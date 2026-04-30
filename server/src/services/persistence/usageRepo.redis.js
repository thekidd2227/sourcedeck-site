// server/src/services/persistence/usageRepo.redis.js
// Redis-backed AI usage metering. Atomic per-tenant per-day counters
// via INCR + EXPIRE so multi-replica deployments don't race.
//
// Lazy-imports `redis` so the package is optional at install time.

import { log } from '../../logger.js';

function dayBucket(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function k(tenantId, day, suffix = '') {
  return suffix ? `sd:usage:${tenantId}:${day}:${suffix}` : `sd:usage:${tenantId}:${day}`;
}

const TTL_SECONDS = 60 * 60 * 26; // 26h — covers UTC-day rollover plus margin

export async function createRedisUsageRepo(cfg = {}) {
  const url = cfg.redisUrl || process.env.REDIS_URL;
  if (!url) throw new Error('persistence.redis: REDIS_URL required');

  let createClient;
  try {
    ({ createClient } = await import('redis'));
  } catch {
    throw new Error('persistence.redis: redis package not installed. Run `npm i redis` in server/.');
  }

  const client = createClient({ url });
  client.on('error', (err) => log.error('redis.error', { code: err?.code, msg: err?.message }));
  await client.connect();

  return {
    name:       'redis',
    isInMemory: false,

    async record({ tenantId, userId, workflowType, taskType, providerId, credentialMode, ts = Date.now() }) {
      const day = dayBucket(ts);
      // Pipeline: bump counters atomically, then set TTL once.
      const multi = client.multi();
      multi.incr(k(tenantId, day));
      multi.incr(k(tenantId, day, `provider:${providerId}`));
      multi.incr(k(tenantId, day, `user:${userId}`));
      multi.incr(k(tenantId, day, `wf:${workflowType}`));
      multi.expire(k(tenantId, day), TTL_SECONDS);
      multi.expire(k(tenantId, day, `provider:${providerId}`), TTL_SECONDS);
      multi.expire(k(tenantId, day, `user:${userId}`), TTL_SECONDS);
      multi.expire(k(tenantId, day, `wf:${workflowType}`), TTL_SECONDS);
      const results = await multi.exec();
      // results[0] is the new top-level count.
      const count = Number(results?.[0] ?? 0);
      // Ignore taskType + credentialMode in counter keys (high cardinality);
      // they're emitted in the audit event already.
      return { count, day };
    },

    async countToday({ tenantId, ts = Date.now() }) {
      const v = await client.get(k(tenantId, dayBucket(ts)));
      return Number(v ?? 0);
    },

    async snapshot({ tenantId, ts = Date.now() }) {
      const day = dayBucket(ts);
      const top = Number((await client.get(k(tenantId, day))) ?? 0);
      // Best-effort scan of bucket facets for the snapshot view.
      const facets = { byProvider: {}, byUser: {}, byWorkflow: {} };
      for await (const key of client.scanIterator({ MATCH: `sd:usage:${tenantId}:${day}:*`, COUNT: 200 })) {
        const v = Number((await client.get(key)) ?? 0);
        const tail = key.split(':').slice(4).join(':');                  // strip "sd:usage:tenantId:day:"
        if (tail.startsWith('provider:')) facets.byProvider[tail.slice(9)]  = v;
        else if (tail.startsWith('user:')) facets.byUser[tail.slice(5)]    = v;
        else if (tail.startsWith('wf:'))   facets.byWorkflow[tail.slice(3)] = v;
      }
      return { day, count: top, ...facets };
    },

    async clear() {
      // Test helper only — scans + deletes all sd:usage:* keys.
      for await (const key of client.scanIterator({ MATCH: 'sd:usage:*', COUNT: 200 })) {
        await client.del(key);
      }
    },

    async _close() { await client.quit(); }
  };
}
