import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DEPLOYMENT_MODE,
  normalizeDeploymentMode,
  isManagedMode,
  canUseManagedIbmWatson,
  providerStatusFromCredential
} from '../src/deploymentMode.js';

test('deployment mode defaults to commercial', () => {
  assert.equal(DEFAULT_DEPLOYMENT_MODE, 'commercial');
  assert.equal(normalizeDeploymentMode(), 'commercial');
  assert.equal(normalizeDeploymentMode('personal'), 'personal');
  assert.equal(normalizeDeploymentMode('bad'), 'commercial');
});

test('managed modes are explicit', () => {
  assert.equal(isManagedMode('commercial'), false);
  assert.equal(isManagedMode('federal_managed'), true);
  assert.equal(isManagedMode('hyatt_managed'), true);
  assert.equal(isManagedMode('enterprise_managed'), true);
});

test('managed IBM Watson requires mode, tier, and entitlement', () => {
  assert.equal(canUseManagedIbmWatson({
    deploymentMode: 'commercial',
    userTier: 'federal',
    entitlements: { ibm_watson_managed: true }
  }), false);
  assert.equal(canUseManagedIbmWatson({
    deploymentMode: 'federal_managed',
    userTier: 'commercial',
    entitlements: { ibm_watson_managed: true }
  }), false);
  assert.equal(canUseManagedIbmWatson({
    deploymentMode: 'federal_managed',
    userTier: 'federal',
    entitlements: {}
  }), false);
  assert.equal(canUseManagedIbmWatson({
    deploymentMode: 'federal_managed',
    userTier: 'federal',
    entitlements: { ibm_watson_managed: true }
  }), true);
  assert.equal(canUseManagedIbmWatson({
    deploymentMode: 'hyatt_managed',
    userTier: 'hyatt_highest',
    entitlements: { ibm_watson_managed: true }
  }), true);
  assert.equal(canUseManagedIbmWatson({
    deploymentMode: 'enterprise_managed',
    userTier: 'enterprise_managed',
    entitlements: { ibm_watson_managed: true }
  }), true);
});

test('provider status exposes presence only', () => {
  assert.deepEqual(providerStatusFromCredential(null), { configured: false, last4: null });
  assert.deepEqual(providerStatusFromCredential({ configured: true, secret: 'DO_NOT_RETURN', last4: '1234' }), {
    configured: true,
    last4: '1234'
  });
});
