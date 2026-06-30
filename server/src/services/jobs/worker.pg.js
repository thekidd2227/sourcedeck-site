// server/src/services/jobs/worker.pg.js
// ONE shared Postgres-backed durable job system (solicitation/cost/subcontractor/
// vendor/proposal/export). Atomic leasing via FOR UPDATE SKIP LOCKED, lease
// expiry + heartbeat, bounded retries with exponential backoff, dead-letter,
// cancellation, and stale-job recovery. No proposal-only queue.

let _seq = 0;
const id = p => `${p}_${Date.now().toString(36)}${(_seq++).toString(36)}`;

export const JOB_TYPES = Object.freeze([
  'generate_proposal_section', 'regenerate_proposal_block', 'validate_proposal_section',
  'export_proposal', 'resolve_proposal_placeholders',
  'parse_solicitation_document', 'analyze_solicitation_opportunity',
  'extract_subcontractor_requirements', 'search_vendor_shortlist'
]);

export function createPgJobQueue(pool, { now = () => new Date(), leaseSeconds = 60, backoffBaseSeconds = 5 } = {}) {
  const q = (t, p) => pool.query(t, p);

  return {
    name: 'pg-processing-job-queue',

    async enqueue({ tenantId, jobType, entityType = null, entityId = null, proposalId = null, sectionId = null, baseVersionId = null, payload = {}, idempotencyKey = null, priority = 100, maximumAttempts = 3, createdBy = null }) {
      // Idempotent: a duplicate idempotency_key returns the existing job.
      if (idempotencyKey) {
        const { rows } = await q(`SELECT * FROM processing_job WHERE tenant_id=$1 AND idempotency_key=$2`, [tenantId, idempotencyKey]);
        if (rows[0]) return { job: rows[0], deduped: true };
      }
      const { rows } = await q(
        `INSERT INTO processing_job (id, tenant_id, job_type, entity_type, entity_id, proposal_id, section_id, base_version_id, payload_reference, idempotency_key, priority, maximum_attempts, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [id('job'), tenantId, jobType, entityType, entityId, proposalId, sectionId, baseVersionId, JSON.stringify(payload), idempotencyKey, priority, maximumAttempts, createdBy]);
      return { job: rows[0], deduped: false };
    },

    /** Atomically claim the next runnable job for this worker. Returns null if none. */
    async claim(workerId, { jobTypes = null } = {}) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const typeFilter = jobTypes ? `AND job_type = ANY($2)` : '';
        const params = jobTypes ? [now().toISOString(), jobTypes] : [now().toISOString()];
        const { rows } = await client.query(
          `SELECT id FROM processing_job
            WHERE status IN ('queued','retry_wait') AND next_attempt_at <= $1 ${typeFilter}
            ORDER BY priority ASC, next_attempt_at ASC
            FOR UPDATE SKIP LOCKED LIMIT 1`, params);
        if (!rows[0]) { await client.query('COMMIT'); return null; }
        const leaseExpires = new Date(now().getTime() + leaseSeconds * 1000).toISOString();
        const { rows: upd } = await client.query(
          `UPDATE processing_job SET status='leased', lease_owner=$2, lease_expires_at=$3,
             heartbeat_at=$4, attempt_count=attempt_count+1, updated_at=now()
           WHERE id=$1 RETURNING *`, [rows[0].id, workerId, leaseExpires, now().toISOString()]);
        await client.query('COMMIT');
        return upd[0];
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
    },

    async heartbeat(jobId, workerId) {
      const leaseExpires = new Date(now().getTime() + leaseSeconds * 1000).toISOString();
      const { rows } = await q(
        `UPDATE processing_job SET heartbeat_at=$3, lease_expires_at=$4, status='running', updated_at=now()
         WHERE id=$1 AND lease_owner=$2 AND status IN ('leased','running') RETURNING id`,
        [jobId, workerId, now().toISOString(), leaseExpires]);
      return rows.length > 0;
    },

    async complete(jobId, workerId, resultReference = {}) {
      const { rows } = await q(
        `UPDATE processing_job SET status='completed', result_reference=$3, completed_at=now(), updated_at=now()
         WHERE id=$1 AND lease_owner=$2 RETURNING *`, [jobId, workerId, JSON.stringify(resultReference)]);
      return rows[0] || null;
    },

    /** Fail a job: retry with exponential backoff, or dead-letter when attempts exhausted. */
    async fail(jobId, workerId, error) {
      const { rows: cur } = await q(`SELECT attempt_count, maximum_attempts FROM processing_job WHERE id=$1`, [jobId]);
      if (!cur[0]) return null;
      const exhausted = cur[0].attempt_count >= cur[0].maximum_attempts;
      if (exhausted) {
        const { rows } = await q(
          `UPDATE processing_job SET status='dead_letter', structured_error=$3, lease_owner=NULL, lease_expires_at=NULL, updated_at=now()
           WHERE id=$1 AND lease_owner=$2 RETURNING *`, [jobId, workerId, JSON.stringify(err(error))]);
        return rows[0] || null;
      }
      const backoff = backoffBaseSeconds * Math.pow(2, cur[0].attempt_count);
      const nextAt = new Date(now().getTime() + backoff * 1000).toISOString();
      const { rows } = await q(
        `UPDATE processing_job SET status='retry_wait', next_attempt_at=$3, structured_error=$4, lease_owner=NULL, lease_expires_at=NULL, updated_at=now()
         WHERE id=$1 AND lease_owner=$2 RETURNING *`, [jobId, workerId, nextAt, JSON.stringify(err(error))]);
      return rows[0] || null;
    },

    async cancel(tenantId, jobId) {
      const { rows } = await q(
        `UPDATE processing_job SET status='cancelled', lease_owner=NULL, updated_at=now()
         WHERE id=$1 AND tenant_id=$2 AND status IN ('queued','retry_wait','leased','running') RETURNING *`,
        [jobId, tenantId]);
      return rows[0] || null;
    },

    /** Recover jobs whose lease expired (crashed worker): back to retry_wait. */
    async recoverStaleLeases() {
      const { rows } = await q(
        `UPDATE processing_job SET status='retry_wait', lease_owner=NULL, lease_expires_at=NULL, next_attempt_at=now(), updated_at=now()
         WHERE status IN ('leased','running') AND lease_expires_at < $1 RETURNING id`, [now().toISOString()]);
      return rows.length;
    },

    async get(tenantId, jobId) {
      const { rows } = await q(`SELECT * FROM processing_job WHERE id=$1 AND tenant_id=$2`, [jobId, tenantId]);
      return rows[0] || null;
    },

    async status() {
      const { rows } = await q(`SELECT status, count(*)::int AS n FROM processing_job GROUP BY status`);
      return Object.fromEntries(rows.map(r => [r.status, r.n]));
    }
  };
}

function err(e) {
  if (!e) return { message: 'unknown' };
  if (typeof e === 'string') return { message: e };
  return { message: e.message || String(e), code: e.code || null };
}
