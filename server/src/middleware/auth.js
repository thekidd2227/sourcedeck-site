// server/src/middleware/auth.js
// Role-based access control. Roles: owner > admin > analyst > viewer.
//
// This is a thin server-side gate on top of whatever real auth provider
// the deployment uses (local session, OIDC, IBM IAM). The provider populates
// req.user; this middleware enforces it.

export const ROLES = Object.freeze(['owner', 'admin', 'analyst', 'viewer']);
const RANK = Object.freeze({ owner: 4, admin: 3, analyst: 2, viewer: 1 });

export function requireAuth() {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    next();
  };
}

/** Require role >= minRole on the user's tenant. */
export function requireRole(minRole) {
  if (!RANK[minRole]) throw new Error(`requireRole: unknown role "${minRole}"`);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    const userRank = RANK[req.user.role] || 0;
    if (userRank < RANK[minRole]) {
      return res.status(403).json({ error: 'forbidden', need: minRole, have: req.user.role });
    }
    next();
  };
}

/** Reject cross-tenant access — every resource fetch should pass through this. */
export function assertSameTenant(req, resource) {
  if (!req.user?.tenantId || !resource?.tenantId) return false;
  return req.user.tenantId === resource.tenantId;
}

/** Pure helper for unit tests. */
export function hasRole(role, minRole) {
  return (RANK[role] || 0) >= (RANK[minRole] || 0);
}
