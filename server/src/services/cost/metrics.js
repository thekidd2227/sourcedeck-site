// server/src/services/cost/metrics.js
// Deterministic scope metrics. Computed in code (never via AI). When source
// values conflict, the metric is marked provisional and unreliable values are
// EXCLUDED from authoritative totals (no silent choice). The normalized `scope`
// object is built from the solicitation findings/extraction layer.

const num = n => (typeof n === 'number' && Number.isFinite(n) ? n : null);

/**
 * @param scope {
 *   buildings: [{ id, sqft, sqftStatus: confirmed|conflicting|missing,
 *                 interiorSqft?, exteriorSqft?, sources?[] }],
 *   recurringVisitsPerYear?, specialtyVisitsPerYear?, emergencyCallsPerYear?,
 *   periods: [{ type: 'base'|'option', months }],
 *   clins: string[], scopeTasks: [{ id, hasClin }],
 *   clinsWithoutScope: string[], missingPricingCells: number,
 *   locationCount?
 * }
 */
export function computeScopeMetrics(scope = {}) {
  const buildings = scope.buildings || [];
  const confirmed = buildings.filter(b => b.sqftStatus === 'confirmed' && num(b.sqft) != null);
  const conflicting = buildings.filter(b => b.sqftStatus === 'conflicting');
  const missing = buildings.filter(b => b.sqftStatus === 'missing' || num(b.sqft) == null);

  const reliableTotalSqFt = confirmed.reduce((s, b) => s + b.sqft, 0);
  // Provisional total includes conflicting/missing buildings only as a clearly
  // flagged figure; it is NOT used as an authoritative input downstream.
  const provisionalTotalSqFt = buildings.reduce((s, b) => s + (num(b.sqft) || 0), 0);
  const squareFootageReliable = buildings.length > 0 && conflicting.length === 0 && missing.length === 0;

  const interiorSqFt = sumField(confirmed, 'interiorSqft');
  const exteriorSqFt = sumField(confirmed, 'exteriorSqft');

  const periods = scope.periods || [];
  const base = periods.filter(p => p.type === 'base');
  const options = periods.filter(p => p.type === 'option');
  const baseYearDurationMonths = base.reduce((s, p) => s + (num(p.months) || 0), 0);
  const totalPossibleDurationMonths = periods.reduce((s, p) => s + (num(p.months) || 0), 0);

  const scopeTasks = scope.scopeTasks || [];

  return {
    reliableTotalSqFt,
    provisionalTotalSqFt,
    squareFootageReliable,
    conflictingBuildings: conflicting.map(b => ({ id: b.id, sources: b.sources || [] })),
    missingBuildings: missing.map(b => b.id),
    buildingCount: buildings.length,
    locationCount: scope.locationCount != null ? scope.locationCount : buildings.length,
    interiorSqFt,
    exteriorSqFt,
    recurringVisitsPerYear: num(scope.recurringVisitsPerYear),
    specialtyVisitsPerYear: num(scope.specialtyVisitsPerYear),
    emergencyCallEstimate: num(scope.emergencyCallsPerYear),   // only when stated
    baseYearDurationMonths,
    totalPossibleDurationMonths,
    optionYearCount: options.length,
    clinCount: (scope.clins || []).length,
    missingPricingCellCount: num(scope.missingPricingCells) || 0,
    scopeTasksWithoutClin: scopeTasks.filter(t => !t.hasClin).map(t => t.id),
    clinsWithoutScope: scope.clinsWithoutScope || []
  };
}

/**
 * Which inputs are missing for a reliable cost estimate. Drives the
 * "INSUFFICIENT DATA" behavior in the cost summary.
 */
export function missingForReliableCost(metrics, { hasPriorAward, hasVendorQuote } = {}) {
  const missing = [];
  if (!metrics.squareFootageReliable || metrics.reliableTotalSqFt <= 0) missing.push('reliable_square_footage');
  if (metrics.recurringVisitsPerYear == null) missing.push('service_frequency');
  if (!hasPriorAward) missing.push('prior_award_value');
  if (!hasVendorQuote) missing.push('vendor_quote');
  if (metrics.emergencyCallEstimate == null) missing.push('emergency_call_volume');
  if (metrics.specialtyVisitsPerYear == null) missing.push('specialty_service_quantity');
  if (metrics.missingPricingCellCount > 0) missing.push('completed_pricing_cells');
  return missing;
}

function sumField(arr, field) {
  const vals = arr.map(b => num(b[field])).filter(v => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
}
