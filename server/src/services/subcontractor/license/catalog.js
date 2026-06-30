// server/src/services/subcontractor/license/catalog.js
// Provider catalog — a CONFIGURABLE data structure (not per-state code branches,
// not one table per state). Records, per jurisdiction+authority, the official
// authority metadata and the HONEST current automation coverage. The framework
// supports every jurisdiction; the catalog tells the truth about which have
// automation today.

export const COVERAGE = Object.freeze({
  automated_verified: 'automated_verified',       // official API/dataset, working
  automated_limited:  'automated_limited',        // official lookup, partial/rate-limited
  manual_official:    'manual_official_verification',
  provider_planned:   'provider_planned',
  unsupported:        'unsupported',
  not_applicable:     'not_applicable'
});

// Seed catalog. Real deployments extend this via config. Coverage reflects what
// is ACTUALLY implemented as automation in this branch (contract-accurate test
// adapters; no live credentials were used — see the coverage audit).
export const PROVIDER_CATALOG = [
  { jurisdiction: 'TX', authority: 'Texas Department of Agriculture (Structural Pest Control Service)',
    website: 'https://www.texasagriculture.gov/', occupations: ['structural_pest_control'],
    licenseTypes: ['business_license', 'commercial_applicator', 'technician'],
    holder: 'both', lookupMethod: 'official_public_lookup', automation: COVERAGE.automated_limited,
    authValue: 'tdlr/tda public lookup', reliabilityTier: 'official' },
  { jurisdiction: 'MD', authority: 'Maryland Department of Labor — Occupational & Professional Licensing',
    website: 'https://www.dllr.state.md.us/', occupations: ['pest_control', 'hvac', 'electrical'],
    licenseTypes: ['professional_license'], holder: 'individual',
    lookupMethod: 'official_public_lookup', automation: COVERAGE.manual_official, reliabilityTier: 'official' },
  { jurisdiction: 'VA', authority: 'Virginia DPOR — Board for Contractors',
    website: 'https://www.dpor.virginia.gov/', occupations: ['contractor', 'pest_control'],
    licenseTypes: ['class_a_contractor', 'class_b_contractor', 'class_c_contractor', 'pesticide_business'],
    holder: 'business', lookupMethod: 'official_public_lookup', automation: COVERAGE.automated_limited, reliabilityTier: 'official' },
  { jurisdiction: 'DC', authority: 'DC DLCP — Business Licensing',
    website: 'https://dlcp.dc.gov/', occupations: ['general_services', 'pest_control'],
    licenseTypes: ['basic_business_license'], holder: 'business',
    lookupMethod: 'official_public_lookup', automation: COVERAGE.manual_official, reliabilityTier: 'official' },
  { jurisdiction: 'CA', authority: 'California Structural Pest Control Board',
    website: 'https://www.pestboard.ca.gov/', occupations: ['structural_pest_control'],
    licenseTypes: ['company_registration', 'branch_2_3', 'field_rep', 'applicator'],
    holder: 'both', lookupMethod: 'official_api', automation: COVERAGE.automated_verified, reliabilityTier: 'official' },
  { jurisdiction: 'FL', authority: 'Florida Dept. of Agriculture & Consumer Services',
    website: 'https://www.fdacs.gov/', occupations: ['pest_control'],
    licenseTypes: ['business_license', 'certified_operator'], holder: 'both',
    lookupMethod: 'official_downloadable_dataset', automation: COVERAGE.automated_verified, reliabilityTier: 'official' },
  { jurisdiction: 'NY', authority: 'NYS DEC — Pesticide Business Registration',
    website: 'https://www.dec.ny.gov/', occupations: ['pest_control'],
    licenseTypes: ['business_registration', 'certified_applicator'], holder: 'both',
    lookupMethod: 'official_public_lookup', automation: COVERAGE.manual_official, reliabilityTier: 'official' }
];

export function getCatalogEntry(jurisdiction, occupation) {
  const j = String(jurisdiction || '').toUpperCase();
  return PROVIDER_CATALOG.find(e => e.jurisdiction === j &&
    (!occupation || e.occupations.includes(occupation))) || null;
}

export function coverageFor(jurisdiction, occupation) {
  const e = getCatalogEntry(jurisdiction, occupation);
  if (!e) return { jurisdiction, occupation, automation: COVERAGE.unsupported, authority: null,
    note: 'no catalog entry — guided manual verification required' };
  return { jurisdiction: e.jurisdiction, occupation: occupation || null,
    automation: e.automation, authority: e.authority, website: e.website, lookupMethod: e.lookupMethod };
}

/** Honest national coverage summary. Never claims automated nationwide coverage. */
export function nationalCoverageSummary() {
  const buckets = {};
  for (const c of Object.values(COVERAGE)) buckets[c] = [];
  for (const e of PROVIDER_CATALOG) buckets[e.automation].push(e.jurisdiction);
  return {
    totalCatalogued: PROVIDER_CATALOG.length,
    byCoverage: buckets,
    claimsAutomatedNationwide: false,
    note: 'Framework supports all US jurisdictions; only catalogued authorities have automation. Uncatalogued jurisdictions fall back to guided official manual verification.'
  };
}
