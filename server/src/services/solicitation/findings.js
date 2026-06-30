// server/src/services/solicitation/findings.js
// The finding & citation contract for the Solicitation Intelligence Workspace.
//
// Every MATERIAL claim the workspace surfaces must be a Finding that carries a
// Citation pointing at a verifiable location in stored, extracted source text.
// Inferences are labeled `inferred`, contradictions `conflicting`, gaps
// `missing`. A model-produced citation that cannot be validated against stored
// extraction text is never presented as `confirmed`.
//
// Pure module: no I/O, no Electron, no provider calls. Safe to unit-test.

export const FACT_STATUS = Object.freeze([
  'confirmed',     // directly extracted + citation validates
  'inferred',      // derived/assumed; labeled, lower confidence
  'conflicting',   // two sources disagree
  'missing',       // referenced or expected but absent
  'not_applicable' // explicitly N/A for this solicitation
]);

export const EXTRACTION_METHODS = Object.freeze([
  'pdf_text', 'pdf_ocr', 'docx_text', 'xlsx_cell', 'csv_cell',
  'image_ocr', 'metadata', 'inference', 'ai_synthesis'
]);

/**
 * Build a citation. A citation locates source text inside ONE document at a
 * page / sheet+cell / section. At least one locator must be present.
 */
export function makeCitation({
  id, tenantId, documentId,
  pageNumber = null, printedPageLabel = null,
  sheetName = null, cellRange = null,
  sectionReference = null,
  sourceText, sourceBoundingBox = null,
  confidence = null, extractionMethod, extractedAt
}) {
  if (!tenantId) throw new Error('citation: tenantId required');
  if (!documentId) throw new Error('citation: documentId required');
  if (!sourceText || !String(sourceText).trim()) {
    throw new Error('citation: sourceText required (no citation without source)');
  }
  if (!EXTRACTION_METHODS.includes(extractionMethod)) {
    throw new Error(`citation: invalid extractionMethod "${extractionMethod}"`);
  }
  const hasLocator =
    pageNumber != null || sheetName != null || cellRange != null ||
    sectionReference != null;
  if (!hasLocator) {
    throw new Error('citation: at least one locator (page/sheet/cell/section) required');
  }
  return {
    id: id || null,
    tenantId,
    documentId,
    pageNumber,
    printedPageLabel,
    sheetName,
    cellRange,
    sectionReference,
    sourceText: String(sourceText),
    sourceBoundingBox,
    confidence,
    extractionMethod,
    extractedAt: extractedAt || null,
    validated: false
  };
}

/**
 * Build a material finding. `citation` is required for confirmed/conflicting
 * findings; missing/not_applicable/inferred may omit it but must say why.
 */
export function makeFinding({
  tenantId, opportunityId, analysisVersion = 1,
  section, key, value = null, normalizedValue = null,
  status, confidence = null, citation = null, note = null
}) {
  if (!tenantId) throw new Error('finding: tenantId required');
  if (!opportunityId) throw new Error('finding: opportunityId required');
  if (!section) throw new Error('finding: section required');
  if (!key) throw new Error('finding: key required');
  if (!FACT_STATUS.includes(status)) {
    throw new Error(`finding: invalid status "${status}"`);
  }
  // A confirmed material finding MUST have a citation. This is the core
  // anti-fabrication rule.
  if (status === 'confirmed' && !citation) {
    throw new Error(`finding "${key}": confirmed findings require a citation`);
  }
  if (status === 'missing' && !note) {
    throw new Error(`finding "${key}": missing findings require a note explaining the gap`);
  }
  return {
    tenantId, opportunityId, analysisVersion,
    section, key, value, normalizedValue,
    status, confidence, citation, note
  };
}

/**
 * Validate a citation against the stored extraction for its document.
 * `lookupExtraction(documentId)` returns the normalized extraction
 * ({ pages:[{pageNumber,text}], sheets:[{sheetName, cells:{A1:..}}], sections }).
 *
 * Returns { validated:boolean, reason }. The citation object is mutated to set
 * `validated`. A citation whose sourceText cannot be found in the cited
 * location does NOT validate — callers must downgrade the finding's status.
 */
export function validateCitation(citation, lookupExtraction) {
  const ex = lookupExtraction(citation.documentId);
  if (!ex) return finalize(citation, false, 'no_extraction_for_document');

  const needle = normalizeForMatch(citation.sourceText);
  if (!needle) return finalize(citation, false, 'empty_source_text');

  // Sheet/cell citation: the cell's stored value must contain the source text.
  if (citation.sheetName != null) {
    const sheet = (ex.sheets || []).find(s => s.sheetName === citation.sheetName);
    if (!sheet) return finalize(citation, false, 'sheet_not_found');
    if (citation.cellRange) {
      const cellVal = sheet.cells ? sheet.cells[citation.cellRange] : undefined;
      const ok = cellVal != null && normalizeForMatch(String(cellVal)).includes(needle);
      return finalize(citation, ok, ok ? 'ok' : 'cell_text_mismatch');
    }
    const hay = normalizeForMatch(Object.values(sheet.cells || {}).join(' '));
    const ok = hay.includes(needle);
    return finalize(citation, ok, ok ? 'ok' : 'sheet_text_mismatch');
  }

  // Page citation: the page's stored text must contain the source text.
  if (citation.pageNumber != null) {
    const page = (ex.pages || []).find(p => p.pageNumber === citation.pageNumber);
    if (!page) return finalize(citation, false, 'page_not_found');
    const ok = normalizeForMatch(page.text || '').includes(needle);
    return finalize(citation, ok, ok ? 'ok' : 'page_text_mismatch');
  }

  // Section citation: the named section's stored text must contain it.
  if (citation.sectionReference != null) {
    const sec = (ex.sections || []).find(
      s => s.letter === citation.sectionReference || s.title === citation.sectionReference
    );
    if (!sec) return finalize(citation, false, 'section_not_found');
    const ok = normalizeForMatch(sec.text || '').includes(needle);
    return finalize(citation, ok, ok ? 'ok' : 'section_text_mismatch');
  }

  return finalize(citation, false, 'no_locator');
}

function finalize(citation, validated, reason) {
  citation.validated = validated;
  return { validated, reason };
}

export function normalizeForMatch(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Enforce the contract on a finding after citation validation: a `confirmed`
 * finding whose citation failed validation is downgraded to `inferred` and
 * annotated, so unverifiable claims are never shown as confirmed.
 */
export function reconcileFindingStatus(finding) {
  if (finding.status === 'confirmed' && finding.citation && finding.citation.validated === false) {
    return {
      ...finding,
      status: 'inferred',
      note: (finding.note ? finding.note + ' ' : '') +
        '[citation could not be validated against stored source; downgraded from confirmed]'
    };
  }
  return finding;
}
