-- infra/sql/tenant_ai_policy.sql
-- Persistent tenant AI policy table.
--
-- Apply once at deploy time. Adapter at
-- server/src/services/persistence/tenantPolicyRepo.postgres.js does NOT
-- auto-create or migrate this table — table lifecycle is a deploy-time
-- concern, not a request-time concern.

CREATE TABLE IF NOT EXISTS tenant_ai_policy (
  tenant_id                  TEXT PRIMARY KEY,
  subscription_tier          TEXT NOT NULL DEFAULT 'starter'
                               CHECK (subscription_tier IN
                                      ('starter','pro','business','enterprise','government')),
  tenant_type                TEXT NOT NULL DEFAULT 'standard'
                               CHECK (tenant_type IN
                                      ('standard','enterprise','government')),
  byok_enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_drafting_providers TEXT[] NOT NULL DEFAULT ARRAY['watsonx'],
  default_drafting_provider  TEXT   NOT NULL DEFAULT 'watsonx',
  governance_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  -- Presence flags only (no raw secret material). Real keys live in the
  -- secret store (BYOK = IBM Secrets Manager).
  tenant_keys                JSONB  NOT NULL DEFAULT '{}'::jsonb,
  updated_by                 TEXT,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hard rules enforced at the database layer in addition to policy.js:
--   1. Government tenants cannot enable BYOK.
--   2. Government tenants cannot list non-watsonx drafting providers.
ALTER TABLE tenant_ai_policy
  DROP CONSTRAINT IF EXISTS tenant_ai_policy_government_no_byok;
ALTER TABLE tenant_ai_policy
  ADD  CONSTRAINT tenant_ai_policy_government_no_byok
       CHECK (subscription_tier <> 'government' OR byok_enabled = FALSE);

ALTER TABLE tenant_ai_policy
  DROP CONSTRAINT IF EXISTS tenant_ai_policy_government_watsonx_only;
ALTER TABLE tenant_ai_policy
  ADD  CONSTRAINT tenant_ai_policy_government_watsonx_only
       CHECK (subscription_tier <> 'government'
              OR allowed_drafting_providers = ARRAY['watsonx']);

-- Lookup index for admin views.
CREATE INDEX IF NOT EXISTS tenant_ai_policy_tier_idx
  ON tenant_ai_policy (subscription_tier);
