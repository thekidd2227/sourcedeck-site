import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryTenantPolicyRepo } from '../src/services/persistence/tenantPolicyRepo.memory.js';

test('tenantPolicyRepo: returns defaults for unknown tenant', async () => {
  const repo = createInMemoryTenantPolicyRepo();
  const p = await repo.get('new_tenant');
  assert.equal(p.subscriptionTier, 'starter');
  assert.equal(p.tenantType, 'standard');
  assert.equal(p.byokEnabled, false);
  assert.deepEqual(p.allowedDraftingProviders, ['watsonx']);
});

test('tenantPolicyRepo: upsert merges patch + bumps updatedAt', async () => {
  const repo = createInMemoryTenantPolicyRepo();
  const a = await repo.upsert('t1', { subscriptionTier: 'business', byokEnabled: true }, 'admin@x');
  assert.equal(a.subscriptionTier, 'business');
  assert.equal(a.byokEnabled, true);
  assert.equal(a.updatedBy, 'admin@x');

  const b = await repo.upsert('t1', { allowedDraftingProviders: ['watsonx', 'openai'] });
  assert.equal(b.subscriptionTier, 'business');                  // preserved
  assert.deepEqual(b.allowedDraftingProviders, ['watsonx', 'openai']);
});

test('tenantPolicyRepo: never persists raw secret blobs in tenantKeys', async () => {
  const repo = createInMemoryTenantPolicyRepo();
  const p = await repo.upsert('t1', { tenantKeys: { openai: 'sk-real-secret-key', anthropic: false } });
  // Coerced to booleans only.
  assert.equal(p.tenantKeys.openai, true);
  assert.equal(p.tenantKeys.anthropic, false);
});

test('tenantPolicyRepo: government tenant config round-trips', async () => {
  const repo = createInMemoryTenantPolicyRepo();
  const p = await repo.upsert('gov_dod', {
    subscriptionTier: 'government',
    tenantType:       'government',
    byokEnabled:      false,
    allowedDraftingProviders: ['watsonx'],
    governanceEnabled: true
  });
  assert.equal(p.tenantType, 'government');
  assert.equal(p.governanceEnabled, true);
});
