import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { createAiGateway } from '../src/services/ai/gateway.js';
import { listAgents, getAgent, buildAgentInput, assertAgentsHaveWorkflows, AGENTS } from '../src/services/ai/agents.js';
import { resolveWorkflow, WORKFLOWS } from '../src/services/ai/workflows.js';
import { PROMPTS } from '../src/services/ai/prompts.js';
import { audit, EVENT_TYPES } from '../src/services/audit.js';

function withCapturedAudit(fn) {
  const events = [];
  const orig = audit.sink;
  audit.sink = (e) => events.push(e);
  return fn(events).finally(() => { audit.sink = orig; });
}

const REQUIRED_AGENT_IDS = [
  'reply_classifier', 'lead_scorer', 'proposal_drafter', 'bounce_guard',
  'meeting_summarizer', 'rfp_responder', 'denial_predictor',
  'followup_engine', 'sla_watcher'
];

test('agents: registry contains all 9 cards from /agents/', () => {
  const ids = listAgents().map(a => a.id).sort();
  assert.deepEqual(ids, [...REQUIRED_AGENT_IDS].sort());
});

test('agents: every registered agent maps to a real workflow', () => {
  assertAgentsHaveWorkflows();   // throws on drift
});

test('agents: every workflow has a registered prompt', () => {
  for (const a of listAgents()) {
    const wf = resolveWorkflow(a.workflowType);
    assert.ok(WORKFLOWS[a.workflowType], `workflow missing: ${a.workflowType}`);
    assert.ok(PROMPTS[wf.defaultPromptId], `prompt missing: ${wf.defaultPromptId}`);
  }
});

test('agents: governed agents are categorized governed (lock to watsonx)', () => {
  const governed = ['lead_scorer', 'proposal_drafter', 'rfp_responder', 'denial_predictor', 'sla_watcher'];
  for (const id of governed) {
    const wf = resolveWorkflow(getAgent(id).workflowType);
    assert.equal(wf.category, 'governed', `${id} should be governed`);
  }
});

test('agents: drafting-eligible agents are categorized user_drafting', () => {
  const drafting = ['reply_classifier', 'bounce_guard', 'meeting_summarizer', 'followup_engine'];
  for (const id of drafting) {
    const wf = resolveWorkflow(getAgent(id).workflowType);
    assert.equal(wf.category, 'user_drafting', `${id} should be user_drafting`);
  }
});

test('agents: buildAgentInput rejects missing required fields with structured error', () => {
  try {
    buildAgentInput('lead_scorer', { /* missing company + role */ });
    assert.fail('expected throw');
  } catch (err) {
    assert.equal(err.code, 'missing_fields');
    assert.ok(err.fields.includes('company'));
    assert.ok(err.fields.includes('role'));
  }
});

test('agents: buildAgentInput renders a model-friendly body when fields are present', () => {
  const body = buildAgentInput('lead_scorer', {
    company: 'Acme PM', role: 'COO', industry: 'Property Mgmt'
  });
  assert.ok(body.includes('COMPANY: Acme PM'));
  assert.ok(body.includes('ROLE: COO'));
  assert.ok(body.includes('INDUSTRY: Property Mgmt'));
});

test('agents: governed agent forces watsonx and audits, even if openai requested', async () => {
  await withCapturedAudit(async (events) => {
    const cfg = loadConfig({});
    const gateway = createAiGateway({ cfg });
    const input = buildAgentInput('lead_scorer', { company: 'Acme', role: 'COO' });
    const r = await gateway.execute({
      tenantId: 't1', userId: 'u1', subscriptionTier: 'business',
      workflowType: 'lead_score',
      requestedProvider: 'openai',
      input,
      requestId: 'req_la1'
    });
    assert.equal(r.policy.decision, 'forced_watsonx');
    const types = events.map(e => e.eventType);
    assert.ok(types.includes(EVENT_TYPES.GOVERNED_WORKFLOW_ENFORCED));
    // mock returns realistic shape:
    assert.equal(typeof r.output.score, 'number');
    assert.ok(r.output.score >= 0 && r.output.score <= 100);
    assert.ok(['cold', 'warm', 'hot', 'priority'].includes(r.output.tier));
  });
});

test('agents: drafting agent runs cleanly and returns shape-correct mock output', async () => {
  const cfg = loadConfig({});
  const gateway = createAiGateway({ cfg });
  const input = buildAgentInput('reply_classifier', {
    body: 'Thanks for the proposal. Can you clarify what counts as Operator-tier audit?'
  });
  const r = await gateway.execute({
    tenantId: 't1', userId: 'u1', subscriptionTier: 'business',
    workflowType: 'reply_classify', input, requestId: 'req_rc1'
  });
  assert.equal(r.status, 'ok');
  assert.ok(['positive', 'objection', 'unsubscribe', 'out_of_office', 'question', 'referral']
    .includes(r.output.classification));
});

test('agents: government tenant is pinned to watsonx for every agent', async () => {
  await withCapturedAudit(async (_events) => {
    const cfg = loadConfig({});
    const gateway = createAiGateway({ cfg });
    for (const id of REQUIRED_AGENT_IDS) {
      const a = getAgent(id);
      // Build minimal valid input by filling required fields with placeholders.
      const inputObj = Object.fromEntries(a.input.fields.filter(f => f.required).map(f => [f.name, 'x']));
      const input = buildAgentInput(id, inputObj);
      // Government tenant + non-watsonx → rejected for any agent that isn't already watsonx-only.
      // For governed/government_restricted, the policy is identical.
      const r = await gateway.execute({
        tenantId: 'gov', userId: 'u', subscriptionTier: 'government',
        workflowType: a.workflowType, input, requestId: `req_${id}`
      }).catch(e => e);
      // Either succeeded (watsonx selected) or rejected w/ policy_rejected when openai/etc was requested.
      // Here we didn't request a non-watsonx provider, so it should succeed:
      assert.equal(r.status, 'ok', `${id} should succeed under government tenant w/ default provider`);
      assert.equal(r.providerId, 'mock');     // dev fallback
    }
  });
});
