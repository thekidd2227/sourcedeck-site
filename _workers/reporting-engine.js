/**
 * SourceDeck · Reporting Engine Worker (scaffold)
 *
 * Purpose: assemble weekly + monthly client reports.
 *  - Cron pulls workspace KPIs, renders HTML + PDF, stores in R2.
 *  - POST /render?workspace=X forces a one-off render.
 *  - GET /report/:id streams the saved artifact.
 *
 * Not deployed. Wire R2 + D1 + Postmark bindings before shipping.
 * Spec of record: /docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md §17 (reports).
 */

export default {
  async scheduled(event, env, ctx) {
    // cron: 0 13 * * 1  (Monday 13:00 UTC — Monday 9am ET)
    ctx.waitUntil(renderAllDue(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/render') {
      const ws = url.searchParams.get('workspace');
      if (!ws) return json({ error: 'workspace required' }, 400);
      const report = await renderWorkspaceReport(env, ws, url.searchParams.get('period') || 'weekly');
      return json(report);
    }
    if (url.pathname.startsWith('/report/')) {
      const id = url.pathname.slice('/report/'.length);
      // TODO: stream from R2
      return json({ id, status: 'scaffold' });
    }
    if (url.pathname === '/health') return json({ ok: true, worker: 'reporting-engine' });
    return new Response('Not found', { status: 404 });
  }
};

async function renderAllDue(env) {
  // TODO: SELECT workspace_id, cadence FROM reporting_schedules WHERE next_run_at <= now
  return { rendered: 0 };
}

async function renderWorkspaceReport(env, workspace_id, period) {
  // TODO:
  //  1. Pull KPIs: funnel, pipeline movement, playbook pass-rate, invoice aging.
  //  2. Assemble sections: snapshot · funnel · delivery · billing · risks.
  //  3. Render HTML template + convert via headless Chromium (browser-rendering binding).
  //  4. Save to R2 key `reports/${workspace_id}/${period}/${date}.pdf`.
  //  5. Email via Postmark if workspace.auto_email = true.
  return {
    workspace_id,
    period,
    status: 'scaffolded',
    sections: ['snapshot', 'funnel', 'delivery', 'billing', 'risks']
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
