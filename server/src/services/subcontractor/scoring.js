// server/src/services/subcontractor/scoring.js
// Deterministic vendor fit/risk scoring. Weights are explicit and every category
// exposes its weight, input, evidence, and points — the AI never assigns an
// unexplained score. A missing/expired MANDATORY license disqualifies the vendor
// regardless of total score.

export const DEFAULT_WEIGHTS = Object.freeze({
  required_license_match:        0.20,
  core_capability_match:         0.20,
  distance_local_response:       0.15,
  similar_institutional_exp:     0.15,
  government_experience:         0.10,
  required_business_designation: 0.05,
  emergency_capacity:            0.05,
  insurance_license_recency:     0.05,
  reporting_quality_systems:     0.05
});

const RANK = [
  { min: 80, label: 'Recommended' },
  { min: 65, label: 'Strong candidate' },
  { min: 50, label: 'Conditional candidate' },
  { min: 35, label: 'Reserve candidate' },
  { min: 0,  label: 'Insufficient evidence' }
];

/**
 * @param vendor {
 *   licenses:[{category,status}], capabilities:[], businessDesignations:[],
 *   governmentExperience:bool, institutionalExperience:bool, emergencyCapable:bool,
 *   insuranceActive:bool|null, reportingSystems:bool, withinRadius:bool
 * }
 * @param req {
 *   mandatoryLicenses:[category], requiredCapabilities:[], requiredBusinessType?,
 *   emergencyResponseRequired:bool
 * }
 */
export function scoreVendor(vendor, req, weights = DEFAULT_WEIGHTS) {
  const breakdown = [];
  const disqualifyingIssues = [];
  const add = (category, fraction, input, evidence) => {
    const w = weights[category] || 0;
    const points = round2(w * clamp01(fraction) * 100);
    breakdown.push({ category, weight: w, input, evidence, points,
      confidence: evidence === 'no_evidence' ? 0.3 : 0.8 });
  };

  // Mandatory license check (disqualifying).
  const lic = vendor.licenses || [];
  const mand = req.mandatoryLicenses || [];
  let licOk = 0;
  for (const cat of mand) {
    const found = lic.find(l => eq(l.category, cat));
    if (!found || found.status === 'expired' || found.status === 'unable_to_verify' || found.status === 'name_mismatch') {
      disqualifyingIssues.push({ type: 'mandatory_license', category: cat,
        reason: !found ? 'missing' : found.status });
    } else if (found.status === 'active' || found.status === 'active_renewal_approaching') {
      licOk += 1;
    }
  }
  add('required_license_match', mand.length ? licOk / mand.length : 1,
    `${licOk}/${mand.length} mandatory licenses active`, mand.length ? 'license_records' : 'none_required');

  // Capability match.
  const reqCaps = req.requiredCapabilities || [];
  const capHit = reqCaps.filter(c => (vendor.capabilities || []).some(vc => eq(vc, c))).length;
  add('core_capability_match', reqCaps.length ? capHit / reqCaps.length : 1,
    `${capHit}/${reqCaps.length} capabilities`, reqCaps.length ? 'capability_list' : 'none_required');

  add('distance_local_response', vendor.withinRadius ? 1 : 0,
    vendor.withinRadius ? 'within radius' : 'outside/unverified radius',
    vendor.distanceMethod || 'unknown');
  add('similar_institutional_exp', vendor.institutionalExperience ? 1 : 0,
    vendor.institutionalExperience ? 'similar facility experience' : 'none found',
    vendor.institutionalExperience ? 'evidence' : 'no_evidence');
  add('government_experience', vendor.governmentExperience ? 1 : 0,
    vendor.governmentExperience ? 'prior gov work' : 'none found',
    vendor.governmentExperience ? 'award_evidence' : 'no_evidence');
  add('required_business_designation',
    !req.requiredBusinessType ? 1 : ((vendor.businessDesignations || []).some(d => eq(d, req.requiredBusinessType)) ? 1 : 0),
    req.requiredBusinessType || 'none required',
    (vendor.businessDesignations || []).length ? 'designation_evidence' : 'no_evidence');
  add('emergency_capacity', !req.emergencyResponseRequired ? 1 : (vendor.emergencyCapable ? 1 : 0),
    req.emergencyResponseRequired ? (vendor.emergencyCapable ? 'capable' : 'not stated') : 'n/a',
    vendor.emergencyCapable ? 'evidence' : 'no_evidence');
  add('insurance_license_recency', vendor.insuranceActive === true ? 1 : (vendor.insuranceActive == null ? 0.5 : 0),
    vendor.insuranceActive === true ? 'insurance active' : (vendor.insuranceActive == null ? 'unknown' : 'expired'),
    vendor.insuranceActive == null ? 'no_evidence' : 'insurance_record');
  add('reporting_quality_systems', vendor.reportingSystems ? 1 : 0,
    vendor.reportingSystems ? 'QC/reporting systems' : 'none stated',
    vendor.reportingSystems ? 'evidence' : 'no_evidence');

  const total = round2(breakdown.reduce((s, b) => s + b.points, 0));
  const disqualified = disqualifyingIssues.length > 0;
  const classification = disqualified ? 'Disqualified' : (RANK.find(r => total >= r.min)).label;

  return { total, classification, disqualified, disqualifyingIssues, weights, breakdown };
}

function clamp01(n) { return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0)); }
function eq(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
