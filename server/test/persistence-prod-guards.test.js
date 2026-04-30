import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureProductionPersistence, autoBindPersistence, getTenantPolicyRepo, getUsageRepo, bindTenantPolicyRepo, bindUsageRepo } from '../src/services/persistence/index.js';
import { createInMemoryTenantPolicyRepo } from '../src/services/persistence/tenantPolicyRepo.memory.js';
import { createInMemoryUsageRepo } from '../src/services/persistence/usageRepo.memory.js';

function withEnv(env, fn) {
  const orig = { ...process.env };
  Object.assign(process.env, env);
  try { return fn(); }
  finally {
    for (const k of Object.keys(env)) delete process.env[k];
    Object.assign(process.env, orig);
  }
}

test('ensureProductionPersistence: passes in dev', () => {
  withEnv({ APP_ENV: 'development' }, () => {
    ensureProductionPersistence();
  });
});

test('ensureProductionPersistence: throws in prod with in-memory repos', () => {
  // Reset to in-memory just in case prior tests bound something else.
  bindTenantPolicyRepo(createInMemoryTenantPolicyRepo());
  bindUsageRepo(createInMemoryUsageRepo());
  withEnv({ APP_ENV: 'production' }, () => {
    assert.throws(() => ensureProductionPersistence(), /in-memory repos are dev-only/);
  });
});

test('ensureProductionPersistence: ALLOW_IN_MEMORY_PROD=true unlocks prod', () => {
  bindTenantPolicyRepo(createInMemoryTenantPolicyRepo());
  bindUsageRepo(createInMemoryUsageRepo());
  withEnv({ APP_ENV: 'production', ALLOW_IN_MEMORY_PROD: 'true' }, () => {
    ensureProductionPersistence();
  });
});

test('autoBindPersistence: defaults to memory when no DB/Redis env', async () => {
  const summary = await autoBindPersistence({});
  assert.equal(summary.tenantPolicyRepo, 'memory');
  assert.equal(summary.usageRepo, 'memory');
});

test('autoBindPersistence: in dev, missing pg package is logged but not thrown', async () => {
  // Force the postgres-bind path; it should fall back without throwing in dev.
  const summary = await autoBindPersistence({ DATABASE_URL: 'postgres://nope' });
  // It either bound (if pg is installed and connected) or warned. Either is acceptable in dev.
  assert.ok(summary.tenantPolicyRepo === 'postgres' || summary.warnings.length > 0);
});

test('autoBindPersistence: production w/o real adapters and override → throws via ensureProductionPersistence', async () => {
  bindTenantPolicyRepo(createInMemoryTenantPolicyRepo());
  bindUsageRepo(createInMemoryUsageRepo());
  // Auto-bind reads env. With no DATABASE_URL, repo stays in-memory.
  await autoBindPersistence({});
  withEnv({ APP_ENV: 'production' }, () => {
    assert.throws(() => ensureProductionPersistence(), /in-memory repos are dev-only/);
  });
});
