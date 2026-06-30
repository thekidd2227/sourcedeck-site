// server/src/services/subcontractor/requirements.js
// Deterministic requirements classification for Screen A. Mandatory vs
// recommended is preserved; FAR clauses are NOT all treated as flow-downs;
// insurance silence stays "not_stated"; the vetting checklist is generated from
// actual requirements. No invented requirements (every material item must carry
// a citation from the solicitation findings; this module classifies, it does not
// assert un-sourced facts).

export const REQ_STATUS = ['mandatory', 'evaluation_preference', 'recommended', 'not_stated', 'requires_clarification', 'conflicting'];

/** Classify a requirement from its source language + finding status. */
export function classifyRequirement({ sourceText = '', findingStatus = null } = {}) {
  if (findingStatus === 'conflicting') return 'conflicting';
  if (findingStatus === 'missing') return 'not_stated';
  const t = sourceText.toLowerCase();
  if (/\b(shall|must|is required|are required|mandatory|will be required)\b/.test(t)) return 'mandatory';
  if (/\b(preferred|will be evaluated|evaluation (?:credit|preference)|desirable|advantage)\b/.test(t)) return 'evaluation_preference';
  if (/\b(should|recommended|encouraged|may)\b/.test(t)) return 'recommended';
  if (!t.trim()) return 'not_stated';
  return 'requires_clarification';
}

// Conditional FAR flow-down table. The key principle: a clause that binds the
// PRIME does not automatically flow down to subcontractors. Each entry states
// the condition under which it flows down.
const FAR_FLOWDOWN = {
  '52.209-6': { title: 'Protecting the Government’s Interest When Subcontracting with Contractors Debarred/Suspended', applicabilityStatus: 'conditional_threshold', flowdownCondition: 'non-commercial subcontracts over the threshold', actionRequired: 'verify subcontractor not excluded (SAM)' },
  '52.219-8': { title: 'Utilization of Small Business Concerns', applicabilityStatus: 'conditional_threshold', flowdownCondition: 'subcontracts that offer further subcontracting opportunities above the threshold', actionRequired: 'flow down to subs with further subcontracting' },
  '52.219-9': { title: 'Small Business Subcontracting Plan', applicabilityStatus: 'prime_only', flowdownCondition: 'applies to a large-business prime above the threshold; NOT a subcontractor flow-down', actionRequired: 'prime maintains the subcontracting plan' },
  '52.219-14': { title: 'Limitations on Subcontracting', applicabilityStatus: 'prime_obligation', flowdownCondition: 'binds the set-aside prime; "similarly situated" subs may count toward the limit', actionRequired: 'track self-performance vs similarly-situated subcontracting' },
  '52.222-41': { title: 'Service Contract Labor Standards', applicabilityStatus: 'must_flow_down', flowdownCondition: 'all covered service subcontracts', actionRequired: 'flow down + apply wage determination' },
  '52.222-50': { title: 'Combating Trafficking in Persons', applicabilityStatus: 'all_tiers', flowdownCondition: 'all subcontracts at all tiers', actionRequired: 'flow down to all subs' },
  '52.222-54': { title: 'Employment Eligibility Verification (E-Verify)', applicabilityStatus: 'conditional_threshold', flowdownCondition: 'subcontracts for services/construction over the threshold (commercial items excepted)', actionRequired: 'flow down where applicable; enroll in E-Verify' },
  '52.222-55': { title: 'Minimum Wages (Executive Order)', applicabilityStatus: 'must_flow_down', flowdownCondition: 'covered subcontracts', actionRequired: 'flow down minimum-wage requirement' },
  '52.222-62': { title: 'Paid Sick Leave (Executive Order 13706)', applicabilityStatus: 'must_flow_down', flowdownCondition: 'covered subcontracts', actionRequired: 'flow down paid-sick-leave requirement' }
};

/**
 * Determine flow-down applicability for a clause found in the solicitation.
 * Returns a conditional determination — never "universal flow-down".
 */
export function farFlowdownApplicability(clauseNumber, { foundInSolicitation = true, verificationDate = null } = {}) {
  const base = FAR_FLOWDOWN[clauseNumber];
  if (!base) {
    return { clauseNumber, title: null, applicabilityStatus: 'requires_clarification',
      flowdownCondition: 'not in the known flow-down table — verify against current authority',
      actionRequired: 'verify on acquisition.gov', verificationDate, universalFlowdown: false, foundInSolicitation };
  }
  return { clauseNumber, ...base, verificationDate, universalFlowdown: false, foundInSolicitation };
}

/** Insurance silence stays "not_stated" — never invent limits. */
export function insuranceFromSilence(found) {
  return found && found.value
    ? { status: classifyRequirement({ sourceText: found.sourceText || '', findingStatus: found.status }), value: found.value, citation: found.citation || null }
    : { status: 'not_stated', value: null, note: 'solicitation is silent on this coverage — no limit invented' };
}

const CHECKLIST_GROUPS = [
  'corporate_eligibility', 'sam_exclusion_review', 'business_designation', 'licensing',
  'certifications', 'insurance', 'bonding', 'personnel', 'background_investigations',
  'technical_capability', 'equipment', 'materials', 'environmental_compliance', 'safety',
  'past_performance', 'references', 'pricing', 'far_flowdowns', 'wage_compliance',
  'limitation_on_subcontracting', 'data_cybersecurity', 'subcontract_terms'
];

/**
 * Build an editable vetting checklist from classified requirements.
 * @param req { licenses:[{name,status,citation}], certifications:[...],
 *              insurance:[...], businessType?, farClauses:[clauseNumber] }
 */
export function buildVettingChecklist(req = {}) {
  const items = [];
  const push = (group, requirement, mandatory, source) =>
    items.push({ group, requirement, mandatory, source: source || null, owner: null,
      status: 'pending', evidence: null, expirationDate: null,
      risk: mandatory ? 'high' : 'medium', notes: null });

  push('sam_exclusion_review', 'Active SAM registration + not excluded', true, 'standard');
  for (const l of req.licenses || []) push('licensing', `License: ${l.name}`, l.status === 'mandatory' || l.mandatory, l.citation);
  for (const c of req.certifications || []) push('certifications', `Certification: ${c.name}`, !!c.mandatory, c.citation);
  for (const i of req.insurance || []) push('insurance', `Insurance: ${i.name}`, !!i.mandatory, i.citation);
  if (req.businessType) push('business_designation', `Business type: ${req.businessType}`, true, req.businessTypeCitation || null);
  for (const cl of req.farClauses || []) {
    const f = farFlowdownApplicability(cl);
    if (f.applicabilityStatus !== 'prime_only') push('far_flowdowns', `Flow down ${cl} — ${f.flowdownCondition}`, f.applicabilityStatus !== 'requires_clarification', 'far');
  }
  // Ensure every group exists (empty groups are visible, not hidden).
  return { groups: CHECKLIST_GROUPS, items };
}
