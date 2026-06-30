// server/src/services/proposal/intelligence.js
// Deterministic, anti-fabrication core of the Proposal Intelligence Workspace.
// No DB / browser / AI / credentials. The AI gateway (reused) drafts prose, but
// every MATERIAL claim must trace to one of: a solicitation citation, a saved
// tenant company fact, saved vendor evidence, explicit user input, or a
// structured placeholder. Unsupported model claims are downgraded to
// placeholders — never presented as fact. Section lists are derived from the
// solicitation, not auto-populated.

export const SECTION_TYPES = Object.freeze([
  'technical_approach', 'technical_capability', 'technical_solution', 'management_plan',
  'quality_control_plan', 'staffing_key_personnel', 'mobilization_transition', 'risk_management',
  'past_performance', 'subcontracting_teaming', 'executive_summary', 'custom'
]);

export const SECTION_STATUS = Object.freeze([
  'not_started', 'inputs_required', 'placeholders_unresolved', 'draft',
  'needs_validation', 'ready_for_review', 'approved', 'superseded'
]);

export const TEAM_MODES = Object.freeze(['prime_only', 'saved_subcontractor', 'add_subcontractor', 'decide_later']);

export const CLAIM_SOURCES = Object.freeze(['citation', 'company_fact', 'vendor_evidence', 'user_input', 'placeholder']);

export const PARTNER_PLACEHOLDERS = Object.freeze([
  '[SUBCONTRACTOR_NAME]', '[SUBCONTRACTOR_ROLE]', '[SUBCONTRACTOR_LICENSE]', '[QUALIFIED_PERSON_NAME]',
  '[TECHNICIAN_COUNT]', '[LOCAL_RESPONSE_TIME]', '[PARTNER_PAST_PERFORMANCE]', '[PARTNER_EQUIPMENT]',
  '[WORKSHARE_PERCENTAGE]', '[PARTNER_INSURANCE]', '[PARTNER_CONTACT]'
]);

const PARTNER_SENSITIVE = new Set([
  'technical_approach', 'management_plan', 'quality_control_plan', 'staffing_key_personnel',
  'mobilization_transition', 'subcontracting_teaming'
]);
export function sectionNeedsTeamDecision(sectionType) { return PARTNER_SENSITIVE.has(sectionType); }

/**
 * Derive the proposal section list from the SOLICITATION — not an automatic
 * dump of every standard section.
 * @param sol { requiredSections:[{type,title,citationId}], evaluationFactors:[{name,citationId}],
 *              submissionInstructions:[{type,citationId}], optionalTemplates:[type], customSections:[{title}] }
 */
export function deriveSections(sol = {}) {
  const out = [];
  const seen = new Set();
  const push = (type, title, origin, citationId = null) => {
    const key = `${type}:${title || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ type: SECTION_TYPES.includes(type) ? type : 'custom', title: title || titleFor(type),
      origin, citationId, status: 'not_started' });
  };
  for (const s of sol.requiredSections || []) push(s.type, s.title, 'solicitation_required', s.citationId);
  for (const f of sol.evaluationFactors || []) push(mapFactorToSection(f.name), null, 'evaluation_factor', f.citationId);
  for (const i of sol.submissionInstructions || []) if (i.type) push(i.type, null, 'submission_instruction', i.citationId);
  for (const t of sol.optionalTemplates || []) push(t, null, 'optional_template');
  for (const c of sol.customSections || []) push('custom', c.title, 'user_custom');
  return out;
}

/**
 * Enforce claim sourcing on generated blocks. Each block has {text, claims:[{text, source}]}.
 * Any claim whose source is not a valid, present source is converted to a placeholder
 * and the block is flagged. Returns { blocks, downgraded:[] }.
 */
export function enforceClaimSourcing(blocks, available = {}) {
  const downgraded = [];
  const out = (blocks || []).map(b => {
    const claims = (b.claims || []).map(c => {
      if (!CLAIM_SOURCES.includes(c.source?.kind) || !sourcePresent(c.source, available)) {
        downgraded.push({ block: b.id, claim: c.text, reason: 'unsupported_source' });
        return { ...c, source: { kind: 'placeholder', ref: '[UNVERIFIED_CLAIM]' }, downgraded: true };
      }
      return c;
    });
    const hasUnsupported = claims.some(c => c.downgraded);
    return { ...b, claims, status: hasUnsupported ? 'placeholders_unresolved' : (b.status || 'draft') };
  });
  return { blocks: out, downgraded };
}

/** Strict output-schema validation. Malformed → { ok:false, errors }. */
export function validateProposalOutput(output) {
  const errors = [];
  if (!output || typeof output !== 'object') return { ok: false, errors: ['output not an object'] };
  if (!SECTION_TYPES.includes(output.sectionType)) errors.push('invalid sectionType');
  if (!output.title) errors.push('missing title');
  if (!Array.isArray(output.blocks)) errors.push('blocks must be an array');
  if (!Array.isArray(output.citations)) errors.push('citations must be an array');
  for (const b of output.blocks || []) {
    if (!b.id || typeof b.text !== 'string') errors.push(`malformed block ${b.id || '(no id)'}`);
  }
  return { ok: errors.length === 0, errors };
}

export function extractPlaceholders(text) {
  const found = new Set();
  for (const m of String(text || '').matchAll(/\[[A-Z_]+\]/g)) found.add(m[0]);
  return [...found];
}

/**
 * Decide-later draft: produce a section whose partner-dependent facts are
 * structured placeholders only — NEVER invented partner facts.
 */
export function buildDecideLaterSection(sectionType, primeContent = '') {
  return {
    sectionType, title: titleFor(sectionType),
    teamMode: 'decide_later',
    placeholders: PARTNER_PLACEHOLDERS.slice(),
    blocks: [{ id: 'b1', text: primeContent, claims: [] }],
    warningAcknowledgementRequired: true,
    note: 'Subcontractor not selected — partner-dependent facts are placeholders. Review and regenerate affected sections before submission.'
  };
}

/**
 * When a partner is selected later, report which sections/placeholders are
 * affected. Preserves prior versions (caller stores them); offers selective
 * regeneration. Never silently overwrites.
 */
export function partnerImpactReport(sections, partnerSelection) {
  const affected = [];
  for (const s of sections || []) {
    const ph = (s.placeholders || []).filter(p => PARTNER_PLACEHOLDERS.includes(p));
    const partnerSensitive = sectionNeedsTeamDecision(s.sectionType || s.type);
    if (ph.length || partnerSensitive) {
      affected.push({ sectionType: s.sectionType || s.type, placeholders: ph,
        action: 'offer_selective_regeneration', preservePriorVersion: true });
    }
  }
  return { partner: partnerSelection?.vendorId || null, affectedSections: affected,
    preserveUnaffectedEdits: true, silentOverwrite: false };
}

/** Section validation against the actual evaluation map. */
export function validateSection(section, evalMap = {}) {
  const issues = [];
  const text = (section.blocks || []).map(b => b.text || '').join('\n');
  const placeholders = extractPlaceholders(text);
  if (placeholders.length) issues.push({ type: 'unresolved_placeholders', items: placeholders });
  const factors = (evalMap.evaluationFactors || []).map(f => f.name);
  const addressed = section.evaluationFactorsAddressed || [];
  const missingFactors = factors.filter(f => !addressed.includes(f));
  if (missingFactors.length) issues.push({ type: 'evaluation_factors_not_addressed', items: missingFactors });
  for (const b of section.blocks || []) {
    for (const c of b.claims || []) {
      if (c.source?.kind === 'placeholder') issues.push({ type: 'unsupported_claim', block: b.id, claim: c.text });
    }
  }
  return { ok: issues.length === 0, issues };
}

function sourcePresent(source, available) {
  switch (source.kind) {
    case 'citation': return (available.citationIds || []).includes(source.ref);
    case 'company_fact': return (available.companyFacts || []).includes(source.ref);
    case 'vendor_evidence': return (available.vendorEvidenceIds || []).includes(source.ref);
    case 'user_input': return !!source.ref;
    case 'placeholder': return true;
    default: return false;
  }
}
function mapFactorToSection(name) {
  const n = String(name || '').toLowerCase();
  if (/technical|approach|solution/.test(n)) return 'technical_approach';
  if (/management/.test(n)) return 'management_plan';
  if (/quality/.test(n)) return 'quality_control_plan';
  if (/staff|personnel/.test(n)) return 'staffing_key_personnel';
  if (/past performance/.test(n)) return 'past_performance';
  if (/transition|mobiliz/.test(n)) return 'mobilization_transition';
  if (/risk/.test(n)) return 'risk_management';
  return 'custom';
}
function titleFor(type) {
  return String(type || 'custom').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
