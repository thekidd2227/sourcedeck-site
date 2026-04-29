import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { createAiGateway } from '../src/services/ai/gateway.js';
import { audit, EVENT_TYPES } from '../src/services/audit.js';

function withCapturedAudit(fn) {
  const events = [];
  const orig = audit.sink;
  audit.sink = (e) => events.push(e);
  return fn(events).finally(() => { audit.sink = orig; });
}

test('gateway: governed workflow uses watsonx (mock fallback in dev) and audits', async () => {
  await withCapturedAudit(async (events) => {
    const cfg = loadConfig({});
    const g = createAiGateway({ cfg });
    const r = await g.execute({
      tenantId: 't1', userId: 'u1', subscriptionTier: 'business',
      workflowType: 'document_summary',
      input: 'Sample contract.', requestId: 'req_1'
    });
    assert.equal(r.policy.decision, 'allowed');
    assert.equal(r.policy.credentialMode, 'platform_managed');
    assert.equal(r.providerId, 'mock');                              // fallback in dev when watsonx not configured
    const types = events.map(e => e.eventType);
    assert.ok(types.includes(EVENT_TYPES.AI_PROVIDER_SELECTED));
    assert.ok(types.includes(EVENT_TYPES.AI_REQUEST_CREATED));
    assert.ok(types.includes(EVENT_TYPES.AI_RESPONSE_RECEIVED));
  });
});

test('gateway: governed workflow + non-watsonx requested → forced_watsonx + GOVERNED_WORKFLOW_ENFORCED audited', async () => {
  await withCapturedAudit(async (events) => {
    const cfg = loadConfig({});
    const g = createAiGateway({ cfg });
    const r = await g.execute({
      tenantId: 't1', userId: 'u1', subscriptionTier: 'enterprise',
      workflowType: 'document_classification',
      requestedProvider: 'openai',
      tenantPolicy: { byokEnabled: true },
      userByok: { provider: 'openai', hasKey: true },                // even with key, governed forces watsonx
      input: 'Sample.', requestId: 'req_2'
    });
    assert.equal(r.policy.decision, 'forced_watsonx');
    const types = events.map(e => e.eventType);
    assert.ok(types.includes(EVENT_TYPES.GOVERNED_WORKFLOW_ENFORCED));
  });
});

test('gateway: government tenant + non-watsonx → policy_rejected error + audit', async () => {
  await withCapturedAudit(async (events) => {
    const cfg = loadConfig({});
    const g = createAiGateway({ cfg });
    await assert.rejects(
      () => g.execute({
        tenantId: 'gov', userId: 'u1', subscriptionTier: 'government',
        workflowType: 'email_draft', requestedProvider: 'openai',
        input: 'hi', requestId: 'req_3'
      }),
      (err) => err.code === 'policy_rejected'
    );
    const types = events.map(e => e.eventType);
    assert.ok(types.includes(EVENT_TYPES.GOVERNMENT_PROVIDER_RESTRICTED));
  });
});

test('gateway: drafting + missing BYOK provider key → falls back to watsonx + AI_PROVIDER_FALLBACK_USED', async () => {
  await withCapturedAudit(async (events) => {
    const cfg = loadConfig({});
    const g = createAiGateway({ cfg });
    const r = await g.execute({
      tenantId: 't1', userId: 'u1', subscriptionTier: 'business',
      workflowType: 'email_draft', requestedProvider: 'openai',
      tenantPolicy: { byokEnabled: true, allowedDraftingProviders: ['watsonx', 'openai'] },
      userByok: { provider: 'openai', hasKey: false },
      input: 'Draft a follow-up.', requestId: 'req_4'
    });
    assert.equal(r.providerId, 'mock');                              // mock = watsonx-fallback in dev
    const types = events.map(e => e.eventType);
    assert.ok(types.includes(EVENT_TYPES.AI_PROVIDER_FALLBACK_USED));
  });
});

test('gateway: production governed without watsonx config fails fast at config load (not execute)', () => {
  // The hard contract: production with AI_PROVIDER=watsonx and no
  // WATSONX_API_KEY must NOT silently fall back to mock. We enforce this
  // at config load time so the process never even reaches the gateway.
  assert.throws(
    () => loadConfig({
      APP_ENV: 'production',
      SESSION_SECRET: 'x'.repeat(32),
      JWT_SECRET:     'y'.repeat(32),
      AI_PROVIDER:    'watsonx'
    }),
    /AI_PROVIDER=watsonx but WATSONX_API_KEY missing/
  );
});

test('gateway: audit events never carry input text', async () => {
  await withCapturedAudit(async (events) => {
    const cfg = loadConfig({});
    const g = createAiGateway({ cfg });
    const SECRET_LIKE = 'sk-PLAIN-TEXT-DOCUMENT-CONTENTS-MUST-NOT-LEAK';
    await g.execute({
      tenantId: 't1', userId: 'u1', subscriptionTier: 'business',
      workflowType: 'document_summary', input: SECRET_LIKE, requestId: 'req_6'
    });
    const dump = JSON.stringify(events);
    assert.ok(!dump.includes(SECRET_LIKE), 'audit dump must not include input text');
  });
});
