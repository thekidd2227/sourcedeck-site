// server/test/cost-engine.test.js
// Deterministic Scope & Cost Intelligence tests. Pure node:test; no DB, no
// browser, no AI. Covers the arithmetic acceptance criteria (Step 18 #1-13,
// 15, 17-19). Persistence-dependent criteria (#16 override history, #20-21
// cross-tenant, #22 export injection) are deferred — see the continuation audit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  annualizedValue, annualCostPerSf, governmentBidFromCost, grossProfit, grossMargin,
  maximumVendorCost, optionYearPrice, walkAwayVendorPrice, contractDurationYears
} from '../src/services/cost/engine.js';
import { computeScopeMetrics, missingForReliableCost } from '../src/services/cost/metrics.js';
import { makeBenchmark, annualizeBenchmark, similarityScore } from '../src/services/cost/benchmarks.js';
import { buildPricingScenario, buildStandardScenarios, buildRecommendation } from '../src/services/cost/scenarios.js';

const approx = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test('#1 reliable square footage totals correctly', () => {
  const m = computeScopeMetrics({ buildings: [
    { id: 'b1', sqft: 20000, sqftStatus: 'confirmed' },
    { id: 'b2', sqft: 30000, sqftStatus: 'confirmed' }
  ] });
  assert.equal(m.reliableTotalSqFt, 50000);
  assert.equal(m.squareFootageReliable, true);
  assert.equal(m.buildingCount, 2);
});

test('#2 conflicting square footage is NOT silently used', () => {
  const m = computeScopeMetrics({ buildings: [
    { id: 'b1', sqft: 20000, sqftStatus: 'confirmed' },
    { id: 'b2', sqft: null, sqftStatus: 'conflicting', sources: [{ value: 30000 }, { value: 40000 }] }
  ] });
  assert.equal(m.reliableTotalSqFt, 20000, 'conflicting building excluded from authoritative total');
  assert.equal(m.squareFootageReliable, false);
  assert.deepEqual(m.conflictingBuildings.map(b => b.id), ['b2']);
});

test('#3 annualized value is correct', () => {
  assert.equal(annualizedValue(500000, 5).output, 100000);
  assert.equal(annualizedValue(500000, 0).status, 'insufficient_data');
});

test('#4 obligations and potential value remain distinct', () => {
  const b = makeBenchmark({ benchmarkType: 'exact_prior_contract',
    obligations: 300000, currentValue: 350000, potentialValue: 500000, ceiling: 600000,
    selectedValueType: 'obligations', periodStart: '2023-01-01', periodEnd: '2026-01-01' });
  assert.equal(b.obligations, 300000);
  assert.equal(b.potentialValue, 500000);
  assert.equal(b.ceiling, 600000);
  assert.equal(b.selectedValue, 300000, 'selected value = obligations only, never merged');
  const a = annualizeBenchmark(b);
  // ~3-year span; allow for leap-day day-counting (2024) — correct per spec.
  assert.ok(approx(a.annualizedValue, 100000, 100), `annualized from obligations / ~3 years (got ${a.annualizedValue})`);
});

test('#5 cost per sf is calculated ONLY with reliable inputs', () => {
  assert.equal(annualCostPerSf(100000, 50000).output, 2);
  assert.equal(annualCostPerSf(100000, 0).status, 'insufficient_data');
  assert.equal(annualCostPerSf(100000, null).status, 'insufficient_data');
});

test('#6-8 the three scenarios calculate government price from cost', () => {
  const basis = { recurringVendorCost: 100000, periods: [{ type: 'base', months: 12 }] };
  const [agg, bal, prot] = buildStandardScenarios(basis);
  // price = vendor / (1 - margin)
  assert.ok(approx(agg.baseYearGovernmentPrice, 100000 / 0.85));   // margin 0.15
  assert.ok(approx(bal.baseYearGovernmentPrice, 100000 / 0.75));   // margin 0.25
  assert.ok(approx(prot.baseYearGovernmentPrice, 100000 / 0.65));  // margin 0.35
  assert.ok(prot.baseYearGovernmentPrice > bal.baseYearGovernmentPrice);
});

test('#9 vendor-cost edits recalculate gross margin (fixed government price)', () => {
  const govPrice = 133333.33;
  const m1 = grossMargin(grossProfit({ governmentPrice: govPrice, vendorCost: 100000 }).output, govPrice).output;
  const m2 = grossMargin(grossProfit({ governmentPrice: govPrice, vendorCost: 110000 }).output, govPrice).output;
  assert.ok(approx(m1, 0.25, 0.001));
  assert.ok(m2 < m1, 'higher vendor cost → lower gross margin');
});

test('#10 target-margin edits recalculate maximum vendor cost', () => {
  const max25 = maximumVendorCost({ governmentPrice: 133333.33, requiredGrossProfit: 133333.33 * 0.25 }).output;
  const max35 = maximumVendorCost({ governmentPrice: 133333.33, requiredGrossProfit: 133333.33 * 0.35 }).output;
  assert.ok(max35 < max25, 'higher required margin → lower max vendor cost');
  assert.ok(approx(max25, 100000));
});

test('#11 walk-away vendor cost is correct', () => {
  const w = walkAwayVendorPrice({ governmentPrice: 133333.33, minimumGrossMargin: 0.15 }).output;
  assert.ok(approx(w, 133333.33 * 0.85), 'vendor at which margin == 15%');
});

test('#12 option-year escalation is correct', () => {
  assert.ok(approx(optionYearPrice(100000, 0.03).output, 103000));
  const s = buildPricingScenario({ recurringVendorCost: 100000, governmentEscalationRate: 0.03,
    periods: [{ type: 'base', months: 12 }, { type: 'option', months: 12 }] });
  assert.ok(approx(s.years[1].governmentPrice, s.years[0].governmentPrice * 1.03));
});

test('#13 one-time mobilization is NOT repeated across every year', () => {
  const s = buildPricingScenario({ recurringVendorCost: 100000, mobilization: 20000,
    targetGrossMargin: 0.25, periods: [{ type: 'base', months: 12 }, { type: 'option', months: 12 }] });
  assert.equal(s.years[0].vendorCost, 120000, 'year 1 includes mobilization');
  assert.equal(s.years[1].vendorCost, 100000, 'year 2 does NOT repeat mobilization');
});

test('#15 missing quantities trigger insufficient-data signals', () => {
  const m = computeScopeMetrics({ buildings: [{ id: 'b1', sqft: null, sqftStatus: 'missing' }] });
  const missing = missingForReliableCost(m, { hasPriorAward: false, hasVendorQuote: false });
  assert.ok(missing.includes('reliable_square_footage'));
  assert.ok(missing.includes('service_frequency'));
  assert.ok(missing.includes('prior_award_value'));
});

test('#17 calculation lineage is complete (formula + inputs + output)', () => {
  const r = governmentBidFromCost({ vendorCost: 100000, targetGrossMargin: 0.25 });
  assert.ok(r.formula.includes('1 - target_gross_margin'));
  assert.deepEqual(Object.keys(r.inputs).sort(), ['contingencyAmount', 'primeDirectCost', 'targetGrossMargin', 'vendorCost']);
  assert.equal(typeof r.output, 'number');
  assert.equal(r.status, 'ok');
});

test('#18 arithmetic is deterministic and AI-free (same inputs → same output)', () => {
  const a = buildPricingScenario({ recurringVendorCost: 87654, targetGrossMargin: 0.22,
    periods: [{ type: 'base', months: 12 }, { type: 'option', months: 12 }] });
  const b = buildPricingScenario({ recurringVendorCost: 87654, targetGrossMargin: 0.22,
    periods: [{ type: 'base', months: 12 }, { type: 'option', months: 12 }] });
  assert.deepEqual(a.years, b.years, 'pure function — reproducible without any model');
});

test('#19 unverified benchmarks remain labeled', () => {
  const userB = makeBenchmark({ benchmarkType: 'user_entered', obligations: 100000, selectedValueType: 'obligations' });
  assert.equal(userB.verificationStatus, 'user_provided');
  const est = makeBenchmark({ benchmarkType: 'similar_facility_award', obligations: 100000, selectedValueType: 'obligations' });
  assert.equal(est.verificationStatus, 'estimated', 'unverified award labeled, not "verified"');
});

test('partial-year + sub-12-month duration handled', () => {
  assert.equal(contractDurationYears([{ months: 6 }]), 0.5);
  assert.equal(contractDurationYears([{ months: 12 }, { months: 12 }, { months: 6 }]), 2.5);
});

test('similarity score lists its contributing factors (no hidden weights)', () => {
  const b = makeBenchmark({ benchmarkType: 'same_agency_similar_service', agency: 'USCG',
    placeOfPerformance: 'Base X', serviceFrequency: 'monthly', squareFootage: 50000, selectedValueType: 'obligations', obligations: 1 });
  const { score, factors } = similarityScore(b, { agency: 'USCG', placeOfPerformance: 'Base X', serviceFrequency: 'monthly', squareFootage: 52000 });
  assert.ok(score > 0.8);
  assert.ok(factors.includes('same_agency') && factors.includes('same_location'));
});

test('recommendation: MORE INFORMATION REQUIRED when square footage unreliable', () => {
  const rec = buildRecommendation({ missingForReliableCost: ['reliable_square_footage'], scenario: null });
  assert.equal(rec.status, 'MORE INFORMATION REQUIRED');
  assert.match(rec.disclaimer, /does not provide legal advice/);
});

test('recommendation: NO-BID when vendor quote exceeds walk-away price', () => {
  const s = buildPricingScenario({ recurringVendorCost: 100000, targetGrossMargin: 0.25, minimumGrossMargin: 0.15,
    periods: [{ type: 'base', months: 12 }] });
  const rec = buildRecommendation({ missingForReliableCost: [], scenario: s,
    vendorQuote: s.vendorTarget.walkAwayVendorPrice + 5000 });
  assert.equal(rec.status, 'NO-BID');
});

test('recommendation: BID when reliable + margin met + no critical conflicts', () => {
  const s = buildPricingScenario({ recurringVendorCost: 100000, targetGrossMargin: 0.25, minimumGrossMargin: 0.15,
    periods: [{ type: 'base', months: 12 }] });
  const rec = buildRecommendation({ missingForReliableCost: [], scenario: s, criticalConflicts: 0,
    vendorQuote: s.vendorTarget.idealVendorPrice });
  assert.equal(rec.status, 'BID');
});
