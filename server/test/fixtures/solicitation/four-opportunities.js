// server/test/fixtures/solicitation/four-opportunities.js
// Sanitized, synthetic solicitation packages modeled on the STRUCTURAL patterns
// of the four-opportunity reference analysis (CBP/USCG/VA/USDA-like). No real
// PHI, no real solicitation text — only the shapes needed to exercise grouping,
// extraction, citations, conflicts, compliance, and versioning.
//
// Each document is given as `normalizedContent` (what a parser yields): pages
// with text and/or sheets with A1-addressed cells.

function page(n, text) { return { pageNumber: n, printedPageLabel: String(n), text }; }

export function opportunityA_base() {
  return {
    filename: 'A_combined_solicitation.pdf', classificationHint: 'solicitation',
    normalizedContent: { pages: [
      page(1, [
        'Combined Synopsis/Solicitation No: 70B03C26Q0000164',
        'Agency: Department of Homeland Security',
        'NAICS code: 561720',
        'Total Small Business Set-Aside',
        'Responses are due 06/22/2026 at 3:00 PM Pacific.',
        'Questions are due 06/15/2026.',
        'Place of performance: 1234 Harbor Drive, San Diego, CA.',
        'CLIN 0001 Base period janitorial services.',
        'CLIN 0002 Option period one.',
        'Personnel list due 06/20/2026.'
      ].join('\n'))
    ] }
  };
}
export function opportunityA_amendment() {
  return {
    filename: 'A_amendment_0001.pdf', classificationHint: 'amendment',
    normalizedContent: { pages: [
      page(1, [
        'Amendment 0001 to Solicitation No: 70B03C26Q0000164 (SF-30).',
        'Quotes due 06/29/2026 at 2:00 PM Eastern.',
        'Personnel list due 06/24/2026.'
      ].join('\n'))
    ] }
  };
}

export function opportunityB_sf1449() {
  return {
    filename: 'B_SF1449.pdf', classificationHint: 'sf1449',
    normalizedContent: { pages: [
      page(1, [
        'Standard Form 1449 — Solicitation No: 70Z08426Q0042',
        'Agency: United States Coast Guard',
        'NAICS code: 561210',
        'Offers due 07/10/2026 at 4:00 PM Eastern.',
        'A mandatory site visit will be held; the prime contractor must be named on the sign-in sheet.',
        'CLIN 0001 facilities support services.',
        'Submit your quote to contracting.officer@uscg.mil',
        'SAM.gov registration must be active.'
      ].join('\n'))
    ] }
  };
}
export function opportunityB_pws() {
  return {
    filename: 'B_PWS.pdf', classificationHint: 'pws',
    normalizedContent: { pages: [
      page(1, [
        'Performance Work Statement — Solicitation No: 70Z08426Q0042',
        'The contractor shall provide wage determination compliant labor.',
        'CLIN 0002 recurring maintenance.'
      ].join('\n'))
    ] }
  };
}

export function opportunityC_solicitation() {
  return {
    filename: 'C_solicitation.pdf', classificationHint: 'solicitation',
    normalizedContent: { pages: [
      page(1, [
        'Solicitation No: 36C24426Q0457',
        'Agency: Department of Veterans Affairs',
        'NAICS code: 238220',
        'Offers due 07/01/2026 at 1:00 PM Eastern.',
        'Phase-in shall be completed within 30 calendar days after award.',
        'Submit quotes to contracting@va gov',           // malformed (missing dot)
        'CLIN 0001 HVAC services.'
      ].join('\n'))
    ] }
  };
}
export function opportunityC_addendum() {
  return {
    filename: 'C_addendum.pdf', classificationHint: 'amendment',
    normalizedContent: { pages: [
      page(1, [
        'Addendum to Solicitation No: 36C24426Q0457',
        'The contractor shall begin within 15 days from award.'  // conflicts with 30
      ].join('\n'))
    ] }
  };
}

export function opportunityD_partial_sow() {
  return {
    filename: 'D_partial_SOW.pdf', classificationHint: 'sow',
    normalizedContent: { pages: [
      page(1, [
        'Statement of Work — Reference No: AG3142B260012',
        'Agency: Department of Agriculture',
        'CLIN 0001 grounds maintenance.',
        // intentionally: no due date, no evaluation criteria, no pricing workbook
        'A site investigation is referenced but no details are provided.'
      ].join('\n'))
    ] }
  };
}

// A pricing workbook for opportunity A (has a blank required cell).
export function opportunityA_pricing() {
  return {
    filename: 'A_pricing.csv', classificationHint: 'pricing_workbook',
    csv: 'CLIN,Description,Unit Price,Total\n0001,Base janitorial,,\n0002,Option one,500,500\n'
  };
}

export function allDocs() {
  return [
    opportunityA_base(), opportunityA_amendment(), opportunityA_pricing(),
    opportunityB_sf1449(), opportunityB_pws(),
    opportunityC_solicitation(), opportunityC_addendum(),
    opportunityD_partial_sow()
  ];
}
