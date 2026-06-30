// server/src/services/solicitation/analysis.js
// Assembles the opportunity analysis (Sections 1-7), RFI questions, the
// executive brief and bid calendar from findings + conflicts + compliance.
//
// Sections 1-5 are deterministic (built from findings). Optional governed-AI
// narrative synthesis can be injected via `synth` (a function calling the
// existing gateway with workflowType 'rfp_response'); when absent, sections
// carry the structured evidence only. Sections 6-7 (enrichment) return an
// explicit feature-flagged state when enrichment is disabled — never fake data.

export function buildAnalysis({ findings, conflicts, compliance, enrichmentEnabled = false }) {
  const byKey = {};
  for (const f of findings) (byKey[f.key] = byKey[f.key] || []).push(f);
  const first = k => (byKey[k] || [])[0] || null;

  const sections = [];

  // Section 1 — Metadata & scope
  sections.push(section(1, 'Solicitation Metadata and Summary', {
    solicitation_number: first('solicitation_number'),
    naics: first('naics'),
    set_aside: first('set_aside'),
    submission_deadline: first('submission_deadline'),
    question_deadline: first('question_deadline'),
    clins: first('clins')
  }, byKey));

  // Section 2 — Place of performance (only confirmed/complete addresses are mapped)
  sections.push(section(2, 'Place of Performance', {
    primary_address: first('primary_address')
  }, byKey, {
    map_note: first('primary_address')
      ? 'address present; geocode only verified, complete addresses'
      : 'no confirmed place of performance to map'
  }));

  // Section 3 — Subcontracting & proposal preparation (tasks derived from findings)
  sections.push(section(3, 'Subcontractor Identification and Proposal Preparation', {
    set_aside: first('set_aside')
  }, byKey, { prep_tasks: prepTasks(compliance) }));

  // Section 4 — Compliance matrix
  sections.push({ number: 4, title: 'Compliance and Submission Requirements',
    compliance_matrix: compliance });

  // Section 5 — Site visit (state is explicit; "unstated" != "no site visit")
  sections.push({ number: 5, title: 'Site Visit Details and Logistics',
    site_visit_state: first('site_visit_state')?.value || 'unknown_due_to_missing_documents',
    citation: first('site_visit_state')?.citation || null });

  // Section 6 — local vendor discovery (enrichment)
  sections.push(enrichmentSection(6, 'Local Subcontractor Companies', enrichmentEnabled));
  // Section 7 — incumbent / prior-award research (enrichment)
  sections.push(enrichmentSection(7, 'Incumbent and Prior-Award Research', enrichmentEnabled));

  const rfiQuestions = conflicts
    .filter(c => c.suggested_rfi)
    .map(c => ({ question: c.suggested_rfi, basis: c.title, severity: c.severity }));

  const deadlines = (byKey['submission_deadline'] || []).map(f => ({
    type: 'submission', value: f.value, normalized: f.normalizedValue, citation: f.citation
  })).concat((byKey['question_deadline'] || []).map(f => ({
    type: 'question', value: f.value, citation: f.citation
  })));

  return { sections, rfiQuestions, deadlines };
}

function section(number, title, fields, byKey, extra = {}) {
  const findings = {};
  for (const [k, f] of Object.entries(fields)) {
    findings[k] = f ? {
      value: f.value, normalized_value: f.normalizedValue, status: f.status,
      confidence: f.confidence, citation: f.citation
    } : { value: null, status: 'missing' };
  }
  return { number, title, findings, ...extra };
}

function enrichmentSection(number, title, enabled) {
  return enabled
    ? { number, title, status: 'enabled', results: [], note: 'user-initiated discovery required' }
    : { number, title, status: 'disabled_feature_flag',
        note: 'Enrichment is disabled (SOLICITATION_ENRICHMENT_ENABLED=false / credentials absent). No vendor or incumbent data is fabricated.' };
}

function prepTasks(compliance) {
  return compliance
    .filter(r => r.mandatory && (r.status === 'missing' || r.status === 'open'))
    .map(r => ({ task: `Address: ${r.requirement}`, owner: null, status: 'todo',
      due_date: null, risk: r.risk_level, citation: r.citation || null }));
}

/**
 * Cross-opportunity executive decision brief. Recommendations are evidence-based,
 * carry confidence + blocking conditions, and are explicitly NOT legal advice or
 * an autonomous submission decision.
 */
export function buildExecutiveBrief(opportunities) {
  const items = opportunities.map(o => {
    const criticalConflicts = (o.conflicts || []).filter(c => c.severity === 'critical');
    const missingPricing = (o.conflicts || []).some(c => c.title.includes('no pricing workbook'));
    const overall_risk = criticalConflicts.length ? 'high' : (o.conflicts || []).length ? 'medium' : 'low';
    const recommendation =
      criticalConflicts.length ? 'conditional' :
      (o.conflicts || []).length ? 'pursue_with_conditions' : 'pursue';
    return {
      opportunityId: o.id,
      title: o.title,
      solicitation_number: o.solicitation_number || null,
      recommendation,
      overall_risk,
      blocking_conditions: criticalConflicts.map(c => c.title),
      primary_risk: criticalConflicts[0]?.title || (o.conflicts || [])[0]?.title || null,
      critical_findings: criticalConflicts.length,
      missing_pricing: missingPricing,
      confidence: criticalConflicts.length ? 0.6 : 0.8,
      next_action: criticalConflicts.length ? 'Resolve blocking RFIs before bid/no-bid' : 'Proceed to compliance + pricing'
    };
  });

  const bidCalendar = opportunities.flatMap(o =>
    (o.deadlines || []).filter(d => d.type === 'submission').map(d => ({
      opportunityId: o.id, title: o.title, deadline: d.normalized || d.value, citation: d.citation
    }))
  );

  return {
    disclaimer: 'Draft-only analysis aid. Requires human review against the live SAM.gov notice and controlling documents. SourceDeck does not submit bids and does not provide legal advice.',
    items,
    bid_calendar: bidCalendar,
    immediate_48h_actions: items
      .filter(i => i.recommendation !== 'pursue')
      .map(i => ({ opportunityId: i.opportunityId, action: i.next_action })),
    generated_with_assumptions: true
  };
}
