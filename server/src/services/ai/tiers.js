// server/src/services/ai/tiers.js
// Subscription-tier policy. This is config + policy, not billing — it
// declares what each tier is allowed to do with AI providers. Billing
// integration (Stripe etc.) maps tenants to tiers in a separate layer.

import { SUBSCRIPTION_TIERS, PROVIDER_IDS } from './types.js';

const T = SUBSCRIPTION_TIERS;
const P = PROVIDER_IDS;

/**
 * @typedef {object} TierPolicy
 * @property {string}  tier
 * @property {string}  defaultProvider
 * @property {boolean} byokEnabledByDefault
 * @property {boolean} byokAllowed
 * @property {string[]} allowedDraftingProviders
 * @property {boolean} governanceExports
 * @property {boolean} auditLogs
 * @property {boolean} adminProviderSettings
 * @property {boolean} ssoReady
 * @property {boolean} satelliteReady
 * @property {{requestsPerDay:number, maxInputChars:number}} usage
 */

/** @type {Record<string, TierPolicy>} */
export const TIER_POLICY = Object.freeze({
  [T.STARTER]: {
    tier: T.STARTER,
    defaultProvider: P.WATSONX,
    byokEnabledByDefault: false,
    byokAllowed: false,
    allowedDraftingProviders: [P.WATSONX],
    governanceExports: false,
    auditLogs: false,
    adminProviderSettings: false,
    ssoReady: false,
    satelliteReady: false,
    usage: { requestsPerDay: 100, maxInputChars: 20_000 }
  },
  [T.PRO]: {
    tier: T.PRO,
    defaultProvider: P.WATSONX,
    byokEnabledByDefault: false,
    byokAllowed: false,
    allowedDraftingProviders: [P.WATSONX],
    governanceExports: false,
    auditLogs: true,
    adminProviderSettings: false,
    ssoReady: false,
    satelliteReady: false,
    usage: { requestsPerDay: 1_000, maxInputChars: 60_000 }
  },
  [T.BUSINESS]: {
    tier: T.BUSINESS,
    defaultProvider: P.WATSONX,
    byokEnabledByDefault: false,
    byokAllowed: true,                                              // optional, admin-controlled
    allowedDraftingProviders: [P.WATSONX, P.OPENAI, P.ANTHROPIC],   // can be tightened by tenant
    governanceExports: false,
    auditLogs: true,
    adminProviderSettings: true,
    ssoReady: false,
    satelliteReady: false,
    usage: { requestsPerDay: 10_000, maxInputChars: 120_000 }
  },
  [T.ENTERPRISE]: {
    tier: T.ENTERPRISE,
    defaultProvider: P.WATSONX,
    byokEnabledByDefault: false,
    byokAllowed: true,
    allowedDraftingProviders: [P.WATSONX, P.OPENAI, P.ANTHROPIC, P.GOOGLE],
    governanceExports: true,
    auditLogs: true,
    adminProviderSettings: true,
    ssoReady: true,
    satelliteReady: true,
    usage: { requestsPerDay: 100_000, maxInputChars: 250_000 }
  },
  [T.GOVERNMENT]: {
    tier: T.GOVERNMENT,
    defaultProvider: P.WATSONX,
    byokEnabledByDefault: false,
    byokAllowed: false,                                             // hard rule
    allowedDraftingProviders: [P.WATSONX],
    governanceExports: true,
    auditLogs: true,
    adminProviderSettings: false,
    ssoReady: true,
    satelliteReady: true,
    usage: { requestsPerDay: 100_000, maxInputChars: 250_000 }
  }
});

export function getTierPolicy(tier) {
  return TIER_POLICY[tier] || TIER_POLICY[T.STARTER];
}
