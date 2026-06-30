-- infra/sql/proposal.sql  (forward migration)
-- Compact Proposal Intelligence persistence (5 tables). Tenant-scoped; FKs;
-- indexes; optimistic concurrency; version history. Additive — no existing
-- table altered. Rollback: infra/sql/proposal_rollback.sql.

CREATE TABLE IF NOT EXISTS proposal_project (
  id                        TEXT PRIMARY KEY,
  tenant_id                 TEXT NOT NULL,
  opportunity_id            TEXT NOT NULL,
  title                     TEXT NOT NULL DEFAULT 'Untitled proposal',
  status                    TEXT NOT NULL DEFAULT 'draft',
  active_analysis_version_id TEXT,
  created_by                TEXT,
  updated_by                TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  optimistic_version        INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS proposal_project_tenant_idx ON proposal_project (tenant_id, opportunity_id);

CREATE TABLE IF NOT EXISTS proposal_section (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  proposal_project_id TEXT NOT NULL REFERENCES proposal_project(id) ON DELETE CASCADE,
  section_type        TEXT NOT NULL,
  title               TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'not_started',
  current_version_id  TEXT,
  evaluation_factor_ids JSONB NOT NULL DEFAULT '[]',
  requirement_ids     JSONB NOT NULL DEFAULT '[]',
  created_by          TEXT,
  updated_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  optimistic_version  INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS proposal_section_tenant_idx ON proposal_section (tenant_id, proposal_project_id);

CREATE TABLE IF NOT EXISTS proposal_team_selection (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  proposal_project_id TEXT NOT NULL REFERENCES proposal_project(id) ON DELETE CASCADE,
  mode                TEXT NOT NULL,
  primary_vendor_id   TEXT,
  additional_vendor_ids JSONB NOT NULL DEFAULT '[]',
  responsibilities_json JSONB NOT NULL DEFAULT '{}',
  workshare_json      JSONB NOT NULL DEFAULT '{}',
  confirmed_by        TEXT,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proposal_team_tenant_idx ON proposal_team_selection (tenant_id, proposal_project_id);

CREATE TABLE IF NOT EXISTS proposal_draft_version (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  proposal_section_id TEXT NOT NULL REFERENCES proposal_section(id) ON DELETE CASCADE,
  version_number      INTEGER NOT NULL,
  content_json        JSONB NOT NULL DEFAULT '{}',
  plain_text          TEXT,
  generation_source   TEXT,
  base_version_id     TEXT,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current          BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, proposal_section_id, version_number)
);
CREATE INDEX IF NOT EXISTS proposal_version_section_idx ON proposal_draft_version (tenant_id, proposal_section_id, version_number);

CREATE TABLE IF NOT EXISTS proposal_source_link (
  id                       TEXT PRIMARY KEY,
  tenant_id                TEXT NOT NULL,
  proposal_draft_version_id TEXT NOT NULL REFERENCES proposal_draft_version(id) ON DELETE CASCADE,
  block_id                 TEXT NOT NULL,
  source_type              TEXT NOT NULL,   -- citation|company_fact|vendor_evidence|user_input|placeholder
  citation_id              TEXT,
  company_fact_id          TEXT,
  vendor_evidence_id       TEXT,
  user_input_id            TEXT,
  verification_status      TEXT NOT NULL DEFAULT 'unverified',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proposal_source_link_idx ON proposal_source_link (tenant_id, proposal_draft_version_id, block_id);
