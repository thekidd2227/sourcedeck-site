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
import { createPostgresTenantPolicyRepo } from './tenantPolicyRepo.postgres.js';
import { createRedisUsageRepo }           from './usageRepo.redis.js';
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
 * APP_ENV=production while still on the in-memory adapters, unless
 * ALLOW_IN_MEMORY_PROD=true is explicitly set.
 */
export function ensureProductionPersistence({ allow = false } = {}) {
  if (process.env.APP_ENV !== 'production') return;
  const explicitOverride = process.env.ALLOW_IN_MEMORY_PROD === 'true';
  if (allow || explicitOverride) {
    if (explicitOverride) log.warn('persistence.in_memory_prod_override_active');
    return;
  }
  if (_tenantPolicyRepo.isInMemory || _usageRepo.isInMemory) {
    throw new Error(
      'persistence: in-memory repos are dev-only; bind real adapters before APP_ENV=production ' +
      '(or set ALLOW_IN_MEMORY_PROD=true at your own risk)'
    );
  }
}

/**
 * Boot-time auto-binding. Reads env and wires whichever real adapters
 * are configured. Tests bypass this and bind manually.
 *
 * Returns a summary suitable for logging at boot.
 */
export async function autoBindPersistence(env = process.env) {
  const summary = { tenantPolicyRepo: 'memory', usageRepo: 'memory', warnings: [] };

  if (env.DATABASE_URL) {
    try {
      const repo = await createPostgresTenantPolicyRepo({ databaseUrl: env.DATABASE_URL });
      bindTenantPolicyRepo(repo);
      summary.tenantPolicyRepo = 'postgres';
    } catch (err) {
      if (env.APP_ENV === 'production' && env.ALLOW_IN_MEMORY_PROD !== 'true') throw err;
      summary.warnings.push(`postgres bind failed: ${err.message}`);
      log.warn('persistence.postgres_bind_failed', { reason: err.message });
    }
  }

  if (env.REDIS_URL) {
    try {
      const repo = await createRedisUsageRepo({ redisUrl: env.REDIS_URL });
      bindUsageRepo(repo);
      summary.usageRepo = 'redis';
    } catch (err) {
      if (env.APP_ENV === 'production' && env.ALLOW_IN_MEMORY_PROD !== 'true') throw err;
      summary.warnings.push(`redis bind failed: ${err.message}`);
      log.warn('persistence.redis_bind_failed', { reason: err.message });
    }
  }

  return summary;
}
