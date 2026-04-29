// server/src/routes/results.js
// GET /api/v1/results        — list current tenant's processing records
// GET /api/v1/results/:id    — read one (records RESULT_VIEWED)

import { Router } from 'express';
import { recordAuditEvent, EVENT_TYPES } from '../services/audit.js';
import { requireAuth, requireRole, assertSameTenant } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';

export function resultsRouter({ store }) {
  const router = Router();

  router.get('/',
    requireAuth(),
    requireRole('viewer'),
    resolveTenant(),
    (req, res) => {
      const items = [];
      for (const r of store.processing.values()) {
        if (r.tenantId === req.tenantId) items.push(r);
      }
      res.json({ items, count: items.length });
    }
  );

  router.get('/:id',
    requireAuth(),
    requireRole('viewer'),
    resolveTenant(),
    (req, res) => {
      const record = store.processing.get(req.params.id);
      if (!record) return res.status(404).json({ error: 'not_found' });
      if (!assertSameTenant(req, record)) return res.status(403).json({ error: 'cross_tenant_blocked' });

      recordAuditEvent({
        type:          EVENT_TYPES.RESULT_VIEWED,
        tenantId:      req.tenantId,
        userId:        req.user.id,
        resourceType:  'processing',
        resourceId:    record.id,
        correlationId: req.correlationId,
        ip:            req.ip,
        userAgent:     req.headers['user-agent'],
        status:        'ok'
      });

      res.json({ processing: record });
    }
  );

  return router;
}
