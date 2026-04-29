// server/src/services/ai/gateway.js
// SourceDeck AI Gateway — the only entry point for AI execution.
//
// Responsibilities:
//   1. Resolve workflow + tier policy (policy.js).
//   2. Pick provider + credential mode.
//   3. Lazily build the chosen provider with the right credentials.
//   4. Execute, audit (with redaction), and return a normalized response.
//   5. Fall back safely (governed → watsonx; drafting → watsonx) when
//      provider credentials are missing in non-prod.
//
// Hard rules (also enforced upstream by policy.js, kept here as belt-
// and-suspenders):
//   - governed workflows never use BYOK
//   - government-tenant requests never use a non-watsonx provider
//   - failures during a governed call in production throw — no silent
//     mock fallback

import { recordAuditEvent, EVENT_TYPES } from '../audit.js';
import { decideProvider, listAllowedProviders } from './policy.js';
import { resolveWorkflow } from './workflows.js';
import { fetchByokKey } from './byok.js';
import { PROVIDER_IDS, CREDENTIAL_MODES } from './types.js';
import { createWatsonxProvider } from './watsonx.js';
import { createMockProvider }    from './mock.js';
import { createOpenaiProvider }  from './openai.js';
import { createAnthropicProvider } from './anthropic.js';
import { createGoogleProvider }    from './google.js';
import { createCustomProvider }    from './custom.js';
import { log } from '../../logger.js';

const P  = PROVIDER_IDS;
const CM = CREDENTIAL_MODES;

export function createAiGateway({ cfg }) {

  /** Lazy provider builder. Returns the configured adapter or null. */
  async function buildProvider({ providerId, credentialMode, tenantId, userId }) {
    if (providerId === P.WATSONX) {
      try { return createWatsonxProvider(cfg.ai.watsonx); }
      catch (err) {
        // In dev/test we permit a mock fallback. In production the gateway
        // surfaces this as a hard failure for governed workflows.
        if (cfg.isProduction) throw err;
        log.warn('gateway.watsonx_unavailable_fallback_mock', { reason: err.message });
        return createMockProvider();
      }
    }

    if (providerId === P.MOCK) return createMockProvider();

    // BYOK / tenant-managed providers — pick the right key source.
    let apiKey;
    if (credentialMode === CM.USER_BYOK) {
      apiKey = await fetchByokKey({ tenantId, userId, providerId });
    } else if (credentialMode === CM.TENANT_MANAGED) {
      apiKey = cfg.ai.tenantKeys?.[providerId] || null;   // wired by ops
    } else if (credentialMode === CM.PLATFORM_MANAGED) {
      apiKey = cfg.ai[providerId]?.apiKey || process.env[`${providerId.toUpperCase()}_API_KEY`] || null;
    }
    if (!apiKey && providerId !== P.CUSTOM) return null;

    switch (providerId) {
      case P.OPENAI:    return createOpenaiProvider({ apiKey });
      case P.ANTHROPIC: return createAnthropicProvider({ apiKey });
      case P.GOOGLE:    return createGoogleProvider({ apiKey });
      case P.CUSTOM:    return createCustomProvider({ apiKey, endpoint: cfg.ai.custom?.endpoint });
      default:          return null;
    }
  }

  /**
   * Execute an AI request through the gateway.
   * @param {object} req - AiRequest (see types.js)
   * @returns {Promise<object>} AiResponse
   */
  async function execute(req) {
    const wf = resolveWorkflow(req.workflowType);
    const decision = decideProvider({
      workflowType:      req.workflowType,
      tenantId:          req.tenantId,
      requestedProvider: req.requestedProvider,
      tenantPolicy:      req.tenantPolicy || {},
      userByok:          req.userByok || null,
      subscriptionTier:  req.subscriptionTier
    });

    // Audit: provider selection
    const auditCommon = {
      tenantId:      req.tenantId,
      userId:        req.userId,
      correlationId: req.requestId,
      metadata: {
        workflowType:     wf.workflowType,
        workflowCategory: wf.category,
        requestedProvider: decision.requestedProvider || null,
        selectedProvider:  decision.selectedProvider,
        credentialMode:    decision.credentialMode,
        policyDecision:    decision.decision,
        policyReason:      decision.reason,
        subscriptionTier:  req.subscriptionTier
      }
    };
    recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.AI_PROVIDER_SELECTED, status: 'ok' });

    // Government-tenant rejection → audit + throw a structured error.
    if (decision.decision === 'rejected') {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.GOVERNMENT_PROVIDER_RESTRICTED, status: 'denied' });
      const err = new Error('ai_gateway: provider rejected by policy');
      err.code = 'policy_rejected';
      err.policy = decision;
      throw err;
    }

    if (decision.decision === 'forced_watsonx') {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.GOVERNED_WORKFLOW_ENFORCED, status: 'ok' });
    }
    if (decision.decision === 'fallback') {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.AI_PROVIDER_FALLBACK_USED, status: 'ok' });
    }

    // Build the provider. If it fails to build for a governed workflow in
    // production, this throws — exactly the contract.
    let provider = await buildProvider({
      providerId:     decision.selectedProvider,
      credentialMode: decision.credentialMode,
      tenantId:       req.tenantId,
      userId:         req.userId
    });

    // Drafting + selected non-watsonx + missing credentials → fall back to watsonx.
    if (!provider && decision.selectedProvider !== P.WATSONX) {
      log.warn('gateway.provider_unavailable_falling_back', { providerId: decision.selectedProvider });
      provider = await buildProvider({ providerId: P.WATSONX, credentialMode: CM.PLATFORM_MANAGED });
      decision.selectedProvider = P.WATSONX;
      decision.credentialMode   = CM.PLATFORM_MANAGED;
      decision.decision         = 'fallback';
      decision.reason           = decision.reason + '+credential_unavailable';
      recordAuditEvent({ ...auditCommon,
        type: EVENT_TYPES.AI_PROVIDER_FALLBACK_USED,
        status: 'ok',
        metadata: { ...auditCommon.metadata, selectedProvider: P.WATSONX, credentialMode: CM.PLATFORM_MANAGED, policyDecision: 'fallback' }
      });
    }

    if (!provider) {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.AI_REQUEST_FAILED, status: 'error',
        metadata: { ...auditCommon.metadata, reason: 'provider_unavailable' } });
      const err = new Error('ai_gateway: no provider available');
      err.code = 'provider_unavailable';
      throw err;
    }

    // Defense-in-depth: provider must declare it supports this category.
    if (!provider.supportsWorkflow(wf.category)) {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.AI_PROVIDER_REJECTED_BY_POLICY, status: 'denied',
        metadata: { ...auditCommon.metadata, reason: 'provider_does_not_support_category' } });
      const err = new Error('ai_gateway: provider does not support this workflow category');
      err.code = 'provider_unsupported_category';
      throw err;
    }

    if (decision.credentialMode === CM.USER_BYOK) {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.BYOK_PROVIDER_USED, status: 'ok' });
    }

    recordAuditEvent({
      ...auditCommon,
      type: EVENT_TYPES.AI_REQUEST_CREATED,
      status: 'pending',
      modelId: provider.modelId,
      promptVersion: undefined
    });

    const t0 = Date.now();
    let result;
    try {
      result = await provider.invoke({
        promptId:   req.promptId || wf.defaultPromptId,
        content:    req.input,
        parameters: req.parameters || {}
      });
    } catch (err) {
      recordAuditEvent({ ...auditCommon, type: EVENT_TYPES.AI_REQUEST_FAILED, status: 'error',
        modelId: provider.modelId, metadata: { ...auditCommon.metadata, reason: err.message } });
      throw err;
    }

    recordAuditEvent({
      ...auditCommon,
      type: EVENT_TYPES.AI_RESPONSE_RECEIVED,
      status: 'ok',
      modelId: result.modelId,
      promptVersion: result.promptVersion,
      metadata: { ...auditCommon.metadata, latencyMs: result.latencyMs, usage: result.usage }
    });

    return {
      providerId:    result.provider,
      modelId:       result.modelId,
      promptId:      result.promptId,
      promptVersion: result.promptVersion,
      output:        result.output,
      usage:         result.usage,
      latencyMs:     Date.now() - t0,
      status:        'ok',
      requestId:     req.requestId,
      createdAt:     new Date().toISOString(),
      policy: {
        decision:        decision.decision,
        reason:          decision.reason,
        credentialMode:  decision.credentialMode,
        requestedProvider: decision.requestedProvider
      }
    };
  }

  return {
    execute,
    decide:  decideProvider,
    allowed: listAllowedProviders,
    /** Health probe across all configured providers. */
    async health() {
      const results = {};
      for (const id of Object.values(P)) {
        const prov = await buildProvider({ providerId: id, credentialMode: CM.PLATFORM_MANAGED }).catch(() => null);
        results[id] = prov ? await prov.healthCheck() : { ok: false, reason: 'not_configured' };
      }
      return results;
    }
  };
}
