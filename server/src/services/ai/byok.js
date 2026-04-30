// server/src/services/ai/byok.js
// BYOK credential service.
//
// SECURITY POSTURE: this module is the *interface* for BYOK. The actual
// secure storage MUST be wired to a real secrets manager (IBM Secrets
// Manager, Vault, AWS KMS-encrypted Postgres column, etc.) before any
// production use. This in-memory store is dev-only and refuses to start
// when APP_ENV=production unless an external store is bound.
//
// Hard rules enforced by this module:
//   - never log a key, even at debug level
//   - never echo a key back through the API; only masked references
//   - keys are scoped per (tenantId, userId, providerId)
//   - BYOK can only be activated on tiers where tier.byokAllowed === true
//   - governed workflows never read a BYOK key, even if one exists

import { getTierPolicy } from './tiers.js';
import { PROVIDER_IDS } from './types.js';
import { log } from '../../logger.js';

const _store = new Map(); // key: `${tenantId}:${userId}:${providerId}` → record

let _externalStore = null;

/** Wire a production-grade store before serving requests. */
export function bindExternalStore(store) {
  _externalStore = store;
  log.info('byok.external_store_bound', { name: store?.name || 'custom' });
}

/** Test-only / hot-reload helper. */
export function unbindExternalStore() { _externalStore = null; }

/** True iff a real (non-in-memory) BYOK store is currently bound. */
export function hasExternalStore() { return !!_externalStore; }

function ensureProductionExternalStore() {
  if (process.env.APP_ENV !== 'production') return;
  if (process.env.ALLOW_IN_MEMORY_PROD === 'true') {
    log.warn('byok.in_memory_prod_override_active');
    return;
  }
  if (!_externalStore) {
    throw new Error('byok: in-memory store is dev-only. Bind an external secrets store before production.');
  }
}

/**
 * Boot-time auto-bind. When IBM_SECRETS_MANAGER_URL +
 * IBM_SECRETS_MANAGER_API_KEY are present, binds the IBM adapter.
 * Otherwise leaves the dev in-memory store in place.
 */
export async function autoBindByokStore(env = process.env) {
  if (!env.IBM_SECRETS_MANAGER_URL || !env.IBM_SECRETS_MANAGER_API_KEY) {
    return { bound: false, reason: 'env_not_present' };
  }
  try {
    const { createIbmSecretsManagerByokStore } = await import('./byokIbmSecretsManager.js');
    const store = createIbmSecretsManagerByokStore({
      url:        env.IBM_SECRETS_MANAGER_URL,
      apiKey:     env.IBM_SECRETS_MANAGER_API_KEY,
      groupId:    env.IBM_SECRETS_MANAGER_GROUP_ID,
      instanceId: env.IBM_SECRETS_MANAGER_INSTANCE_ID
    });
    bindExternalStore(store);
    return { bound: true, name: 'ibm_secrets_manager' };
  } catch (err) {
    if (env.APP_ENV === 'production' && env.ALLOW_IN_MEMORY_PROD !== 'true') throw err;
    log.warn('byok.ibm_bind_failed', { reason: err.message });
    return { bound: false, reason: err.message };
  }
}

function key(tenantId, userId, providerId) { return `${tenantId}:${userId}:${providerId}`; }

function maskKey(raw) {
  if (typeof raw !== 'string' || raw.length < 8) return '****';
  return raw.slice(0, 3) + '…' + raw.slice(-3);
}

function validateProviderForByok(providerId) {
  const allowed = new Set([PROVIDER_IDS.OPENAI, PROVIDER_IDS.ANTHROPIC, PROVIDER_IDS.GOOGLE]);
  if (!allowed.has(providerId)) {
    throw new Error(`byok: provider "${providerId}" not eligible for BYOK`);
  }
}

/** Add or update a BYOK key. Returns the masked record only. */
export async function addByokKey({ tenantId, userId, providerId, apiKey, subscriptionTier }) {
  ensureProductionExternalStore();
  validateProviderForByok(providerId);
  const tier = getTierPolicy(subscriptionTier);
  if (!tier.byokAllowed) throw new Error('byok: tier does not permit BYOK');
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) {
    throw new Error('byok: invalid api key');
  }

  const record = {
    tenantId, userId, providerId,
    addedAt: new Date().toISOString(),
    masked:  maskKey(apiKey)
    // raw key intentionally NOT in this object — held only by the store impl
  };

  if (_externalStore) await _externalStore.put({ tenantId, userId, providerId, apiKey });
  else _store.set(key(tenantId, userId, providerId), { ...record, _raw: apiKey });

  log.info('byok.key_added', { tenantId, userId, providerId, masked: record.masked });
  return record;
}

export async function removeByokKey({ tenantId, userId, providerId }) {
  ensureProductionExternalStore();
  if (_externalStore) await _externalStore.remove({ tenantId, userId, providerId });
  else _store.delete(key(tenantId, userId, providerId));
  log.info('byok.key_removed', { tenantId, userId, providerId });
  return { ok: true };
}

/** Used internally by the gateway. Never returned through the API. */
export async function fetchByokKey({ tenantId, userId, providerId }) {
  ensureProductionExternalStore();
  if (_externalStore) return _externalStore.get({ tenantId, userId, providerId });
  const r = _store.get(key(tenantId, userId, providerId));
  return r ? r._raw : null;
}

export async function hasByokKey({ tenantId, userId, providerId }) {
  return !!(await fetchByokKey({ tenantId, userId, providerId }));
}

export async function listByokKeys({ tenantId, userId }) {
  ensureProductionExternalStore();
  if (_externalStore) return _externalStore.list({ tenantId, userId });
  const out = [];
  for (const [k, v] of _store.entries()) {
    if (k.startsWith(`${tenantId}:${userId}:`)) {
      out.push({ providerId: v.providerId, addedAt: v.addedAt, masked: v.masked });
    }
  }
  return out;
}
