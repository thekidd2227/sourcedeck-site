// server/src/services/cost/benchmarks.js
// Benchmark value model. Obligations, current value, potential value, and
// ceiling are kept STRICTLY DISTINCT and never merged into one unlabeled
// "contract value". Annualization is deterministic; similarity is scored from
// visible factors only. No invented incumbents/awards/values (the research
// layer, when enabled, fills these from authoritative sources; this module only
// models + computes).

import { round2, round4 } from './engine.js';

export const BENCHMARK_TYPES = Object.freeze([
  'exact_prior_contract', 'prior_related_award', 'same_location_similar_service',
  'same_agency_similar_service', 'similar_facility_award', 'industry_benchmark',
  'vendor_quote', 'user_entered'
]);
export const VERIFICATION_STATUS = Object.freeze([
  'verified', 'calculated', 'estimated', 'user_provided', 'conflicting', 'insufficient_data'
]);
export const VALUE_TYPES = Object.freeze(['obligations', 'current', 'potential', 'ceiling']);

/**
 * Build a benchmark record. The four value types are stored separately; the
 * caller must pick `selectedValueType` to drive annualization.
 */
export function makeBenchmark(input) {
  if (!BENCHMARK_TYPES.includes(input.benchmarkType)) {
    throw new Error(`benchmark: invalid benchmarkType "${input.benchmarkType}"`);
  }
  const b = {
    benchmarkType: input.benchmarkType,
    contractorName: input.contractorName || null,
    agency: input.agency || null,
    awardNumber: input.awardNumber || null,
    solicitationNumber: input.solicitationNumber || null,
    awardDate: input.awardDate || null,
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    obligations: numOrNull(input.obligations),
    currentValue: numOrNull(input.currentValue),
    potentialValue: numOrNull(input.potentialValue),
    ceiling: numOrNull(input.ceiling),
    selectedValueType: input.selectedValueType || null,
    squareFootage: numOrNull(input.squareFootage),
    buildingCount: numOrNull(input.buildingCount),
    serviceFrequency: input.serviceFrequency || null,
    placeOfPerformance: input.placeOfPerformance || null,
    sourceUrl: input.sourceUrl || null,
    sourceDocument: input.sourceDocument || null,
    retrievalDate: input.retrievalDate || null,
    verificationStatus: VERIFICATION_STATUS.includes(input.verificationStatus)
      ? input.verificationStatus
      : (input.benchmarkType === 'user_entered' || input.benchmarkType === 'vendor_quote'
        ? 'user_provided' : 'estimated')
  };
  b.selectedValue = b.selectedValueType && VALUE_TYPES.includes(b.selectedValueType)
    ? b[selectedKey(b.selectedValueType)] : null;
  return b;
}

/** Deterministic annualization: selected_value / duration_years. */
export function annualizeBenchmark(b) {
  const years = durationYears(b.periodStart, b.periodEnd);
  if (b.selectedValue == null || !(years > 0)) {
    return { annualizedValue: null, annualCostPerSf: null, durationYears: years,
      status: 'insufficient_data',
      warnings: [b.selectedValue == null ? 'no selected_value' : 'no usable period of performance'] };
  }
  const annualizedValue = round2(b.selectedValue / years);
  const annualCostPerSf = (b.squareFootage && b.squareFootage > 0)
    ? round4(annualizedValue / b.squareFootage) : null;
  return { annualizedValue, annualCostPerSf, durationYears: years, status: 'calculated', warnings: [] };
}

/**
 * Similarity score in [0,1] from visible factors. No hidden weights —
 * each contributing factor is listed.
 */
export function similarityScore(b, target) {
  const factors = [];
  let score = 0, max = 0;
  const add = (w, hit, label) => { max += w; if (hit) { score += w; factors.push(label); } };

  add(0.30, b.agency && target.agency && eq(b.agency, target.agency), 'same_agency');
  add(0.25, b.placeOfPerformance && target.placeOfPerformance && eq(b.placeOfPerformance, target.placeOfPerformance), 'same_location');
  add(0.20, b.serviceFrequency && target.serviceFrequency && eq(b.serviceFrequency, target.serviceFrequency), 'same_service_frequency');
  // square-footage proximity (within 25%).
  const sfClose = b.squareFootage && target.squareFootage &&
    Math.abs(b.squareFootage - target.squareFootage) / target.squareFootage <= 0.25;
  add(0.15, sfClose, 'similar_square_footage');
  add(0.10, b.solicitationNumber && target.solicitationNumber && eq(b.solicitationNumber, target.solicitationNumber), 'same_solicitation');

  return { score: max ? round4(score / max) : 0, factors };
}

function selectedKey(t) {
  return t === 'current' ? 'currentValue' : t === 'potential' ? 'potentialValue' : t; // obligations|ceiling
}
function durationYears(start, end) {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return null;
  return round4((e - s) / (365.25 * 24 * 3600 * 1000));
}
function numOrNull(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function eq(a, b) { return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
