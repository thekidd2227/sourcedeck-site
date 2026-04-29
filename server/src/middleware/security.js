// server/src/middleware/security.js
// Secure HTTP headers + simple in-memory rate limit.
// Production should replace the rate limiter with a shared backend
// (Redis, IBM Cloud Databases for Redis) or front it with API Gateway / CIS.

import helmet from 'helmet';

export function secureHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // The static site lives outside the API; this CSP only applies to
        // JSON / API responses. UI hosts (sourcedeck.app, Vercel) define
        // their own CSP via the static deployment.
        'default-src':  ["'none'"],
        'frame-ancestors': ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' }
  });
}

const buckets = new Map();

/**
 * Token-bucket-ish per-IP limiter. Drops to fixed-window counting under
 * load. Suitable for dev / single-replica only — see header comment.
 */
export function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  return (req, res, next) => {
    const key = (req.ip || req.headers['x-forwarded-for'] || 'anon') + ':' + req.path.split('/')[1];
    const now = Date.now();
    const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count += 1;
    buckets.set(key, entry);
    res.setHeader('x-ratelimit-limit', max);
    res.setHeader('x-ratelimit-remaining', Math.max(0, max - entry.count));
    res.setHeader('x-ratelimit-reset', Math.ceil(entry.resetAt / 1000));
    if (entry.count > max) {
      res.setHeader('retry-after', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'rate_limited' });
    }
    next();
  };
}
