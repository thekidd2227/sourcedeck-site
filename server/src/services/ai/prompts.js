// server/src/services/ai/prompts.js
// Versioned prompt registry. Bumping a version creates a new entry; the old
// entry stays so historical audit events remain reproducible.
//
// IMPORTANT: prompts here must NOT contain secrets, customer data, or
// document text. Document content is injected at call time, never stored.

export const PROMPTS = Object.freeze({
  document_summary_v1: {
    id:      'document_summary_v1',
    task:    'summarize',
    version: 1,
    template:
      'You are an operations analyst. Summarize the following document in 5 bullet points. ' +
      'Focus on parties, obligations, dates, monetary values, and risks. ' +
      'Output strict JSON with keys: summary (string), parties (string[]), ' +
      'dates (string[]), amounts (string[]), risks (string[]).' +
      '\n\nDOCUMENT:\n{{content}}'
  },

  key_field_extraction_v1: {
    id:      'key_field_extraction_v1',
    task:    'extract',
    version: 1,
    template:
      'Extract the following fields from the document. If a field is not ' +
      'present, return null. Output strict JSON with keys: ' +
      'title, effective_date, expiration_date, parties (string[]), ' +
      'total_value, governing_law, signatories (string[]).' +
      '\n\nDOCUMENT:\n{{content}}'
  },

  document_classification_v1: {
    id:      'document_classification_v1',
    task:    'classify',
    version: 1,
    template:
      'Classify the document into one of: msa, sow, nda, invoice, proposal, ' +
      'rfp, rfq, sam_solicitation, policy, other. Provide a confidence score ' +
      '0..1 and 1-sentence rationale. Output strict JSON with keys: ' +
      'classification, confidence, rationale.' +
      '\n\nDOCUMENT:\n{{content}}'
  },

  action_checklist_v1: {
    id:      'action_checklist_v1',
    task:    'checklist',
    version: 1,
    template:
      'Produce an operator-facing action checklist for this document. ' +
      'Each item has: name, owner_role, due_offset_days, evidence_required, ' +
      'approval_required. Output strict JSON with key: items (array of objects).' +
      '\n\nDOCUMENT:\n{{content}}'
  },

  // ── Agent prompts (one per /agents/ card) ──────────────────────────

  reply_classify_v1: {
    id: 'reply_classify_v1', task: 'classify', version: 1,
    template:
      'You are an inbound-email triage classifier. Classify the reply below into ' +
      'exactly ONE of: positive, objection, unsubscribe, out_of_office, question, referral. ' +
      'Also extract: sentiment (-1..1), urgency (low|medium|high), and one short next_action ' +
      'string for the human owner. Strict JSON keys: classification, sentiment, urgency, next_action, rationale.' +
      '\n\nREPLY:\n{{content}}'
  },

  lead_score_v1: {
    id: 'lead_score_v1', task: 'classify', version: 1,
    template:
      'Score the following lead 0-100 on overall fit x intent for an enterprise B2B operator ' +
      'platform. Use firmographic signals, role match, stated intent, and engagement clues. ' +
      'Strict JSON keys: score (integer 0-100), fit (0-100), intent (0-100), tier ' +
      '(cold|warm|hot|priority), rationale (1-2 sentences), recommended_next_step (string).' +
      '\n\nLEAD CONTEXT:\n{{content}}'
  },

  proposal_draft_v1: {
    id: 'proposal_draft_v1', task: 'generate', version: 1,
    template:
      'Draft a complete branded proposal from the deal context below. Output strict JSON ' +
      'with keys: title, executive_summary, scope_sections (array of {heading, body}), ' +
      'pricing_options (array of {tier, price, includes[]}), assumptions (string[]), ' +
      'next_steps (string[]), close_signature_block (string). Tone: professional, concise, ' +
      'high-trust. No invented client facts; if a field is missing, leave it as TBD.' +
      '\n\nDEAL CONTEXT:\n{{content}}'
  },

  bounce_guard_v1: {
    id: 'bounce_guard_v1', task: 'classify', version: 1,
    template:
      'Analyze the email-deliverability snapshot below. Decide: should the campaign be paused? ' +
      'Strict JSON keys: pause_recommended (boolean), severity (low|medium|high), ' +
      'reason (string), top_failure_addresses (string[]), recommended_actions (string[]).' +
      '\n\nDELIVERABILITY SNAPSHOT:\n{{content}}'
  },

  meeting_summary_v1: {
    id: 'meeting_summary_v1', task: 'summarize', version: 1,
    template:
      'You are a meeting-notes assistant. From the transcript below, output strict JSON keys: ' +
      'summary_lines (exactly 5 short bullet strings), action_items (exactly 3 objects with ' +
      'owner, action, due_offset_days), next_touch (object with channel, when, message_draft).' +
      '\n\nTRANSCRIPT:\n{{content}}'
  },

  rfp_response_v1: {
    id: 'rfp_response_v1', task: 'generate', version: 1,
    template:
      'You are a federal-contracting proposal analyst. From the solicitation excerpt below, ' +
      'output strict JSON: parsed_requirements (array of {section, requirement, page_ref}), ' +
      'compliance_matrix (array of {requirement_id, where_addressed, status}), ' +
      'response_section_drafts (array of {heading, body, evidence_needed}), ' +
      'past_performance_match_query (string for retrieval), pwin_estimate (0-100), ' +
      'pwin_rationale (string). Do not invent past-performance content; mark TBD when uncertain.' +
      '\n\nSOLICITATION:\n{{content}}'
  },

  denial_predict_v1: {
    id: 'denial_predict_v1', task: 'classify', version: 1,
    template:
      'Healthcare claim risk-screening. The text contains de-identified claim/encounter data. ' +
      'Output strict JSON keys: denial_risk (low|medium|high), risk_score (0-100), ' +
      'documentation_gaps (string[]), code_mismatch_warnings (string[]), ' +
      'payer_policy_flags (string[]), recommended_fixes (string[]). ' +
      'Do not echo PHI back. Do not invent diagnoses. If data is insufficient, say so.' +
      '\n\nCLAIM CONTEXT (de-identified):\n{{content}}'
  },

  followup_draft_v1: {
    id: 'followup_draft_v1', task: 'generate', version: 1,
    template:
      'A deal has been silent for 48+ hours after the last meaningful exchange below. ' +
      'Draft a context-aware follow-up. Strict JSON keys: subject, body, tone ' +
      '(neutral|warm|firm), call_to_action (string), confidence (0-1), ' +
      'should_auto_send (boolean), reasoning (1 sentence).' +
      '\n\nLAST EXCHANGE:\n{{content}}'
  },

  sla_watch_v1: {
    id: 'sla_watch_v1', task: 'classify', version: 1,
    template:
      'Given the SLA breach record(s) below, prioritize and recommend ownership. ' +
      'Strict JSON keys: priority (low|medium|high|critical), recommended_owner_role ' +
      '(owner|admin|analyst), escalation_required (boolean), customer_impact (string), ' +
      'recommended_message_to_customer (string), internal_action (string).' +
      '\n\nSLA BREACH(ES):\n{{content}}'
  }
});

export function getPrompt(id) {
  const p = PROMPTS[id];
  if (!p) throw new Error(`prompts: unknown id "${id}"`);
  return p;
}

export function renderPrompt(id, vars) {
  const p = getPrompt(id);
  // Simple {{var}} interpolation — no sub-templates, no eval.
  return p.template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars?.[k] ?? ''));
}
