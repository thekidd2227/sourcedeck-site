import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthMiddleware } from '../src/middleware/oidc.js';

function withEnv(env, fn) {
  const orig = { ...process.env };
  Object.assign(process.env, env);
  try { return fn(); }
  finally {
    for (const k of Object.keys(env)) delete process.env[k];
    Object.assign(process.env, orig);
  }
}

function harness(headers = {}) {
  const req = { headers, path: '/x' };
  const res = {
    statusCode: 200, _body: null,
    status(c) { this.statusCode = c; return this; },
    json(b)   { this._body = b; return this; }
  };
  return { req, res };
}

test('auth: dev → header shim populates req.user', () => {
  withEnv({ APP_ENV: 'development' }, () => {
    const mw = createAuthMiddleware({ auth: { provider: 'local' } });
    const { req, res } = harness({
      'x-user-id':            'u1',
      'x-user-role':          'admin',
      'x-tenant-id':          't1',
      'x-subscription-tier':  'business'
    });
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 'u1');
    assert.equal(req.user.role, 'admin');
    assert.equal(req.user.tenantId, 't1');
    assert.equal(req.user.subscriptionTier, 'business');
  });
});

test('auth: production + AUTH_PROVIDER=local → throws (refuses to start)', () => {
  withEnv({ APP_ENV: 'production' }, () => {
    assert.throws(
      () => createAuthMiddleware({ auth: { provider: 'local' } }),
      /production refuses provider="local"/
    );
  });
});

test('auth: production + ALLOW_DEV_HEADERS_PROD=true → returns dev shim', () => {
  withEnv({ APP_ENV: 'production', ALLOW_DEV_HEADERS_PROD: 'true' }, () => {
    const mw = createAuthMiddleware({ auth: { provider: 'local' } });
    const { req, res } = harness({ 'x-user-id': 'u1' });
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 'u1');
  });
});

test('auth: production + oidc but missing config → factory throws', () => {
  withEnv({ APP_ENV: 'production', AUTH_PROVIDER: 'oidc' }, () => {
    assert.throws(
      () => createAuthMiddleware({ auth: { provider: 'oidc' } }),
      /missing AUTH_ISSUER_URL/
    );
  });
});

test('auth: production + oidc + complete config → returns oidc middleware (does NOT throw at factory time)', () => {
  withEnv({
    APP_ENV: 'production',
    AUTH_PROVIDER: 'oidc',
    AUTH_AUDIENCE: 'sourcedeck-api',
    AUTH_JWKS_URL: 'https://example.invalid/.well-known/jwks.json'
  }, () => {
    const mw = createAuthMiddleware({
      auth: { provider: 'oidc', issuerUrl: 'https://example.invalid' }
    });
    assert.equal(typeof mw, 'function');
  });
});

test('auth: oidc middleware rejects request with no Bearer token (401)', async () => {
  withEnv({
    APP_ENV: 'production',
    AUTH_PROVIDER: 'oidc',
    AUTH_AUDIENCE: 'sourcedeck-api',
    AUTH_JWKS_URL: 'https://example.invalid/.well-known/jwks.json'
  }, async () => {
    const mw = createAuthMiddleware({
      auth: { provider: 'oidc', issuerUrl: 'https://example.invalid' }
    });
    const { req, res } = harness({});
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res._body.error, 'missing_bearer_token');
  });
});

test('auth: oidc middleware rejects malformed Bearer token (401 invalid_token)', async () => {
  withEnv({
    APP_ENV: 'production',
    AUTH_PROVIDER: 'oidc',
    AUTH_AUDIENCE: 'sourcedeck-api',
    AUTH_JWKS_URL: 'https://example.invalid/.well-known/jwks.json'
  }, async () => {
    const mw = createAuthMiddleware({
      auth: { provider: 'oidc', issuerUrl: 'https://example.invalid' }
    });
    const { req, res } = harness({ 'authorization': 'Bearer not.a.real.jwt' });
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res._body.error, 'invalid_token');
  });
});
