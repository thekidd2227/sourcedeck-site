// server/src/services/ai/types.js
// Shared shapes for the SourceDeck AI Gateway. JS only — these are
// JSDoc-style typedefs so the runtime stays dependency-free, but
// editors and tests get structural hints.

/**
 * @typedef {'platform_managed' | 'tenant_managed' | 'user_byok' | 'mock'} CredentialMode
 *
 * @typedef {'governed' | 'user_drafting' | 'enterprise_configurable' | 'government_restricted'} WorkflowCategory
 *
 * @typedef {'summarize' | 'extract' | 'classify' | 'checklist' | 'generate'} TaskType
 *
 * @typedef {'starter' | 'pro' | 'business' | 'enterprise' | 'government'} SubscriptionTier
 *
 * @typedef {'watsonx' | 'openai' | 'anthropic' | 'google' | 'custom' | 'mock'} ProviderId
 *
 * @typedef {object} AiRequest
 * @property {string}          tenantId
 * @property {string}          userId
 * @property {WorkflowCategory} workflowCategory
 * @property {string}          workflowType        - workflow id, e.g. "document_summary"
 * @property {TaskType}        taskType
 * @property {string}          promptId            - id from prompts registry, e.g. "document_summary_v1"
 * @property {string}          [modelId]           - optional pin
 * @property {string}          input               - text to send (interpolated into prompt)
 * @property {object}          [metadata]          - non-sensitive
 * @property {string}          requestId           - correlation id
 * @property {CredentialMode}  [credentialMode]    - hint; final mode is set by policy
 * @property {ProviderId}      [requestedProvider] - what the caller asked for
 * @property {SubscriptionTier} [subscriptionTier] - resolved at gateway
 *
 * @typedef {object} AiResponse
 * @property {ProviderId}    providerId
 * @property {string}        modelId
 * @property {string}        promptId
 * @property {number}        promptVersion
 * @property {object}        output
 * @property {object}        [usage]
 * @property {number}        latencyMs
 * @property {'ok'|'error'}  status
 * @property {string}        [error]
 * @property {string}        requestId
 * @property {string}        createdAt
 */

export const CREDENTIAL_MODES = Object.freeze({
  PLATFORM_MANAGED: 'platform_managed',
  TENANT_MANAGED:   'tenant_managed',
  USER_BYOK:        'user_byok',
  MOCK:             'mock'
});

export const WORKFLOW_CATEGORIES = Object.freeze({
  GOVERNED:                 'governed',
  USER_DRAFTING:            'user_drafting',
  ENTERPRISE_CONFIGURABLE:  'enterprise_configurable',
  GOVERNMENT_RESTRICTED:    'government_restricted'
});

export const SUBSCRIPTION_TIERS = Object.freeze({
  STARTER:    'starter',
  PRO:        'pro',
  BUSINESS:   'business',
  ENTERPRISE: 'enterprise',
  GOVERNMENT: 'government'
});

export const PROVIDER_IDS = Object.freeze({
  WATSONX:   'watsonx',
  OPENAI:    'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE:    'google',
  CUSTOM:    'custom',
  MOCK:      'mock'
});
