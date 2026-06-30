// server/src/services/subcontractor/license/qualification.js
// Per-jurisdiction vendor qualification. A license in one jurisdiction NEVER
// qualifies another without verified reciprocity evidence. Mandatory unresolved
// or expired licenses block qualification. Business vs individual licenses are
// not interchangeable. County/municipal overlays are evaluated separately from
// state licenses. Deterministic — no AI.

import { isValidJurisdiction } from './contract.js';

const BLOCKING = new Set(['expired', 'revoked', 'disciplined', 'name_mismatch', 'category_mismatch', 'unable_to_verify']);

/**
 * @param vendor {
 *   licenses: [{ jurisdictionCode, holderType, occupation?, licenseCategory?, status, expirationDate? }],
 *   reciprocity: [{ fromJurisdiction, toJurisdiction, occupation?, officialSource }]   // verified evidence
 * }
 * @param requirements [{ jurisdiction, occupation?, holderType:'business'|'individual'|'both',
 *                        mandatory:boolean, localOverlay?:{authorityLevel,authorityName} }]
 */
export function qualifyVendorAcrossJurisdictions(vendor, requirements, { now = null } = {}) {
  const perJurisdiction = (requirements || []).map(req => evaluateOne(vendor, req, now));
  const mandatory = perJurisdiction.filter(j => j.mandatory);
  const qualifiedEverywhereMandatory = mandatory.length > 0 &&
    mandatory.every(j => j.status === 'qualified' || j.status === 'qualified_warning' || j.status === 'qualified_via_reciprocity');

  return {
    overallQualified: qualifiedEverywhereMandatory,
    perJurisdiction,
    unresolvedJurisdictions: perJurisdiction.filter(j => j.status === 'unresolved').map(j => j.jurisdiction),
    unqualifiedJurisdictions: perJurisdiction.filter(j => j.status === 'unqualified').map(j => j.jurisdiction),
    warnings: perJurisdiction.filter(j => j.status === 'qualified_warning').map(j => j.jurisdiction)
  };
}

function evaluateOne(vendor, req, now) {
  const jur = String(req.jurisdiction || '').toUpperCase();
  const out = { jurisdiction: jur, occupation: req.occupation || null, mandatory: !!req.mandatory,
    holderType: req.holderType || 'business', reasons: [], evidence: [] };

  if (!isValidJurisdiction(jur)) {
    out.status = 'unresolved';
    out.reasons.push('unknown_jurisdiction — guided manual verification required');
    return out;
  }

  const licenses = (vendor.licenses || []).filter(l =>
    String(l.jurisdictionCode || '').toUpperCase() === jur &&
    holderMatches(req.holderType, l.holderType) &&
    (!req.occupation || !l.occupation || l.occupation === req.occupation));

  // Direct license in THIS jurisdiction.
  const active = licenses.find(l => l.status === 'active');
  const approaching = licenses.find(l => l.status === 'active_renewal_approaching');
  const blocking = licenses.find(l => BLOCKING.has(l.status));

  if (active) { out.status = 'qualified'; out.evidence.push(active); }
  else if (approaching) {
    out.status = 'qualified_warning';
    out.reasons.push(`license renewal approaching (expires ${approaching.expirationDate || 'soon'})`);
    out.evidence.push(approaching);
  } else if (blocking) {
    out.status = 'unqualified';
    out.reasons.push(`mandatory license ${blocking.status} in ${jur}`);
    out.evidence.push(blocking);
  } else {
    // No direct license — check VERIFIED reciprocity only.
    const recip = (vendor.reciprocity || []).find(r =>
      String(r.toJurisdiction || '').toUpperCase() === jur && r.officialSource &&
      (!req.occupation || !r.occupation || r.occupation === req.occupation));
    const sourceLicense = recip && (vendor.licenses || []).find(l =>
      String(l.jurisdictionCode || '').toUpperCase() === String(recip.fromJurisdiction || '').toUpperCase() &&
      l.status === 'active' && holderMatches(req.holderType, l.holderType));
    if (recip && sourceLicense) {
      out.status = 'qualified_via_reciprocity';
      out.reasons.push(`reciprocity from ${recip.fromJurisdiction} (official source on file)`);
      out.evidence.push({ reciprocity: recip, sourceLicense });
    } else {
      out.status = 'unresolved';
      out.reasons.push(`no verified license in ${jur}` + (recip ? ' (reciprocity claimed but no active source license/evidence)' : ''));
    }
  }

  // Local (county/municipal) overlay is SEPARATE — a state license never satisfies it.
  if (req.localOverlay) {
    const local = (vendor.licenses || []).find(l =>
      String(l.jurisdictionCode || '').toUpperCase() === jur &&
      (l.authorityLevel === 'county' || l.authorityLevel === 'municipal') && l.status === 'active');
    if (!local) {
      out.localOverlay = { satisfied: false, authority: req.localOverlay.authorityName || null,
        note: 'local business license required and not verified — state license does not satisfy it' };
      if (req.mandatory && out.status.startsWith('qualified')) {
        out.status = 'unresolved';
        out.reasons.push('local overlay license unresolved');
      }
    } else {
      out.localOverlay = { satisfied: true, evidence: local };
    }
  }

  return out;
}

// Business and individual licenses are not interchangeable unless 'both'.
function holderMatches(required, actual) {
  if (required === 'both') return true;
  if (actual === 'both') return true;
  return required === actual;
}
