// server/src/services/solicitation/store.js
// Tenant-scoped in-memory repository for the Solicitation Intelligence
// Workspace. This is the dev/test default, mirroring the pattern in
// services/persistence/* (in-memory default; Postgres adapter is the
// production seam — see infra/sql/solicitation.sql).
//
// EVERY read/write is tenant-scoped. Cross-tenant access returns null/empty,
// never another tenant's data. Higher layers additionally call
// assertSameTenant() before returning a resource to a caller.

let _seq = 0;
function id(prefix) {
  _seq += 1;
  // Deterministic-ish, monotonic id (no Math.random/Date in hot path so tests
  // are stable). Callers may pass createdAt explicitly.
  return `${prefix}_${_seq.toString(36)}${(_seq * 2654435761 % 0xffffff).toString(36)}`;
}

export function createInMemorySolicitationStore() {
  // Maps keyed by record id. Each record carries tenantId.
  const batches       = new Map();
  const opportunities = new Map();
  const documents     = new Map();
  const extractions   = new Map(); // documentId -> normalized extraction
  const analyses      = new Map(); // `${opportunityId}:v${version}` -> analysis run snapshot

  const scoped = (map, tenantId) =>
    [...map.values()].filter(r => r.tenantId === tenantId);

  return {
    name: 'in-memory-solicitation-store',
    isInMemory: true,

    // ---- batches ----
    createBatch({ tenantId, name, createdBy, createdAt }) {
      const rec = {
        id: id('batch'), tenantId, name: name || 'Untitled batch',
        createdBy, status: 'uploaded', createdAt: createdAt || null
      };
      batches.set(rec.id, rec);
      return rec;
    },
    getBatch(tenantId, batchId) {
      const b = batches.get(batchId);
      return b && b.tenantId === tenantId ? b : null;
    },
    updateBatch(tenantId, batchId, patch) {
      const b = this.getBatch(tenantId, batchId);
      if (!b) return null;
      Object.assign(b, patch);
      return b;
    },

    // ---- documents ----
    addDocument(doc) {
      const rec = { id: id('doc'), processing_status: 'uploaded', warnings: [], ...doc };
      documents.set(rec.id, rec);
      return rec;
    },
    getDocument(tenantId, documentId) {
      const d = documents.get(documentId);
      return d && d.tenantId === tenantId ? d : null;
    },
    updateDocument(tenantId, documentId, patch) {
      const d = this.getDocument(tenantId, documentId);
      if (!d) return null;
      Object.assign(d, patch);
      return d;
    },
    listDocumentsByBatch(tenantId, batchId) {
      return scoped(documents, tenantId).filter(d => d.batch_id === batchId);
    },
    listDocumentsByOpportunity(tenantId, opportunityId) {
      return scoped(documents, tenantId).filter(d => d.opportunity_id === opportunityId);
    },
    findDocumentByHash(tenantId, batchId, contentHash) {
      return scoped(documents, tenantId)
        .find(d => d.batch_id === batchId && d.content_hash === contentHash) || null;
    },

    // ---- extractions ----
    putExtraction(tenantId, documentId, extraction) {
      extractions.set(documentId, { tenantId, documentId, ...extraction });
      return extractions.get(documentId);
    },
    getExtraction(tenantId, documentId) {
      const e = extractions.get(documentId);
      return e && e.tenantId === tenantId ? e : null;
    },

    // ---- opportunities ----
    createOpportunity(opp) {
      const rec = {
        id: id('opp'), analysis_version: 0, grouping_evidence: [],
        recommendation: null, overall_risk: null, ...opp
      };
      opportunities.set(rec.id, rec);
      return rec;
    },
    getOpportunity(tenantId, opportunityId) {
      const o = opportunities.get(opportunityId);
      return o && o.tenantId === tenantId ? o : null;
    },
    updateOpportunity(tenantId, opportunityId, patch) {
      const o = this.getOpportunity(tenantId, opportunityId);
      if (!o) return null;
      Object.assign(o, patch);
      return o;
    },
    listOpportunitiesByBatch(tenantId, batchId) {
      return scoped(opportunities, tenantId).filter(o => o.batch_id === batchId);
    },
    deleteOpportunity(tenantId, opportunityId) {
      const o = this.getOpportunity(tenantId, opportunityId);
      if (!o) return false;
      opportunities.delete(opportunityId);
      return true;
    },

    // ---- analysis versions ----
    putAnalysis(tenantId, opportunityId, version, snapshot) {
      const key = `${opportunityId}:v${version}`;
      analyses.set(key, { tenantId, opportunityId, version, ...snapshot });
      return analyses.get(key);
    },
    getAnalysis(tenantId, opportunityId, version) {
      const a = analyses.get(`${opportunityId}:v${version}`);
      return a && a.tenantId === tenantId ? a : null;
    },
    listAnalysisVersions(tenantId, opportunityId) {
      return [...analyses.values()]
        .filter(a => a.tenantId === tenantId && a.opportunityId === opportunityId)
        .sort((x, y) => x.version - y.version);
    }
  };
}
