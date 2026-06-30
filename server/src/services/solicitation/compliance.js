// server/src/services/solicitation/compliance.js
// Builds a compliance matrix from extracted findings + standard submission
// requirements. Every row carries a source citation when one is available and
// a risk level. Rows without a confirmed source are flagged for verification.

const RISK = { critical: 'critical', high: 'high', medium: 'medium', info: 'informational' };

// Standard federal submission requirements to probe for. Each maps to finding
// keys / signal regexes; absence becomes a `missing` row (not silently dropped).
const STANDARD = [
  { requirement: 'Submission deadline met', category: 'submission', mandatory: true,
    risk: RISK.critical, findingKey: 'submission_deadline',
    consequence: 'Late submissions are rejected.' },
  { requirement: 'Submission channel / address followed', category: 'submission', mandatory: true,
    risk: RISK.critical, signal: /submit(?:ted)?\s+(?:to|via|through|at)\b|email\s+(?:your|the)\s+(?:quote|proposal)|sam\.gov/i,
    consequence: 'Wrong channel can disqualify the offer.' },
  { requirement: 'SAM.gov registration active', category: 'eligibility', mandatory: true,
    risk: RISK.high, signal: /SAM\.gov\s+registration|registered\s+in\s+SAM|active\s+registration/i,
    consequence: 'Award cannot be made to an unregistered offeror.' },
  { requirement: 'Required forms (e.g. SF-1449) signed', category: 'forms', mandatory: true,
    risk: RISK.high, signal: /SF[- ]?1449|standard\s+form\s+1449|signed\s+(?:offer|form)/i,
    consequence: 'Unsigned/missing forms are non-responsive.' },
  { requirement: 'Pricing schedule completed', category: 'pricing', mandatory: true,
    risk: RISK.critical, findingKey: 'clins',
    consequence: 'Incomplete pricing is non-responsive.' },
  { requirement: 'Amendment(s) acknowledged', category: 'submission', mandatory: true,
    risk: RISK.high, signal: /amendment|SF[- ]?30|acknowledge/i,
    consequence: 'Failure to acknowledge amendments can be disqualifying.' },
  { requirement: 'Wage determination compliance', category: 'labor', mandatory: false,
    risk: RISK.medium, signal: /wage\s+determination|SCA|service\s+contract\s+act|davis[- ]bacon/i,
    consequence: 'Non-compliant labor rates create performance/legal risk.' },
  { requirement: 'Site visit attendance (if required)', category: 'submission', mandatory: false,
    risk: RISK.medium, findingKey: 'site_visit_state',
    consequence: 'Missing a mandatory site visit can disqualify the offer.' }
];

/**
 * @param findings Finding[]
 * @param fullText string (concatenated normalized text of the opportunity)
 * @returns ComplianceRow[]
 */
export function buildComplianceMatrix(findings, fullText = '') {
  const byKey = {};
  for (const f of findings) (byKey[f.key] = byKey[f.key] || []).push(f);

  return STANDARD.map(req => {
    let status = 'unknown', citation = null, note = null, riskLevel = req.risk;

    if (req.findingKey && byKey[req.findingKey]?.length) {
      const f = byKey[req.findingKey][0];
      if (req.findingKey === 'site_visit_state') {
        const state = f.value;
        if (state === 'mandatory' || state === 'scheduled') {
          status = 'open'; citation = f.citation;
          note = `site visit is "${state}" — attendance may be required`;
        } else if (state === 'unstated') {
          status = 'not_applicable';
          note = 'no site visit stated in package (unstated, not confirmed-none)';
          riskLevel = RISK.info;
        } else {
          status = 'open'; citation = f.citation; note = `site visit: ${state}`;
        }
      } else {
        status = 'open'; citation = f.citation || null;
      }
    } else if (req.signal && req.signal.test(fullText)) {
      status = 'open';
    } else {
      status = 'missing';
      note = `no evidence of "${req.requirement}" found in the package`;
    }

    return {
      requirement: req.requirement,
      category: req.category,
      mandatory: req.mandatory,
      citation,
      responsible: null,
      status,                 // open | missing | not_applicable | unknown
      due_date: null,
      risk_level: riskLevel,
      consequence: req.consequence,
      notes: note
    };
  });
}
