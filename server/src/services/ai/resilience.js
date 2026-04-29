// server/src/services/ai/resilience.js
// Wraps a provider's `invoke` with timeout, bounded retry on transient
// failures, and a per-key circuit breaker.
//
// Hard rules:
//   - Never retry policy_rejected, provider_unsupported_category, or any
//     4xx semantic failure. Only retry on transient signals: timeout,
//     network error, 5xx, or `Retry-After` 429.
//   - Never escape a governed-workflow contract: this wrapper does not
//     change provider selection, only adds resilience to the chosen
//     provider's call.

import { log } from '../../logger.js';

export class TimeoutError extends Error {
  constructor(ms) { super(`timeout after ${ms}ms`); this.code = 'timeout'; }
}

export class CircuitOpenError extends Error {
  constructor(key) { super(`circuit_open:${key}`); this.code = 'circuit_open'; this.key = key; }
}

const TRANSIENT_PATTERNS = [
  /timeout/i, /ECONNRESET/, /EAI_AGAIN/, /ENOTFOUND/, /fetch failed/i,
  /\b5\d\d\b/, /\b429\b/
];

function isTransient(err) {
  const msg = err?.message || '';
  if (err?.code === 'timeout') return true;
  return TRANSIENT_PATTERNS.some(rx => rx.test(msg));
}

function withTimeout(promise, ms) {
  if (!ms || ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

/**
 * Per-key circuit breaker. Opens after `failureThreshold` consecutive
 * failures within `windowMs`; half-opens after `cooldownMs`.
 */
export function createCircuitBreaker({ failureThreshold = 5, windowMs = 60_000, cooldownMs = 30_000 } = {}) {
  const state = new Map();   // key → { failures, openedAt, firstFailureAt }
  return {
    state,                   // exposed for tests / health endpoint
    check(key) {
      const s = state.get(key);
      if (!s) return;
      if (s.openedAt && Date.now() - s.openedAt < cooldownMs) {
        throw new CircuitOpenError(key);
      }
    },
    onSuccess(key) {
      state.delete(key);
    },
    onFailure(key) {
      const s = state.get(key) || { failures: 0, openedAt: null, firstFailureAt: Date.now() };
      // Reset window if we've drifted past it without tripping.
      if (Date.now() - s.firstFailureAt > windowMs) {
        s.failures = 0;
        s.firstFailureAt = Date.now();
        s.openedAt = null;
      }
      s.failures += 1;
      if (s.failures >= failureThreshold) s.openedAt = Date.now();
      state.set(key, s);
    }
  };
}

/**
 * Wraps a provider's `invoke` with timeout + retry + circuit breaker.
 *
 * @param {object} provider - AI provider adapter (must expose .providerId & .invoke)
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=20000]
 * @param {number} [opts.maxRetries=2]
 * @param {number} [opts.baseDelayMs=200]
 * @param {object} [opts.breaker]   - shared per-process or per-tenant
 * @param {function(string):string} [opts.keyFn]
 */
export function wrapWithResilience(provider, opts = {}) {
  const timeoutMs   = opts.timeoutMs   ?? 20_000;
  const maxRetries  = opts.maxRetries  ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const breaker     = opts.breaker     ?? createCircuitBreaker();
  const keyFn       = opts.keyFn       ?? (() => provider.providerId);

  return {
    ...provider,
    breaker,                                     // exposed for tests
    async invoke(args) {
      const key = keyFn(args);
      breaker.check(key);                        // throws CircuitOpenError if open

      let attempt = 0;
      let lastErr;
      while (attempt <= maxRetries) {
        try {
          const result = await withTimeout(provider.invoke(args), timeoutMs);
          breaker.onSuccess(key);
          if (attempt > 0) log.info('resilience.recovered', { provider: provider.providerId, attempt });
          return result;
        } catch (err) {
          lastErr = err;
          if (!isTransient(err) || attempt === maxRetries) {
            breaker.onFailure(key);
            throw err;
          }
          // Exponential backoff with full jitter.
          const delay = Math.floor(Math.random() * (baseDelayMs * 2 ** attempt));
          log.warn('resilience.retrying', { provider: provider.providerId, attempt: attempt + 1, delayMs: delay });
          await new Promise(r => setTimeout(r, delay));
          attempt += 1;
        }
      }
      throw lastErr;
    }
  };
}
