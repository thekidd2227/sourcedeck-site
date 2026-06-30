// server/test/solicitation-wiring.test.js
// Step 2 — feature-flag + production-dependency guard tests.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  planSolicitationMount, isSolicitationEnabled, checkSolicitationDependencies,
  resolveSolicitationStore, bindSolicitationStore, _resetSolicitationStore
} from '../src/services/solicitation/wiring.js';

afterEach(() => _resetSolicitationStore());

const devCfg  = { isProduction: false, storage: { provider: 'local' }, auth: { provider: 'local' } };
const prodCfg = (over = {}) => ({
  isProduction: true,
  storage: { provider: 'ibm_cos', ibmCos: { bucket: 'b' } },
  auth: { provider: 'oidc' },
  ...over
});
const persistentStore = { name: 'pg', isInMemory: false };
const fullProdEnv = {
  APP_ENV: 'production', SOLICITATION_WORKSPACE_ENABLED: 'true',
  DATABASE_URL: 'postgres://x', SOLICITATION_WORKER: 'pg'
};

test('undefined flag → route not mounted', () => {
  assert.equal(isSolicitationEnabled({}), false);
  assert.equal(planSolicitationMount(devCfg, {}).mount, false);
});

test('flag "false" → route not mounted', () => {
  assert.equal(planSolicitationMount(devCfg, { SOLICITATION_WORKSPACE_ENABLED: 'false' }).mount, false);
});

test('flag "true" in dev → mounted with in-memory store', () => {
  const plan = planSolicitationMount(devCfg, { SOLICITATION_WORKSPACE_ENABLED: 'true' });
  assert.equal(plan.mount, true);
  assert.ok(plan.store && plan.store.isInMemory, 'dev uses in-memory store');
});

test('flag "true" in production with missing deps → startup throws', () => {
  assert.throws(
    () => planSolicitationMount(prodCfg(), { APP_ENV: 'production', SOLICITATION_WORKSPACE_ENABLED: 'true' }),
    /missing mandatory dependencies/
  );
});

test('production dependency check enumerates each missing dependency', () => {
  const { ok, missing } = checkSolicitationDependencies(
    { isProduction: true, storage: { provider: 'local' }, auth: { provider: 'local' } },
    { APP_ENV: 'production' }
  );
  assert.equal(ok, false);
  assert.ok(missing.some(m => m.startsWith('persistent_repository')));
  assert.ok(missing.some(m => m.startsWith('object_storage')));
  assert.ok(missing.some(m => m.startsWith('authentication')));
  assert.ok(missing.some(m => m.startsWith('durable_worker')));
});

test('flag "true" in production WITH all deps + persistent adapter → mounted', () => {
  bindSolicitationStore(persistentStore);
  const plan = planSolicitationMount(prodCfg(), fullProdEnv);
  assert.equal(plan.mount, true);
  assert.equal(plan.store.isInMemory, false, 'production uses the persistent adapter');
});

test('production refuses in-memory persistence even if bound', () => {
  bindSolicitationStore({ name: 'mem', isInMemory: true });
  const { ok, missing } = checkSolicitationDependencies(prodCfg(), fullProdEnv);
  assert.equal(ok, false);
  assert.ok(missing.some(m => m.includes('in-memory adapter not allowed')));
});

test('resolveSolicitationStore throws in production without a persistent adapter', () => {
  assert.throws(() => resolveSolicitationStore(prodCfg(), { APP_ENV: 'production' }),
    /refusing to use in-memory store in production/);
});

test('ALLOW_DEV_HEADERS_PROD disqualifies production mounting', () => {
  bindSolicitationStore(persistentStore);
  const { ok, missing } = checkSolicitationDependencies(prodCfg(),
    { ...fullProdEnv, ALLOW_DEV_HEADERS_PROD: 'true' });
  assert.equal(ok, false);
  assert.ok(missing.some(m => m.startsWith('tenant_enforcement')));
});
