import test from 'node:test';
import assert from 'node:assert/strict';
import { decideProvider, listAllowedProviders } from '../src/services/ai/policy.js';

const baseTier = (t) => ({ subscriptionTier: t });

test('policy: default is watsonx for governed workflow', () => {
  const d = decideProvider({ workflowType: 'document_summary', ...baseTier('starter') });
  assert.equal(d.selectedProvider, 'watsonx');
  assert.equal(d.credentialMode, 'platform_managed');
  assert.equal(d.decision, 'allowed');
});

test('policy: governed workflow forces watsonx when other provider requested', () => {
  const d = decideProvider({
    workflowType: 'document_summary', requestedProvider: 'openai', ...baseTier('business')
  });
  assert.equal(d.selectedProvider, 'watsonx');
  assert.equal(d.decision, 'forced_watsonx');
  assert.equal(d.reason, 'governed_workflow_watsonx_only');
});

test('policy: government tenant rejects non-watsonx', () => {
  const d = decideProvider({
    workflowType: 'email_draft', requestedProvider: 'openai', ...baseTier('government')
  });
  assert.equal(d.decision, 'rejected');
  assert.equal(d.selectedProvider, 'watsonx');
});

test('policy: government tenant allows watsonx for drafting', () => {
  const d = decideProvider({ workflowType: 'email_draft', requestedProvider: 'watsonx', ...baseTier('government') });
  assert.equal(d.decision, 'allowed');
});

test('policy: unknown workflow defaults to governed/watsonx', () => {
  const d = decideProvider({ workflowType: 'invented_workflow_xyz', requestedProvider: 'openai', ...baseTier('enterprise') });
  assert.equal(d.selectedProvider, 'watsonx');
  assert.equal(d.decision, 'forced_watsonx');
  assert.equal(d.reason, 'unknown_workflow_default_governed');
});

test('policy: drafting allows BYOK when tier+tenant permit and key exists', () => {
  const d = decideProvider({
    workflowType: 'email_draft', requestedProvider: 'openai',
    tenantPolicy: { byokEnabled: true, allowedDraftingProviders: ['watsonx', 'openai'] },
    userByok: { provider: 'openai', hasKey: true },
    ...baseTier('business')
  });
  assert.equal(d.selectedProvider, 'openai');
  assert.equal(d.credentialMode, 'user_byok');
  assert.equal(d.decision, 'allowed');
});

test('policy: drafting + BYOK disabled by tier (starter) → never user_byok', () => {
  const d = decideProvider({
    workflowType: 'email_draft', requestedProvider: 'openai',
    tenantPolicy: { byokEnabled: true },
    userByok: { provider: 'openai', hasKey: true },
    ...baseTier('starter')
  });
  assert.notEqual(d.credentialMode, 'user_byok');
});

test('policy: drafting + missing BYOK key → falls back to watsonx', () => {
  const d = decideProvider({
    workflowType: 'email_draft', requestedProvider: 'openai',
    tenantPolicy: { byokEnabled: true, allowedDraftingProviders: ['watsonx', 'openai'] },
    userByok: { provider: 'openai', hasKey: false },
    ...baseTier('business')
  });
  assert.equal(d.selectedProvider, 'watsonx');
  assert.equal(d.decision, 'fallback');
});

test('policy: drafting + requested provider not in tier allowlist → falls back', () => {
  const d = decideProvider({
    workflowType: 'email_draft', requestedProvider: 'google',
    tenantPolicy: { allowedDraftingProviders: ['watsonx'] },
    ...baseTier('business')
  });
  assert.equal(d.selectedProvider, 'watsonx');
  assert.equal(d.decision, 'fallback');
  assert.equal(d.reason, 'requested_provider_not_allowed_for_tier');
});

test('policy: BYOK is never used for governed workflows even if key exists', () => {
  const d = decideProvider({
    workflowType: 'document_classification', requestedProvider: 'anthropic',
    tenantPolicy: { byokEnabled: true, allowedDraftingProviders: ['watsonx', 'anthropic'] },
    userByok: { provider: 'anthropic', hasKey: true },
    ...baseTier('enterprise')
  });
  assert.equal(d.selectedProvider, 'watsonx');
  assert.equal(d.credentialMode, 'platform_managed');
  assert.equal(d.decision, 'forced_watsonx');
});

test('policy.allowed: governed workflow lists only watsonx', () => {
  assert.deepEqual(
    listAllowedProviders({ workflowType: 'document_summary', subscriptionTier: 'enterprise' }),
    ['watsonx']
  );
});

test('policy.allowed: drafting on government → only watsonx', () => {
  assert.deepEqual(
    listAllowedProviders({ workflowType: 'email_draft', subscriptionTier: 'government' }),
    ['watsonx']
  );
});

test('policy.allowed: drafting on enterprise → full allowlist', () => {
  const allowed = listAllowedProviders({ workflowType: 'email_draft', subscriptionTier: 'enterprise' });
  assert.ok(allowed.includes('watsonx'));
  assert.ok(allowed.includes('openai'));
  assert.ok(allowed.includes('anthropic'));
  assert.ok(allowed.includes('google'));
});

test('policy.allowed: drafting on starter → only watsonx (no BYOK eligibility)', () => {
  assert.deepEqual(
    listAllowedProviders({ workflowType: 'email_draft', subscriptionTier: 'starter' }),
    ['watsonx']
  );
});
