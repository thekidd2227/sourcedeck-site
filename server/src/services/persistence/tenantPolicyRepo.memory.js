// server/src/services/persistence/tenantPolicyRepo.memory.js
// In-memory tenant AI policy repository. Dev-only. Production must bind
// a Postgres-backed (or IBM Cloud Databases) adapter implementing the
// same interface.

/**
 * @typedef {object} TenantPolicy
 * @property {string} tenantId
 * @property {string} subscriptionTier             starter|pro|business|enterprise|government
 * @property {('standard'|'enterprise'|'government')} tenantType
 * @property {boolean} byokEnabled
 * @property {string[]} allowedDraftingProviders
 * @property {string} [defaultDraftingProvider]
 * @property {boolean} governanceEnabled
 * @property {Record<string,boolean>} [tenantKeys] mark which providers have tenant-managed keys (the keys themselves live in the secret store)
 * @property {string} [updatedBy]
 * @property {string} updatedAt
 */

const DEFAULT_POLICY = Object.freeze({
  subscriptionTier:         'starter',
  tenantType:               'standard',
  byokEnabled:              false,
  allowedDraftingProviders: ['watsonx'],
  defaultDraftingProvider:  'watsonx',
  governanceEnabled:        false,
  tenantKeys:               {}
});

export function createInMemoryTenantPolicyRepo() {
  const store = new Map(); // tenantId → TenantPolicy

  return {
    name:        'memory',
    isInMemory:  true,

    async get(tenantId) {
      if (store.has(tenantId)) return clone(store.get(tenantId));
      return clone({ ...DEFAULT_POLICY, tenantId, updatedAt: new Date(0).toISOString() });
    },

    async upsert(tenantId, patch, updatedBy) {
      const prev = store.has(tenantId) ? store.get(tenantId) : { ...DEFAULT_POLICY, tenantId };
      const next = {
        ...prev,
        ...patch,
        tenantId,
        updatedBy: updatedBy || prev.updatedBy || null,
        updatedAt: new Date().toISOString()
      };
      // Defensive: never persist a key blob. Tenant keys live in the
      // secret store; here we only flag presence.
      if (next.tenantKeys && typeof next.tenantKeys === 'object') {
        next.tenantKeys = Object.fromEntries(
          Object.entries(next.tenantKeys).map(([k, v]) => [k, !!v])
        );
      }
      store.set(tenantId, next);
      return clone(next);
    },

    async list() {
      return [...store.values()].map(clone);
    },

    async clear() { store.clear(); }   // test helper
  };
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
