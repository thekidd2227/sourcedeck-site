// server/src/services/subcontractor/license/adapters/index.js
// Contract-accurate license provider adapters proving the framework is NOT
// Texas-specific: each models a DIFFERENT regulatory pattern. These are
// deterministic test/contract adapters — they verify against an injected
// `dataset` of official records (in production the same interface calls the
// official API/dataset/lookup). No live credentials are used here; live
// validation is the only blocked step (see the coverage audit).
//
// Patterns covered: TX (state agency business+technician pest license, public
// lookup), MD (individual professional board), VA (contractor CLASS category,
// business), DC (basic business license overlay), CA (official API + result
// normalization, business+individual), FL (downloadable dataset), NY (manual
// fallback — no automation).

import { normalizeLicenseResult } from '../contract.js';

// A dataset is { [jurisdiction]: [ official records ] }. Records are synthetic.
function find(dataset, jurisdiction, vendor, occupation) {
  const rows = (dataset && dataset[jurisdiction]) || [];
  const name = norm(vendor?.legalBusinessName || vendor?.name);
  const recName = r => norm(r.legalBusinessName || r.co_name);
  const recLic = r => norm(r.licenseNumber || r.lic_no);
  // Match on license number first (strong), then exact legal name. Tolerates
  // adapter-specific raw field names (e.g. CA co_name/lic_no).
  return rows.find(r => vendor?.licenseNumber && recLic(r) === norm(vendor.licenseNumber))
    || rows.find(r => recName(r) === name && (!occupation || !r.occupation || r.occupation === occupation))
    || null;
}

const businessAdapter = (id, jurisdiction, authority, method, occupation, level = 'state') => ({
  id,
  supportsJurisdiction: j => j === jurisdiction,
  supportsRequirement: (_t, occ) => !occ || occ === occupation,
  getVerificationMethod: () => method,
  getOfficialSource: () => authority,
  async verifyBusinessLicense({ vendor, now }) {
    const rec = find(this._dataset, jurisdiction, vendor, occupation);
    if (!rec) return normalizeLicenseResult({ jurisdictionCode: jurisdiction, jurisdictionName: jurisdiction,
      authorityName: authority, authorityLevel: level, licenseType: 'business_license', holderType: 'business',
      legalBusinessName: vendor?.legalBusinessName || vendor?.name, status: 'unable_to_verify',
      verificationMethod: method, retrievalDate: now, matchConfidence: 0,
      limitations: 'no matching official record found', followUpRequired: true });
    return normalizeLicenseResult({ ...rec, jurisdictionCode: jurisdiction, jurisdictionName: jurisdiction,
      authorityName: authority, authorityLevel: level, holderType: rec.holderType || 'business',
      verificationMethod: method, retrievalDate: now,
      matchConfidence: norm(rec.legalBusinessName) === norm(vendor?.legalBusinessName || vendor?.name) ? 0.95 : 0.6 });
  },
  // bind a dataset (injected by tests / config-loaded in prod)
  withDataset(ds) { this._dataset = ds; return this; },
  _dataset: null
});

// TX — state agency, pest control, business + technician, public lookup (automated_limited).
export function texasPestControlAdapter() {
  return businessAdapter('tx_tda_pest', 'TX', 'Texas Department of Agriculture (SPCS)', 'official_public_lookup', 'structural_pest_control');
}
// VA — Board for Contractors, CLASS A/B/C category, business.
export function virginiaContractorAdapter() {
  const a = businessAdapter('va_dpor_contractor', 'VA', 'Virginia DPOR — Board for Contractors', 'official_public_lookup', 'contractor');
  return a;
}
// FL — official downloadable dataset.
export function floridaPestAdapter() {
  return businessAdapter('fl_fdacs_pest', 'FL', 'Florida FDACS', 'official_downloadable_dataset', 'pest_control');
}
// DC — basic business license overlay (municipal-style).
export function dcBusinessLicenseAdapter() {
  return businessAdapter('dc_dlcp_bbl', 'DC', 'DC DLCP — Basic Business License', 'official_public_lookup', 'pest_control', 'other');
}

// CA — official API, business registration AND individual field rep; normalizes a
// distinct raw shape.
export function californiaPestBoardAdapter() {
  const jurisdiction = 'CA', authority = 'California Structural Pest Control Board';
  return {
    id: 'ca_pestboard',
    _dataset: null,
    withDataset(ds) { this._dataset = ds; return this; },
    supportsJurisdiction: j => j === jurisdiction,
    supportsRequirement: (_t, occ) => !occ || occ === 'structural_pest_control',
    getVerificationMethod: () => 'official_api',
    getOfficialSource: () => authority,
    async verifyBusinessLicense({ vendor, now }) {
      return this._normalize(find(this._dataset, jurisdiction, vendor, 'structural_pest_control'), vendor, now, 'business');
    },
    async verifyIndividualLicense({ vendor, now }) {
      return this._normalize(find(this._dataset, jurisdiction, vendor, 'structural_pest_control'), vendor, now, 'individual');
    },
    _normalize(rec, vendor, now, holderType) {
      if (!rec) return normalizeLicenseResult({ jurisdictionCode: jurisdiction, authorityName: authority,
        authorityLevel: 'professional_board', licenseType: holderType === 'individual' ? 'field_rep' : 'company_registration',
        holderType, status: 'unable_to_verify', verificationMethod: 'official_api', retrievalDate: now,
        matchConfidence: 0, followUpRequired: true });
      // CA raw shape: { co_name, lic_no, lic_status, exp, branch } → normalized.
      return normalizeLicenseResult({ jurisdictionCode: jurisdiction, authorityName: authority,
        authorityLevel: 'professional_board',
        licenseType: holderType === 'individual' ? 'field_rep' : 'company_registration',
        licenseCategory: rec.branch || rec.licenseCategory, licenseNumber: rec.lic_no || rec.licenseNumber,
        holderType, legalBusinessName: rec.co_name || rec.legalBusinessName,
        status: mapCaStatus(rec.lic_status || rec.status), expirationDate: rec.exp || rec.expirationDate,
        verificationMethod: 'official_api', retrievalDate: now, matchConfidence: 0.9 });
    }
  };
}

// NY — no automation; manual fallback only (getVerificationMethod returns manual).
export function newYorkManualAdapter() {
  const jurisdiction = 'NY';
  return {
    id: 'ny_dec_manual',
    supportsJurisdiction: j => j === jurisdiction,
    supportsRequirement: () => true,
    getVerificationMethod: () => 'manual_official_verification',
    getOfficialSource: () => 'NYS DEC — Pesticide Business Registration'
    // no verifyBusinessLicense → registry will route to a manual plan
  };
}

// MD — individual professional board.
export function marylandProfessionalAdapter() {
  const a = businessAdapter('md_dllr_prof', 'MD', 'Maryland DLLR — Occupational & Professional Licensing', 'manual_official_verification', 'pest_control', 'professional_board');
  return a;
}

export function registerDefaultAdapters(registry, datasets = {}) {
  const adapters = [
    texasPestControlAdapter(), virginiaContractorAdapter(), floridaPestAdapter(),
    dcBusinessLicenseAdapter(), californiaPestBoardAdapter(), newYorkManualAdapter(),
    marylandProfessionalAdapter()
  ];
  for (const a of adapters) {
    if (a.withDataset) a.withDataset(datasets);
    registry.register(a);
  }
  return registry;
}

function mapCaStatus(s) {
  const v = String(s || '').toLowerCase();
  if (/active|current|valid/.test(v)) return 'active';
  if (/expired|lapsed/.test(v)) return 'expired';
  if (/suspend|revok|discipl/.test(v)) return 'disciplined';
  return 'unresolved';
}
function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
