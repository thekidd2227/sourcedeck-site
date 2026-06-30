-- infra/sql/solicitation.sql
-- Solicitation Intelligence Workspace schema (Postgres production seam).
-- Additive: no existing table is altered. The in-memory adapter
-- (server/src/services/solicitation/store.js) is the dev/test default; this
-- DDL is applied at deploy time, matching the tenant_ai_policy.sql pattern.
-- Every table is tenant-scoped; child tables cascade from their parent.
-- Rollback: DROP the tables below (reverse order); no other schema is touched.

CREATE TABLE IF NOT EXISTS solicitation_upload_batch (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Untitled batch',
  created_by    TEXT,
  status        TEXT NOT NULL DEFAULT 'uploaded',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solicitation_batch_tenant_idx ON solicitation_upload_batch (tenant_id);

CREATE TABLE IF NOT EXISTS solicitation_opportunity (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  batch_id            TEXT NOT NULL REFERENCES solicitation_upload_batch(id) ON DELETE CASCADE,
  title               TEXT,
  solicitation_number TEXT,
  agency              TEXT,
  sub_agency          TEXT,
  grouping_confidence REAL,
  grouping_evidence   JSONB NOT NULL DEFAULT '[]',
  analysis_version    INTEGER NOT NULL DEFAULT 0,
  recommendation      TEXT,
  overall_risk        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solicitation_opp_tenant_idx ON solicitation_opportunity (tenant_id, batch_id);

CREATE TABLE IF NOT EXISTS solicitation_document (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  batch_id            TEXT NOT NULL REFERENCES solicitation_upload_batch(id) ON DELETE CASCADE,
  opportunity_id      TEXT REFERENCES solicitation_opportunity(id) ON DELETE SET NULL,
  original_filename   TEXT NOT NULL,
  normalized_file_type TEXT,
  content_type        TEXT,
  content_hash        TEXT,
  storage_provider    TEXT,
  storage_key         TEXT NOT NULL,
  classification      TEXT,
  document_version    INTEGER NOT NULL DEFAULT 1,
  amendment_number    INTEGER,
  processing_status   TEXT NOT NULL DEFAULT 'uploaded',
  page_count          INTEGER,
  sheet_names         JSONB NOT NULL DEFAULT '[]',
  extraction_method   TEXT,
  warnings            JSONB NOT NULL DEFAULT '[]',
  duplicate_of        TEXT,
  last_error          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solicitation_doc_tenant_idx ON solicitation_document (tenant_id, batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS solicitation_doc_hash_idx ON solicitation_document (tenant_id, batch_id, content_hash);

-- Per-document normalized extraction (pages/sheets/sections) as JSONB.
CREATE TABLE IF NOT EXISTS solicitation_extraction (
  document_id   TEXT PRIMARY KEY REFERENCES solicitation_document(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL,
  extraction    JSONB NOT NULL
);

-- Analysis runs are versioned; older versions remain queryable.
CREATE TABLE IF NOT EXISTS solicitation_analysis_run (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  opportunity_id  TEXT NOT NULL REFERENCES solicitation_opportunity(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  provider        TEXT,
  model           TEXT,
  inputs_hash     TEXT,
  snapshot        JSONB NOT NULL,   -- findings, conflicts, compliance, sections, rfi, deadlines
  status          TEXT NOT NULL DEFAULT 'completed',
  token_usage     JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  UNIQUE (tenant_id, opportunity_id, version)
);
CREATE INDEX IF NOT EXISTS solicitation_run_idx ON solicitation_analysis_run (tenant_id, opportunity_id, version);
