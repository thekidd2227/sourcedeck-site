// server/src/services/ai/policy.js
// Provider-selection policy engine.
//
// Rules in order of precedence:
//   1. Government tenant → watsonx only, always.
//   2. Governed workflow → watsonx only; reject or force-watsonx based on caller intent.
//   3. User drafting   → BYOK > tenant-managed > platform watsonx, gated by tier + tenant policy.
//   4. Enterprise-configurable → tenant admin policy decides; falls through to (2)/(3) per workflow category.
//   5. Unknown workflow → treated as governed.

import { PROVIDER_IDS, WORKFLOW_CATEGORIES, CREDENTIAL_MODES } from './types.js';
import { resolveWorkflow } from './workflows.js';
import { getTierPolicy } from './tiers.js';

const P  = PROVIDER_IDS;
const WC = WORKFLOW_CATEGORIES;
const CM = CREDENTIAL_MODES;

/**
 * Decide which provider + credential mode should serve a request.
 *
 * @param {object} args
 * @param {string} args.workflowType
 * @param {string} args.tenantId
 * @param {string} [args.requestedProvider]
 * @param {object} args.tenantPolicy            - per-tenant overrides
 * @param {object} args.userByok                - { provider, hasKey } if a key is registered
 * @param {string} args.subscriptionTier
 * @returns {object} decision
 */
export function decideProvider(args) {
  const wf   = resolveWorkflow(args.workflowType);
  const tier = getTierPolicy(args.subscriptionTier);
  const tp   = args.tenantPolicy || {};
  const requested = args.requestedProvider || null;

  const base = {
    workflowType:     wf.workflowType,
    workflowCategory: wf.category,
    tier:             tier.tier,
    requestedProvider: requested,
    selectedProvider:  null,
    credentialMode:    null,
    decision:          null,                      // 'allowed' | 'forced_watsonx' | 'rejected' | 'fallback'
    reason:            null,
    riskFlags:         []
  };

  // Rule 1 — government tenant.
  if (tier.tier === 'government') {
    if (requested && requested !== P.WATSONX) {
      base.riskFlags.push('cross_tenant_attempt'); // misnamed historically; see riskFlags vocab — keep generic
      return done(base, {
        selectedProvider: P.WATSONX,
        credentialMode:   CM.PLATFORM_MANAGED,
        decision:         'rejected',
        reason:           'government_tenant_watsonx_only'
      });
    }
    return done(base, {
      selectedProvider: P.WATSONX,
      credentialMode:   CM.PLATFORM_MANAGED,
      decision:         'allowed',
      reason:           'government_tenant'
    });
  }

  // Rule 2 — governed (or unknown) workflow → watsonx only.
  if (wf.category === WC.GOVERNED || wf.unknown) {
    if (requested && requested !== P.WATSONX) {
      return done(base, {
        selectedProvider: P.WATSONX,
        credentialMode:   CM.PLATFORM_MANAGED,
        decision:         'forced_watsonx',
        reason:           wf.unknown ? 'unknown_workflow_default_governed' : 'governed_workflow_watsonx_only'
      });
    }
    return done(base, {
      selectedProvider: P.WATSONX,
      credentialMode:   CM.PLATFORM_MANAGED,
      decision:         'allowed',
      reason:           'governed_workflow'
    });
  }

  // Rule 3 — user drafting.
  if (wf.category === WC.USER_DRAFTING) {
    // Effective allow-list: intersection of tier + tenant overrides.
    const tenantAllow = tp.allowedDraftingProviders || tier.allowedDraftingProviders;
    const allowList   = tier.allowedDraftingProviders.filter(p => tenantAllow.includes(p));
    const byokOn      = !!(tp.byokEnabled ?? tier.byokEnabledByDefault) && tier.byokAllowed;

    // 3a — caller asked for BYOK explicitly:
    if (byokOn && args.userByok?.hasKey) {
      const byokProvider = args.userByok.provider;
      if (allowList.includes(byokProvider) && (!requested || requested === byokProvider)) {
        return done(base, {
          selectedProvider: byokProvider,
          credentialMode:   CM.USER_BYOK,
          decision:         'allowed',
          reason:           'byok_user_drafting'
        });
      }
    }

    // 3b — explicit non-watsonx requested:
    if (requested && requested !== P.WATSONX) {
      if (!allowList.includes(requested)) {
        return done(base, {
          selectedProvider: P.WATSONX,
          credentialMode:   CM.PLATFORM_MANAGED,
          decision:         'fallback',
          reason:           'requested_provider_not_allowed_for_tier'
        });
      }
      // Tenant-managed key for that provider:
      if (tp.tenantKeys?.[requested]) {
        return done(base, {
          selectedProvider: requested,
          credentialMode:   CM.TENANT_MANAGED,
          decision:         'allowed',
          reason:           'tenant_managed_key'
        });
      }
      // No tenant key, no user BYOK → fall back to watsonx.
      return done(base, {
        selectedProvider: P.WATSONX,
        credentialMode:   CM.PLATFORM_MANAGED,
        decision:         'fallback',
        reason:           'no_credential_for_requested_provider'
      });
    }

    // 3c — default for drafting is watsonx unless tenant pinned a different default.
    const tenantDefault = tp.defaultDraftingProvider || P.WATSONX;
    if (tenantDefault !== P.WATSONX && allowList.includes(tenantDefault) && tp.tenantKeys?.[tenantDefault]) {
      return done(base, {
        selectedProvider: tenantDefault,
        credentialMode:   CM.TENANT_MANAGED,
        decision:         'allowed',
        reason:           'tenant_default_drafting_provider'
      });
    }
    return done(base, {
      selectedProvider: P.WATSONX,
      credentialMode:   CM.PLATFORM_MANAGED,
      decision:         'allowed',
      reason:           'drafting_default_watsonx'
    });
  }

  // Rule 4 — enterprise-configurable falls through to whatever the tenant
  // policy explicitly says, but governed sub-actions are still locked.
  if (wf.category === WC.ENTERPRISE_CONFIGURABLE) {
    if (tp.enterpriseDefaultProvider && tp.tenantKeys?.[tp.enterpriseDefaultProvider]) {
      return done(base, {
        selectedProvider: tp.enterpriseDefaultProvider,
        credentialMode:   CM.TENANT_MANAGED,
        decision:         'allowed',
        reason:           'enterprise_admin_policy'
      });
    }
    return done(base, {
      selectedProvider: P.WATSONX,
      credentialMode:   CM.PLATFORM_MANAGED,
      decision:         'allowed',
      reason:           'enterprise_default_watsonx'
    });
  }

  // Catchall: governed.
  return done(base, {
    selectedProvider: P.WATSONX,
    credentialMode:   CM.PLATFORM_MANAGED,
    decision:         'forced_watsonx',
    reason:           'catchall_governed'
  });
}

function done(base, patch) {
  return { ...base, ...patch };
}

/** Allowed-providers helper for the UI / API. */
export function listAllowedProviders({ workflowType, subscriptionTier, tenantPolicy }) {
  const wf   = resolveWorkflow(workflowType);
  const tier = getTierPolicy(subscriptionTier);
  if (tier.tier === 'government')                              return [P.WATSONX];
  if (wf.category === WC.GOVERNED || wf.unknown)               return [P.WATSONX];
  const tenantAllow = tenantPolicy?.allowedDraftingProviders || tier.allowedDraftingProviders;
  return tier.allowedDraftingProviders.filter(p => tenantAllow.includes(p));
}
