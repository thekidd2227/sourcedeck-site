// server/src/services/audit.js
// Audit / governance event service. watsonx.governance-ready metadata capture.
//
// Events are append-only. Default sink is stdout (JSON). Production should
// route stdout to a managed log sink (LogDNA, Splunk, OpenSearch) and/or
// forward into watsonx.governance via the export pipeline.
//
// CRITICAL: never include raw document content or full AI prompts in events.

import { log } from '../logger.js';

export const EVENT_TYPES = Object.freeze({
  USER_LOGIN:                 'USER_LOGIN',
  FILE_UPLOADED:              'FILE_UPLOADED',
  FILE_PROCESSING_STARTED:    'FILE_PROCESSING_STARTED',
  WATSONX_REQUEST_CREATED:    'WATSONX_REQUEST_CREATED',
  WATSONX_RESPONSE_RECEIVED:  'WATSONX_RESPONSE_RECEIVED',
  FILE_PROCESSING_COMPLETED:  'FILE_PROCESSING_COMPLETED',
  FILE_PROCESSING_FAILED:     'FILE_PROCESSING_FAILED',
  RESULT_VIEWED:              'RESULT_VIEWED',
  ADMIN_ROLE_CHANGED:         'ADMIN_ROLE_CHANGED',
  CONFIG_CHANGED:             'CONFIG_CHANGED',

  // ── AI gateway events ────────────────────────────────────────────────
  AI_PROVIDER_SELECTED:           'AI_PROVIDER_SELECTED',
  AI_PROVIDER_REJECTED_BY_POLICY: 'AI_PROVIDER_REJECTED_BY_POLICY',
  AI_PROVIDER_FALLBACK_USED:      'AI_PROVIDER_FALLBACK_USED',
  AI_REQUEST_CREATED:             'AI_REQUEST_CREATED',
  AI_RESPONSE_RECEIVED:           'AI_RESPONSE_RECEIVED',
  AI_REQUEST_FAILED:              'AI_REQUEST_FAILED',
  BYOK_KEY_ADDED:                 'BYOK_KEY_ADDED',
  BYOK_KEY_REMOVED:               'BYOK_KEY_REMOVED',
  BYOK_PROVIDER_USED:             'BYOK_PROVIDER_USED',
  GOVERNED_WORKFLOW_ENFORCED:     'GOVERNED_WORKFLOW_ENFORCED',
  GOVERNMENT_PROVIDER_RESTRICTED: 'GOVERNMENT_PROVIDER_RESTRICTED',
  TENANT_AI_POLICY_UPDATED:       'TENANT_AI_POLICY_UPDATED'
});

const ALLOWED_STATUS = new Set(['ok', 'error', 'pending', 'denied']);

// Keys that must NEVER appear in event metadata.
const FORBIDDEN_META_KEYS = new Set([
  'document', 'documentContent', 'fileContent', 'fileBody', 'body',
  'prompt', 'promptText', 'aiPrompt', 'rawText',
  'apiKey', 'api_key', 'apikey', 'authorization', 'token', 'secret',
  'WATSONX_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY', 'CUSTOM_AI_API_KEY'
]);

function newEventId() {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return 'evt_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function sanitizeMetadata(meta = {}) {
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.has(k)) continue;
    if (typeof v === 'string' && v.length > 2048) {
      out[k] = '[TRUNCATED]';
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Record an audit event. Returns the persisted event (or {error} on failure).
 *
 * @param {object} input
 * @param {string} input.type             - one of EVENT_TYPES
 * @param {string} [input.tenantId]
 * @param {string} [input.userId]
 * @param {string} [input.resourceType]   - e.g. "file", "result", "user"
 * @param {string} [input.resourceId]
 * @param {string} [input.correlationId]
 * @param {string} [input.ip]
 * @param {string} [input.userAgent]
 * @param {string} [input.status]         - "ok"|"error"|"pending"|"denied"
 * @param {string[]} [input.riskFlags]    - e.g. ["pii_present","auto_approved"]
 * @param {object} [input.metadata]       - non-sensitive metadata only
 */
export function recordAuditEvent(input) {
  if (!EVENT_TYPES[input.type]) {
    log.error('audit.invalid_type', { type: input.type });
    return { error: 'invalid_type' };
  }
  const status = ALLOWED_STATUS.has(input.status) ? input.status : 'ok';

  const event = {
    eventId:       newEventId(),
    eventType:     input.type,
    tenantId:      input.tenantId || null,
    userId:        input.userId   || null,
    resourceType:  input.resourceType || null,
    resourceId:    input.resourceId   || null,
    correlationId: input.correlationId || null,
    ip:            input.ip || null,
    userAgent:     input.userAgent || null,
    status,
    riskFlags:     Array.isArray(input.riskFlags) ? input.riskFlags : [],
    metadata:      sanitizeMetadata(input.metadata || {}),
    timestamp:     new Date().toISOString(),

    // governance schema hints — populated by config consumer if enabled.
    governance: {
      schemaVersion: '1',
      // model metadata captured at the AI-call sites:
      modelId:       input.modelId       || null,
      promptVersion: input.promptVersion || null
    }
  };

  // Default sink: structured stdout. Replace with a DB-backed sink in
  // production by reassigning `audit.sink` from a bootstrap module.
  audit.sink(event);
  return event;
}

export const audit = {
  /** Override in production to ship events to a durable store. */
  sink: (event) => log.info('audit', { event })
};
