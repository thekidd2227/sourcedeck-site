// server/src/services/solicitation/extract/fields.js
// Deterministic candidate-fact extraction from a normalized extraction.
// Emits findings with page/sheet citations. NO model calls — this is the
// evidence layer the AI synthesis is constrained by.

import { makeCitation, makeFinding } from '../findings.js';

const RX = {
  // Federal solicitation numbers are always labeled. Anchor on the label and
  // capture the identifier (e.g. 70B03C26Q0000164, 36C24426Q0457, W50S8X...).
  solicitationNumber: /(?:solicitation|reference|notice|rfq|rfp|combined\s+synopsis)\s*(?:no\.?|number|num|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{7,})/i,
  naics: /\bNAICS(?:\s*code)?\s*[:#]?\s*(\d{6})\b/i,
  setAside: /\b(total\s+small\s+business|8\(a\)|HUBZone|SDVOSB|service[- ]disabled\s+veteran|WOSB|women[- ]owned|small\s+business\s+set[- ]aside|unrestricted|full\s+and\s+open)\b/i,
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]*[A-Za-z0-9-]/g,
  dueDate: /\b(?:responses?\s+(?:are\s+)?due|response\s+due|offers?\s+due|quotes?\s+due|submission\s+deadline|closing\s+date|due\s+(?:date|by))\b[^\n]*/i,
  questionDate: /\b(?:questions?\s+(?:are\s+)?due|question\s+deadline|RFI\s+deadline|questions?\s+(?:must|shall)\s+be\s+submitted)\b[^\n]*/i,
  date: /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i,
  time: /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/,
  timezone: /\b(ET|ET\b|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT|Eastern|Central|Mountain|Pacific)\b/,
  clin: /\bCLIN\s*[:#]?\s*(\d{3,4})\b/gi,
  startupDays: /\b(\d{1,3})\s*(?:calendar\s+)?days?\s+(?:after\s+award|from\s+award|to\s+(?:begin|start|commence)|for\s+(?:phase[- ]in|transition|start[- ]up))/i,
  siteVisit: /\bsite\s+visit\b/i,
  mandatorySite: /\b(mandatory|required)\b[^\n]{0,40}\bsite\s+visit\b|\bsite\s+visit\b[^\n]{0,40}\b(mandatory|required)\b/i,
  popAddress: /\b(\d{2,5}\s+[A-Z][A-Za-z0-9 .'-]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Highway|Hwy\.?))\b/
};

// A malformed email is one that fails a strict RFC-ish shape (no TLD dot, or
// trailing/leading dot, or space) while still looking like an attempted email.
const STRICT_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

function searchPages(extraction, rx) {
  for (const page of extraction.pages || []) {
    for (const rawLine of String(page.text || '').split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const m = line.match(rx);
      if (m) return { match: m, line, pageNumber: page.pageNumber, printedPageLabel: page.printedPageLabel };
    }
  }
  return null;
}

function cite(ctx, hit, method = 'pdf_text', confidence = 0.9) {
  return makeCitation({
    tenantId: ctx.tenantId,
    documentId: ctx.documentId,
    pageNumber: hit.pageNumber,
    printedPageLabel: hit.printedPageLabel,
    sourceText: hit.line,
    confidence,
    extractionMethod: method,
    extractedAt: ctx.extractedAt
  });
}

/**
 * @param ctx { tenantId, opportunityId, documentId, analysisVersion, extractedAt }
 * @param extraction normalized extraction (pages/sheets/sections/text)
 * @returns Finding[]
 */
export function extractFields(ctx, extraction) {
  const out = [];
  const add = f => out.push(f);
  const F = (key, value, status, citation, extra = {}) =>
    makeFinding({ tenantId: ctx.tenantId, opportunityId: ctx.opportunityId,
      analysisVersion: ctx.analysisVersion || 1, section: 'metadata',
      key, value, status, citation, ...extra });

  const sol = searchPages(extraction, RX.solicitationNumber);
  if (sol) add(F('solicitation_number', sol.match[1], 'confirmed', cite(ctx, sol)));

  const naics = searchPages(extraction, RX.naics);
  if (naics) add(F('naics', naics.match[1], 'confirmed', cite(ctx, naics)));

  const setAside = searchPages(extraction, RX.setAside);
  if (setAside) add(F('set_aside', setAside.match[1], 'confirmed', cite(ctx, setAside)));

  // Deadlines: capture the line, then pull date/time/tz out of it.
  const due = searchPages(extraction, RX.dueDate);
  if (due) {
    const date = (due.line.match(RX.date) || [])[0] || null;
    const time = (due.line.match(RX.time) || [])[0] || null;
    const tz   = (due.line.match(RX.timezone) || [])[0] || null;
    add(F('submission_deadline', due.line, 'confirmed', cite(ctx, due),
      { normalizedValue: [date, time, tz].filter(Boolean).join(' ') || null }));
    if (!tz) add(F('submission_deadline_timezone', null, 'missing', null,
      { note: 'submission deadline found but no timezone stated', section: 'metadata' }));
  }

  const q = searchPages(extraction, RX.questionDate);
  if (q) add(F('question_deadline', q.line, 'confirmed', cite(ctx, q)));

  // Emails + malformed detection.
  for (const page of extraction.pages || []) {
    const matches = String(page.text || '').match(RX.email) || [];
    for (const raw of matches) {
      const malformed = !STRICT_EMAIL.test(raw);
      const hit = { line: raw, pageNumber: page.pageNumber, printedPageLabel: page.printedPageLabel };
      add(F(malformed ? 'submission_email_malformed' : 'contact_email', raw,
        malformed ? 'conflicting' : 'confirmed', cite(ctx, hit, 'pdf_text', malformed ? 0.7 : 0.9),
        malformed ? { note: 'email address appears malformed (no valid TLD / bad shape)' } : {}));
    }
  }

  // CLIN references.
  const clins = new Set();
  for (const page of extraction.pages || []) {
    let m; const rx = new RegExp(RX.clin.source, 'gi');
    while ((m = rx.exec(page.text || '')) !== null) clins.add(m[1]);
  }
  if (clins.size) {
    const hit = searchPages(extraction, RX.clin) || {};
    add(F('clins', [...clins].join(','), 'confirmed', hit.line ? cite(ctx, hit) :
      makeCitation({ tenantId: ctx.tenantId, documentId: ctx.documentId, sectionReference: 'B',
        sourceText: [...clins].join(','), extractionMethod: 'inference', confidence: 0.6,
        extractedAt: ctx.extractedAt })));
  }

  // Startup window (for cross-doc startup conflict detection).
  const startup = searchPages(extraction, RX.startupDays);
  if (startup) add(F('startup_window_days', startup.match[1], 'confirmed', cite(ctx, startup)));

  // Place of performance.
  const pop = searchPages(extraction, RX.popAddress);
  if (pop) add(makeFinding({ tenantId: ctx.tenantId, opportunityId: ctx.opportunityId,
    analysisVersion: ctx.analysisVersion || 1, section: 'place_of_performance',
    key: 'primary_address', value: pop.match[1], status: 'confirmed', citation: cite(ctx, pop) }));

  // Site-visit classification — "not mentioned" must NOT become "no site visit".
  const siteVisit = searchPages(extraction, RX.siteVisit);
  if (siteVisit) {
    const mandatory = RX.mandatorySite.test(siteVisit.line);
    const hasDate = RX.date.test(siteVisit.line);
    const state = mandatory ? 'mandatory' : hasDate ? 'scheduled' : 'referenced_details_missing';
    add(makeFinding({ tenantId: ctx.tenantId, opportunityId: ctx.opportunityId,
      analysisVersion: ctx.analysisVersion || 1, section: 'site_visit',
      key: 'site_visit_state', value: state, status: 'confirmed', citation: cite(ctx, siteVisit) }));
  } else {
    add(makeFinding({ tenantId: ctx.tenantId, opportunityId: ctx.opportunityId,
      analysisVersion: ctx.analysisVersion || 1, section: 'site_visit',
      key: 'site_visit_state', value: 'unstated', status: 'missing',
      note: 'no site-visit language found in this document; state is "unstated", not "no site visit"' }));
  }

  // Blank required pricing cells (from any sheet).
  for (const sheet of extraction.sheets || []) {
    for (const addr of sheet.blankRequiredCells || []) {
      add(makeFinding({ tenantId: ctx.tenantId, opportunityId: ctx.opportunityId,
        analysisVersion: ctx.analysisVersion || 1, section: 'compliance',
        key: 'blank_required_pricing_cell', value: `${sheet.sheetName}!${addr}`,
        status: 'conflicting',
        citation: makeCitation({ tenantId: ctx.tenantId, documentId: ctx.documentId,
          sheetName: sheet.sheetName, cellRange: addr,
          sourceText: `(blank required cell ${addr})`, extractionMethod: 'xlsx_cell',
          confidence: 0.8, extractedAt: ctx.extractedAt }),
        note: 'required pricing cell is blank' }));
    }
  }

  return out;
}
