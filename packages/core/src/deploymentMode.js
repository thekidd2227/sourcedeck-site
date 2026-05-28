export const DEPLOYMENT_MODES = Object.freeze([
  'personal',
  'commercial',
  'federal_managed',
  'hyatt_managed',
  'enterprise_managed'
]);

export const DEFAULT_DEPLOYMENT_MODE = 'commercial';

const MANAGED_MODES = new Set(['federal_managed', 'hyatt_managed', 'enterprise_managed']);
const MANAGED_IBM_TIERS = new Set(['federal', 'hyatt_highest', 'enterprise_managed']);

export function normalizeDeploymentMode(value) {
  const mode = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return DEPLOYMENT_MODES.includes(mode) ? mode : DEFAULT_DEPLOYMENT_MODE;
}

export function isManagedMode(value) {
  return MANAGED_MODES.has(normalizeDeploymentMode(value));
}

export function canUseManagedIbmWatson(input = {}) {
  const deploymentMode = normalizeDeploymentMode(input.deploymentMode);
  const userTier = typeof input.userTier === 'string' ? input.userTier.trim().toLowerCase() : '';
  const entitlements = input.entitlements && typeof input.entitlements === 'object'
    ? input.entitlements
    : {};

  return MANAGED_MODES.has(deploymentMode) &&
    MANAGED_IBM_TIERS.has(userTier) &&
    entitlements.ibm_watson_managed === true;
}

export function providerStatusFromCredential(record) {
  if (!record || typeof record !== 'object' || !record.configured) {
    return { configured: false, last4: null };
  }
  const last4 = typeof record.last4 === 'string' && record.last4.length <= 4
    ? record.last4
    : null;
  return { configured: true, last4 };
}
