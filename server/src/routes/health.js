// server/src/routes/health.js
// Liveness + readiness endpoints. Liveness is process-level. Readiness
// reports whether the configured providers are reachable / configured.

import { Router } from 'express';

export function healthRouter({ cfg, deps }) {
  const router = Router();

  // Liveness: process is up. Used by k8s liveness probe + Code Engine.
  router.get('/live', (_req, res) => {
    res.status(200).json({ status: 'live', ts: new Date().toISOString() });
  });

  // Readiness: dependencies are configured. Don't make outbound calls here
  // every probe — return cached state only.
  router.get('/ready', (_req, res) => {
    const checks = {
      storage: deps?.storage?.name || 'unknown',
      ai:      deps?.ai?.name      || 'unknown',
      auth:    cfg.auth.provider
    };
    const ready = !!deps?.storage && !!deps?.ai;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      ts:     new Date().toISOString(),
      checks,
      env:    cfg.appEnv
    });
  });

  // Backwards-compat: GET /health → liveness.
  router.get('/', (_req, res) => res.redirect(302, '/health/live'));

  return router;
}
