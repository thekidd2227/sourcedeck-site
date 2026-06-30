// server/src/services/cost/scenarios.js
// Deterministic pricing scenarios, vendor targets, cost ranges, and the
// rule-based bid recommendation. Composes engine.js + metrics.js + benchmarks.js.
// One-time costs (mobilization) are applied to year 1 only; optional services
// are kept separate; escalation is applied per year. No AI arithmetic.

import {
  governmentBidFromCost, optionYearPrice, grossProfit, grossMargin,
  maximumVendorCost, walkAwayVendorPrice, round2, round4
} from './engine.js';

export const SCENARIO_DEFAULTS = Object.freeze({
  aggressive:        { targetGrossMargin: 0.15, minimumGrossMargin: 0.08, riskLevel: 'high' },
  balanced:          { targetGrossMargin: 0.25, minimumGrossMargin: 0.15, riskLevel: 'medium' },
  'margin-protected':{ targetGrossMargin: 0.35, minimumGrossMargin: 0.25, riskLevel: 'low' }
});

/**
 * @param p {
 *   name, targetGrossMargin, minimumGrossMargin,
 *   recurringVendorCost,            // annual recurring vendor cost (year 1 basis)
 *   primeDirectCost = 0, contingencyAmount = 0,
 *   mobilization = 0,               // one-time, year 1 only
 *   governmentEscalationRate = 0, vendorEscalationRate = 0,
 *   periods: [{type:'base'|'option', months}]   // ordered
 * }
 */
export function buildPricingScenario(p) {
  const periods = p.periods && p.periods.length ? p.periods : [{ type: 'base', months: 12 }];
  const target = clampMargin(p.targetGrossMargin);
  const minMargin = clampMargin(p.minimumGrossMargin ?? 0);
  const prime = nn(p.primeDirectCost);
  const contingency = nn(p.contingencyAmount);
  const mobilization = nn(p.mobilization);
  const gEsc = num(p.governmentEscalationRate) || 0;
  const vEsc = num(p.vendorEscalationRate) || 0;
  const recurring = nn(p.recurringVendorCost);

  const lineage = [];
  const years = [];
  let prevGov = null;
  for (let i = 0; i < periods.length; i++) {
    const yearFactorMonths = num(periods[i].months) || 12;
    const yearFraction = yearFactorMonths / 12;
    // Vendor cost for the year: recurring escalated + one-time mobilization (yr1).
    const recurringThisYear = round2(recurring * Math.pow(1 + vEsc, i) * yearFraction);
    const vendorCost = round2(recurringThisYear + (i === 0 ? mobilization : 0));

    let govPrice;
    if (i === 0) {
      const bid = governmentBidFromCost({ vendorCost, primeDirectCost: prime, contingencyAmount: contingency, targetGrossMargin: target });
      lineage.push(bid);
      govPrice = bid.output;
    } else {
      const esc = optionYearPrice(prevGov, gEsc);
      lineage.push(esc);
      govPrice = esc.output;
    }
    const gp = grossProfit({ governmentPrice: govPrice, vendorCost, primeDirectCost: prime, contingencyAmount: contingency });
    const gm = grossMargin(gp.output, govPrice);
    lineage.push(gp, gm);
    years.push({
      year: i + 1, periodType: periods[i].type, months: yearFactorMonths,
      governmentPrice: govPrice, vendorCost, primeDirectCost: prime, contingencyAmount: contingency,
      grossProfit: gp.output, grossMargin: gm.output
    });
    prevGov = govPrice;
  }

  const evaluatedTotal = round2(years.reduce((s, y) => s + (y.governmentPrice || 0), 0));
  const annualProfit = years.length ? years[0].grossProfit : null;
  const vendorTarget = buildVendorTarget({
    baseGovernmentPrice: years[0]?.governmentPrice, primeDirectCost: prime,
    contingencyAmount: contingency, targetGrossMargin: target, minimumGrossMargin: minMargin,
    idealVendorCost: years[0]?.vendorCost
  });

  return {
    name: p.name || 'scenario',
    targetGrossMargin: target, minimumGrossMargin: minMargin,
    baseYearGovernmentPrice: years[0]?.governmentPrice ?? null,
    optionYearPrices: years.slice(1).map(y => y.governmentPrice),
    governmentEscalationRate: gEsc, vendorEscalationRate: vEsc,
    evaluatedTotal, annualProfit,
    years, vendorTarget, lineage
  };
}

export function buildVendorTarget({ baseGovernmentPrice, primeDirectCost = 0, contingencyAmount = 0, targetGrossMargin, minimumGrossMargin, idealVendorCost }) {
  if (!(baseGovernmentPrice > 0)) {
    return { status: 'insufficient_data', warnings: ['no base-year government price'] };
  }
  const requiredGrossProfit = round2(baseGovernmentPrice * targetGrossMargin);
  const max = maximumVendorCost({ governmentPrice: baseGovernmentPrice, primeDirectCost, contingencyAmount, requiredGrossProfit });
  const walk = walkAwayVendorPrice({ governmentPrice: baseGovernmentPrice, primeDirectCost, contingencyAmount, minimumGrossMargin });
  return {
    idealVendorPrice: numOr(idealVendorCost, null),
    acceptableVendorRange: idealVendorCost != null && max.output != null
      ? [round2(idealVendorCost), max.output] : null,
    maximumVendorPrice: max.output,
    walkAwayVendorPrice: walk.output,
    targetGrossMargin, minimumGrossMargin,
    requiredGrossProfit, primeDirectCost, contingencyAmount,
    status: (max.status === 'ok' && walk.status === 'ok') ? 'ok' : 'insufficient_data',
    lineage: [max, walk]
  };
}

/** Build all three standard scenarios from a shared cost basis. */
export function buildStandardScenarios(basis) {
  return Object.entries(SCENARIO_DEFAULTS).map(([name, d]) =>
    buildPricingScenario({ ...basis, name, targetGrossMargin: d.targetGrossMargin, minimumGrossMargin: d.minimumGrossMargin }));
}

/**
 * Rule-based recommendation. Derived from facts/metrics/thresholds, NOT a model
 * opinion. Statuses: BID | CONDITIONAL BID | NO-BID | MORE INFORMATION REQUIRED.
 */
export function buildRecommendation({ missingForReliableCost = [], scenario, criticalConflicts = 0, vendorQuote = null }) {
  const reasons = [];
  let status;

  if (missingForReliableCost.length >= 3 || missingForReliableCost.includes('reliable_square_footage')) {
    status = 'MORE INFORMATION REQUIRED';
    reasons.push(`insufficient inputs: ${missingForReliableCost.join(', ')}`);
  } else if (scenario?.vendorTarget?.status === 'insufficient_data') {
    status = 'MORE INFORMATION REQUIRED';
    reasons.push('vendor target could not be computed');
  } else if (scenario?.vendorTarget?.walkAwayVendorPrice != null && vendorQuote != null &&
             vendorQuote > scenario.vendorTarget.walkAwayVendorPrice) {
    status = 'NO-BID';
    reasons.push('vendor quote exceeds the walk-away vendor price (cannot meet minimum margin)');
  } else if (criticalConflicts > 0) {
    status = 'CONDITIONAL BID';
    reasons.push(`${criticalConflicts} critical solicitation conflict(s) must be resolved (RFI)`);
  } else {
    status = 'BID';
    reasons.push('reliable scope + a scenario meeting the target margin');
  }

  return {
    status,
    recommendedBaseYearPrice: scenario?.baseYearGovernmentPrice ?? null,
    recommendedEvaluatedTotal: scenario?.evaluatedTotal ?? null,
    maximumVendorCost: scenario?.vendorTarget?.maximumVendorPrice ?? null,
    walkAwayVendorCost: scenario?.vendorTarget?.walkAwayVendorPrice ?? null,
    expectedGrossProfit: scenario?.annualProfit ?? null,
    expectedGrossMargin: scenario?.years?.[0]?.grossMargin ?? null,
    confidence: status === 'BID' ? 0.75 : status === 'CONDITIONAL BID' ? 0.6 : 0.4,
    basis: 'deterministic: scope metrics + cost engine + thresholds (+ conflicts/RFIs); not a model opinion',
    reasons,
    disclaimer: 'Draft decision-support only. Requires human review against the live SAM.gov notice and controlling documents. SourceDeck does not submit bids and does not provide legal advice.'
  };
}

function clampMargin(m) { const v = num(m); return v != null && v >= 0 && v < 1 ? v : 0; }
function nn(v) { const n = num(v); return n != null && n >= 0 ? n : 0; }
function num(n) { return typeof n === 'number' && Number.isFinite(n) ? n : null; }
function numOr(v, d) { return num(v) != null ? round2(v) : d; }
