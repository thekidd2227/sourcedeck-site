import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapWithResilience, createCircuitBreaker, TimeoutError, CircuitOpenError } from '../src/services/ai/resilience.js';

function makeProvider(invoke) {
  return { providerId: 'test', modelId: 'm', invoke };
}

test('resilience: passes through on first success', async () => {
  let calls = 0;
  const p = wrapWithResilience(makeProvider(async () => { calls++; return { ok: true, output: {} }; }));
  const r = await p.invoke({});
  assert.equal(calls, 1);
  assert.equal(r.ok, true);
});

test('resilience: retries transient (5xx) failures up to maxRetries then succeeds', async () => {
  let calls = 0;
  const p = wrapWithResilience(makeProvider(async () => {
    calls++;
    if (calls < 3) throw new Error('upstream 503 service unavailable');
    return { ok: true };
  }), { maxRetries: 3, baseDelayMs: 1 });
  const r = await p.invoke({});
  assert.equal(calls, 3);
  assert.equal(r.ok, true);
});

test('resilience: does NOT retry 4xx / non-transient errors', async () => {
  let calls = 0;
  const p = wrapWithResilience(makeProvider(async () => {
    calls++;
    throw new Error('validation_failed status 400');
  }), { maxRetries: 3, baseDelayMs: 1 });
  await assert.rejects(() => p.invoke({}), /validation_failed/);
  assert.equal(calls, 1);
});

test('resilience: enforces timeout', async () => {
  const p = wrapWithResilience(makeProvider(() => new Promise(() => {})), { timeoutMs: 30, maxRetries: 0 });
  await assert.rejects(() => p.invoke({}), (e) => e instanceof TimeoutError);
});

test('resilience: circuit opens after threshold and rejects fast', async () => {
  const breaker = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 1_000 });
  const p = wrapWithResilience(
    makeProvider(async () => { throw new Error('persistent failure 500'); }),
    { breaker, maxRetries: 0 }
  );

  await assert.rejects(() => p.invoke({}));
  await assert.rejects(() => p.invoke({}));
  // Now circuit is open — next call should reject with CircuitOpenError.
  await assert.rejects(() => p.invoke({}), (e) => e instanceof CircuitOpenError);
});

test('resilience: success resets failure count', async () => {
  const breaker = createCircuitBreaker({ failureThreshold: 2 });
  let mode = 'fail';
  const p = wrapWithResilience(makeProvider(async () => {
    if (mode === 'fail') throw new Error('500');
    return { ok: true };
  }), { breaker, maxRetries: 0 });

  await assert.rejects(() => p.invoke({}));
  mode = 'ok';
  await p.invoke({});
  // Counter should be cleared; another single failure should not trip.
  mode = 'fail';
  await assert.rejects(() => p.invoke({}));
  // Confirm circuit is still closed (i.e. error is the original, not CircuitOpenError).
  await assert.rejects(() => p.invoke({}), (e) => !(e instanceof CircuitOpenError));
});
