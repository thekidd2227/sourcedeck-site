// server/test/proposal-persistence.pg.test.js
// REAL Postgres integration tests for the proposal repository. Runs only when
// PROPOSAL_PG_TEST_URL is set (a disposable Postgres) — otherwise skipped, so the
// default suite stays green without Docker. Applies the forward migration,
// exercises tenant isolation + optimistic locking + version creation/restore,
// then cleans up. Migration rollback is verified separately.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_ = process.env.PROPOSAL_PG_TEST_URL;
const SQL_DIR = fileURLToPath(new URL('../../infra/sql/', import.meta.url));

let pool, repo, skip = !URL_;

before(async () => {
  if (skip) return;
  const pg = (await import('pg')).default;
  pool = new pg.Pool({ connectionString: URL_ });
  await pool.query(fs.readFileSync(SQL_DIR + 'proposal.sql', 'utf8')); // idempotent (IF NOT EXISTS)
  const { createPostgresProposalRepo } = await import('../src/services/proposal/repo.pg.js');
  repo = createPostgresProposalRepo(pool);
});

after(async () => { if (pool) await pool.end(); });

const T1 = 'tenant-1', T2 = 'tenant-2';

test('migration applied + project CRUD (tenant-scoped)', { skip }, async () => {
  const p = await repo.createProject({ tenantId: T1, opportunityId: 'opp1', title: 'Moore AFB pest', createdBy: 'u1' });
  assert.ok(p.id);
  assert.equal((await repo.getProject(T1, p.id)).title, 'Moore AFB pest');
});

test('tenant isolation — another tenant cannot read the project', { skip }, async () => {
  const p = await repo.createProject({ tenantId: T1, opportunityId: 'opp2', title: 'X', createdBy: 'u1' });
  assert.equal(await repo.getProject(T2, p.id), null, 'cross-tenant read blocked');
});

test('optimistic locking — stale version update is rejected', { skip }, async () => {
  const p = await repo.createProject({ tenantId: T1, opportunityId: 'opp3', title: 'A', createdBy: 'u1' });
  await repo.updateProject(T1, p.id, { title: 'B' }, p.optimistic_version); // ok (v1→v2)
  await assert.rejects(() => repo.updateProject(T1, p.id, { title: 'C' }, p.optimistic_version), /optimistic_conflict/);
});

test('version creation increments, flips is_current, updates section pointer', { skip }, async () => {
  const p = await repo.createProject({ tenantId: T1, opportunityId: 'opp4', title: 'P', createdBy: 'u1' });
  const s = await repo.createSection({ tenantId: T1, projectId: p.id, sectionType: 'technical_approach', title: 'Tech', createdBy: 'u1' });
  const v1 = await repo.createDraftVersion({ tenantId: T1, sectionId: s.id, contentJson: { blocks: [{ id: 'b1', text: 'v1' }] }, plainText: 'v1', generationSource: 'ai' });
  const v2 = await repo.createDraftVersion({ tenantId: T1, sectionId: s.id, contentJson: { blocks: [{ id: 'b1', text: 'v2' }] }, plainText: 'v2', generationSource: 'ai' });
  assert.equal(v1.version_number, 1);
  assert.equal(v2.version_number, 2);
  const versions = await repo.listVersions(T1, s.id);
  assert.equal(versions.filter(v => v.is_current).length, 1, 'exactly one current version (retry-safe)');
  assert.equal(versions.find(v => v.is_current).version_number, 2);
  const sec = await repo.getSection(T1, s.id);
  assert.equal(sec.current_version_id, v2.id);
});

test('restore creates a new current version (history preserved)', { skip }, async () => {
  const p = await repo.createProject({ tenantId: T1, opportunityId: 'opp5', title: 'P', createdBy: 'u1' });
  const s = await repo.createSection({ tenantId: T1, projectId: p.id, sectionType: 'management_plan', createdBy: 'u1' });
  const v1 = await repo.createDraftVersion({ tenantId: T1, sectionId: s.id, contentJson: { v: 1 }, plainText: 'one' });
  await repo.createDraftVersion({ tenantId: T1, sectionId: s.id, contentJson: { v: 2 }, plainText: 'two' });
  const restored = await repo.restoreVersion(T1, s.id, v1.id);
  assert.equal(restored.version_number, 3, 'restore is a new version, not a destructive revert');
  assert.equal(restored.plain_text, 'one');
  assert.equal((await repo.listVersions(T1, s.id)).length, 3, 'history preserved');
});

test('source links record claim provenance', { skip }, async () => {
  const p = await repo.createProject({ tenantId: T1, opportunityId: 'opp6', title: 'P', createdBy: 'u1' });
  const s = await repo.createSection({ tenantId: T1, projectId: p.id, sectionType: 'past_performance', createdBy: 'u1' });
  const v = await repo.createDraftVersion({ tenantId: T1, sectionId: s.id, contentJson: {}, plainText: '' });
  const link = await repo.addSourceLink({ tenantId: T1, draftVersionId: v.id, blockId: 'b1', sourceType: 'citation', citationId: 'cit1', verificationStatus: 'verified' });
  assert.equal(link.source_type, 'citation');
  assert.equal(link.citation_id, 'cit1');
});
