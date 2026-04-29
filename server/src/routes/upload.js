// server/src/routes/upload.js
// POST /api/v1/files — secure upload endpoint. Stores via storage adapter,
// persists metadata in the in-memory store (replace with DB), records audit.

import { Router } from 'express';
import { recordAuditEvent, EVENT_TYPES } from '../services/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';

export function uploadRouter({ cfg, deps, store, uploadMw }) {
  const router = Router();

  router.post('/',
    requireAuth(),
    requireRole('analyst'),
    resolveTenant(),
    uploadMw,
    async (req, res) => {
      try {
        const { buffer, mimetype, originalname, size } = req.file;
        const meta = await deps.storage.put({
          buffer,
          contentType:      mimetype,
          originalFilename: originalname,
          tenantId:         req.tenantId
        });

        const fileRecord = {
          id:               'file_' + meta.key,
          tenantId:         req.tenantId,
          uploaderId:       req.user.id,
          storageProvider:  meta.provider,
          storageKey:       meta.key,
          originalFilename: originalname,
          contentType:      mimetype,
          size,
          createdAt:        meta.createdAt
        };
        store.files.set(fileRecord.id, fileRecord);

        recordAuditEvent({
          type:          EVENT_TYPES.FILE_UPLOADED,
          tenantId:      req.tenantId,
          userId:        req.user.id,
          resourceType:  'file',
          resourceId:    fileRecord.id,
          correlationId: req.correlationId,
          ip:            req.ip,
          userAgent:     req.headers['user-agent'],
          status:        'ok',
          metadata: {
            contentType: mimetype,
            sizeBytes:   size,
            provider:    meta.provider
          }
        });

        res.status(201).json({ file: fileRecord });
      } catch (err) {
        recordAuditEvent({
          type:          EVENT_TYPES.FILE_UPLOADED,
          tenantId:      req.tenantId,
          userId:        req.user?.id,
          correlationId: req.correlationId,
          status:        'error',
          metadata:      { reason: err.message }
        });
        res.status(500).json({ error: 'upload_failed' });
      }
    }
  );

  return router;
}
