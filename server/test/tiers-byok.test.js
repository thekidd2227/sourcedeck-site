import test from 'node:test';
import assert from 'node:assert/strict';
import { getTierPolicy } from '../src/services/ai/tiers.js';
import { addByokKey, removeByokKey, hasByokKey, listByokKeys } from '../src/services/ai/byok.js';

test('tiers: starter — no BYOK, watsonx default, lowest limits', () => {
  const t = getTierPolicy('starter');
  assert.equal(t.defaultProvider, 'watsonx');
  assert.equal(t.byokAllowed, false);
  assert.equal(t.byokEnabledByDefault, false);
});

test('tiers: business — BYOK allowed but disabled by default', () => {
  const t = getTierPolicy('business');
  assert.equal(t.byokAllowed, true);
  assert.equal(t.byokEnabledByDefault, false);
});

test('tiers: government — strict watsonx-only, no BYOK ever', () => {
  const t = getTierPolicy('government');
  assert.equal(t.byokAllowed, false);
  assert.deepEqual(t.allowedDraftingProviders, ['watsonx']);
});

test('tiers: enterprise has SSO + Satellite readiness flags', () => {
  const t = getTierPolicy('enterprise');
  assert.equal(t.ssoReady, true);
  assert.equal(t.satelliteReady, true);
  assert.equal(t.governanceExports, true);
});

test('tiers: unknown tier defaults to starter', () => {
  const t = getTierPolicy('lol');
  assert.equal(t.tier, 'starter');
});

test('byok: rejects when tier disallows', async () => {
  await assert.rejects(
    () => addByokKey({ tenantId: 't', userId: 'u', providerId: 'openai', apiKey: 'sk-real-key', subscriptionTier: 'starter' }),
    /tier does not permit BYOK/
  );
});

test('byok: rejects watsonx as a BYOK provider', async () => {
  await assert.rejects(
    () => addByokKey({ tenantId: 't', userId: 'u', providerId: 'watsonx', apiKey: 'k', subscriptionTier: 'business' }),
    /not eligible for BYOK/
  );
});

test('byok: rejects empty / short keys', async () => {
  await assert.rejects(
    () => addByokKey({ tenantId: 't', userId: 'u', providerId: 'openai', apiKey: 'x', subscriptionTier: 'business' }),
    /invalid api key/
  );
});

test('byok: add/list/has/remove flow returns masked record', async () => {
  const r = await addByokKey({
    tenantId: 't1', userId: 'u1', providerId: 'openai',
    apiKey: 'sk-very-long-secret-value', subscriptionTier: 'business'
  });
  assert.match(r.masked, /^sk-…lue$|^sk-…/);
  assert.equal(r.providerId, 'openai');
  assert.ok(!('apiKey' in r));
  assert.ok(!('_raw'   in r));

  assert.equal(await hasByokKey({ tenantId: 't1', userId: 'u1', providerId: 'openai' }), true);
  const list = await listByokKeys({ tenantId: 't1', userId: 'u1' });
  assert.equal(list.length, 1);
  assert.ok(!('apiKey' in list[0]) && !('_raw' in list[0]));

  await removeByokKey({ tenantId: 't1', userId: 'u1', providerId: 'openai' });
  assert.equal(await hasByokKey({ tenantId: 't1', userId: 'u1', providerId: 'openai' }), false);
});
