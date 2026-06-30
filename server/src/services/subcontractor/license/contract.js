// server/src/services/subcontractor/license/contract.js
// Jurisdiction-NEUTRAL normalized license-verification contract. No jurisdiction
// is privileged in the core (Texas is just one adapter). Every provider returns
// results in this shape so the registry/qualification logic is jurisdiction
// agnostic and the data model stays compact (one vendor_license row shape for
// all 50 states + DC + territories + tribal/county/municipal/federal).

export const AUTHORITY_LEVELS = Object.freeze([
  'federal', 'state', 'territory', 'tribal', 'county', 'municipal',
  'professional_board', 'special_district', 'other'
]);

export const VERIFICATION_METHODS = Object.freeze([
  'official_api', 'official_downloadable_dataset', 'official_public_lookup',
  'official_document', 'approved_connector', 'manual_official_verification',
  'user_provided', 'unavailable'
]);

export const LICENSE_STATUS = Object.freeze([
  'active', 'active_renewal_approaching', 'expired', 'disciplined', 'revoked',
  'name_mismatch', 'address_mismatch', 'category_mismatch', 'unable_to_verify',
  'not_required', 'unresolved'
]);

export const HOLDER_TYPES = Object.freeze(['business', 'individual', 'both']);

// US states + DC + the five territories. The framework supports ALL of these;
// the provider catalog separately records which have automation today.
export const US_JURISDICTIONS = Object.freeze([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC','PR','VI','GU','MP','AS'
]);
export const TERRITORIES = Object.freeze(['PR', 'VI', 'GU', 'MP', 'AS']);

export function isValidJurisdiction(code) {
  return US_JURISDICTIONS.includes(String(code || '').toUpperCase());
}

/**
 * Build a normalized verification result. `raw` is never trusted directly —
 * adapters map their source into this shape and the application validates it.
 */
export function normalizeLicenseResult(input) {
  const level = AUTHORITY_LEVELS.includes(input.authorityLevel) ? input.authorityLevel : 'other';
  const method = VERIFICATION_METHODS.includes(input.verificationMethod) ? input.verificationMethod : 'unavailable';
  const status = LICENSE_STATUS.includes(input.status) ? input.status : 'unresolved';
  const holderType = HOLDER_TYPES.includes(input.holderType) ? input.holderType : 'business';

  return {
    jurisdictionCode: String(input.jurisdictionCode || '').toUpperCase() || null,
    jurisdictionName: input.jurisdictionName || null,
    authorityName: input.authorityName || null,
    authorityLevel: level,
    licenseType: input.licenseType || null,
    licenseCategory: input.licenseCategory || null,
    licenseNumber: input.licenseNumber || null,
    holderType,                                  // business | individual | both
    holderName: input.holderName || null,
    legalBusinessName: input.legalBusinessName || null,
    tradeName: input.tradeName || null,
    status,
    issueDate: input.issueDate || null,
    expirationDate: input.expirationDate || null,
    renewalDate: input.renewalDate || null,
    disciplinaryStatus: input.disciplinaryStatus || null,
    insuranceStatus: input.insuranceStatus || null,
    bondStatus: input.bondStatus || null,
    address: input.address || null,
    sourceUrl: input.sourceUrl || null,
    sourceType: input.sourceType || null,
    retrievalDate: input.retrievalDate || null,
    verificationMethod: method,
    matchConfidence: clamp01(input.matchConfidence),
    rawSnapshotHash: input.rawSnapshotHash || null,
    evidenceStatus: deriveEvidenceStatus(method, status),
    limitations: input.limitations || null,
    followUpRequired: !!input.followUpRequired
  };
}

// Evidence status is derived, never asserted as "verified" for manual/user paths.
function deriveEvidenceStatus(method, status) {
  if (method === 'user_provided') return 'user_provided';
  if (method === 'manual_official_verification') return 'manually_verified';
  if (method === 'unavailable') return 'unverified';
  if (['official_api', 'official_downloadable_dataset', 'official_public_lookup', 'approved_connector', 'official_document'].includes(method)) {
    return status === 'unresolved' ? 'unverified' : 'officially_verified';
  }
  return 'unverified';
}

function clamp01(n) { return typeof n === 'number' && n >= 0 && n <= 1 ? n : (n == null ? null : Math.max(0, Math.min(1, n))); }
