// server/src/services/solicitation/wiring.js
// Safe mounting + dependency guards for the Solicitation Intelligence Workspace.
//
// Rules (corrects prototype defect D1):
//   - The feature defaults OFF. It mounts only when
//     SOLICITATION_WORKSPACE_ENABLED === 'true' (any other value, including
//     undefined/'false', leaves the route unmounted).
//   - In production the route refuses to mount unless ALL mandatory
//     dependencies are configured: a persistent solicitation repository,
//     object storage, real authentication, tenant enforcement, and a durable
//     processing worker. Missing dependencies are a startup failure, never a
//     silent in-memory fallback.
//   - The in-memory store is permitted ONLY in non-production (dev/test).

import { createInMemorySolicitationStore } from './store.js';

let _boundStore = null; // a persistent adapter binds itself here (Step 3 seam)

/** Bind a persistent solicitation repository (e.g. Postgres). */
export function bindSolicitationStore(store) { _boundStore = store; }
export function getBoundSolicitationStore() { return _boundStore; }
/** Test/dev reset. */
export function _resetSolicitationStore() { _boundStore = null; }

export function isSolicitationEnabled(env = process.env) {
  return env.SOLICITATION_WORKSPACE_ENABLED === 'true';
}

function isProd(cfg, env) {
  return cfg?.isProduction ?? (env.APP_ENV || env.NODE_ENV) === 'production';
}

/**
 * Validate mandatory production dependencies. Returns { ok, missing[] }.
 * Pure — takes env + cfg, no side effects.
 */
export function checkSolicitationDependencies(cfg, env = process.env) {
  const missing = [];

  // 1. Persistent solicitation repository (no volatile product data in prod).
  if (!_boundStore && !env.DATABASE_URL) missing.push('persistent_repository(DATABASE_URL)');
  if (_boundStore && _boundStore.isInMemory) missing.push('persistent_repository(in-memory adapter not allowed in prod)');

  // 2. Object storage for original files.
  if (cfg?.storage?.provider !== 'ibm_cos' || !cfg?.storage?.ibmCos?.bucket) {
    missing.push('object_storage(STORAGE_PROVIDER=ibm_cos + IBM_COS_BUCKET)');
  }

  // 3. Real authentication (not the dev header shim).
  const authProvider = cfg?.auth?.provider;
  if (!(authProvider === 'oidc' || authProvider === 'ibm_iam')) {
    missing.push('authentication(AUTH_PROVIDER=oidc|ibm_iam)');
  }

  // 4. Tenant enforcement. In production the tenant middleware already refuses
  //    unresolved tenants; require the explicit allow flag to be ABSENT.
  if (env.ALLOW_DEV_HEADERS_PROD === 'true') missing.push('tenant_enforcement(ALLOW_DEV_HEADERS_PROD must not be true)');

  // 5. Durable processing worker / supported persisted job mechanism.
  //    'inline' (request-bound) is dev-only; production needs a durable worker.
  const worker = env.SOLICITATION_WORKER || 'inline';
  if (worker === 'inline') missing.push('durable_worker(SOLICITATION_WORKER=pg|queue)');

  return { ok: missing.length === 0, missing };
}

/**
 * Resolve the store to use, enforcing the no-in-memory-in-prod rule.
 * Throws in production if no persistent adapter is bound.
 */
export function resolveSolicitationStore(cfg, env = process.env) {
  if (isProd(cfg, env)) {
    if (!_boundStore || _boundStore.isInMemory) {
      throw new Error('solicitation: refusing to use in-memory store in production; bind a persistent adapter');
    }
    return _boundStore;
  }
  return _boundStore || createInMemorySolicitationStore();
}

/**
 * The single decision point used by server bootstrap.
 * @returns { mount: boolean, store?, reason }
 * @throws in production when enabled but mandatory dependencies are missing.
 */
export function planSolicitationMount(cfg, env = process.env) {
  if (!isSolicitationEnabled(env)) {
    return { mount: false, reason: 'disabled (SOLICITATION_WORKSPACE_ENABLED !== "true")' };
  }
  if (isProd(cfg, env)) {
    const { ok, missing } = checkSolicitationDependencies(cfg, env);
    if (!ok) {
      throw new Error(
        'solicitation: enabled in production but missing mandatory dependencies: ' + missing.join(', ')
      );
    }
  }
  return { mount: true, store: resolveSolicitationStore(cfg, env), reason: 'enabled' };
}
