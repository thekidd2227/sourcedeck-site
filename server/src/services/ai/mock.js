// server/src/services/ai/mock.js
// Mock AI provider for local development and tests. Deterministic outputs
// per task — no network, no credentials.

import { getPrompt } from './prompts.js';

export function createMockProvider() {
  return {
    // Legacy alias preserved for backwards compatibility.
    name:        'mock',
    providerId:  'mock',
    displayName: 'Mock (local)',
    modelId:     'mock-deterministic-v1',

    /** Mock works for any workflow — only used in dev/tests. */
    supportsWorkflow(_category) { return true; },
    redactForLogging(req) {
      const { input, ...rest } = req || {};
      return { ...rest, input: input ? '[REDACTED]' : undefined };
    },
    async healthCheck() { return { ok: true }; },

    async invoke({ promptId, content }) {
      const p = getPrompt(promptId);
      const t0 = Date.now();
      const output = mockOutput(p.task, content, promptId);
      return {
        promptId,
        promptVersion: p.version,
        modelId:       'mock-deterministic-v1',
        provider:      'mock',
        output,
        usage:         { inputChars: (content || '').length, outputChars: JSON.stringify(output).length },
        latencyMs:     Date.now() - t0
      };
    }
  };
}

function mockOutput(task, content, promptId) {
  const head = (content || '').slice(0, 80).replace(/\s+/g, ' ').trim();

  // Per-agent shape-correct fixtures so dev runs return realistic JSON.
  switch (promptId) {
    case 'reply_classify_v1':
      return { classification: 'question', sentiment: 0.2, urgency: 'medium',
               next_action: 'Answer the pricing question; offer a 15-min call.',
               rationale: '[mock] Reply contains a direct question about plan tiers.' };
    case 'lead_score_v1':
      return { score: 72, fit: 75, intent: 68, tier: 'warm',
               rationale: '[mock] Mid-market PM firm in target NAICS with stated need.',
               recommended_next_step: 'Send Operator-tier proposal; book discovery call.' };
    case 'proposal_draft_v1':
      return { title: '[mock] SourceDeck Operator Tier - Proposal',
               executive_summary: 'Deploy SourceDeck Operator across the workspace…',
               scope_sections: [
                 { heading: 'Workflow Setup', body: '[mock] Configure governed workflows…' },
                 { heading: 'Integrations',   body: '[mock] Wire Stripe, COS, watsonx…' }
               ],
               pricing_options: [
                 { tier: 'Operator', price: '$999/mo', includes: ['Audit', 'BYOK', 'SSO-ready'] }
               ],
               assumptions: ['Existing email infra in place', 'Tenant admin available'],
               next_steps: ['Sign MSA', 'Kickoff in 5 business days'],
               close_signature_block: '[mock] Authorized signer block here.' };
    case 'bounce_guard_v1':
      return { pause_recommended: true, severity: 'high',
               reason: '[mock] Bounce rate 4.2% over last 50 sends exceeds 3% threshold.',
               top_failure_addresses: ['unknown@example1.invalid', 'unknown@example2.invalid'],
               recommended_actions: ['Pause campaign', 'Re-verify list with MX check', 'Trim role-based addresses'] };
    case 'meeting_summary_v1':
      return { summary_lines: [
                 '[mock] Discussed Operator tier scope.',
                 '[mock] Customer needs governance + audit exports.',
                 '[mock] Pricing aligned at $999/mo.',
                 '[mock] Two stakeholders to loop in by Friday.',
                 '[mock] Mutual close target end of next month.'
               ],
               action_items: [
                 { owner: 'jean@arivergrop.com',    action: 'Send proposal',         due_offset_days: 1 },
                 { owner: 'customer-stakeholder',   action: 'Loop in CFO + IT',      due_offset_days: 2 },
                 { owner: 'jean@arivergrop.com',    action: 'Schedule security call', due_offset_days: 3 }
               ],
               next_touch: { channel: 'email', when: 'tomorrow 9am ET',
                             message_draft: '[mock] Following up with the proposal we discussed…' } };
    case 'rfp_response_v1':
      return { parsed_requirements: [{ section: 'L.2', requirement: '[mock] Past performance summary', page_ref: 'p.12' }],
               compliance_matrix:    [{ requirement_id: 'L.2', where_addressed: 'Section 4', status: 'addressed' }],
               response_section_drafts: [{ heading: 'Past Performance', body: '[mock] Three relevant contracts…', evidence_needed: ['DD-2579', 'PWS excerpts'] }],
               past_performance_match_query: 'PM contracts in DC metro 2024-2026',
               pwin_estimate: 41, pwin_rationale: '[mock] Strong fit on NAICS, weak on staffing depth.' };
    case 'denial_predict_v1':
      return { denial_risk: 'medium', risk_score: 56,
               documentation_gaps: ['Missing time-of-service notes for code 99213'],
               code_mismatch_warnings: ['Modifier 25 used without separate E&M documentation'],
               payer_policy_flags: ['Payer X requires prior auth for code 70551'],
               recommended_fixes: ['Add documentation', 'Confirm prior auth'] };
    case 'followup_draft_v1':
      return { subject: '[mock] Quick follow-up on next steps',
               body: '[mock] Hi — circling back on the proposal we shared Tuesday…',
               tone: 'warm', call_to_action: 'Reply with a 15-min slot this week.',
               confidence: 0.78, should_auto_send: false,
               reasoning: 'Drafted but routed to owner for review.' };
    case 'sla_watch_v1':
      return { priority: 'high', recommended_owner_role: 'admin',
               escalation_required: true, customer_impact: '[mock] First-response SLA missed by 6h.',
               recommended_message_to_customer: '[mock] Apologies for the delay — here is the update…',
               internal_action: 'Reassign to senior CSM; review on-call rotation.' };
  }

  // Fallback by task type (legacy prompts).
  switch (task) {
    case 'summarize':
      return {
        summary: `[mock] Document begins: "${head}..."`,
        parties: ['Party A', 'Party B'],
        dates:   ['2026-01-01', '2027-01-01'],
        amounts: ['$10,000.00'],
        risks:   ['indemnification scope', 'unilateral termination clause']
      };
    case 'extract':
      return {
        title:           '[mock] Sample Agreement',
        effective_date:  '2026-01-01',
        expiration_date: '2027-01-01',
        parties:         ['Party A', 'Party B'],
        total_value:     '$10,000.00',
        governing_law:   'State of Delaware',
        signatories:     ['Jane Doe', 'John Roe']
      };
    case 'classify':
      return {
        classification: 'msa',
        confidence:     0.78,
        rationale:      '[mock] Contains master-services language and ordering structure.'
      };
    case 'checklist':
      return {
        items: [
          { name: 'Counter-sign MSA',           owner_role: 'admin',   due_offset_days: 1, evidence_required: true,  approval_required: true  },
          { name: 'File DPA exhibit',           owner_role: 'analyst', due_offset_days: 2, evidence_required: true,  approval_required: false },
          { name: 'Add to renewal calendar',    owner_role: 'analyst', due_offset_days: 3, evidence_required: false, approval_required: false }
        ]
      };
    default:
      return { note: '[mock] no template for task=' + task };
  }
}
