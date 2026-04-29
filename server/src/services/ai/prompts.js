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
