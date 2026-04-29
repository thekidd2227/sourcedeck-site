// server/server.js
// SourceDeck API entry point.
//
// Brownfield-safe: this is an additive backend for the existing static
// SourceDeck site. The frontend is unchanged. Routes are namespaced under
// /api/v1/*; /health/* serves liveness + readiness for Code Engine, k8s,
// and OpenShift probes.

import express from 'express';

import { loadConfig } from './src/config.js';
import { log, setLevel, requestLogger } from './src/logger.js';
import { secureHeaders, rateLimit } from './src/middleware/security.js';
import { createUploadMiddleware } from './src/middleware/upload.js';
import { createStorage } from './src/services/storage/index.js';
import { createAiProvider, createAiGateway } from './src/services/ai/index.js';
import { healthRouter }  from './src/routes/health.js';
import { uploadRouter }  from './src/routes/upload.js';
import { processRouter } from './src/routes/process.js';
import { resultsRouter } from './src/routes/results.js';
import { aiRouter }      from './src/routes/ai.js';
import { getTenantPolicyRepo, ensureProductionPersistence } from './src/services/persistence/index.js';

async function bootstrap() {
  const cfg = loadConfig();
  setLevel(cfg.logLevel);

  const deps = {
    storage: await createStorage(cfg),
    ai:      createAiProvider(cfg),
    gateway: createAiGateway({ cfg })
  };

  // In-memory stores. Replace with Postgres per docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md.
  const store = {
    files:      new Map(),
    processing: new Map(),
    tenants:    new Map()  // tenantId → { subscriptionTier, aiPolicy }
  };

  // Hard-fail in production if persistence repos are still in-memory.
  // Bypassable in dev / tests.
  ensureProductionPersistence();

  // Tenant settings — backed by the persistence layer (in-memory by
  // default, replaceable via bindTenantPolicyRepo()).
  const policyRepo = getTenantPolicyRepo();
  const tenantSettings = {
    async get(tenantId) {
      const p = await policyRepo.get(tenantId);
      // Surface fields in the shape callers expect for backward-compat.
      return {
        subscriptionTier: p.subscriptionTier,
        tenantType:       p.tenantType,
        aiPolicy: {
          byokEnabled:              p.byokEnabled,
          allowedDraftingProviders: p.allowedDraftingProviders,
          defaultDraftingProvider:  p.defaultDraftingProvider,
          governanceEnabled:        p.governanceEnabled,
          tenantKeys:               p.tenantKeys || {}
        },
        updatedBy: p.updatedBy,
        updatedAt: p.updatedAt
      };
    },
    async set(tenantId, value) {
      const patch = {
        subscriptionTier:         value.subscriptionTier,
        tenantType:               value.tenantType,
        byokEnabled:              value.aiPolicy?.byokEnabled,
        allowedDraftingProviders: value.aiPolicy?.allowedDraftingProviders,
        defaultDraftingProvider:  value.aiPolicy?.defaultDraftingProvider,
        governanceEnabled:        value.aiPolicy?.governanceEnabled,
        tenantKeys:               value.aiPolicy?.tenantKeys
      };
      // Strip undefined to avoid clobbering with nulls.
      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
      return policyRepo.upsert(tenantId, patch, value.updatedBy);
    }
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(secureHeaders());
  app.use(express.json({ limit: '256kb' }));
  app.use(requestLogger());
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));

  // Stub auth: accept x-user-id / x-user-role / x-tenant-id headers in non-prod
  // for local development. Production must replace this with the real auth
  // provider middleware (OIDC / IBM IAM).
  app.use((req, _res, next) => {
    if (req.headers['x-user-id']) {
      req.user = {
        id:       String(req.headers['x-user-id']),
        role:     String(req.headers['x-user-role']  || 'viewer'),
        tenantId: String(req.headers['x-tenant-id']  || 'default'),
        scopes:   ['multi_tenant']
      };
    }
    next();
  });

  const uploadMw = createUploadMiddleware(cfg);

  app.use('/health',           healthRouter({ cfg, deps }));
  app.use('/api/v1/files',     uploadRouter({ cfg, deps, store, uploadMw }));
  app.use('/api/v1/process',   processRouter({ deps, store, tenantSettings }));
  app.use('/api/v1/results',   resultsRouter({ store }));
  app.use('/api/v1/ai',        aiRouter({ gateway: deps.gateway, tenantSettings }));

  app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

  app.use((err, req, res, _next) => {
    log.error('unhandled', { err: err.message, path: req.path, correlationId: req.correlationId });
    res.status(500).json({ error: 'internal_error', correlationId: req.correlationId });
  });

  app.listen(cfg.port, () => {
    log.info('boot', {
      port:     cfg.port,
      env:      cfg.appEnv,
      storage:  deps.storage.name,
      ai:       deps.ai.name,
      modelId:  deps.ai.modelId
    });
  });
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ level: 'error', msg: 'bootstrap_failed', err: err.message }));
  process.exit(1);
});
