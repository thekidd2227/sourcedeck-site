// server/src/services/solicitation/grouping.js
// Evidence-based opportunity grouping. Documents uploaded together are NOT
// forced into one opportunity; they are clustered by the strongest available
// evidence (solicitation number > agency+title > filename amendment refs),
// with a confidence score and an evidence trail. Users can then correct the
// grouping (move / merge / split / rename / mark-supporting / mark-unrelated).

/**
 * @param docs Array<{ id, originalFilename, signals: { solicitationNumber?, agency?,
 *                      title?, amendmentOf? } }>
 * @returns Array<{ key, title, solicitationNumber, agency, documentIds[],
 *                  confidence, evidence[] }>
 */
export function groupDocuments(docs) {
  const groups = new Map(); // key -> group

  for (const doc of docs) {
    const s = doc.signals || {};
    const evidence = [];
    let key, confidence;

    if (s.solicitationNumber) {
      key = norm(s.solicitationNumber);
      confidence = 0.95;
      evidence.push({ kind: 'solicitation_number', value: s.solicitationNumber });
    } else if (s.agency && s.title) {
      key = norm(s.agency) + '::' + norm(s.title).slice(0, 40);
      confidence = 0.6;
      evidence.push({ kind: 'agency_title', value: `${s.agency} / ${s.title}` });
    } else if (s.title) {
      key = 'title::' + norm(s.title).slice(0, 40);
      confidence = 0.45;
      evidence.push({ kind: 'title', value: s.title });
    } else {
      // No grouping evidence — its OWN opportunity (never merged blindly).
      key = 'ungrouped::' + doc.id;
      confidence = 0.2;
      evidence.push({ kind: 'no_evidence', value: doc.originalFilename });
    }

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: s.title || titleFromFilename(doc.originalFilename),
        solicitationNumber: s.solicitationNumber || null,
        agency: s.agency || null,
        documentIds: [],
        confidence,
        evidence: []
      });
    }
    const g = groups.get(key);
    g.documentIds.push(doc.id);
    g.evidence.push(...evidence.map(e => ({ ...e, documentId: doc.id })));
    if (s.solicitationNumber && !g.solicitationNumber) g.solicitationNumber = s.solicitationNumber;
    if (s.agency && !g.agency) g.agency = s.agency;
    // Confidence is the max evidence strength seen for the group.
    g.confidence = Math.max(g.confidence, confidence);
    // Amendment of a known solicitation → attach to that solicitation.
    if (s.amendmentOf) {
      g.evidence.push({ kind: 'amendment_of', value: s.amendmentOf, documentId: doc.id });
    }
  }

  return [...groups.values()];
}

// ---- manual grouping corrections ----
// A grouping is Array<{ key, documentIds[], title, ... }>. Operations return a
// NEW grouping array (pure); callers persist the result.

export function applyCorrection(groups, op) {
  const g = groups.map(x => ({ ...x, documentIds: [...x.documentIds] }));
  switch (op.type) {
    case 'rename': {
      const t = g.find(x => x.key === op.key);
      if (t) t.title = op.title;
      return g;
    }
    case 'move': { // move a document to another (existing) opportunity
      detach(g, op.documentId);
      const dest = g.find(x => x.key === op.toKey);
      if (!dest) throw new Error('move: destination opportunity not found');
      dest.documentIds.push(op.documentId);
      return prune(g);
    }
    case 'new_opportunity': { // move a document into a brand-new opportunity
      detach(g, op.documentId);
      g.push({ key: op.key || ('manual::' + op.documentId), title: op.title || 'New opportunity',
        solicitationNumber: null, agency: null, documentIds: [op.documentId],
        confidence: 1.0, evidence: [{ kind: 'manual', value: 'user-created' }] });
      return prune(g);
    }
    case 'merge': { // merge source group into target
      const src = g.find(x => x.key === op.fromKey);
      const dst = g.find(x => x.key === op.toKey);
      if (!src || !dst) throw new Error('merge: group not found');
      dst.documentIds.push(...src.documentIds);
      dst.evidence = [...(dst.evidence || []), { kind: 'manual_merge', value: src.key }];
      return prune(g.filter(x => x.key !== src.key));
    }
    case 'split': { // pull listed documents into a new group
      const src = g.find(x => x.key === op.key);
      if (!src) throw new Error('split: group not found');
      src.documentIds = src.documentIds.filter(d => !op.documentIds.includes(d));
      g.push({ key: op.newKey || ('split::' + op.documentIds[0]), title: op.title || (src.title + ' (split)'),
        solicitationNumber: null, agency: src.agency, documentIds: [...op.documentIds],
        confidence: 1.0, evidence: [{ kind: 'manual_split', value: src.key }] });
      return prune(g);
    }
    case 'mark_supporting':
      tagDoc(g, op.documentId, 'supporting'); return g;
    case 'mark_unrelated':
      tagDoc(g, op.documentId, 'unrelated'); return g;
    default:
      throw new Error(`unknown grouping correction "${op.type}"`);
  }
}

function detach(groups, documentId) {
  for (const x of groups) x.documentIds = x.documentIds.filter(d => d !== documentId);
}
function prune(groups) { return groups.filter(x => x.documentIds.length > 0); }
function tagDoc(groups, documentId, tag) {
  for (const x of groups) {
    if (x.documentIds.includes(documentId)) {
      x.docTags = x.docTags || {};
      x.docTags[documentId] = tag;
    }
  }
}
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function titleFromFilename(f) { return String(f || 'document').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); }
