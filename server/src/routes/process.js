// server/src/routes/process.js
// POST /api/v1/process — run a versioned prompt against a stored file.
//
// MIGRATED to the AI Gateway. Document processing is treated as a
// governed workflow — the gateway forces watsonx, blocks BYOK, and
// emits the AI_PROVIDER_SELECTED → AI_REQUEST_CREATED →
// AI_RESPONSE_RECEIVED audit chain in addition to the legacy
// FILE_PROCESSING_* events the existing UI consumes.
//
// Backward compatibility:
//   - Request body still { fileId, promptId } (and now optional
//     `requestedProvider` which is ALWAYS overridden to watsonx for
//     governed work).
//   - Response shape preserved: { processing: { id, status, result, ... } }
//   - Legacy FILE_PROCESSING_STARTED / _COMPLETED / _FAILED audit events
//     remain so existing dashboards keep working.

import { Router } from 'express';
import { recordAuditEvent, EVENT_TYPES } from '../services/audit.js';
import { requireAuth, requireRole, assertSameTenant } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { PROMPTS } from '../services/ai/prompts.js';

const SUPPORTED_PROMPTS = new Set(Object.keys(PROMPTS));

// Map prompt id → governed workflow id used by the gateway/policy engine.
const PROMPT_TO_WORKFLOW = {
  document_summary_v1:        'document_summary',
  key_field_extraction_v1:    'field_extraction',
  document_classification_v1: 'document_classification',
  action_checklist_v1:        'action_checklist'
};

export function processRouter({ deps, store, tenantSettings }) {
  const router = Router();

  router.post('/',
    requireAuth(),
    requireRole('analyst'),
    resolveTenant(),
    async (req, res) => {
      const { fileId, promptId } = req.body || {};
      if (!fileId || !promptId) return res.status(400).json({ error: 'fileId_and_promptId_required' });
      if (!SUPPORTED_PROMPTS.has(promptId)) return res.status(400).json({ error: 'unknown_prompt' });

      const file = store.files.get(fileId);
      if (!file) return res.status(404).json({ error: 'file_not_found' });
      if (!assertSameTenant(req, file)) return res.status(403).json({ error: 'cross_tenant_blocked' });

      const processingId = 'proc_' + Math.random().toString(36).slice(2, 14);
      const baseAudit = {
        tenantId:      req.tenantId,
        userId:        req.user.id,
        resourceType:  'processing',
        resourceId:    processingId,
        correlationId: req.correlationId,
        ip:            req.ip,
        userAgent:     req.headers['user-agent']
      };

      recordAuditEvent({ ...baseAudit, type: EVENT_TYPES.FILE_PROCESSING_STARTED, status: 'pending', metadata: { fileId, promptId } });

      const record = {
        id:        processingId,
        tenantId:  req.tenantId,
        fileId,
        promptId,
        status:    'pending',
        result:    null,
        provider:  null,
        modelId:   null,
        startedAt: new Date().toISOString()
      };
      store.processing.set(processingId, record);

      try {
        // Load document content via the storage adapter — never touches
        // user-supplied paths.
        const buffer  = await deps.storage.getBuffer(file.storageKey);
        const content = buffer.toString('utf8');

        // Resolve tenant policy (persisted) for tier + tenant overrides.
        const tenant = await tenantSettings.get(req.tenantId);

        // Document processing is a governed workflow. The gateway
        // ignores any requestedProvider for governed work and forces
        // watsonx — we still pass it through so audit captures the
        // intent + the GOVERNED_WORKFLOW_ENFORCED event fires.
        const workflowType = PROMPT_TO_WORKFLOW[promptId] || 'document_summary';

        const aiResult = await deps.gateway.execute({
          tenantId:          req.tenantId,
          userId:            req.user.id,
          workflowType,
          requestedProvider: req.body?.requestedProvider || null,
          tenantPolicy:      tenant.aiPolicy || tenant,
          subscriptionTier:  tenant.subscriptionTier,
          userByok:          null,                       // BYOK never used for governed
          input:             content,
          promptId,
          requestId:         req.correlationId
        });

        record.status      = 'completed';
        record.result      = aiResult.output;
        record.provider    = aiResult.providerId;
        record.modelId     = aiResult.modelId;
        record.promptVersion = aiResult.promptVersion;
        record.policy      = aiResult.policy;
        record.completedAt = new Date().toISOString();
        store.processing.set(processingId, record);

        recordAuditEvent({
          ...baseAudit,
          type:          EVENT_TYPES.FILE_PROCESSING_COMPLETED,
          modelId:       aiResult.modelId,
          promptVersion: aiResult.promptVersion,
          status:        'ok'
        });

        res.status(200).json({ processing: record });
      } catch (err) {
        record.status      = 'failed';
        record.error       = err.message;
        record.completedAt = new Date().toISOString();
        store.processing.set(processingId, record);

        recordAuditEvent({
          ...baseAudit,
          type:     EVENT_TYPES.FILE_PROCESSING_FAILED,
          status:   'error',
          metadata: { reason: err.message, code: err.code || null }
        });

        // Map gateway / metering errors to clean HTTP codes.
        if (err.code === 'usage_cap_exceeded') return res.status(429).json({ error: err.code, processingId, ...err.meta });
        if (err.code === 'input_too_large')    return res.status(413).json({ error: err.code, processingId, ...err.meta });
        if (err.code === 'policy_rejected')    return res.status(403).json({ error: err.code, processingId, policy: err.policy });
        if (err.code === 'circuit_open')       return res.status(503).json({ error: err.code, processingId });
        if (err.code === 'timeout')            return res.status(504).json({ error: err.code, processingId });
        res.status(502).json({ error: 'processing_failed', processingId });
      }
    }
  );

  return router;
}
