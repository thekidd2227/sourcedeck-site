// server/src/services/persistence/usageRepo.memory.js
// In-memory AI usage metering. Dev-only.
//
// Production must bind a Redis-backed (IBM Cloud Databases for Redis)
// adapter that supports atomic INCR + EXPIRE so multi-replica deployments
// don't race. The interface below is intentionally tiny so a Redis impl
// is a one-file swap.

function dayBucket(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

export function createInMemoryUsageRepo() {
  // key: `${tenantId}:${day}` → { count, byProvider, byUser, byWorkflow }
  const counters = new Map();
  // event log for audit replay (small ring; dev-only)
  const events = [];

  function bucket(tenantId, day) {
    const k = `${tenantId}:${day}`;
    if (!counters.has(k)) counters.set(k, { count: 0, byProvider: {}, byUser: {}, byWorkflow: {} });
    return counters.get(k);
  }

  return {
    name:       'memory',
    isInMemory: true,

    async record({ tenantId, userId, workflowType, taskType, providerId, credentialMode, ts = Date.now() }) {
      const day = dayBucket(ts);
      const b = bucket(tenantId, day);
      b.count += 1;
      b.byProvider[providerId] = (b.byProvider[providerId] || 0) + 1;
      b.byUser[userId]         = (b.byUser[userId]         || 0) + 1;
      b.byWorkflow[workflowType] = (b.byWorkflow[workflowType] || 0) + 1;
      const ev = { tenantId, userId, workflowType, taskType, providerId, credentialMode, day, ts };
      events.push(ev);
      if (events.length > 10_000) events.shift();
      return { count: b.count, day };
    },

    async countToday({ tenantId, ts = Date.now() }) {
      const day = dayBucket(ts);
      return bucket(tenantId, day).count;
    },

    async snapshot({ tenantId, ts = Date.now() }) {
      const day = dayBucket(ts);
      return { day, ...clone(bucket(tenantId, day)) };
    },

    async clear() { counters.clear(); events.length = 0; }   // test helper
  };
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
