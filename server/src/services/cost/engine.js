// server/src/services/cost/engine.js
// Deterministic cost calculation engine. ALL final arithmetic lives here in
// plain application code — the AI never computes authoritative numbers. Every
// calculation returns a lineage record {formula, inputs, output, status,
// warnings} so results are auditable and reproducible.
//
// Pure module: no I/O, no provider calls, no DB. Safe to unit-test exhaustively.

export const CALC_STATUS = Object.freeze(['ok', 'insufficient_data', 'invalid_input']);

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const isPos = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
const isNonNeg = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function lineage(formula, inputs, output, status = 'ok', warnings = []) {
  return { formula, inputs, output, status, warnings };
}

/** annualized_value = selected_contract_value / contract_duration_years */
export function annualizedValue(selectedContractValue, durationYears) {
  const inputs = { selectedContractValue, durationYears };
  if (!isNonNeg(selectedContractValue) || !isPos(durationYears)) {
    return lineage('selected_contract_value / contract_duration_years', inputs, null,
      'insufficient_data', ['need a non-negative value and a positive duration']);
  }
  return lineage('selected_contract_value / contract_duration_years', inputs,
    round2(selectedContractValue / durationYears));
}

/** annual_cost_per_sf = annualized_recurring_value / reliable_serviced_sf
 *  Computed ONLY when both inputs are reliable (>0). */
export function annualCostPerSf(annualizedRecurringValue, reliableServicedSqFt) {
  const inputs = { annualizedRecurringValue, reliableServicedSqFt };
  if (!isPos(annualizedRecurringValue) || !isPos(reliableServicedSqFt)) {
    return lineage('annualized_recurring_value / reliable_serviced_square_footage', inputs, null,
      'insufficient_data', ['cost/sf requires a reliable recurring value AND reliable square footage']);
  }
  return lineage('annualized_recurring_value / reliable_serviced_square_footage', inputs,
    round4(annualizedRecurringValue / reliableServicedSqFt));
}

/** recommended_government_bid =
 *  (vendor_cost + prime_direct_cost + contingency) / (1 - target_gross_margin) */
export function governmentBidFromCost({ vendorCost, primeDirectCost = 0, contingencyAmount = 0, targetGrossMargin }) {
  const inputs = { vendorCost, primeDirectCost, contingencyAmount, targetGrossMargin };
  if (!isNonNeg(vendorCost) || !isNonNeg(primeDirectCost) || !isNonNeg(contingencyAmount)) {
    return lineage('(vendor+prime+contingency)/(1-margin)', inputs, null, 'invalid_input', ['costs must be non-negative']);
  }
  if (!(typeof targetGrossMargin === 'number' && targetGrossMargin >= 0 && targetGrossMargin < 1)) {
    return lineage('(vendor+prime+contingency)/(1-margin)', inputs, null, 'invalid_input',
      ['target_gross_margin must be in [0,1)']);
  }
  return lineage('(vendor_cost + prime_direct_cost + contingency) / (1 - target_gross_margin)', inputs,
    round2((vendorCost + primeDirectCost + contingencyAmount) / (1 - targetGrossMargin)));
}

/** gross_profit = government_price - vendor_cost - prime_direct_cost - contingency */
export function grossProfit({ governmentPrice, vendorCost, primeDirectCost = 0, contingencyAmount = 0 }) {
  const inputs = { governmentPrice, vendorCost, primeDirectCost, contingencyAmount };
  if (![governmentPrice, vendorCost, primeDirectCost, contingencyAmount].every(isNonNeg)) {
    return lineage('government_price - vendor_cost - prime_direct_cost - contingency', inputs, null,
      'insufficient_data', ['all inputs must be present and non-negative']);
  }
  return lineage('government_price - vendor_cost - prime_direct_cost - contingency', inputs,
    round2(governmentPrice - vendorCost - primeDirectCost - contingencyAmount));
}

/** gross_margin = gross_profit / government_price */
export function grossMargin(grossProfitValue, governmentPrice) {
  const inputs = { grossProfit: grossProfitValue, governmentPrice };
  if (typeof grossProfitValue !== 'number' || !isPos(governmentPrice)) {
    return lineage('gross_profit / government_price', inputs, null, 'insufficient_data',
      ['government_price must be > 0']);
  }
  return lineage('gross_profit / government_price', inputs, round4(grossProfitValue / governmentPrice));
}

/** maximum_vendor_cost =
 *  government_price - prime_direct_cost - contingency - required_gross_profit */
export function maximumVendorCost({ governmentPrice, primeDirectCost = 0, contingencyAmount = 0, requiredGrossProfit }) {
  const inputs = { governmentPrice, primeDirectCost, contingencyAmount, requiredGrossProfit };
  if (![governmentPrice, primeDirectCost, contingencyAmount, requiredGrossProfit].every(isNonNeg)) {
    return lineage('government_price - prime - contingency - required_gross_profit', inputs, null,
      'insufficient_data', ['all inputs must be present and non-negative']);
  }
  return lineage('government_price - prime_direct_cost - contingency - required_gross_profit', inputs,
    round2(governmentPrice - primeDirectCost - contingencyAmount - requiredGrossProfit));
}

/** option_year_price = previous_year_price * (1 + escalation_rate) */
export function optionYearPrice(previousYearPrice, escalationRate) {
  const inputs = { previousYearPrice, escalationRate };
  if (!isPos(previousYearPrice) || typeof escalationRate !== 'number' || escalationRate < -1) {
    return lineage('previous_year_price * (1 + escalation_rate)', inputs, null, 'invalid_input',
      ['need a positive previous price and an escalation_rate >= -1']);
  }
  return lineage('previous_year_price * (1 + escalation_rate)', inputs,
    round2(previousYearPrice * (1 + escalationRate)));
}

/** walk_away_vendor_price: the vendor cost at which gross margin == minimum.
 *  Derived: vendor = government_price*(1 - min_margin) - prime - contingency. */
export function walkAwayVendorPrice({ governmentPrice, primeDirectCost = 0, contingencyAmount = 0, minimumGrossMargin }) {
  const inputs = { governmentPrice, primeDirectCost, contingencyAmount, minimumGrossMargin };
  if (!isPos(governmentPrice) || !(minimumGrossMargin >= 0 && minimumGrossMargin < 1)) {
    return lineage('government_price*(1-min_margin) - prime - contingency', inputs, null,
      'insufficient_data', ['need a positive government_price and min_margin in [0,1)']);
  }
  const v = governmentPrice * (1 - minimumGrossMargin) - primeDirectCost - contingencyAmount;
  return lineage('government_price*(1 - minimum_gross_margin) - prime_direct_cost - contingency', inputs,
    round2(v), v < 0 ? 'insufficient_data' : 'ok',
    v < 0 ? ['walk-away vendor price is negative — the opportunity cannot meet the minimum margin'] : []);
}

/**
 * Contract duration in years from a base period + option periods, supporting
 * partial years (months) and contracts shorter than 12 months.
 * @param periods Array<{ months }> e.g. [{months:12},{months:12}]
 */
export function contractDurationYears(periods = []) {
  const totalMonths = periods.reduce((s, p) => s + (isNonNeg(p.months) ? p.months : 0), 0);
  return round4(totalMonths / 12);
}

function round4(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }
export { round2, round4 };
