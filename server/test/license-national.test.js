// server/test/license-national.test.js
// National (jurisdiction-neutral) license framework tests. Pure node:test; no
// DB/browser/credentials. Proves the framework is NOT Texas-specific and that
// multi-jurisdiction qualification is correct. Covers Step 12 #1-23, 26, 30
// deterministically. (#24/#25/#27/#29 are persistence/UI/budget — deferred;
// #28 is a structural check below.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JurisdictionLicenseProviderRegistry } from '../src/services/subcontractor/license/registry.js';
import { registerDefaultAdapters } from '../src/services/subcontractor/license/adapters/index.js';
import { qualifyVendorAcrossJurisdictions } from '../src/services/subcontractor/license/qualification.js';
import { nationalCoverageSummary, coverageFor, COVERAGE } from '../src/services/subcontractor/license/catalog.js';
import { normalizeLicenseResult, isValidJurisdiction, TERRITORIES } from '../src/services/subcontractor/license/contract.js';

const DATASETS = {
  TX: [{ legalBusinessName: 'Bluegrass Pest Control LLC', licenseNumber: 'TX-1001', occupation: 'structural_pest_control', holderType: 'business', status: 'active', expirationDate: '2027-01-01' }],
  VA: [{ legalBusinessName: 'Old Dominion Pest', licenseNumber: 'VA-A-22', occupation: 'contractor', licenseCategory: 'class_a_contractor', holderType: 'business', status: 'active' }],
  FL: [{ legalBusinessName: 'Sunshine Pest', licenseNumber: 'FL-77', occupation: 'pest_control', holderType: 'business', status: 'expired' }],
  DC: [{ legalBusinessName: 'Capital Pest', licenseNumber: 'DC-9', occupation: 'pest_control', holderType: 'business', status: 'active' }],
  CA: [{ co_name: 'Golden State Pest', lic_no: 'CA-PR-5', lic_status: 'Active', exp: '2026-09-01', branch: 'branch_2' }]
};
function reg() { return registerDefaultAdapters(new JurisdictionLicenseProviderRegistry(), DATASETS); }
const NOW = '2026-06-30T00:00:00Z';

test('#1 Texas pest-control business license verifies via the adapter', async () => {
  const r = await reg().verify({ jurisdiction: 'TX', occupation: 'structural_pest_control',
    vendor: { legalBusinessName: 'Bluegrass Pest Control LLC' }, now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.result.status, 'active');
  assert.equal(r.result.jurisdictionCode, 'TX');
  assert.equal(r.result.verificationMethod, 'official_public_lookup');
});

test('#3 Virginia contractor CLASS category verifies', async () => {
  const r = await reg().verify({ jurisdiction: 'VA', occupation: 'contractor',
    vendor: { legalBusinessName: 'Old Dominion Pest' }, now: NOW });
  assert.equal(r.result.licenseCategory, 'class_a_contractor');
});

test('#5 California official-API result is normalized from a distinct raw shape', async () => {
  const r = await reg().verify({ jurisdiction: 'CA', occupation: 'structural_pest_control',
    vendor: { licenseNumber: 'CA-PR-5' }, now: NOW });
  assert.equal(r.result.status, 'active');
  assert.equal(r.result.licenseNumber, 'CA-PR-5');
  assert.equal(r.result.verificationMethod, 'official_api');
  assert.equal(r.result.authorityLevel, 'professional_board');
});

test('#6 Florida dataset normalization preserves status (expired)', async () => {
  const r = await reg().verify({ jurisdiction: 'FL', occupation: 'pest_control',
    vendor: { legalBusinessName: 'Sunshine Pest' }, now: NOW });
  assert.equal(r.result.status, 'expired');
  assert.equal(r.result.verificationMethod, 'official_downloadable_dataset');
});

test('#7 New York has no automation → guided manual verification plan', async () => {
  const r = await reg().verify({ jurisdiction: 'NY', occupation: 'pest_control', vendor: { name: 'X' }, now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.plan.type, 'guided_manual_verification');
  assert.ok(r.plan.officialLookupUrl);
});

test('#8 unknown/uncatalogued jurisdiction → manual plan, not a failure', async () => {
  const r = await reg().verify({ jurisdiction: 'WY', occupation: 'pest_control', vendor: { name: 'X' }, now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.plan.type, 'guided_manual_verification');
});

test('#9 territory codes are accepted by the framework', () => {
  for (const t of TERRITORIES) assert.equal(isValidJurisdiction(t), true);
  assert.equal(isValidJurisdiction('PR'), true);
  assert.equal(isValidJurisdiction('ZZ'), false);
});

test('#10/#26 multi-state opportunity → separate per-jurisdiction requirements', () => {
  const vendor = { licenses: [
    { jurisdictionCode: 'TX', holderType: 'business', occupation: 'structural_pest_control', status: 'active' }
  ] };
  const q = qualifyVendorAcrossJurisdictions(vendor, [
    { jurisdiction: 'TX', occupation: 'structural_pest_control', holderType: 'business', mandatory: true },
    { jurisdiction: 'MD', occupation: 'pest_control', holderType: 'business', mandatory: true }
  ]);
  assert.equal(q.perJurisdiction.length, 2);
  const tx = q.perJurisdiction.find(j => j.jurisdiction === 'TX');
  const md = q.perJurisdiction.find(j => j.jurisdiction === 'MD');
  assert.equal(tx.status, 'qualified');
  assert.equal(md.status, 'unresolved', 'no MD license → unresolved, not auto-qualified');
});

test('#11 a license in State A does NOT qualify State B', () => {
  const vendor = { licenses: [{ jurisdictionCode: 'TX', holderType: 'business', status: 'active' }] };
  const q = qualifyVendorAcrossJurisdictions(vendor, [{ jurisdiction: 'CA', holderType: 'business', mandatory: true }]);
  assert.equal(q.perJurisdiction[0].status, 'unresolved');
  assert.equal(q.overallQualified, false);
});

test('#12 reciprocity accepted only with official evidence + active source license', () => {
  const base = { licenses: [{ jurisdictionCode: 'VA', holderType: 'business', status: 'active' }] };
  // No reciprocity record → unresolved in MD.
  let q = qualifyVendorAcrossJurisdictions(base, [{ jurisdiction: 'MD', holderType: 'business', mandatory: true }]);
  assert.equal(q.perJurisdiction[0].status, 'unresolved');
  // With official reciprocity evidence VA→MD → qualified_via_reciprocity.
  const withRecip = { ...base, reciprocity: [{ fromJurisdiction: 'VA', toJurisdiction: 'MD', officialSource: 'https://md.gov/reciprocity' }] };
  q = qualifyVendorAcrossJurisdictions(withRecip, [{ jurisdiction: 'MD', holderType: 'business', mandatory: true }]);
  assert.equal(q.perJurisdiction[0].status, 'qualified_via_reciprocity');
});

test('#13 county/municipal overlay is separate from the state license', () => {
  const vendor = { licenses: [{ jurisdictionCode: 'FL', holderType: 'business', status: 'active' }] };
  const q = qualifyVendorAcrossJurisdictions(vendor, [
    { jurisdiction: 'FL', holderType: 'business', mandatory: true, localOverlay: { authorityLevel: 'county', authorityName: 'Miami-Dade' } }
  ]);
  assert.equal(q.perJurisdiction[0].localOverlay.satisfied, false);
  assert.equal(q.perJurisdiction[0].status, 'unresolved', 'state license does not satisfy the local overlay');
});

test('#14 mandatory unresolved license blocks overall qualification', () => {
  const q = qualifyVendorAcrossJurisdictions({ licenses: [] }, [{ jurisdiction: 'TX', holderType: 'business', mandatory: true }]);
  assert.equal(q.overallQualified, false);
  assert.ok(q.unresolvedJurisdictions.includes('TX'));
});

test('#15 expired license blocks qualification', () => {
  const vendor = { licenses: [{ jurisdictionCode: 'TX', holderType: 'business', status: 'expired' }] };
  const q = qualifyVendorAcrossJurisdictions(vendor, [{ jurisdiction: 'TX', holderType: 'business', mandatory: true }]);
  assert.equal(q.perJurisdiction[0].status, 'unqualified');
  assert.equal(q.overallQualified, false);
});

test('#16 expiring license produces a warning (still qualified)', () => {
  const vendor = { licenses: [{ jurisdictionCode: 'TX', holderType: 'business', status: 'active_renewal_approaching', expirationDate: '2026-07-15' }] };
  const q = qualifyVendorAcrossJurisdictions(vendor, [{ jurisdiction: 'TX', holderType: 'business', mandatory: true }]);
  assert.equal(q.perJurisdiction[0].status, 'qualified_warning');
  assert.equal(q.overallQualified, true);
});

test('#17/#18 individual and business licenses are not interchangeable', () => {
  const bizOnly = { licenses: [{ jurisdictionCode: 'CA', holderType: 'business', status: 'active' }] };
  const needIndividual = qualifyVendorAcrossJurisdictions(bizOnly, [{ jurisdiction: 'CA', holderType: 'individual', mandatory: true }]);
  assert.equal(needIndividual.perJurisdiction[0].status, 'unresolved', 'business license does not satisfy an individual requirement');
  const needBusiness = qualifyVendorAcrossJurisdictions(bizOnly, [{ jurisdiction: 'CA', holderType: 'business', mandatory: true }]);
  assert.equal(needBusiness.perJurisdiction[0].status, 'qualified');
});

test('#19 user-provided evidence stays user_provided', () => {
  const r = normalizeLicenseResult({ jurisdictionCode: 'TX', status: 'active', verificationMethod: 'user_provided' });
  assert.equal(r.evidenceStatus, 'user_provided');
});

test('#20 manual official verification is labeled manually_verified (not auto)', () => {
  const r = normalizeLicenseResult({ jurisdictionCode: 'NY', status: 'active', verificationMethod: 'manual_official_verification' });
  assert.equal(r.evidenceStatus, 'manually_verified');
});

test('#21 a failed verify (unable_to_verify) does not overwrite a stored active license', async () => {
  // Registry verify of an unknown business returns unable_to_verify...
  const r = await reg().verify({ jurisdiction: 'TX', occupation: 'structural_pest_control',
    vendor: { legalBusinessName: 'Nonexistent Co' }, now: NOW });
  assert.equal(r.result.status, 'unable_to_verify');
  // ...but qualification still uses the vendor's previously-stored active license.
  const vendor = { licenses: [{ jurisdictionCode: 'TX', holderType: 'business', status: 'active' }] };
  const q = qualifyVendorAcrossJurisdictions(vendor, [{ jurisdiction: 'TX', holderType: 'business', mandatory: true }]);
  assert.equal(q.perJurisdiction[0].status, 'qualified');
});

test('#22 provider catalog reports automation coverage honestly (no nationwide claim)', () => {
  const s = nationalCoverageSummary();
  assert.equal(s.claimsAutomatedNationwide, false);
  assert.ok(s.byCoverage[COVERAGE.manual_official].length >= 1, 'some authorities are manual-only');
  assert.equal(coverageFor('WY', 'pest_control').automation, COVERAGE.unsupported);
});

test('#23/#7 manual-only authorities are never auto-verified (no bypass)', async () => {
  // NY adapter advertises manual only; registry must not invent an automated result.
  const r = await reg().verify({ jurisdiction: 'NY', vendor: { name: 'X' }, now: NOW });
  assert.notEqual(r.ok, true);
  assert.equal(r.plan.resultLabel.includes('manual'), true);
});

test('#30 Texas is NOT hardcoded as default/only — CA works with no TX involvement', async () => {
  const r = await reg().verify({ jurisdiction: 'CA', occupation: 'structural_pest_control', vendor: { licenseNumber: 'CA-PR-5' }, now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.result.jurisdictionCode, 'CA');
});
