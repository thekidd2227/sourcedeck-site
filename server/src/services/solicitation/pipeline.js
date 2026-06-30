// server/src/services/solicitation/pipeline.js
// Idempotent processing pipeline + status machine. Synchronous in-process
// today (queue-swappable seam — see architecture doc). Stages run per document
// then per opportunity; failed documents can be retried independently; adding
// an amendment / reprocessing produces a NEW analysis version while older
// versions remain retrievable.

import { extractDocument, contentHash, normalizeFileType } from './extract/index.js';
import { extractFields } from './extract/fields.js';
import { groupDocuments } from './grouping.js';
import { detectConflicts } from './conflicts.js';
import { buildComplianceMatrix } from './compliance.js';
import { buildAnalysis } from './analysis.js';
import { validateCitation, reconcileFindingStatus } from './findings.js';

export const STAGES = Object.freeze([
  'uploaded', 'validated', 'malware_check', 'classified', 'grouped',
  'normalizing', 'rendering', 'extracting', 'chunking', 'analyzing',
  'cross_validating', 'citation_validating',
  'enrichment_pending', 'completed', 'completed_with_warnings', 'failed', 'cancelled'
]);

const TERMINAL = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled']);
export function isTerminal(status) { return TERMINAL.has(status); }

function classify(filename, text = '') {
  const t = (text || '').toLowerCase();
  if (/sf[- ]?1449|standard form 1449/.test(t)) return 'sf1449';
  if (/statement of work|\bsow\b/.test(t)) return 'sow';
  if (/performance work statement|\bpws\b/.test(t)) return 'pws';
  if (/amendment|sf[- ]?30/.test(t)) return 'amendment';
  if (/wage determination/.test(t)) return 'wage_determination';
  if (/\bquestions?\b.*\banswers?\b|\brfi\b|\bq&a\b/.test(t)) return 'qa_rfi';
  const ft = normalizeFileType(filename);
  if (ft === 'xlsx' || ft === 'csv') return 'pricing_workbook';
  if (ft === 'image') return 'drawing_or_map';
  return 'solicitation';
}

/**
 * Extract ONE document into the store. Idempotent by content hash within a
 * batch (duplicate files are detected, not re-stored).
 * @param input { buffer?, normalizedContent? }
 */
export function runDocumentExtraction(store, tenantId, doc, input, now = null) {
  try {
    store.updateDocument(tenantId, doc.id, { processing_status: 'extracting' });
    const buffer = input.buffer || Buffer.from(input.normalizedContent ? JSON.stringify(input.normalizedContent) : '');
    const hash = contentHash(buffer);

    const dup = store.findDocumentByHash(tenantId, doc.batch_id, hash);
    if (dup && dup.id !== doc.id) {
      store.updateDocument(tenantId, doc.id, {
        processing_status: 'completed_with_warnings', content_hash: hash,
        warnings: [{ code: 'duplicate', message: `duplicate of ${dup.id}` }],
        duplicate_of: dup.id
      });
      return { findings: [], duplicate: true };
    }

    const extraction = extractDocument({
      buffer: input.buffer || Buffer.alloc(0),
      filename: doc.original_filename, mime: doc.content_type,
      normalizedContent: input.normalizedContent || null
    });
    store.putExtraction(tenantId, doc.id, extraction);

    const classification = classify(doc.original_filename, extraction.text);
    store.updateDocument(tenantId, doc.id, {
      content_hash: hash, classification,
      normalized_file_type: normalizeFileType(doc.original_filename, doc.content_type),
      page_count: (extraction.pages || []).length,
      sheet_names: (extraction.sheets || []).map(s => s.sheetName),
      extraction_method: extraction.extractionMethod,
      warnings: extraction.warnings || [],
      processing_status: (extraction.warnings || []).length ? 'completed_with_warnings' : 'extracting'
    });

    // Extraction runs BEFORE grouping, so the opportunity is not yet known.
    // Findings carry a 'pending' opportunityId and are re-stamped with the
    // real opportunity id once the document is grouped (see processBatch).
    const ctx = { tenantId, documentId: doc.id, opportunityId: doc.opportunity_id || 'pending',
      analysisVersion: 1, extractedAt: now };
    const findings = extractFields(ctx, extraction);
    return { findings, classification, extraction, hash };
  } catch (err) {
    store.updateDocument(tenantId, doc.id, {
      processing_status: 'failed', last_error: err.message
    });
    return { findings: [], error: err.message };
  }
}

/**
 * Retry a single failed document without rerunning the batch.
 */
export function retryDocument(store, tenantId, documentId, input, now = null) {
  const doc = store.getDocument(tenantId, documentId);
  if (!doc) return { error: 'not_found' };
  store.updateDocument(tenantId, documentId, { processing_status: 'uploaded', last_error: null });
  return runDocumentExtraction(store, tenantId, doc, input, now);
}

/**
 * Process a whole batch: extract each doc, group into opportunities, then per
 * opportunity build conflicts + compliance + analysis with citation validation.
 * @param inputs Map<documentId, { buffer?, normalizedContent? }>
 */
export function processBatch(store, tenantId, batchId, inputs, opts = {}) {
  const { enrichmentEnabled = false, now = null } = opts;
  const docs = store.listDocumentsByBatch(tenantId, batchId);
  const docFindings = new Map();   // documentId -> Finding[]
  const docSignals  = new Map();   // documentId -> signals for grouping

  // ---- per-document extraction ----
  for (const doc of docs) {
    const input = inputs.get(doc.id) || {};
    const { findings = [] } = runDocumentExtraction(store, tenantId, doc, input, now);
    docFindings.set(doc.id, findings);
    const byKey = indexByKey(findings);
    docSignals.set(doc.id, {
      solicitationNumber: byKey.solicitation_number?.value || null,
      agency: doc.agency_hint || null,
      title: doc.title_hint || null,
      amendmentOf: doc.classification === 'amendment' ? (byKey.solicitation_number?.value || null) : null
    });
  }

  // ---- grouping ----
  store.updateBatch(tenantId, batchId, { status: 'grouped' });
  const groups = groupDocuments(docs.map(d => ({
    id: d.id, originalFilename: d.original_filename, signals: docSignals.get(d.id)
  })));

  // ---- per-opportunity analysis ----
  const opportunities = [];
  for (const g of groups) {
    const opp = store.createOpportunity({
      tenantId, batch_id: batchId, title: g.title,
      solicitation_number: g.solicitationNumber, agency: g.agency,
      grouping_confidence: g.confidence, grouping_evidence: g.evidence
    });
    // attach docs to opportunity + collect findings (re-stamp opportunityId)
    let findings = [];
    let fullText = '';
    let hasPricingWorkbook = false;
    for (const docId of g.documentIds) {
      store.updateDocument(tenantId, docId, { opportunity_id: opp.id });
      const doc = store.getDocument(tenantId, docId);
      if (['pricing_workbook'].includes(doc.classification)) hasPricingWorkbook = true;
      const ex = store.getExtraction(tenantId, docId);
      if (ex) fullText += '\n' + (ex.text || '');
      for (const f of docFindings.get(docId) || []) findings.push({ ...f, opportunityId: opp.id });
    }

    // citation validation → downgrade unverifiable confirmed findings
    const lookup = id => store.getExtraction(tenantId, id);
    findings = findings.map(f => {
      if (f.citation) validateCitation(f.citation, lookup);
      return reconcileFindingStatus(f);
    });

    const conflicts = detectConflicts(findings, { hasPricingWorkbook });
    const compliance = buildComplianceMatrix(findings, fullText);
    const analysis = buildAnalysis({ findings, conflicts, compliance, enrichmentEnabled });

    const version = 1;
    store.putAnalysis(tenantId, opp.id, version, {
      findings, conflicts, compliance,
      sections: analysis.sections, rfiQuestions: analysis.rfiQuestions,
      deadlines: analysis.deadlines, createdAt: now, status: 'completed'
    });
    store.updateOpportunity(tenantId, opp.id, {
      analysis_version: version,
      overall_risk: conflicts.some(c => c.severity === 'critical') ? 'high'
        : conflicts.length ? 'medium' : 'low'
    });
    opportunities.push({ id: opp.id, title: opp.title,
      solicitation_number: opp.solicitation_number, conflicts, deadlines: analysis.deadlines });
  }

  const anyWarn = docs.some(d => (store.getDocument(tenantId, d.id)?.warnings || []).length);
  store.updateBatch(tenantId, batchId, { status: anyWarn ? 'completed_with_warnings' : 'completed' });
  return { opportunities };
}

/**
 * Reprocess an opportunity (e.g. after an amendment is added) → new analysis
 * version; the prior version remains retrievable via the store.
 */
export function reprocessOpportunity(store, tenantId, opportunityId, inputs, opts = {}) {
  const opp = store.getOpportunity(tenantId, opportunityId);
  if (!opp) return { error: 'not_found' };
  const { enrichmentEnabled = false, now = null } = opts;

  const docs = store.listDocumentsByOpportunity(tenantId, opportunityId);
  let findings = [], fullText = '', hasPricingWorkbook = false;
  for (const doc of docs) {
    const input = inputs.get(doc.id) || {};
    const { findings: fs = [] } = runDocumentExtraction(store, tenantId, doc, input, now);
    if (doc.classification === 'pricing_workbook') hasPricingWorkbook = true;
    const ex = store.getExtraction(tenantId, doc.id);
    if (ex) fullText += '\n' + (ex.text || '');
    for (const f of fs) findings.push({ ...f, opportunityId });
  }
  const lookup = id => store.getExtraction(tenantId, id);
  findings = findings.map(f => { if (f.citation) validateCitation(f.citation, lookup); return reconcileFindingStatus(f); });

  const conflicts = detectConflicts(findings, { hasPricingWorkbook });
  const compliance = buildComplianceMatrix(findings, fullText);
  const analysis = buildAnalysis({ findings, conflicts, compliance, enrichmentEnabled });

  const version = (opp.analysis_version || 0) + 1;
  store.putAnalysis(tenantId, opportunityId, version, {
    findings, conflicts, compliance, sections: analysis.sections,
    rfiQuestions: analysis.rfiQuestions, deadlines: analysis.deadlines,
    createdAt: now, status: 'completed'
  });
  store.updateOpportunity(tenantId, opportunityId, { analysis_version: version });
  return { version, conflicts, analysis };
}

function indexByKey(findings) {
  const m = {};
  for (const f of findings) if (!m[f.key]) m[f.key] = f;
  return m;
}
