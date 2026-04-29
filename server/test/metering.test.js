import test from 'node:test';
import assert from 'node:assert/strict';
import { preflight, record, UsageCapError, InputTooLargeError } from '../src/services/ai/metering.js';
import { getUsageRepo } from '../src/services/persistence/index.js';

async function reset() { await getUsageRepo().clear(); }

test('metering: starter tier under cap → preflight passes', async () => {
  await reset();
  await preflight({ tenantId: 't1', userId: 'u1', subscriptionTier: 'starter', input: 'hi', workflowType: 'document_summary' });
});

test('metering: starter exceeds 100/day → UsageCapError', async () => {
  await reset();
  // Force-prime the counter to the cap using the repo directly.
  for (let i = 0; i < 100; i++) {
    await record({ tenantId: 't_cap', userId: 'u1', workflowType: 'document_summary', taskType: 'summarize', providerId: 'mock', credentialMode: 'platform_managed' });
  }
  await assert.rejects(
    () => preflight({ tenantId: 't_cap', userId: 'u1', subscriptionTier: 'starter', input: 'x', workflowType: 'document_summary' }),
    (e) => e instanceof UsageCapError && e.meta.cap === 100
  );
});

test('metering: maxInputChars enforced per tier', async () => {
  await reset();
  const big = 'x'.repeat(20_001);              // starter cap is 20_000
  await assert.rejects(
    () => preflight({ tenantId: 't2', userId: 'u1', subscriptionTier: 'starter', input: big, workflowType: 'document_summary' }),
    (e) => e instanceof InputTooLargeError
  );
});

test('metering: pro tier allows higher input length than starter', async () => {
  await reset();
  const med = 'x'.repeat(20_001);
  await preflight({ tenantId: 't3', userId: 'u1', subscriptionTier: 'pro', input: med, workflowType: 'document_summary' });
});

test('metering: enterprise tier sustains higher request volume', async () => {
  await reset();
  for (let i = 0; i < 1_001; i++) {
    await record({ tenantId: 't_ent', userId: 'u1', workflowType: 'email_draft', taskType: 'generate', providerId: 'mock', credentialMode: 'platform_managed' });
  }
  // 1001 requests is well under enterprise's 100k/day cap → preflight ok.
  await preflight({ tenantId: 't_ent', userId: 'u1', subscriptionTier: 'enterprise', input: 'x', workflowType: 'email_draft' });
});

test('metering: government tier hard cap on input chars', async () => {
  await reset();
  // government tier sets maxInputChars=250_000; one over throws.
  const huge = 'x'.repeat(250_001);
  await assert.rejects(
    () => preflight({ tenantId: 't_gov', userId: 'u1', subscriptionTier: 'government', input: huge, workflowType: 'email_draft' }),
    (e) => e instanceof InputTooLargeError
  );
});
