// server/src/middleware/tenant.js
// Resolves the active tenant for the request. Order of precedence:
//   1. req.user.tenantId (auth-bound, trusted)
//   2. x-tenant-id header (only honored if user has multi-tenant scope)
//   3. fallback "default" tenant (dev only)

export function resolveTenant() {
  return (req, res, next) => {
    if (req.user?.tenantId) {
      req.tenantId = req.user.tenantId;
      return next();
    }
    const header = req.headers['x-tenant-id'];
    if (header && req.user?.scopes?.includes('multi_tenant')) {
      req.tenantId = String(header);
      return next();
    }
    if (process.env.APP_ENV !== 'production') {
      req.tenantId = 'default';
      return next();
    }
    return res.status(400).json({ error: 'tenant_unresolved' });
  };
}
