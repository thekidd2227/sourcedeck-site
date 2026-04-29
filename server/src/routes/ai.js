// server/src/routes/ai.js
// Gateway-backed AI endpoints. Server-side authorization required on
// every route — the upstream auth middleware populates req.user.
//
//   POST /api/v1/ai/resolve   → returns the policy decision (no execution)
//   POST /api/v1/ai/execute   → runs an AI workflow through the gateway
//   GET  /api/v1/ai/allowed   → providers permitted for the user/workflow
//   GET  /api/v1/ai/health    → per-provider health summary (admin)
//   POST /api/v1/ai/byok      → register a BYOK key (admin)
//   GET  /api/v1/ai/byok      → list masked BYOK keys for the user
//   DELETE /api/v1/ai/byok/:provider → revoke a BYOK key (admin)

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { recordAuditEvent, EVENT_TYPES } from '../services/audit.js';
import { addByokKey, removeByokKey, listByokKeys, hasByokKey } from '../services/ai/byok.js';

export function aiRouter({ gateway, tenantSettings }) {
  const router = Router();

  // ── Resolve effective provider for a workflow (no execution) ────────
  router.post('/resolve',
    requireAuth(), requireRole('viewer'), resolveTenant(),
    async (req, res) => {
      const { workflowType, requestedProvider } = req.body || {};
      if (!workflowType) return res.status(400).json({ error: 'workflowType_required' });
      const tenant = await tenantSettings.get(req.tenantId);
      const userByok = requestedProvider
        ? { provider: requestedProvider, hasKey: await hasByokKey({ tenantId: req.tenantId, userId: req.user.id, providerId: requestedProvider }) }
        : null;
      const decision = gateway.decide({
        workflowType,
        tenantId:          req.tenantId,
        requestedProvider,
        tenantPolicy:      tenant.aiPolicy,
        userByok,
        subscriptionTier:  tenant.subscriptionTier
      });
      res.json({ decision });
    }
  );

  // ── List allowed providers for a workflow ───────────────────────────
  router.get('/allowed',
    requireAuth(), requireRole('viewer'), resolveTenant(),
    async (req, res) => {
      const workflowType = req.query.workflowType;
      if (!workflowType) return res.status(400).json({ error: 'workflowType_required' });
      const tenant = await tenantSettings.get(req.tenantId);
      const allowed = gateway.allowed({
        workflowType,
        subscriptionTier: tenant.subscriptionTier,
        tenantPolicy:     tenant.aiPolicy
      });
      res.json({ workflowType, allowed, defaultProvider: 'watsonx', tier: tenant.subscriptionTier });
    }
  );

  // ── Execute through the gateway ─────────────────────────────────────
  router.post('/execute',
    requireAuth(), requireRole('analyst'), resolveTenant(),
    async (req, res) => {
      const { workflowType, requestedProvider, input, promptId } = req.body || {};
      if (!workflowType || !input) return res.status(400).json({ error: 'workflowType_and_input_required' });
      const tenant = await tenantSettings.get(req.tenantId);

      const userByok = requestedProvider
        ? { provider: requestedProvider, hasKey: await hasByokKey({ tenantId: req.tenantId, userId: req.user.id, providerId: requestedProvider }) }
        : null;

      try {
        const result = await gateway.execute({
          tenantId:         req.tenantId,
          userId:           req.user.id,
          workflowType,
          requestedProvider,
          tenantPolicy:     tenant.aiPolicy,
          subscriptionTier: tenant.subscriptionTier,
          userByok,
          input,
          promptId,
          requestId:        req.correlationId
        });
        res.json({ result });
      } catch (err) {
        if (err.code === 'policy_rejected') return res.status(403).json({ error: err.code, policy: err.policy });
        if (err.code === 'provider_unavailable') return res.status(503).json({ error: err.code });
        res.status(502).json({ error: 'ai_execute_failed' });
      }
    }
  );

  // ── BYOK management (tenant admin only) ─────────────────────────────
  router.get('/byok',
    requireAuth(), requireRole('viewer'), resolveTenant(),
    async (req, res) => {
      const items = await listByokKeys({ tenantId: req.tenantId, userId: req.user.id });
      res.json({ items });
    }
  );

  router.post('/byok',
    requireAuth(), requireRole('admin'), resolveTenant(),
    async (req, res) => {
      const { providerId, apiKey } = req.body || {};
      if (!providerId || !apiKey) return res.status(400).json({ error: 'providerId_and_apiKey_required' });
      const tenant = await tenantSettings.get(req.tenantId);
      try {
        const rec = await addByokKey({
          tenantId:         req.tenantId,
          userId:           req.user.id,
          providerId,
          apiKey,
          subscriptionTier: tenant.subscriptionTier
        });
        recordAuditEvent({
          type:          EVENT_TYPES.BYOK_KEY_ADDED,
          tenantId:      req.tenantId,
          userId:        req.user.id,
          correlationId: req.correlationId,
          status:        'ok',
          metadata:      { providerId, masked: rec.masked }
        });
        res.status(201).json({ key: rec });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  router.delete('/byok/:providerId',
    requireAuth(), requireRole('admin'), resolveTenant(),
    async (req, res) => {
      await removeByokKey({ tenantId: req.tenantId, userId: req.user.id, providerId: req.params.providerId });
      recordAuditEvent({
        type:          EVENT_TYPES.BYOK_KEY_REMOVED,
        tenantId:      req.tenantId,
        userId:        req.user.id,
        correlationId: req.correlationId,
        status:        'ok',
        metadata:      { providerId: req.params.providerId }
      });
      res.status(204).end();
    }
  );

  // ── Tenant AI policy (admin only) ───────────────────────────────────
  router.get('/policy',
    requireAuth(), requireRole('admin'), resolveTenant(),
    async (req, res) => {
      const tenant = await tenantSettings.get(req.tenantId);
      res.json({ policy: tenant.aiPolicy, subscriptionTier: tenant.subscriptionTier });
    }
  );

  router.put('/policy',
    requireAuth(), requireRole('admin'), resolveTenant(),
    async (req, res) => {
      const tenant = await tenantSettings.get(req.tenantId);
      const next = { ...tenant.aiPolicy, ...(req.body || {}) };
      await tenantSettings.set(req.tenantId, { ...tenant, aiPolicy: next });
      recordAuditEvent({
        type:          EVENT_TYPES.TENANT_AI_POLICY_UPDATED,
        tenantId:      req.tenantId,
        userId:        req.user.id,
        correlationId: req.correlationId,
        status:        'ok',
        metadata:      { changedKeys: Object.keys(req.body || {}) }
      });
      res.json({ policy: next });
    }
  );

  // ── Health (admin) ──────────────────────────────────────────────────
  router.get('/health',
    requireAuth(), requireRole('admin'),
    async (_req, res) => {
      res.json({ providers: await gateway.health() });
    }
  );

  return router;
}
