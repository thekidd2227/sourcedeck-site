// server/src/middleware/oidc.js
// OIDC / JWT auth middleware for SourceDeck.
//
// Validates a Bearer token using the issuer's JWKS, maps standard claims
// + a configurable claim mapping into req.user, and refuses to start in
// production unless config is present (or the explicit
// ALLOW_DEV_HEADERS_PROD escape hatch is set).
//
// Compatible with IBM IAM (App ID), Okta, Entra ID, Auth0, generic OIDC.
//
// Lazy-imports `jose` so the package is optional at install time.

import { log } from '../logger.js';

let _jwks = null;
let _verifyJwt = null;

async function loadJose() {
  if (_jwks && _verifyJwt) return;
  let jose;
  try { jose = await import('jose'); }
  catch {
    throw new Error('oidc: jose package not installed. Run `npm i jose` in server/.');
  }
  _verifyJwt = jose.jwtVerify;
  _jwks      = jose.createRemoteJWKSet;
}

export function createOidcMiddleware(opts = {}) {
  const issuerUrl = opts.issuerUrl || process.env.AUTH_ISSUER_URL;
  const audience  = opts.audience  || process.env.AUTH_AUDIENCE;
  const jwksUrl   = opts.jwksUrl   || process.env.AUTH_JWKS_URL || (issuerUrl ? `${issuerUrl.replace(/\/$/, '')}/.well-known/jwks.json` : null);

  if (!issuerUrl || !audience || !jwksUrl) {
    throw new Error('oidc: missing AUTH_ISSUER_URL, AUTH_AUDIENCE, or AUTH_JWKS_URL');
  }

  // Map provider claim names → req.user fields. Tenants frequently use
  // custom claim namespaces; defaults cover IBM IAM and standard OIDC.
  const claimMap = {
    userId:           opts.claimUserId   || 'sub',
    email:            opts.claimEmail    || 'email',
    tenantId:         opts.claimTenant   || 'tenant_id',
    role:             opts.claimRole     || 'role',
    subscriptionTier: opts.claimTier     || 'subscription_tier'
  };

  let jwks;

  return async function oidc(req, res, next) {
    // Cheap header check first so missing-token responses don't pay
    // the cost of loading jose or hitting the JWKS endpoint.
    const auth = req.headers['authorization'] || '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (!m) return res.status(401).json({ error: 'missing_bearer_token' });

    try {
      await loadJose();
      if (!jwks) jwks = _jwks(new URL(jwksUrl), { cooldownDuration: 30_000 });

      const { payload } = await _verifyJwt(m[1], jwks, {
        issuer:   issuerUrl,
        audience: audience
      });

      req.user = {
        id:               payload[claimMap.userId],
        email:            payload[claimMap.email] || null,
        tenantId:         payload[claimMap.tenantId] || 'default',
        role:             payload[claimMap.role] || 'viewer',
        subscriptionTier: payload[claimMap.subscriptionTier] || null,
        scopes:           Array.isArray(payload.scopes) ? payload.scopes : []
      };
      next();
    } catch (err) {
      const code = err?.code || err?.message || 'invalid_token';
      // Do not leak token contents in logs.
      log.info('oidc.reject', { reason: String(code).slice(0, 80), path: req.path });
      res.status(401).json({ error: 'invalid_token' });
    }
  };
}

/**
 * Combined middleware factory: in dev/test honors x-user-* headers; in
 * production requires a real OIDC token (unless ALLOW_DEV_HEADERS_PROD
 * is explicitly true — escape hatch for staging only).
 *
 * Bootstrap calls this once and mounts the result globally on
 * /api/v1 routes so route handlers can rely on req.user.
 */
export function createAuthMiddleware(cfg, env = process.env) {
  const isProd = (env.APP_ENV || env.NODE_ENV) === 'production';
  const provider = cfg?.auth?.provider || env.AUTH_PROVIDER || 'local';

  // Dev / test header shim — preserved for local DX.
  function devHeaderShim(req, _res, next) {
    if (req.headers['x-user-id']) {
      req.user = {
        id:               String(req.headers['x-user-id']),
        role:             String(req.headers['x-user-role']  || 'viewer'),
        tenantId:         String(req.headers['x-tenant-id']  || 'default'),
        subscriptionTier: String(req.headers['x-subscription-tier'] || 'starter'),
        scopes:           ['multi_tenant']
      };
    }
    next();
  }

  if (isProd && provider === 'oidc') {
    if (env.ALLOW_DEV_HEADERS_PROD === 'true') {
      log.warn('oidc.dev_headers_prod_override_active');
      return devHeaderShim;
    }
    return createOidcMiddleware({
      issuerUrl: cfg?.auth?.issuerUrl,
      audience:  env.AUTH_AUDIENCE,
      jwksUrl:   env.AUTH_JWKS_URL
    });
  }

  if (isProd && provider !== 'oidc') {
    if (env.ALLOW_DEV_HEADERS_PROD === 'true') {
      log.warn('oidc.dev_headers_prod_override_active', { provider });
      return devHeaderShim;
    }
    throw new Error(
      `auth: production refuses provider="${provider}". Set AUTH_PROVIDER=oidc and ` +
      `AUTH_ISSUER_URL/AUTH_AUDIENCE/AUTH_JWKS_URL, or set ALLOW_DEV_HEADERS_PROD=true at your own risk.`
    );
  }

  // Dev / test path
  return devHeaderShim;
}
