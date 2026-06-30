// server/src/routes/solicitation.js
// /api/v1/solicitation — the Solicitation Intelligence Workspace API.
// Every endpoint is authenticated, tenant-scoped (resolveTenant +
// assertSameTenant), role-gated, and audited. Additive + feature-flagged via
// SOLICITATION_WORKSPACE_ENABLED (the route is only mounted when enabled).

import { Router } from 'express';
import { requireAuth, requireRole, assertSameTenant } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { recordAuditEvent, EVENT_TYPES } from '../services/audit.js';
import { processBatch, retryDocument, reprocessOpportunity } from '../services/solicitation/pipeline.js';

export function solicitationRouter({ deps, store, uploadMw, now = () => new Date().toISOString() }) {
  const router = Router();
  const audit = (req, type, extra = {}) => recordAuditEvent({
    type, tenantId: req.tenantId, userId: req.user?.id,
    correlationId: req.correlationId, ip: req.ip,
    userAgent: req.headers['user-agent'], status: 'ok', ...extra
  });

  // ---- batches ----
  router.post('/batches', requireAuth(), requireRole('analyst'), resolveTenant(), (req, res) => {
    const batch = store.createBatch({
      tenantId: req.tenantId, name: req.body?.name, createdBy: req.user.id, createdAt: now()
    });
    audit(req, EVENT_TYPES.FILE_UPLOADED, { resourceType: 'solicitation_batch', resourceId: batch.id });
    res.status(201).json({ batch });
  });

  router.post('/batches/:id/files',
    requireAuth(), requireRole('analyst'), resolveTenant(), uploadMw,
    async (req, res) => {
      const batch = store.getBatch(req.tenantId, req.params.id);
      if (!batch) return res.status(404).json({ error: 'batch_not_found' });
      try {
        const { buffer, mimetype, originalname, size } = req.file;
        const meta = await deps.storage.put({
          buffer, contentType: mimetype, originalFilename: originalname, tenantId: req.tenantId
        });
        const doc = store.addDocument({
          tenantId: req.tenantId, batch_id: batch.id, opportunity_id: null,
          original_filename: originalname, content_type: mimetype, size,
          storage_provider: meta.provider, storage_key: meta.key,
          title_hint: req.body?.titleHint || null, agency_hint: req.body?.agencyHint || null,
          createdAt: meta.createdAt
        });
        audit(req, EVENT_TYPES.FILE_UPLOADED, { resourceType: 'solicitation_document', resourceId: doc.id });
        res.status(201).json({ document: redactDoc(doc) });
      } catch (err) {
        res.status(500).json({ error: 'upload_failed' });
      }
    });

  router.post('/batches/:id/process',
    requireAuth(), requireRole('analyst'), resolveTenant(), async (req, res) => {
      const batch = store.getBatch(req.tenantId, req.params.id);
      if (!batch) return res.status(404).json({ error: 'batch_not_found' });
      audit(req, EVENT_TYPES.FILE_PROCESSING_STARTED, { resourceType: 'solicitation_batch', resourceId: batch.id });
      try {
        // Load bytes from storage for each document (originals preserved).
        const docs = store.listDocumentsByBatch(req.tenantId, batch.id);
        const inputs = new Map();
        for (const d of docs) {
          let buffer = Buffer.alloc(0);
          try { buffer = await deps.storage.getBuffer(d.storage_key); } catch { /* keep empty */ }
          inputs.set(d.id, { buffer });
        }
        const enrichmentEnabled = process.env.SOLICITATION_ENRICHMENT_ENABLED === 'true';
        const { opportunities } = processBatch(store, req.tenantId, batch.id, inputs, { enrichmentEnabled, now: now() });
        audit(req, EVENT_TYPES.FILE_PROCESSING_COMPLETED, { resourceType: 'solicitation_batch', resourceId: batch.id });
        res.json({ batch: store.getBatch(req.tenantId, batch.id), opportunities });
      } catch (err) {
        audit(req, EVENT_TYPES.FILE_PROCESSING_FAILED, { status: 'error', metadata: { reason: err.message } });
        res.status(500).json({ error: 'processing_failed' });
      }
    });

  router.get('/batches/:id', requireAuth(), requireRole('viewer'), resolveTenant(), (req, res) => {
    const batch = store.getBatch(req.tenantId, req.params.id);
    if (!batch) return res.status(404).json({ error: 'batch_not_found' });
    const opportunities = store.listOpportunitiesByBatch(req.tenantId, batch.id);
    const documents = store.listDocumentsByBatch(req.tenantId, batch.id).map(redactDoc);
    res.json({ batch, opportunities, documents });
  });

  // ---- grouping corrections ----
  router.post('/batches/:id/grouping',
    requireAuth(), requireRole('analyst'), resolveTenant(), (req, res) => {
      const batch = store.getBatch(req.tenantId, req.params.id);
      if (!batch) return res.status(404).json({ error: 'batch_not_found' });
      // Corrections operate on opportunities; validate every referenced doc/opp
      // belongs to this tenant before mutating (defense-in-depth).
      const op = req.body?.op || {};
      if (op.documentId) {
        const d = store.getDocument(req.tenantId, op.documentId);
        if (!d || !assertSameTenant(req, d)) return res.status(404).json({ error: 'document_not_found' });
      }
      try {
        const result = applyGroupingOp(store, req.tenantId, batch.id, op);
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: 'grouping_failed', reason: err.message });
      }
    });

  // ---- opportunities + versions ----
  router.get('/opportunities/:id', requireAuth(), requireRole('viewer'), resolveTenant(), (req, res) => {
    const opp = store.getOpportunity(req.tenantId, req.params.id);
    if (!opp || !assertSameTenant(req, opp)) return res.status(404).json({ error: 'opportunity_not_found' });
    const analysis = store.getAnalysis(req.tenantId, opp.id, opp.analysis_version);
    audit(req, EVENT_TYPES.RESULT_VIEWED, { resourceType: 'solicitation_opportunity', resourceId: opp.id });
    res.json({ opportunity: opp, analysis });
  });

  router.get('/opportunities/:id/versions', requireAuth(), requireRole('viewer'), resolveTenant(), (req, res) => {
    const opp = store.getOpportunity(req.tenantId, req.params.id);
    if (!opp) return res.status(404).json({ error: 'opportunity_not_found' });
    const versions = store.listAnalysisVersions(req.tenantId, opp.id)
      .map(v => ({ version: v.version, createdAt: v.createdAt, status: v.status }));
    res.json({ opportunityId: opp.id, current: opp.analysis_version, versions });
  });

  router.get('/opportunities/:id/versions/:v', requireAuth(), requireRole('viewer'), resolveTenant(), (req, res) => {
    const opp = store.getOpportunity(req.tenantId, req.params.id);
    if (!opp) return res.status(404).json({ error: 'opportunity_not_found' });
    const analysis = store.getAnalysis(req.tenantId, opp.id, Number(req.params.v));
    if (!analysis) return res.status(404).json({ error: 'version_not_found' });
    res.json({ opportunityId: opp.id, version: Number(req.params.v), analysis });
  });

  router.post('/opportunities/:id/reprocess',
    requireAuth(), requireRole('analyst'), resolveTenant(), async (req, res) => {
      const opp = store.getOpportunity(req.tenantId, req.params.id);
      if (!opp) return res.status(404).json({ error: 'opportunity_not_found' });
      const docs = store.listDocumentsByOpportunity(req.tenantId, opp.id);
      const inputs = new Map();
      for (const d of docs) {
        let buffer = Buffer.alloc(0);
        try { buffer = await deps.storage.getBuffer(d.storage_key); } catch { /* empty */ }
        inputs.set(d.id, { buffer });
      }
      const result = reprocessOpportunity(store, req.tenantId, opp.id, inputs, { now: now() });
      res.json({ opportunityId: opp.id, ...result });
    });

  // ---- retry one document ----
  router.post('/documents/:id/retry',
    requireAuth(), requireRole('analyst'), resolveTenant(), async (req, res) => {
      const doc = store.getDocument(req.tenantId, req.params.id);
      if (!doc || !assertSameTenant(req, doc)) return res.status(404).json({ error: 'document_not_found' });
      let buffer = Buffer.alloc(0);
      try { buffer = await deps.storage.getBuffer(doc.storage_key); } catch { /* empty */ }
      const result = retryDocument(store, req.tenantId, doc.id, { buffer }, now());
      res.json({ document: redactDoc(store.getDocument(req.tenantId, doc.id)), retried: !result.error });
    });

  // ---- render payload for the viewer ----
  router.get('/documents/:id/render', requireAuth(), requireRole('viewer'), resolveTenant(), (req, res) => {
    const doc = store.getDocument(req.tenantId, req.params.id);
    if (!doc || !assertSameTenant(req, doc)) return res.status(404).json({ error: 'document_not_found' });
    const ex = store.getExtraction(req.tenantId, doc.id);
    res.json({
      document: redactDoc(doc),
      pages: (ex?.pages || []).map(p => ({ pageNumber: p.pageNumber, printedPageLabel: p.printedPageLabel, text: p.text })),
      sheets: (ex?.sheets || []).map(s => ({ sheetName: s.sheetName, cells: s.cells, blankRequiredCells: s.blankRequiredCells }))
    });
  });

  // ---- citation resolution: never crosses tenants ----
  router.post('/citations/resolve', requireAuth(), requireRole('viewer'), resolveTenant(), (req, res) => {
    const c = req.body?.citation;
    if (!c?.documentId) return res.status(400).json({ error: 'citation_required' });
    const doc = store.getDocument(req.tenantId, c.documentId);
    if (!doc || !assertSameTenant(req, doc)) return res.status(404).json({ error: 'document_not_found' });
    const ex = store.getExtraction(req.tenantId, c.documentId);
    let located = null;
    if (c.pageNumber != null) located = (ex?.pages || []).find(p => p.pageNumber === c.pageNumber) || null;
    else if (c.sheetName != null) located = (ex?.sheets || []).find(s => s.sheetName === c.sheetName) || null;
    res.json({
      documentId: doc.id, opportunityId: doc.opportunity_id,
      locator: { pageNumber: c.pageNumber ?? null, sheetName: c.sheetName ?? null, cellRange: c.cellRange ?? null, sectionReference: c.sectionReference ?? null },
      sourceText: c.sourceText || null,
      found: !!located
    });
  });

  return router;
}

function redactDoc(d) {
  if (!d) return d;
  // Never leak storage internals or buffers to the client.
  const { storage_key, _buffer, ...safe } = d;
  return safe;
}

function applyGroupingOp(store, tenantId, batchId, op) {
  // Minimal server-side grouping correction over persisted opportunities:
  // supports move (reassign a document to another opportunity) and
  // new_opportunity (create one and move a document into it).
  if (op.type === 'move') {
    const dest = store.getOpportunity(tenantId, op.toOpportunityId);
    if (!dest) throw new Error('destination opportunity not found');
    store.updateDocument(tenantId, op.documentId, { opportunity_id: dest.id });
    return { moved: op.documentId, to: dest.id };
  }
  if (op.type === 'new_opportunity') {
    const opp = store.createOpportunity({ tenantId, batch_id: batchId, title: op.title || 'New opportunity',
      grouping_confidence: 1.0, grouping_evidence: [{ kind: 'manual', value: 'user-created' }] });
    store.updateDocument(tenantId, op.documentId, { opportunity_id: opp.id });
    return { created: opp.id, moved: op.documentId };
  }
  if (op.type === 'rename') {
    const opp = store.getOpportunity(tenantId, op.opportunityId);
    if (!opp) throw new Error('opportunity not found');
    store.updateOpportunity(tenantId, opp.id, { title: op.title });
    return { renamed: opp.id, title: op.title };
  }
  throw new Error(`unsupported grouping op "${op.type}"`);
}
