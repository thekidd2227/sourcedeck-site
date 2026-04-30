// server/src/services/ai/workflows.js
// Workflow registry. Each workflow is mapped to a category. Unknown
// workflows fall through to GOVERNED as a fail-safe.

import { WORKFLOW_CATEGORIES } from './types.js';

const WF = WORKFLOW_CATEGORIES;

/**
 * Workflow id  →  { category, taskType, defaultPromptId }
 *
 * Governed workflows are anything that produces an "official", saved,
 * shared, or audit-sensitive artifact. User-drafting workflows are
 * personal scratch / outbound messaging where BYOK is acceptable.
 */
export const WORKFLOWS = Object.freeze({
  // ── Governed (watsonx-only) ────────────────────────────────────────
  document_analysis:        { category: WF.GOVERNED, taskType: 'summarize', defaultPromptId: 'document_summary_v1' },
  document_summary:         { category: WF.GOVERNED, taskType: 'summarize', defaultPromptId: 'document_summary_v1' },
  field_extraction:         { category: WF.GOVERNED, taskType: 'extract',   defaultPromptId: 'key_field_extraction_v1' },
  document_classification:  { category: WF.GOVERNED, taskType: 'classify',  defaultPromptId: 'document_classification_v1' },
  scope_of_work:            { category: WF.GOVERNED, taskType: 'generate',  defaultPromptId: 'document_summary_v1' },
  bid_package:              { category: WF.GOVERNED, taskType: 'generate',  defaultPromptId: 'document_summary_v1' },
  compliance_review:        { category: WF.GOVERNED, taskType: 'classify',  defaultPromptId: 'document_classification_v1' },
  shared_deliverable:       { category: WF.GOVERNED, taskType: 'generate',  defaultPromptId: 'action_checklist_v1' },
  action_checklist:         { category: WF.GOVERNED, taskType: 'checklist', defaultPromptId: 'action_checklist_v1' },

  // ── User drafting (BYOK-eligible) ──────────────────────────────────
  email_draft:              { category: WF.USER_DRAFTING, taskType: 'generate', defaultPromptId: 'document_summary_v1' },
  rewrite_text:             { category: WF.USER_DRAFTING, taskType: 'generate', defaultPromptId: 'document_summary_v1' },
  marketing_copy:           { category: WF.USER_DRAFTING, taskType: 'generate', defaultPromptId: 'document_summary_v1' },
  social_post:              { category: WF.USER_DRAFTING, taskType: 'generate', defaultPromptId: 'document_summary_v1' },
  brainstorm:               { category: WF.USER_DRAFTING, taskType: 'generate', defaultPromptId: 'document_summary_v1' },
  tone_adjust:              { category: WF.USER_DRAFTING, taskType: 'generate', defaultPromptId: 'document_summary_v1' },

  // ── Agent workflows (real, gateway-backed) ─────────────────────────
  // Governed = official, audit-sensitive, watsonx-only:
  lead_score:               { category: WF.GOVERNED, taskType: 'classify',  defaultPromptId: 'lead_score_v1' },
  proposal_draft:           { category: WF.GOVERNED, taskType: 'generate',  defaultPromptId: 'proposal_draft_v1' },
  rfp_response:             { category: WF.GOVERNED, taskType: 'generate',  defaultPromptId: 'rfp_response_v1' },
  denial_predict:           { category: WF.GOVERNED, taskType: 'classify',  defaultPromptId: 'denial_predict_v1' },
  sla_watch:                { category: WF.GOVERNED, taskType: 'classify',  defaultPromptId: 'sla_watch_v1' },
  // User drafting = triage / personal scratch / drafted-but-not-sent:
  reply_classify:           { category: WF.USER_DRAFTING, taskType: 'classify',  defaultPromptId: 'reply_classify_v1' },
  bounce_guard:             { category: WF.USER_DRAFTING, taskType: 'classify',  defaultPromptId: 'bounce_guard_v1' },
  meeting_summary:          { category: WF.USER_DRAFTING, taskType: 'summarize', defaultPromptId: 'meeting_summary_v1' },
  followup_draft:           { category: WF.USER_DRAFTING, taskType: 'generate',  defaultPromptId: 'followup_draft_v1' }
});

export function resolveWorkflow(workflowType) {
  const w = WORKFLOWS[workflowType];
  if (w) return { workflowType, ...w };
  // Fail-safe: unknown workflows default to governed/watsonx.
  return { workflowType, category: WF.GOVERNED, taskType: 'generate', defaultPromptId: 'document_summary_v1', unknown: true };
}
