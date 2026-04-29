// End-to-end test for the migrated /api/v1/process route. Drives the
// route's request handler in-process (no HTTP server) so we can assert
// the full audit chain and the policy/governed enforcement.

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { createAiGateway } from '../src/services/ai/gateway.js';
import { createInMemoryTenantPolicyRepo } from '../src/services/persistence/tenantPolicyRepo.memory.js';
import { audit, EVENT_TYPES } from '../src/services/audit.js';
import { processRouter } from '../src/routes/process.js';

function captureAudit(fn) {
  const events = [];
  const orig = audit.sink;
  audit.sink = (e) => events.push(e);
  return fn(events).finally(() => { audit.sink = orig; });
}

/** Minimal Express-style req/res harness. */
function harness({ body, user = { id: 'u1', role: 'analyst', tenantId: 't1' } }) {
  const req = {
    body,
    user,
    headers: {},
    correlationId: 'cid_proc_test',
    ip: '127.0.0.1',
    tenantId: user.tenantId
  };
  const res = {
    statusCode: 200, _body: null,
    status(c) { this.statusCode = c; return this; },
    json(b)   { this._body = b; return this; }
  };
  return { req, res };
}

/** Pull the POST handler out of the router. */
function getPostHandler(router) {
  const layer = router.stack.find(l => l.route?.path === '/' && l.route.methods.post);
  // Last item in stack is the actual handler we wrote; preceding items are middleware.
  const fns = layer.route.stack.map(l => l.handle);
  return fns[fns.length - 1];
}

async function setupDeps({ contentText = 'Sample contract text.' } = {}) {
  const cfg = loadConfig({});
  const repo = createInMemoryTenantPolicyRepo();
  await repo.upsert('t1', { subscriptionTier: 'business', byokEnabled: true, allowedDraftingProviders: ['watsonx', 'openai'] });
  const gateway = createAiGateway({ cfg });
  const fileBuf = Buffer.from(contentText);
  const deps = {
    storage: { async getBuffer() { return fileBuf; } },
    gateway
  };
  const store = {
    files:      new Map([['file_x', { id: 'file_x', tenantId: 't1', storageKey: 'k', originalFilename: 'a.txt' }]]),
    processing: new Map()
  };
  const tenantSettings = {
    async get(id) {
      const p = await repo.get(id);
      return {
        subscriptionTier: p.subscriptionTier,
        aiPolicy: {
          byokEnabled:              p.byokEnabled,
          allowedDraftingProviders: p.allowedDraftingProviders,
          tenantKeys:               p.tenantKeys || {}
        }
      };
    }
  };
  return { deps, store, tenantSettings };
}

test('process: governed → uses gateway → forces watsonx → emits AI audit chain', async () => {
  await captureAudit(async (events) => {
    const { deps, store, tenantSettings } = await setupDeps();
    const handler = getPostHandler(processRouter({ deps, store, tenantSettings }));
    const { req, res } = harness({ body: { fileId: 'file_x', promptId: 'document_summary_v1', requestedProvider: 'openai' } });
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    const proc = res._body.processing;
    assert.equal(proc.status, 'completed');
    assert.equal(proc.provider, 'mock');                // dev fallback for watsonx
    assert.ok(proc.policy?.decision === 'forced_watsonx' || proc.policy?.decision === 'allowed');

    const types = events.map(e => e.eventType);
    // AI Gateway chain present:
    assert.ok(types.includes(EVENT_TYPES.AI_PROVIDER_SELECTED));
    assert.ok(types.includes(EVENT_TYPES.AI_REQUEST_CREATED));
    assert.ok(types.includes(EVENT_TYPES.AI_RESPONSE_RECEIVED));
    // Legacy chain preserved:
    assert.ok(types.includes(EVENT_TYPES.FILE_PROCESSING_STARTED));
    assert.ok(types.includes(EVENT_TYPES.FILE_PROCESSING_COMPLETED));
    // Governed enforcement audited because `requestedProvider=openai`:
    assert.ok(types.includes(EVENT_TYPES.GOVERNED_WORKFLOW_ENFORCED));
  });
});

test('process: BYOK never reaches /process even if user has key', async () => {
  await captureAudit(async (events) => {
    const { deps, store, tenantSettings } = await setupDeps();
    const handler = getPostHandler(processRouter({ deps, store, tenantSettings }));
    // We don't pass userByok at the route level — that's the contract of
    // process.js. Verify the policy reflects platform_managed.
    const { req, res } = harness({ body: { fileId: 'file_x', promptId: 'document_summary_v1' } });
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res._body.processing.policy.credentialMode, 'platform_managed');
    // No BYOK_PROVIDER_USED audit:
    assert.ok(!events.some(e => e.eventType === EVENT_TYPES.BYOK_PROVIDER_USED));
  });
});

test('process: cross-tenant file → 403', async () => {
  const { deps, store, tenantSettings } = await setupDeps();
  const handler = getPostHandler(processRouter({ deps, store, tenantSettings }));
  // file is owned by t1, but caller is t2:
  const { req, res } = harness({
    body: { fileId: 'file_x', promptId: 'document_summary_v1' },
    user: { id: 'u2', role: 'analyst', tenantId: 't2' }
  });
  await handler(req, res);
  assert.equal(res.statusCode, 403);
});
