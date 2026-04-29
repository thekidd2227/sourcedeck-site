// server/src/services/persistence/index.js
// Persistence repository abstraction.
//
// SourceDeck does not yet have a database wired in. This module defines
// the repository interfaces; the in-memory adapter is dev-safe and is
// the default. Production must bind a real adapter (Postgres per
// docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md, IBM Cloud Databases,
// etc.) via the bind* functions before serving traffic.
//
// We deliberately keep this thin: real ORM choice belongs in the
// PRD-driven backend slice.

import { createInMemoryTenantPolicyRepo } from './tenantPolicyRepo.memory.js';
import { createInMemoryUsageRepo }        from './usageRepo.memory.js';
import { log } from '../../logger.js';

let _tenantPolicyRepo = createInMemoryTenantPolicyRepo();
let _usageRepo        = createInMemoryUsageRepo();

export function bindTenantPolicyRepo(repo) {
  _tenantPolicyRepo = repo;
  log.info('persistence.tenant_policy_repo_bound', { name: repo?.name || 'custom' });
}
export function bindUsageRepo(repo) {
  _usageRepo = repo;
  log.info('persistence.usage_repo_bound', { name: repo?.name || 'custom' });
}

export function getTenantPolicyRepo() { return _tenantPolicyRepo; }
export function getUsageRepo()        { return _usageRepo; }

/**
 * Production safety check. Call from bootstrap. Throws if running with
 * APP_ENV=production while still on the in-memory adapters.
 */
export function ensureProductionPersistence({ allow = false } = {}) {
  if (process.env.APP_ENV !== 'production') return;
  if (allow) return;
  if (_tenantPolicyRepo.isInMemory || _usageRepo.isInMemory) {
    throw new Error('persistence: in-memory repos are dev-only; bind real adapters before APP_ENV=production');
  }
}
