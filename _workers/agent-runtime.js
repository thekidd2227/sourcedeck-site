/**
 * SourceDeck · Agent Runtime Worker (scaffold)
 *
 * Purpose: execute scheduled + event-triggered agents.
 *  - Scheduled: cron triggers walk the `agents` table, fire matching runs.
 *  - Event: POST /fire receives sd_events, fans out to subscribed agents.
 *
 * Not deployed. Wire Cloudflare Workers + D1/KV bindings before shipping.
 * Spec of record: /docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md §14 (agents).
 */

export default {
  async scheduled(event, env, ctx) {
    // cron: */5 * * * *  (every 5 min)
    ctx.waitUntil(tickScheduled(env, event.scheduledTime));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/fire') {
      const body = await request.json().catch(() => null);
      if (!body || !body.type) return json({ error: 'missing event type' }, 400);
      const runs = await fanout(env, body);
      return json({ dispatched: runs.length, runs });
    }
    if (url.pathname === '/health') return json({ ok: true, worker: 'agent-runtime' });
    return new Response('Not found', { status: 404 });
  }
};

async function tickScheduled(env, now) {
  // TODO: SELECT * FROM agents WHERE enabled AND next_run_at <= now
  // For each: enqueue run, update next_run_at via cron expression.
  return { scanned: 0, fired: 0, at: new Date(now).toISOString() };
}

async function fanout(env, evt) {
  // TODO: SELECT * FROM agents WHERE enabled AND trigger_type='event'
  //   AND trigger_config->>'event_type' = evt.type
  //   AND (trigger_config->'filter' matches evt)
  // enqueue run per match.
  return [];
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
