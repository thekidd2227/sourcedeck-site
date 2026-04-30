import test from 'node:test';
import assert from 'node:assert/strict';
import { autoBindByokStore, hasExternalStore, unbindExternalStore, addByokKey } from '../src/services/ai/byok.js';

function withEnv(env, fn) {
  const orig = { ...process.env };
  Object.assign(process.env, env);
  try { return fn(); }
  finally {
    for (const k of Object.keys(env)) delete process.env[k];
    Object.assign(process.env, orig);
  }
}

test('byok.autoBind: no env → not bound, dev in-memory store remains', async () => {
  unbindExternalStore();
  const r = await autoBindByokStore({});
  assert.equal(r.bound, false);
  assert.equal(hasExternalStore(), false);
});

test('byok.autoBind: env present → binds IBM adapter', async () => {
  unbindExternalStore();
  const r = await autoBindByokStore({
    IBM_SECRETS_MANAGER_URL:    'https://example.invalid',
    IBM_SECRETS_MANAGER_API_KEY:'fake-but-valid-shape',
    IBM_SECRETS_MANAGER_INSTANCE_ID: 'inst-id'
  });
  assert.equal(r.bound, true);
  assert.equal(r.name, 'ibm_secrets_manager');
  assert.equal(hasExternalStore(), true);
  unbindExternalStore();
});

test('byok: in production w/o store and w/o override → addByokKey throws fast', async () => {
  unbindExternalStore();
  await withEnv({ APP_ENV: 'production' }, async () => {
    await assert.rejects(
      () => addByokKey({ tenantId: 't', userId: 'u', providerId: 'openai', apiKey: 'sk-very-long-xx', subscriptionTier: 'business' }),
      /in-memory store is dev-only/
    );
  });
});

test('byok: in production w/ ALLOW_IN_MEMORY_PROD=true → addByokKey allowed', async () => {
  unbindExternalStore();
  await withEnv({ APP_ENV: 'production', ALLOW_IN_MEMORY_PROD: 'true' }, async () => {
    const rec = await addByokKey({
      tenantId: 't', userId: 'u', providerId: 'openai',
      apiKey:  'sk-very-long-xx',
      subscriptionTier: 'business'
    });
    assert.equal(rec.providerId, 'openai');
    assert.match(rec.masked, /^sk-…/);
  });
});
