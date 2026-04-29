// server/src/routes/process.js
// POST /api/v1/process — run a versioned prompt against a stored file.
//
// Flow: load file → call AI provider → persist result → audit. Document
// content is read from storage; not accepted in the request body.

import { Router } from 'express';
import { recordAuditEvent, EVENT_TYPES } from '../services/audit.js';
import { requireAuth, requireRole, assertSameTenant } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { PROMPTS } from '../services/ai/prompts.js';

const SUPPORTED_PROMPTS = new Set(Object.keys(PROMPTS));

export function processRouter({ deps, store }) {
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
        // Load document content via the storage adapter — it never
        // touches user-supplied paths.
        const buffer = await deps.storage.getBuffer(file.storageKey);
        const content = buffer.toString('utf8'); // text-only path; binary docs require an extractor (out of scope).

        recordAuditEvent({
          ...baseAudit,
          type:          EVENT_TYPES.WATSONX_REQUEST_CREATED,
          modelId:       deps.ai.modelId,
          promptVersion: PROMPTS[promptId].version,
          status:        'pending',
          metadata:      { provider: deps.ai.name, promptId }
        });

        const result = await deps.ai.invoke({ promptId, content });

        recordAuditEvent({
          ...baseAudit,
          type:          EVENT_TYPES.WATSONX_RESPONSE_RECEIVED,
          modelId:       result.modelId,
          promptVersion: result.promptVersion,
          status:        'ok',
          metadata: {
            provider:  result.provider,
            latencyMs: result.latencyMs,
            usage:     result.usage
          }
        });

        record.status    = 'completed';
        record.result    = result.output;
        record.provider  = result.provider;
        record.modelId   = result.modelId;
        record.completedAt = new Date().toISOString();
        store.processing.set(processingId, record);

        recordAuditEvent({
          ...baseAudit,
          type:          EVENT_TYPES.FILE_PROCESSING_COMPLETED,
          modelId:       result.modelId,
          promptVersion: result.promptVersion,
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
          metadata: { reason: err.message }
        });
        res.status(502).json({ error: 'processing_failed', processingId });
      }
    }
  );

  return router;
}
