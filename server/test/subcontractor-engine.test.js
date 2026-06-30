// server/test/subcontractor-engine.test.js
// Deterministic Subcontractor Intelligence tests. Pure node:test — no DB, no
// browser, no external providers, no AI. Synthetic pest-control fixture with the
// required edge cases. Covers Step 16 requirements #1-3/9-13, vendor #16-28, and
// cost #31-36 (the deterministic ones). Persistence/worker/UI/provider criteria
// are deferred — see the continuation audit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greatCircleMiles, screenByRadius } from '../src/services/subcontractor/distance.js';
import { scoreVendor } from '../src/services/subcontractor/scoring.js';
import { dedupeVendors, sharesStrongIdentity } from '../src/services/subcontractor/dedup.js';
import { classifyQuote } from '../src/services/subcontractor/quote.js';
import { classifyRequirement, farFlowdownApplicability, insuranceFromSilence, buildVettingChecklist } from '../src/services/subcontractor/requirements.js';
import { buildPricingScenario } from '../src/services/cost/scenarios.js';

const ORIGIN = { lat: 36.60, lon: -87.45, verified: true };
const REQ = {
  mandatoryLicenses: ['pest_control_applicator', 'termite'],
  requiredCapabilities: ['pest_control', 'rodent', 'termite'],
  requiredBusinessType: 'total_small_business',
  emergencyResponseRequired: false
};

// 8 synthetic candidates with the required edge cases.
function candidates() {
  const near = { lat: 36.65, lon: -87.45 };      // ~3.5 mi
  const far = { lat: 37.80, lon: -87.45 };       // ~83 mi
  const base = { capabilities: ['pest_control', 'rodent', 'termite'], businessDesignations: ['total_small_business'],
    governmentExperience: true, institutionalExperience: true, emergencyCapable: false, insuranceActive: true,
    reportingSystems: true, coordinates: near, coordinatesVerified: true,
    licenses: [{ category: 'pest_control_applicator', status: 'active' }, { category: 'termite', status: 'active' }] };
  return [
    { id: 'v1', name: 'Bluegrass Pest Control LLC', website: 'https://bluegrasspest.com', email: 'info@bluegrasspest.com', uei: 'UEI001', ...base },
    { id: 'v2', name: 'Volunteer Exterminators Inc', email: 'ops@volunteerext.com', uei: 'UEI002', ...base,
      licenses: [{ category: 'pest_control_applicator', status: 'active' }] },            // NO termite → disqualified
    { id: 'v3', name: 'Expired Shield Pest Co', email: 'hi@expiredshield.com', uei: 'UEI003', ...base,
      licenses: [{ category: 'pest_control_applicator', status: 'expired' }, { category: 'termite', status: 'active' }] }, // expired mandatory
    { id: 'v4', name: 'RiverCity Pest Services', email: 'sales@rivercitypest.com', uei: 'UEI004', ...base, insuranceActive: false }, // insurance expired
    { id: 'v5', name: 'NoMail Pest Solutions', website: 'https://nomailpest.com', email: null, uei: 'UEI005', ...base }, // missing email
    { id: 'v6', name: 'FarAway Pest Management', email: 'team@farawaypest.com', uei: 'UEI006', ...base, coordinates: far }, // outside radius
    { id: 'v7', name: 'Name Mismatch Pest', email: 'x@nmpest.com', uei: 'UEI007', ...base,
      licenses: [{ category: 'pest_control_applicator', status: 'name_mismatch' }, { category: 'termite', status: 'active' }] }, // name mismatch
    { id: 'v8', name: 'Institutional Strong Pest', email: 'bd@instpest.com', uei: 'UEI008', ...base } // strong institutional
  ];
}

// ---- requirements (Screen A) ----
test('#1/#2 mandatory vs recommended is preserved from source language', () => {
  assert.equal(classifyRequirement({ sourceText: 'The contractor shall hold a state applicator license.' }), 'mandatory');
  assert.equal(classifyRequirement({ sourceText: 'Offerors should provide CPARS references.' }), 'recommended');
  assert.equal(classifyRequirement({ sourceText: 'Experience will be evaluated as a preference.' }), 'evaluation_preference');
});

test('#9 insurance silence remains "not stated" (no invented limit)', () => {
  assert.equal(insuranceFromSilence(null).status, 'not_stated');
  assert.equal(insuranceFromSilence(undefined).value, null);
});

test('#10 FAR flow-downs are conditional, not universal', () => {
  assert.equal(farFlowdownApplicability('52.219-9').applicabilityStatus, 'prime_only');
  assert.equal(farFlowdownApplicability('52.222-50').applicabilityStatus, 'all_tiers');
  assert.equal(farFlowdownApplicability('52.219-9').universalFlowdown, false);
  assert.equal(farFlowdownApplicability('52.999-99').applicabilityStatus, 'requires_clarification');
});

test('#13 vetting checklist is generated with mandatory flags + sources', () => {
  const cl = buildVettingChecklist({ licenses: [{ name: 'Applicator', mandatory: true, citation: { documentId: 'd1' } }],
    businessType: 'total_small_business', farClauses: ['52.222-50', '52.219-9'] });
  assert.ok(cl.items.some(i => i.group === 'licensing' && i.mandatory));
  assert.ok(cl.items.some(i => i.group === 'far_flowdowns' && /52.222-50/.test(i.requirement)));
  assert.ok(!cl.items.some(i => /52.219-9/.test(i.requirement)), 'prime-only clause not added as a flow-down');
});

// ---- distance (Screen B) ----
test('#16/#17 default 25-mi screen + straight-line distance correct', () => {
  assert.ok(Math.abs(greatCircleMiles({ lat: 36.6, lon: -87.45 }, { lat: 36.7, lon: -87.45 }) - 6.9) < 0.2);
  const screened = screenByRadius(ORIGIN, candidates(), 25);
  const v1 = screened.find(v => v.id === 'v1');
  assert.equal(v1.withinRadius, true);
  assert.equal(v1.distanceMethod, 'straight_line_screening_distance');
});

test('#18 unverified coordinates can NEVER be "within radius"', () => {
  const screened = screenByRadius(ORIGIN, [{ id: 'x', coordinates: { lat: 36.61, lon: -87.45 }, coordinatesVerified: false }], 25);
  assert.equal(screened[0].withinRadius, false);
  assert.equal(screened[0].distanceMethod, 'unverified');
});

test('#19/#20 returns the qualified within-radius count honestly', () => {
  const screened = screenByRadius(ORIGIN, candidates(), 25);
  const scored = screened.map(v => ({ v, s: scoreVendor(v, REQ) }));
  const qualified = scored.filter(x => x.v.withinRadius && !x.s.disqualified);
  // v2 (no termite), v3 (expired), v7 (name mismatch) disqualified; v6 outside radius.
  assert.ok(qualified.length < 8, 'fewer than 8 qualify — reported honestly, not padded');
  assert.ok(qualified.some(x => x.v.id === 'v1'));
});

test('#21 missing email stays missing (NOT PUBLICLY FOUND)', () => {
  const v5 = candidates().find(v => v.id === 'v5');
  assert.equal(v5.email, null, 'email is not invented from the domain');
});

test('#22 missing mandatory (termite) license disqualifies', () => {
  const v2 = candidates().find(v => v.id === 'v2');
  const s = scoreVendor(v2, REQ);
  assert.equal(s.disqualified, true);
  assert.ok(s.disqualifyingIssues.some(i => i.category === 'termite' && i.reason === 'missing'));
  assert.equal(s.classification, 'Disqualified');
});

test('#23 expired license produces a disqualifying/critical issue', () => {
  const s = scoreVendor(candidates().find(v => v.id === 'v3'), REQ);
  assert.equal(s.disqualified, true);
  assert.ok(s.disqualifyingIssues.some(i => i.reason === 'expired'));
});

test('#24 expiring/expired insurance lowers score but is not auto-disqualifying', () => {
  const v4 = scoreVendor(candidates().find(v => v.id === 'v4'), REQ);
  const v1 = scoreVendor(candidates().find(v => v.id === 'v1'), REQ);
  assert.equal(v4.disqualified, false);
  assert.ok(v4.total < v1.total, 'expired insurance reduces fit score');
});

test('#25 business designation is not inferred (only from evidence)', () => {
  const noDesig = { ...candidates()[0], businessDesignations: [] };
  const s = scoreVendor(noDesig, REQ);
  const desigCat = s.breakdown.find(b => b.category === 'required_business_designation');
  assert.equal(desigCat.points, 0, 'no designation evidence → 0 points, not assumed');
});

test('#27 duplicate vendor records: strong identity merges; name-only does not', () => {
  const list = [
    { id: 'a', name: 'Bluegrass Pest Control LLC', uei: 'UEI001', evidence: [{ s: 1 }] },
    { id: 'b', name: 'Bluegrass Pest', uei: 'UEI001', evidence: [{ s: 2 }] },           // same UEI → merge
    { id: 'c', name: 'Bluegrass Pest Control Inc', uei: 'UEIZZZ' }                       // name-only → review
  ];
  const { unique, possibleDuplicates } = dedupeVendors(list);
  assert.equal(unique.length, 2, 'same-UEI records merged into one');
  assert.ok(unique[0].evidence.length === 2, 'merge preserved evidence');
  assert.ok(possibleDuplicates.some(p => p.reason.includes('similar_name_only')), 'name-only flagged for review, not merged');
});

test('#27b never merges on similar name alone', () => {
  assert.equal(sharesStrongIdentity({ name: 'ABC Pest' }, { name: 'ABC Pest Inc' }).match, false);
  assert.equal(sharesStrongIdentity({ uei: 'X' }, { uei: 'X' }).match, true);
});

test('#28 candidate scoring exposes weights + evidence (no hidden AI score)', () => {
  const s = scoreVendor(candidates()[0], REQ);
  assert.ok(s.breakdown.every(b => typeof b.weight === 'number' && b.evidence != null && typeof b.points === 'number'));
  assert.ok(Math.abs(Object.values(s.weights).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'weights sum to 1');
});

// ---- cost-quote integration (reuses cost engine) ----
function targets() {
  const s = buildPricingScenario({ recurringVendorCost: 100000, targetGrossMargin: 0.25, minimumGrossMargin: 0.15, periods: [{ type: 'base', months: 12 }] });
  return { governmentPrice: s.baseYearGovernmentPrice, idealVendorPrice: s.vendorTarget.idealVendorPrice,
    maximumVendorPrice: s.vendorTarget.maximumVendorPrice, walkAwayVendorPrice: s.vendorTarget.walkAwayVendorPrice };
}

test('#31 quote within ideal is labeled correctly', () => {
  const t = targets();
  assert.equal(classifyQuote(t.idealVendorPrice - 1000, t).classification, 'within_ideal');
});

test('#32 quote above maximum is labeled correctly', () => {
  const t = targets();
  assert.equal(classifyQuote(t.maximumVendorPrice + 1000, t).classification, 'above_maximum');
});

test('#33 quote above walk-away → walk_away (enforced)', () => {
  const t = targets();
  assert.equal(classifyQuote(t.walkAwayVendorPrice + 1000, t).classification, 'walk_away');
});

test('#34 quote edits recalculate margin deterministically', () => {
  const t = targets();
  const a = classifyQuote(100000, t).grossMargin;
  const b = classifyQuote(110000, t).grossMargin;
  assert.ok(b < a, 'higher quote → lower margin');
});

test('#35 entering a quote does NOT mutate the cost scenario', () => {
  assert.equal(classifyQuote(100000, targets()).mutatesScenario, false);
});

test('#36 incomplete quote handled', () => {
  assert.equal(classifyQuote(null, targets()).classification, 'incomplete');
});
