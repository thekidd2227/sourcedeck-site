// server/test/proposal-intelligence.test.js
// Deterministic Proposal Intelligence core tests. Pure node:test; no DB/browser/
// AI/credentials. Covers Step 18 acceptance #8, 9, 13-18, 22 (the deterministic,
// anti-fabrication ones). UI/migration/worker/Playwright criteria are
// deferred/blocked — see the replacement audit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveSections, enforceClaimSourcing, validateProposalOutput, extractPlaceholders,
  buildDecideLaterSection, partnerImpactReport, validateSection, sectionNeedsTeamDecision,
  SECTION_TYPES, PARTNER_PLACEHOLDERS
} from '../src/services/proposal/intelligence.js';

test('section list is derived from the solicitation, not auto-populated', () => {
  const sections = deriveSections({
    requiredSections: [{ type: 'technical_approach', citationId: 'c1' }],
    evaluationFactors: [{ name: 'Past Performance', citationId: 'c2' }],
    submissionInstructions: [{ type: 'past_performance', citationId: 'c3' }]
  });
  const types = sections.map(s => s.type);
  assert.ok(types.includes('technical_approach'));
  assert.ok(types.includes('past_performance'));
  assert.ok(sections.length < SECTION_TYPES.length, 'not every standard section is auto-added');
  assert.ok(sections.every(s => s.origin), 'each section records why it was included');
});

test('#8 prime-only: claims backed by saved company facts are kept', () => {
  const blocks = [{ id: 'b1', text: 'ARCG holds UEI X.', claims: [{ text: 'UEI X', source: { kind: 'company_fact', ref: 'fact_uei' } }] }];
  const { blocks: out, downgraded } = enforceClaimSourcing(blocks, { companyFacts: ['fact_uei'] });
  assert.equal(downgraded.length, 0);
  assert.equal(out[0].claims[0].downgraded, undefined);
});

test('#9 missing setup facts become placeholders (never invented)', () => {
  const blocks = [{ id: 'b1', text: 'We have 50 technicians.', claims: [{ text: '50 technicians', source: { kind: 'company_fact', ref: 'fact_headcount' } }] }];
  const { blocks: out, downgraded } = enforceClaimSourcing(blocks, { companyFacts: [] }); // fact NOT present
  assert.equal(downgraded.length, 1);
  assert.equal(out[0].claims[0].source.kind, 'placeholder');
  assert.equal(out[0].status, 'placeholders_unresolved');
});

test('#13/#14 decide-later: requires confirmation + only structured placeholders (no invented partner facts)', () => {
  const s = buildDecideLaterSection('technical_approach', 'Prime will manage the contract.');
  assert.equal(s.warningAcknowledgementRequired, true);
  assert.deepEqual(s.placeholders, PARTNER_PLACEHOLDERS.slice());
  // No partner placeholder carries a concrete value.
  assert.ok(s.placeholders.every(p => /^\[[A-Z_]+\]$/.test(p)));
});

test('#15/#16 partner-selected-later → impact report; preserves unaffected edits; no silent overwrite', () => {
  const sections = [
    { sectionType: 'technical_approach', placeholders: ['[SUBCONTRACTOR_NAME]', '[LOCAL_RESPONSE_TIME]'] },
    { sectionType: 'executive_summary', placeholders: [] }
  ];
  const r = partnerImpactReport(sections, { vendorId: 'v1' });
  assert.equal(r.silentOverwrite, false);
  assert.equal(r.preserveUnaffectedEdits, true);
  assert.ok(r.affectedSections.some(a => a.sectionType === 'technical_approach'));
  assert.ok(r.affectedSections.every(a => a.preservePriorVersion === true));
});

test('#17 validation uses ACTUAL evaluation factors', () => {
  const section = { sectionType: 'technical_approach', evaluationFactorsAddressed: ['Technical'], blocks: [{ id: 'b', text: 'ok' }] };
  const v = validateSection(section, { evaluationFactors: [{ name: 'Technical' }, { name: 'Past Performance' }] });
  assert.ok(v.issues.some(i => i.type === 'evaluation_factors_not_addressed' && i.items.includes('Past Performance')));
});

test('#18 unstated evaluation weights are not invented (unsupported claim → placeholder)', () => {
  const blocks = [{ id: 'b1', text: 'Technical is weighted 50%.', claims: [{ text: 'Technical 50%', source: { kind: 'citation', ref: 'c_does_not_exist' } }] }];
  const { downgraded } = enforceClaimSourcing(blocks, { citationIds: ['c_real'] });
  assert.equal(downgraded.length, 1, 'a weight with no valid citation is downgraded, not asserted');
});

test('#22 malformed AI output is rejected', () => {
  assert.equal(validateProposalOutput(null).ok, false);
  assert.equal(validateProposalOutput({ sectionType: 'nope', blocks: 'x' }).ok, false);
  assert.equal(validateProposalOutput({ sectionType: 'technical_approach', title: 'T', blocks: [{ id: 'b', text: 'hi' }], citations: [] }).ok, true);
});

test('every claim traces to one of the allowed sources', () => {
  const blocks = [{ id: 'b1', text: 't', claims: [
    { text: 'a', source: { kind: 'vendor_evidence', ref: 've1' } },
    { text: 'b', source: { kind: 'user_input', ref: 'typed by user' } }
  ] }];
  const { downgraded } = enforceClaimSourcing(blocks, { vendorEvidenceIds: ['ve1'] });
  assert.equal(downgraded.length, 0);
});

test('partner-sensitive sections require a team decision; others do not', () => {
  assert.equal(sectionNeedsTeamDecision('technical_approach'), true);
  assert.equal(sectionNeedsTeamDecision('management_plan'), true);
  assert.equal(sectionNeedsTeamDecision('executive_summary'), false);
});

test('extractPlaceholders finds structured tokens', () => {
  assert.deepEqual(extractPlaceholders('Use [SUBCONTRACTOR_NAME] and [WORKSHARE_PERCENTAGE].').sort(),
    ['[SUBCONTRACTOR_NAME]', '[WORKSHARE_PERCENTAGE]']);
});
