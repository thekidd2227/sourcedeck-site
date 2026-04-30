// server/src/routes/agents.js
//
//   GET  /api/v1/agents              → public catalog (also used by /agents/ page)
//   GET  /api/v1/agents/:id          → single-agent detail incl. input shape
//   POST /api/v1/agents/:id/run      → run an agent through the AI Gateway.
//                                      The agent's workflowType + the policy
//                                      engine decide watsonx-only vs drafting.
//
// Run requirements:
//   - auth (analyst+) and tenant resolution.
//   - structured input matching the agent's declared fields.
//   - everything goes through deps.gateway.execute() — same audit chain
//     as /api/v1/process. BYOK is policy-gated; governed agents never use it.

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { listAgents, getAgent, buildAgentInput } from '../services/ai/agents.js';

export function agentsRouter({ deps, tenantSettings }) {
  const router = Router();

  // ── Public catalog (no auth — used by the marketing page) ──────────
  // Trims the input-shape detail; full detail is on the per-agent route.
  router.get('/', (_req, res) => {
    const items = listAgents().map(a => ({
      id:           a.id,
      name:         a.name,
      icon:         a.icon,
      description:  a.description,
      workflowType: a.workflowType,
      status:       a.status,
      tags:         a.tags,
      tiers:        a.tiers,
      eventHook:    a.eventHook
    }));
    res.json({ items, count: items.length });
  });

  // ── Single agent (with input fields) — auth required ───────────────
  router.get('/:id',
    requireAuth(), requireRole('viewer'),
    (req, res) => {
      try { res.json({ agent: getAgent(req.params.id) }); }
      catch { res.status(404).json({ error: 'agent_not_found' }); }
    }
  );

  // ── Run an agent ───────────────────────────────────────────────────
  router.post('/:id/run',
    requireAuth(), requireRole('analyst'), resolveTenant(),
    async (req, res) => {
      let agent;
      try { agent = getAgent(req.params.id); }
      catch { return res.status(404).json({ error: 'agent_not_found' }); }

      let input;
      try {
        input = buildAgentInput(agent.id, req.body?.input || {});
      } catch (err) {
        if (err.code === 'missing_fields') {
          return res.status(400).json({ error: err.code, fields: err.fields });
        }
        return res.status(400).json({ error: 'invalid_input' });
      }

      const tenant = await tenantSettings.get(req.tenantId);

      try {
        const result = await deps.gateway.execute({
          tenantId:          req.tenantId,
          userId:            req.user.id,
          workflowType:      agent.workflowType,
          requestedProvider: req.body?.requestedProvider || null,
          tenantPolicy:      tenant.aiPolicy,
          subscriptionTier:  tenant.subscriptionTier,
          userByok:          null,                  // agents never receive BYOK directly;
                                                    // policy still allows it for drafting agents
                                                    // when configured at tenant level.
          input,
          requestId:         req.correlationId
        });

        res.json({
          agentId:   agent.id,
          name:      agent.name,
          result
        });
      } catch (err) {
        if (err.code === 'usage_cap_exceeded') return res.status(429).json({ error: err.code, ...err.meta });
        if (err.code === 'input_too_large')    return res.status(413).json({ error: err.code, ...err.meta });
        if (err.code === 'policy_rejected')    return res.status(403).json({ error: err.code, policy: err.policy });
        if (err.code === 'circuit_open')       return res.status(503).json({ error: err.code });
        if (err.code === 'timeout')            return res.status(504).json({ error: err.code });
        res.status(502).json({ error: 'agent_run_failed' });
      }
    }
  );

  return router;
}
