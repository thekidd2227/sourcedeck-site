// server/src/services/solicitation/conflicts.js
// Cross-document conflict & ambiguity engine. Operates on the findings of all
// documents within ONE opportunity. Never resolves a material contradiction
// with an unsupported assumption — it reports both sources and a suggested RFI.

const SEV = { critical: 'critical', high: 'high', medium: 'medium', info: 'informational' };

/**
 * @param findings Finding[] (each may carry a citation with documentId)
 * @param opts { hasPricingWorkbook: boolean }
 * @returns Conflict[]
 */
export function detectConflicts(findings, opts = {}) {
  const conflicts = [];
  const byKey = groupBy(findings, f => f.key);

  // 1. Conflicting submission deadlines across documents.
  pushValueConflict(conflicts, byKey['submission_deadline'], {
    title: 'Conflicting submission deadlines',
    severity: SEV.critical,
    compare: normalizedOrValue,
    explanation: 'Two documents state different submission deadlines.',
    recommended_action: 'Confirm the controlling deadline; the latest amendment normally governs.',
    suggested_rfi: 'Which submission deadline is controlling — the base solicitation or the amendment?'
  });

  // 2. Conflicting question deadlines.
  pushValueConflict(conflicts, byKey['question_deadline'], {
    title: 'Conflicting question (RFI) deadlines',
    severity: SEV.high,
    compare: f => (f.value || '').toLowerCase(),
    explanation: 'Two documents state different question deadlines.',
    recommended_action: 'Confirm the controlling question deadline.',
    suggested_rfi: 'Please confirm the deadline for submitting questions.'
  });

  // 3. Conflicting timezones embedded in the deadline lines.
  const tzValues = (byKey['submission_deadline'] || [])
    .map(f => (String(f.normalizedValue || f.value || '').match(/\b(ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT|Eastern|Central|Mountain|Pacific)\b/) || [])[0])
    .filter(Boolean);
  if (new Set(tzValues.map(t => t.toLowerCase())).size > 1) {
    conflicts.push(make({
      severity: SEV.high, title: 'Conflicting deadline timezones',
      explanation: `Deadline timezones disagree across documents: ${[...new Set(tzValues)].join(', ')}.`,
      source_a: citationOf((byKey['submission_deadline'] || [])[0]),
      source_b: citationOf((byKey['submission_deadline'] || [])[1]),
      confidence: 0.8,
      recommended_action: 'Confirm the controlling timezone for the deadline.',
      suggested_rfi: 'Please confirm the timezone that governs the submission deadline.'
    }));
  }

  // 4. Startup-window conflict (e.g. 15-day vs 30-day).
  const startups = byKey['startup_window_days'] || [];
  const distinctStartups = [...new Set(startups.map(f => String(f.value)))];
  if (distinctStartups.length > 1) {
    conflicts.push(make({
      severity: SEV.high, title: 'Conflicting startup / phase-in windows',
      explanation: `Documents state different startup windows: ${distinctStartups.join(' vs ')} days.`,
      values: distinctStartups,
      source_a: citationOf(startups[0]), source_b: citationOf(startups[1]),
      confidence: 0.85,
      recommended_action: 'Resolve the required start window before pricing transition.',
      suggested_rfi: `Is the required start/phase-in window ${distinctStartups.join(' or ')} days?`
    }));
  }

  // 5. Conflicting place of performance.
  pushValueConflict(conflicts, byKey['primary_address'], {
    title: 'Conflicting place-of-performance addresses',
    severity: SEV.medium, compare: f => (f.value || '').toLowerCase(),
    explanation: 'Two documents state different primary places of performance.',
    recommended_action: 'Confirm the controlling place of performance.',
    suggested_rfi: 'Please confirm the primary place of performance.'
  });

  // 6. Conflicting set-asides.
  pushValueConflict(conflicts, byKey['set_aside'], {
    title: 'Conflicting set-aside designations', severity: SEV.high,
    compare: f => (f.value || '').toLowerCase(),
    explanation: 'Documents state different set-aside types.',
    recommended_action: 'Confirm the controlling set-aside.',
    suggested_rfi: 'Please confirm the set-aside designation for this requirement.'
  });

  // 7. CLINs present but no pricing workbook attached.
  const hasClins = (byKey['clins'] || []).length > 0;
  if (hasClins && !opts.hasPricingWorkbook) {
    conflicts.push(make({
      severity: SEV.critical, title: 'CLINs referenced but no pricing workbook found',
      explanation: 'The package references CLINs but no pricing schedule/workbook was provided or extracted.',
      source_a: citationOf((byKey['clins'] || [])[0]), source_b: null, confidence: 0.75,
      recommended_action: 'Request the pricing schedule/attachment.',
      suggested_rfi: 'Please provide the pricing schedule referenced by the CLIN structure.'
    }));
  }

  // 8. Malformed submission email addresses.
  for (const f of byKey['submission_email_malformed'] || []) {
    conflicts.push(make({
      severity: SEV.high, title: 'Malformed submission email address',
      explanation: `A submission/contact email appears malformed: "${f.value}".`,
      source_a: citationOf(f), source_b: null, confidence: 0.7,
      recommended_action: 'Verify the correct submission email before sending.',
      suggested_rfi: `Please confirm the correct submission email address (document shows "${f.value}").`
    }));
  }

  // 9. Blank required pricing cells.
  for (const f of byKey['blank_required_pricing_cell'] || []) {
    conflicts.push(make({
      severity: SEV.medium, title: 'Blank required pricing cell',
      explanation: `Required pricing cell ${f.value} is blank in the workbook.`,
      source_a: citationOf(f), source_b: null, confidence: 0.8,
      recommended_action: 'Complete all required pricing cells before submission.',
      suggested_rfi: null
    }));
  }

  return conflicts;
}

function pushValueConflict(out, arr, spec) {
  if (!arr || arr.length < 2) return;
  const distinct = new Map();
  for (const f of arr) {
    const k = spec.compare(f);
    if (!distinct.has(k)) distinct.set(k, f);
  }
  if (distinct.size < 2) return;
  const [a, b] = [...distinct.values()];
  out.push(make({
    severity: spec.severity, title: spec.title, explanation: spec.explanation,
    source_a: citationOf(a), source_b: citationOf(b), confidence: 0.85,
    recommended_action: spec.recommended_action, suggested_rfi: spec.suggested_rfi,
    values: [...distinct.keys()]
  }));
}

function make(c) { return { resolution_status: 'open', ...c }; }
function citationOf(finding) { return finding?.citation || null; }
function normalizedOrValue(f) { return String(f.normalizedValue || f.value || '').toLowerCase(); }
function groupBy(arr, fn) {
  const m = {};
  for (const x of arr) { const k = fn(x); (m[k] = m[k] || []).push(x); }
  return m;
}
