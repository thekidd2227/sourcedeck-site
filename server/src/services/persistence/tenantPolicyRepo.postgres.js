// server/src/services/persistence/tenantPolicyRepo.postgres.js
// Postgres-backed tenant AI policy repository.
//
// Lazy-imports `pg` so the package is optional at install time. The
// adapter is bound at boot (see persistence/index.js) only when
// DATABASE_URL is present.
//
// Schema lives in infra/sql/tenant_ai_policy.sql. Apply once before
// first use — this adapter intentionally does NOT auto-create the
// table; that's a deploy-time concern, not a request-time concern.

import { log } from '../../logger.js';

const TABLE = 'tenant_ai_policy';

const DEFAULT_POLICY = Object.freeze({
  subscriptionTier:         'starter',
  tenantType:               'standard',
  byokEnabled:              false,
  allowedDraftingProviders: ['watsonx'],
  defaultDraftingProvider:  'watsonx',
  governanceEnabled:        false,
  tenantKeys:               {}
});

export async function createPostgresTenantPolicyRepo(cfg = {}) {
  const url = cfg.databaseUrl || process.env.DATABASE_URL;
  if (!url) throw new Error('persistence.postgres: DATABASE_URL required');

  let Pool;
  try {
    ({ Pool } = await import('pg'));
  } catch {
    throw new Error('persistence.postgres: pg package not installed. Run `npm i pg` in server/.');
  }

  const pool = new Pool({
    connectionString: url,
    max:              cfg.poolMax || 10,
    idleTimeoutMillis: 30_000
  });

  return {
    name:        'postgres',
    isInMemory:  false,

    async get(tenantId) {
      const r = await pool.query(
        `SELECT tenant_id, subscription_tier, tenant_type, byok_enabled,
                allowed_drafting_providers, default_drafting_provider,
                governance_enabled, tenant_keys, updated_by, updated_at
           FROM ${TABLE} WHERE tenant_id = $1`,
        [tenantId]
      );
      if (!r.rows.length) {
        return { ...DEFAULT_POLICY, tenantId, updatedAt: new Date(0).toISOString() };
      }
      const row = r.rows[0];
      return rowToPolicy(row);
    },

    async upsert(tenantId, patch, updatedBy) {
      // Read-modify-write so partial patches preserve other columns.
      const prev = await this.get(tenantId);
      const next = {
        ...prev,
        ...patch,
        tenantId,
        updatedBy: updatedBy || prev.updatedBy || null,
        updatedAt: new Date().toISOString()
      };
      // Defensive: tenantKeys stores presence flags only.
      if (next.tenantKeys && typeof next.tenantKeys === 'object') {
        next.tenantKeys = Object.fromEntries(
          Object.entries(next.tenantKeys).map(([k, v]) => [k, !!v])
        );
      }

      await pool.query(
        `INSERT INTO ${TABLE}
           (tenant_id, subscription_tier, tenant_type, byok_enabled,
            allowed_drafting_providers, default_drafting_provider,
            governance_enabled, tenant_keys, updated_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::timestamptz)
         ON CONFLICT (tenant_id) DO UPDATE SET
           subscription_tier         = EXCLUDED.subscription_tier,
           tenant_type               = EXCLUDED.tenant_type,
           byok_enabled              = EXCLUDED.byok_enabled,
           allowed_drafting_providers= EXCLUDED.allowed_drafting_providers,
           default_drafting_provider = EXCLUDED.default_drafting_provider,
           governance_enabled        = EXCLUDED.governance_enabled,
           tenant_keys               = EXCLUDED.tenant_keys,
           updated_by                = EXCLUDED.updated_by,
           updated_at                = EXCLUDED.updated_at`,
        [
          tenantId,
          next.subscriptionTier,
          next.tenantType,
          next.byokEnabled,
          next.allowedDraftingProviders,
          next.defaultDraftingProvider,
          next.governanceEnabled,
          JSON.stringify(next.tenantKeys || {}),
          next.updatedBy,
          next.updatedAt
        ]
      );
      log.info('persistence.policy_upsert', { tenantId, updatedBy: next.updatedBy });
      return next;
    },

    async list() {
      const r = await pool.query(`SELECT * FROM ${TABLE} ORDER BY tenant_id`);
      return r.rows.map(rowToPolicy);
    },

    async _close() { await pool.end(); }
  };
}

function rowToPolicy(row) {
  return {
    tenantId:                 row.tenant_id,
    subscriptionTier:         row.subscription_tier,
    tenantType:               row.tenant_type,
    byokEnabled:              row.byok_enabled,
    allowedDraftingProviders: row.allowed_drafting_providers,
    defaultDraftingProvider:  row.default_drafting_provider,
    governanceEnabled:        row.governance_enabled,
    tenantKeys:               row.tenant_keys || {},
    updatedBy:                row.updated_by,
    updatedAt:                row.updated_at?.toISOString?.() || row.updated_at || null
  };
}
