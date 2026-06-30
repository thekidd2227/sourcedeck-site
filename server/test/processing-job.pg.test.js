// server/test/processing-job.pg.test.js
// REAL Postgres integration tests for the shared durable job queue. Runs only
// when PROPOSAL_PG_TEST_URL is set; otherwise skipped (default suite stays green).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_ = process.env.PROPOSAL_PG_TEST_URL;
const SQL = fileURLToPath(new URL('../../infra/sql/processing_job.sql', import.meta.url));
let pool, q, skip = !URL_;
// Anchor the controllable clock slightly AHEAD of the DB's real now() (which
// defaults next_attempt_at), so freshly-enqueued jobs are immediately claimable.
let clock = new Date(Date.now() + 5000);
const now = () => clock;

before(async () => {
  if (skip) return;
  const pg = (await import('pg')).default;
  pool = new pg.Pool({ connectionString: URL_ });
  await pool.query(fs.readFileSync(SQL, 'utf8'));
  await pool.query('DELETE FROM processing_job'); // clean slate
  const { createPgJobQueue } = await import('../src/services/jobs/worker.pg.js');
  q = createPgJobQueue(pool, { now, leaseSeconds: 60, backoffBaseSeconds: 5 });
});
after(async () => { if (pool) await pool.end(); });

const T = 'tenant-1';

test('enqueue is idempotent on idempotency_key', { skip }, async () => {
  const a = await q.enqueue({ tenantId: T, jobType: 'generate_proposal_section', idempotencyKey: 'k1', payload: { x: 1 } });
  const b = await q.enqueue({ tenantId: T, jobType: 'generate_proposal_section', idempotencyKey: 'k1', payload: { x: 2 } });
  assert.equal(b.deduped, true);
  assert.equal(a.job.id, b.job.id);
});

test('atomic claim — a leased job is not handed to a second worker', { skip }, async () => {
  await q.enqueue({ tenantId: T, jobType: 'validate_proposal_section', idempotencyKey: 'claim1' });
  const j1 = await q.claim('worker-A', { jobTypes: ['validate_proposal_section'] });
  assert.ok(j1, 'worker A claims the job');
  const j2 = await q.claim('worker-B', { jobTypes: ['validate_proposal_section'] });
  assert.equal(j2, null, 'worker B gets nothing (job is leased)');
  assert.equal(j1.status, 'leased');
  assert.equal(j1.attempt_count, 1);
});

test('heartbeat extends the lease for the owner only', { skip }, async () => {
  const { job } = await q.enqueue({ tenantId: T, jobType: 'export_proposal', idempotencyKey: 'hb1' });
  const leased = await q.claim('worker-A');
  assert.ok(await q.heartbeat(leased.id, 'worker-A'), 'owner heartbeat ok');
  assert.equal(await q.heartbeat(leased.id, 'worker-B'), false, 'non-owner heartbeat rejected');
});

test('fail → retry_wait with exponential backoff, then dead_letter when exhausted', { skip }, async () => {
  const { job } = await q.enqueue({ tenantId: T, jobType: 'generate_proposal_section', idempotencyKey: 'retry1', maximumAttempts: 2 });
  const a = await q.claim('w', { jobTypes: ['generate_proposal_section'] });          // attempt 1
  const r1 = await q.fail(a.id, 'w', new Error('boom'));
  assert.equal(r1.status, 'retry_wait');
  assert.ok(new Date(r1.next_attempt_at) > clock, 'backoff schedules a future retry');
  // advance clock past backoff, claim again (attempt 2 == max), fail → dead_letter
  clock = new Date(clock.getTime() + 60_000);
  const b = await q.claim('w', { jobTypes: ['generate_proposal_section'] });
  assert.ok(b, 'retry becomes claimable after backoff');
  const r2 = await q.fail(b.id, 'w', new Error('boom again'));
  assert.equal(r2.status, 'dead_letter');
});

test('stale lease recovery returns crashed-worker jobs to the queue', { skip }, async () => {
  const { job } = await q.enqueue({ tenantId: T, jobType: 'search_vendor_shortlist', idempotencyKey: 'stale1' });
  const leased = await q.claim('crashed-worker', { jobTypes: ['search_vendor_shortlist'] });
  // simulate time passing beyond the lease
  clock = new Date(clock.getTime() + 120_000);
  const recovered = await q.recoverStaleLeases();
  assert.ok(recovered >= 1);
  const after = await q.get(T, leased.id);
  assert.equal(after.status, 'retry_wait');
  assert.equal(after.lease_owner, null);
});

test('complete + cancel + tenant-scoped get', { skip }, async () => {
  const { job } = await q.enqueue({ tenantId: T, jobType: 'resolve_proposal_placeholders', idempotencyKey: 'done1' });
  const leased = await q.claim('w', { jobTypes: ['resolve_proposal_placeholders'] });
  const done = await q.complete(leased.id, 'w', { versionId: 'v1' });
  assert.equal(done.status, 'completed');
  assert.equal(await q.get('other-tenant', job.id), null, 'cross-tenant get blocked');
  const { job: c } = await q.enqueue({ tenantId: T, jobType: 'export_proposal', idempotencyKey: 'cancel1' });
  const cancelled = await q.cancel(T, c.id);
  assert.equal(cancelled.status, 'cancelled');
});
