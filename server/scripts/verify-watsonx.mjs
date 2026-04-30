#!/usr/bin/env node
// server/scripts/verify-watsonx.mjs
//
// One-shot verification that the AI Gateway is wired to real watsonx.
// Loads .env (Node 20.6+ via --env-file or shell-exported), boots the
// gateway, runs each of the 9 agents once with a small synthetic input,
// and prints a summary table.
//
// Usage:
//   cd server
//   node --env-file=.env scripts/verify-watsonx.mjs
//
// Exit codes:
//   0 = at least one provider reached real watsonx
//   1 = all calls fell back to mock (env probably missing)
//   2 = config / network failure

import { loadConfig } from '../src/config.js';
import { createAiGateway } from '../src/services/ai/gateway.js';
import { listAgents, buildAgentInput } from '../src/services/ai/agents.js';
import { audit } from '../src/services/audit.js';

// Silence the audit firehose for this CLI run; we only want the table.
audit.sink = () => {};

const cfg = loadConfig();
const g   = createAiGateway({ cfg });

console.log('\nSourceDeck AI verify — booting with config:');
console.log(`  AI_PROVIDER     = ${cfg.ai.provider}`);
console.log(`  WATSONX_URL     = ${cfg.ai.watsonx.url || '(unset)'}`);
console.log(`  WATSONX_MODEL   = ${cfg.ai.watsonx.modelId}`);
console.log(`  has API_KEY     = ${cfg.ai.watsonx.apiKey ? 'yes' : 'NO'}`);
console.log(`  has PROJECT/SPACE = ${cfg.ai.watsonx.projectId || cfg.ai.watsonx.spaceId ? 'yes' : 'NO'}`);
console.log('');

if (cfg.ai.provider !== 'watsonx') {
  console.error(`AI_PROVIDER is "${cfg.ai.provider}", not "watsonx". Set AI_PROVIDER=watsonx in .env.`);
  process.exit(2);
}
if (!cfg.ai.watsonx.apiKey || !(cfg.ai.watsonx.projectId || cfg.ai.watsonx.spaceId)) {
  console.error('Missing WATSONX_API_KEY or WATSONX_PROJECT_ID/SPACE_ID. Calls will fall back to mock.');
}

const SAMPLES = {
  reply_classifier:    { body: 'Thanks for the proposal — can you clarify what counts as Operator-tier audit?' },
  lead_scorer:         { company: 'Acme Property Mgmt', role: 'COO', industry: 'Property Management', notes: 'Inbound from /pricing.' },
  proposal_drafter:    { client_name: 'Acme PM', project_scope: 'Operator tier deployment with audit + BYOK', budget: '$999/mo', timeline: 'kickoff in 2 weeks' },
  bounce_guard:        { campaign_id: 'camp_demo_001', sends: '120', bounces: '7', sample_failures: 'unknown@x.invalid, dead@y.invalid' },
  meeting_summarizer:  { transcript: 'Customer asked about Operator tier scope. We confirmed audit + BYOK are included. Action: send proposal by Friday. Next call Tuesday 9am ET.' },
  rfp_responder:       { agency: 'GSA', naics: '541611', solicitation_text: 'L.2 Past Performance: Provide three relevant contracts in the last 5 years. M.1 Evaluation criteria: technical 40, past perf 30, price 30.' },
  denial_predictor:    { cpt_codes: '99213', icd_codes: 'E11.9', payer: 'Aetna', documentation_excerpt: 'Routine follow-up visit, no acute complaints noted; chronic dx well-controlled.' },
  followup_engine:     { deal_stage: 'proposal_sent', last_message_at: '2026-04-26T10:00:00Z', last_message_body: 'Sent the Operator-tier proposal Tuesday; awaiting feedback.' },
  sla_watcher:         { sla_name: 'first-response-24h', breached_at: '2026-04-30T03:00:00Z', minutes_late: '360', context: 'Customer ticket #4421' }
};

const results = [];

for (const a of listAgents()) {
  const sample = SAMPLES[a.id];
  if (!sample) { results.push({ id: a.id, status: 'skip', note: 'no sample' }); continue; }
  try {
    const input = buildAgentInput(a.id, sample);
    const t0 = Date.now();
    const r = await g.execute({
      tenantId: 'verify_t', userId: 'verify_u',
      subscriptionTier: 'business',
      workflowType:    a.workflowType,
      input,
      requestId:       'verify_' + a.id
    });
    results.push({
      id:        a.id,
      status:    'ok',
      provider:  r.providerId,
      modelId:   r.modelId,
      promptVer: r.promptVersion,
      latencyMs: Date.now() - t0,
      decision:  r.policy?.decision,
      sample:    JSON.stringify(r.output).slice(0, 80) + '…'
    });
  } catch (err) {
    results.push({ id: a.id, status: 'fail', error: err.message?.slice(0, 80) });
  }
}

// Pretty print.
const cols = [
  { h: 'agent',     w: 22, k: 'id'        },
  { h: 'provider',  w: 9,  k: 'provider'  },
  { h: 'model',     w: 30, k: 'modelId'   },
  { h: 'pv',        w: 4,  k: 'promptVer' },
  { h: 'ms',        w: 6,  k: 'latencyMs' },
  { h: 'decision',  w: 14, k: 'decision'  },
  { h: 'output',    w: 40, k: 'sample'    }
];
function pad(s, w) { s = String(s ?? ''); return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length); }
console.log(cols.map(c => pad(c.h, c.w)).join('  '));
console.log(cols.map(c => '─'.repeat(c.w)).join('  '));
for (const r of results) {
  if (r.status === 'fail') {
    console.log(pad(r.id, cols[0].w) + '  ' + pad('FAIL', 9) + '  ' + pad(r.error, 80));
    continue;
  }
  console.log(cols.map(c => pad(r[c.k], c.w)).join('  '));
}

const reachedWatsonx = results.filter(r => r.provider === 'watsonx').length;
const fellBackMock   = results.filter(r => r.provider === 'mock').length;
const failed         = results.filter(r => r.status === 'fail').length;

console.log('');
console.log(`watsonx hits: ${reachedWatsonx}    mock fallbacks: ${fellBackMock}    failures: ${failed}`);

if (failed === results.length)       process.exit(2);
if (reachedWatsonx === 0)            process.exit(1);
process.exit(0);
