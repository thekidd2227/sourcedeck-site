// server/src/services/ai/agents.js
// Agent registry — single source of truth for the /agents/ marketing
// page AND the /api/v1/agents/* runtime endpoints.
//
// Each entry maps a marketing card to a real workflow (registered in
// workflows.js), declares the input shape the API will accept, and
// surfaces the metadata the static page renders. If a card here is not
// also in WORKFLOWS, the contract test fails. If a workflow id changes,
// it must change here too. This is the seam that prevents the page
// from drifting back into being aspirational.

import { resolveWorkflow } from './workflows.js';

/**
 * @typedef {object} AgentDef
 * @property {string}   id              public agent id (URL-safe)
 * @property {string}   name            display name
 * @property {string}   icon            single emoji for the card
 * @property {string}   description     marketing card body
 * @property {string}   workflowType    id from workflows.js
 * @property {'live'|'beta'|'soon'} status
 * @property {string[]} tags            short pill labels
 * @property {string[]} tiers           tier names where the agent is sold
 * @property {string}   eventHook       event the agent listens for, doc-only
 * @property {object}   input           json-schema-ish input shape
 *                                      { fields: [{name, required, hint}] }
 *                                      The /run endpoint flattens these
 *                                      into the prompt content body.
 */

/** @type {Record<string, AgentDef>} */
export const AGENTS = Object.freeze({
  reply_classifier: {
    id: 'reply_classifier',
    name: 'Reply Classifier',
    icon: '🧠',
    description:
      'Tags every inbound reply as positive / objection / unsubscribe / out-of-office / question / referral. ' +
      'Surfaces sentiment, urgency, and a one-line next-action. Powered by watsonx through the SourceDeck AI Gateway.',
    workflowType: 'reply_classify',
    status: 'live',
    tags: ['Email', 'Triage', 'watsonx'],
    tiers: ['Core', 'Pro', 'Business', 'Operator', 'Enterprise'],
    eventHook: 'reply_received',
    input: { fields: [
      { name: 'subject',   required: false, hint: 'Reply subject line' },
      { name: 'from',      required: false, hint: 'Sender address' },
      { name: 'body',      required: true,  hint: 'Reply body text' }
    ]}
  },

  lead_scorer: {
    id: 'lead_scorer',
    name: 'Lead Scorer',
    icon: '📊',
    description:
      'Scores every new lead 0–100 on fit × intent using firmographics, role match, geo signals, and engagement. ' +
      'Returns a tier bucket and a recommended next step. Governed workflow — runs on watsonx only.',
    workflowType: 'lead_score',
    status: 'live',
    tags: ['Pipeline', 'Governed', 'watsonx'],
    tiers: ['Pro', 'Business', 'Operator', 'Enterprise', 'Government'],
    eventHook: 'lead_qualified',
    input: { fields: [
      { name: 'company',       required: true,  hint: 'Company name' },
      { name: 'role',          required: true,  hint: "Lead's job title" },
      { name: 'industry',      required: false, hint: 'Industry / NAICS' },
      { name: 'company_size',  required: false, hint: 'Employee count or revenue band' },
      { name: 'geo',           required: false, hint: 'Geo / region' },
      { name: 'notes',         required: false, hint: 'Free-text context, source, intent signals' }
    ]}
  },

  proposal_drafter: {
    id: 'proposal_drafter',
    name: 'Proposal Drafter',
    icon: '📝',
    description:
      'Generates a fully branded proposal from a deal context. Returns executive summary, scope sections, ' +
      'pricing options, assumptions, next steps, and signature block. Governed workflow — saved deliverables run on watsonx only.',
    workflowType: 'proposal_draft',
    status: 'live',
    tags: ['Revenue', 'Governed', 'watsonx'],
    tiers: ['Operator', 'Enterprise', 'Government'],
    eventHook: 'deal_stage_proposal',
    input: { fields: [
      { name: 'client_name',   required: true,  hint: 'Client / counterparty name' },
      { name: 'project_scope', required: true,  hint: 'Stated scope summary' },
      { name: 'budget',        required: false, hint: 'Stated budget or pricing context' },
      { name: 'timeline',      required: false, hint: 'Target start / delivery date' },
      { name: 'deal_notes',    required: false, hint: 'Discovery notes, prior threads, win-themes' }
    ]}
  },

  bounce_guard: {
    id: 'bounce_guard',
    name: 'Bounce Guard',
    icon: '🔔',
    description:
      'Analyzes the campaign deliverability snapshot and recommends whether to pause. Returns severity, ' +
      'top failure addresses, and remediation steps. Drafting-eligible — does not write to live campaign state until you click Apply.',
    workflowType: 'bounce_guard',
    status: 'live',
    tags: ['Deliverability', 'Operations', 'watsonx'],
    tiers: ['Core', 'Pro', 'Business', 'Operator', 'Enterprise'],
    eventHook: 'bounce_rate_threshold',
    input: { fields: [
      { name: 'campaign_id',   required: true,  hint: 'Campaign identifier' },
      { name: 'sends',         required: true,  hint: 'Sends in the window (integer)' },
      { name: 'bounces',       required: true,  hint: 'Bounces in the window (integer)' },
      { name: 'sample_failures', required: false, hint: 'Sample failing addresses, comma-separated' }
    ]}
  },

  meeting_summarizer: {
    id: 'meeting_summarizer',
    name: 'Meeting Summarizer',
    icon: '🗣️',
    description:
      'Ingests Cal.com / Zoom / Fathom transcripts. Outputs a 5-line summary, three action items with owners and due-offsets, ' +
      'and a next-touch recommendation written back to the deal workspace.',
    workflowType: 'meeting_summary',
    status: 'live',
    tags: ['Revenue', 'Triage', 'watsonx'],
    tiers: ['Pro', 'Business', 'Operator', 'Enterprise'],
    eventHook: 'meeting_completed',
    input: { fields: [
      { name: 'transcript', required: true,  hint: 'Raw transcript text (truncated to tier maxInputChars)' },
      { name: 'attendees',  required: false, hint: 'Comma-separated attendee names' },
      { name: 'meeting_at', required: false, hint: 'When the meeting happened (ISO date)' }
    ]}
  },

  rfp_responder: {
    id: 'rfp_responder',
    name: 'RFP Responder',
    icon: '🏛️',
    description:
      'Ingests solicitation excerpts (SAM.gov, state, commercial). Outputs parsed requirements, compliance matrix, ' +
      'section response drafts, a past-performance retrieval query, and a pWIN estimate with rationale. Governed workflow.',
    workflowType: 'rfp_response',
    status: 'live',
    tags: ['GovCon', 'Governed', 'watsonx'],
    tiers: ['Operator', 'Enterprise', 'Government'],
    eventHook: 'rfp_uploaded',
    input: { fields: [
      { name: 'solicitation_id', required: false, hint: 'SAM.gov notice ID, RFP number, etc.' },
      { name: 'agency',          required: false, hint: 'Issuing agency / department' },
      { name: 'naics',           required: false, hint: 'NAICS code' },
      { name: 'set_aside',       required: false, hint: 'Set-aside type (SDVOSB, 8(a), HUBZone, …)' },
      { name: 'solicitation_text', required: true, hint: 'Solicitation excerpt to analyze' }
    ]}
  },

  denial_predictor: {
    id: 'denial_predictor',
    name: 'Denial Predictor',
    icon: '🩺',
    description:
      'MedPilot vertical pack. Flags claim denial risk before submission based on documentation gaps, code mismatches, ' +
      'and payer-policy deltas. Governed + HIPAA-aware — input MUST be de-identified; the prompt instructs the model not to echo PHI.',
    workflowType: 'denial_predict',
    status: 'live',
    tags: ['MedPilot', 'Governed', 'watsonx', 'HIPAA-aware'],
    tiers: ['Operator', 'Enterprise'],
    eventHook: 'claim_ready',
    input: { fields: [
      { name: 'cpt_codes',          required: true,  hint: 'Comma-separated CPT codes' },
      { name: 'icd_codes',          required: true,  hint: 'Comma-separated ICD-10 codes' },
      { name: 'payer',              required: false, hint: 'Payer name / id' },
      { name: 'modifiers',          required: false, hint: 'Modifiers used (comma-separated)' },
      { name: 'documentation_excerpt', required: true, hint: 'De-identified documentation excerpt' }
    ]}
  },

  followup_engine: {
    id: 'followup_engine',
    name: 'Follow-Up Engine',
    icon: '🔁',
    description:
      'Detects 48h+ reply silence on in-progress deals. Drafts a context-aware nudge and routes to the owner ' +
      'for one-click send, or auto-sends only when tenant policy allows. Drafting-eligible.',
    workflowType: 'followup_draft',
    status: 'live',
    tags: ['Pipeline', 'Triage', 'watsonx'],
    tiers: ['Pro', 'Business', 'Operator', 'Enterprise'],
    eventHook: 'reply_silence_48h',
    input: { fields: [
      { name: 'deal_stage',        required: true,  hint: 'Current deal stage' },
      { name: 'last_message_at',   required: true,  hint: 'Timestamp of last meaningful exchange' },
      { name: 'last_message_body', required: true,  hint: 'Last meaningful message body' },
      { name: 'owner',             required: false, hint: 'Deal owner name' }
    ]}
  },

  sla_watcher: {
    id: 'sla_watcher',
    name: 'SLA Watcher',
    icon: '⏱️',
    description:
      'Given an SLA breach record, recommends priority, owner role, escalation, customer message, and internal action. ' +
      'Governed workflow so the recommendations are auditable and reproducible.',
    workflowType: 'sla_watch',
    status: 'live',
    tags: ['Governance', 'Operations', 'watsonx'],
    tiers: ['Operator', 'Enterprise', 'Government'],
    eventHook: 'sla_breach',
    input: { fields: [
      { name: 'sla_name',     required: true,  hint: 'SLA name (e.g. "first-response-24h")' },
      { name: 'breached_at',  required: true,  hint: 'Breach timestamp (ISO)' },
      { name: 'minutes_late', required: true,  hint: 'How late, in minutes' },
      { name: 'customer_id',  required: false, hint: 'Affected customer/tenant' },
      { name: 'context',      required: false, hint: 'Free-text context' }
    ]}
  }
});

export function listAgents() { return Object.values(AGENTS); }

export function getAgent(id) {
  const a = AGENTS[id];
  if (!a) throw new Error(`agents: unknown id "${id}"`);
  return a;
}

/** Validates input shape and returns the normalized prompt content. */
export function buildAgentInput(agentId, input = {}) {
  const a = getAgent(agentId);
  const missing = a.input.fields.filter(f => f.required && !input[f.name]).map(f => f.name);
  if (missing.length) {
    const err = new Error(`agents: missing required fields: ${missing.join(', ')}`);
    err.code = 'missing_fields';
    err.fields = missing;
    throw err;
  }
  // Flatten the input into a stable, model-friendly text body.
  const lines = a.input.fields
    .filter(f => input[f.name] !== undefined && input[f.name] !== null && String(input[f.name]).length)
    .map(f => `${f.name.toUpperCase().replace(/_/g, ' ')}: ${String(input[f.name])}`);
  return lines.join('\n');
}

/** Cross-check helper used by the contract test. */
export function assertAgentsHaveWorkflows() {
  for (const a of Object.values(AGENTS)) {
    const wf = resolveWorkflow(a.workflowType);
    if (wf.unknown) throw new Error(`agents: workflow "${a.workflowType}" not registered for agent "${a.id}"`);
  }
}
