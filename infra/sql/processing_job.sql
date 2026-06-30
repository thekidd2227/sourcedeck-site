-- infra/sql/processing_job.sql (forward) — ONE shared durable job queue for
-- solicitation/cost/subcontractor/vendor/proposal/export work. Postgres-backed
-- with FOR UPDATE SKIP LOCKED leasing. Additive; rollback in *_rollback.sql.
CREATE TABLE IF NOT EXISTS processing_job (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  job_type          TEXT NOT NULL,
  entity_type       TEXT,
  entity_id         TEXT,
  proposal_id       TEXT,
  section_id        TEXT,
  base_version_id   TEXT,
  payload_reference JSONB NOT NULL DEFAULT '{}',
  result_reference  JSONB,
  idempotency_key   TEXT,
  status            TEXT NOT NULL DEFAULT 'queued',  -- queued|leased|running|retry_wait|completed|failed|cancelled|dead_letter
  priority          INTEGER NOT NULL DEFAULT 100,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  maximum_attempts  INTEGER NOT NULL DEFAULT 3,
  lease_owner       TEXT,
  lease_expires_at  TIMESTAMPTZ,
  heartbeat_at      TIMESTAMPTZ,
  next_attempt_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  structured_error  JSONB,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS processing_job_claim_idx ON processing_job (status, next_attempt_at, priority);
CREATE INDEX IF NOT EXISTS processing_job_tenant_idx ON processing_job (tenant_id, job_type);
CREATE UNIQUE INDEX IF NOT EXISTS processing_job_idem_idx ON processing_job (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
