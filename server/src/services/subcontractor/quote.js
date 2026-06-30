// server/src/services/subcontractor/quote.js
// Vendor quote classification against the existing deterministic Scope & Cost
// Intelligence targets. Reuses cost/engine.js for gross profit/margin — there is
// NO second pricing engine. Entering a quote NEVER mutates the selected cost
// scenario; that requires explicit user confirmation upstream.

import { grossProfit, grossMargin } from '../cost/engine.js';

/**
 * @param quoteAnnual number|null  the vendor's annual quote
 * @param targets {
 *   governmentPrice, primeDirectCost=0, contingencyAmount=0,
 *   idealVendorPrice, maximumVendorPrice, walkAwayVendorPrice
 * }
 */
export function classifyQuote(quoteAnnual, targets) {
  if (!(typeof quoteAnnual === 'number' && Number.isFinite(quoteAnnual) && quoteAnnual >= 0)) {
    return { classification: 'incomplete', reason: 'no usable quote amount' };
  }
  const { governmentPrice, primeDirectCost = 0, contingencyAmount = 0,
    idealVendorPrice, maximumVendorPrice, walkAwayVendorPrice } = targets || {};

  const gp = grossProfit({ governmentPrice, vendorCost: quoteAnnual, primeDirectCost, contingencyAmount });
  const gm = grossMargin(gp.output, governmentPrice);

  let classification;
  if (walkAwayVendorPrice != null && quoteAnnual > walkAwayVendorPrice) classification = 'walk_away';
  else if (maximumVendorPrice != null && quoteAnnual > maximumVendorPrice) classification = 'above_maximum';
  else if (idealVendorPrice != null && quoteAnnual <= idealVendorPrice) classification = 'within_ideal';
  else classification = 'acceptable';

  return {
    classification,
    quoteAnnual,
    grossProfit: gp.output,
    grossMargin: gm.output,
    vsIdeal: idealVendorPrice != null ? round2(quoteAnnual - idealVendorPrice) : null,
    vsMaximum: maximumVendorPrice != null ? round2(quoteAnnual - maximumVendorPrice) : null,
    vsWalkAway: walkAwayVendorPrice != null ? round2(quoteAnnual - walkAwayVendorPrice) : null,
    lineage: [gp, gm],
    note: classification === 'walk_away'
      ? 'quote exceeds the walk-away vendor price — opportunity falls below the minimum acceptable margin'
      : null,
    mutatesScenario: false
  };
}

/** Apply per-year vendor escalation to a base quote (does not mutate scenario). */
export function escalateQuote(baseQuote, escalationRate, years) {
  const out = [];
  for (let i = 0; i < years; i++) out.push(round2(baseQuote * Math.pow(1 + (escalationRate || 0), i)));
  return out;
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
