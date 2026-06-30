// server/src/services/proposal/generate.js
// Server-side proposal generation pipeline (the path the durable worker runs).
// The browser submits only IDs + explicit user input; the SERVER loads
// authoritative context (solicitation/company/vendor), calls the governed AI
// gateway (watsonx default; mock in tests), then validates the output schema and
// claim sourcing BEFORE persisting a new immutable draft version. Unsupported
// claims are downgraded to placeholders; malformed output is rejected; uploaded
// document text is treated as data (no instruction-following, no tool calls, no
// tenant override, no secret disclosure).

import { validateProposalOutput, enforceClaimSourcing } from './intelligence.js';

/**
 * Build the generation context SERVER-SIDE from injected authoritative loaders.
 * `loaders` are functions that read tenant-scoped records (DB/solicitation/etc.).
 */
export async function buildGenerationContext({ tenantId, proposalId, sectionId, sectionType, userInputs = {}, teamMode = 'prime_only', selectedVendorId = null, loaders }) {
  const [opportunity, evaluationMap, companyFacts, vendor] = await Promise.all([
    loaders.opportunity(tenantId, proposalId),
    loaders.evaluationMap(tenantId, proposalId),
    loaders.companyFacts(tenantId),
    selectedVendorId ? loaders.vendorEvidence(tenantId, selectedVendorId) : Promise.resolve(null)
  ]);
  return {
    schemaVersion: 1, tenantId, proposalId, sectionId, sectionType, teamMode,
    opportunity, evaluationMap,
    citationIds: (evaluationMap?.citationIds) || [],
    companyFacts: (companyFacts || []).map(f => f.id),
    vendorEvidenceIds: vendor ? (vendor.evidenceIds || []) : [],
    userInputs
  };
}

/**
 * Run one generation job. Returns { ok, versionId } or throws (caller fails the job).
 * @param gateway must expose async generate({ workflowType:'proposal_generation', context }) → output object
 */
export async function runProposalGeneration({ context, gateway, proposalRepo, createdBy = null }) {
  // 1. Call the governed gateway. Uploaded/solicitation text reaches the model
  //    only as DATA inside the context — never as system/developer instructions.
  const output = await gateway.generate({ workflowType: 'proposal_generation', context });

  // 2. Reject tool-call / instruction-injection style outputs outright.
  if (output && (output.toolCall || output.tool_request || output.systemOverride)) {
    const e = new Error('model_output_requested_unauthorized_action'); e.code = 'AI_BOUNDARY'; throw e;
  }
  // 3. Strict schema validation.
  const v = validateProposalOutput(output);
  if (!v.ok) { const e = new Error('malformed_model_output: ' + v.errors.join(', ')); e.code = 'SCHEMA'; throw e; }

  // 4. Claim sourcing: downgrade any claim not backed by a real source in context.
  const available = { citationIds: context.citationIds, companyFacts: context.companyFacts, vendorEvidenceIds: context.vendorEvidenceIds };
  const { blocks, downgraded } = enforceClaimSourcing(output.blocks, available);

  // 5. Persist a NEW immutable draft version (transaction-safe; retry-safe).
  const version = await proposalRepo.createDraftVersion({
    tenantId: context.tenantId, sectionId: context.sectionId,
    contentJson: { sectionType: output.sectionType, title: output.title, blocks, downgraded },
    plainText: blocks.map(b => b.text).join('\n\n'),
    generationSource: 'proposal_generation', baseVersionId: context.baseVersionId || null, createdBy
  });

  // 6. Record source links for traceability.
  for (const b of blocks) {
    for (const c of (b.claims || [])) {
      await proposalRepo.addSourceLink({
        tenantId: context.tenantId, draftVersionId: version.id, blockId: b.id,
        sourceType: c.source.kind, citationId: c.source.kind === 'citation' ? c.source.ref : null,
        companyFactId: c.source.kind === 'company_fact' ? c.source.ref : null,
        vendorEvidenceId: c.source.kind === 'vendor_evidence' ? c.source.ref : null,
        userInputId: c.source.kind === 'user_input' ? c.source.ref : null,
        verificationStatus: c.source.kind === 'placeholder' ? 'unverified' : 'verified'
      });
    }
  }
  return { ok: true, versionId: version.id, downgradedCount: downgraded.length };
}

/**
 * Deterministic mock governed gateway for tests. NEVER fabricates facts: it
 * emits claims tagged with the sources present in the context, plus (when asked)
 * an unsupported claim to prove it gets downgraded. The tenant scope and secrets
 * in the context are never echoed.
 */
export function createMockGateway(opts = {}) {
  return {
    async generate({ workflowType, context }) {
      if (opts.malformed) return { sectionType: 'nope', blocks: 'x' };
      if (opts.toolCall) return { toolCall: { name: 'read_secret' } };
      const blocks = [{
        id: 'b1', blockType: 'narrative', heading: 'Understanding of Requirements',
        text: 'The contractor will perform recurring services as specified.',
        claims: [
          ...(context.citationIds[0] ? [{ text: 'service frequency', source: { kind: 'citation', ref: context.citationIds[0] } }] : []),
          ...(context.companyFacts[0] ? [{ text: 'company capability', source: { kind: 'company_fact', ref: context.companyFacts[0] } }] : []),
          ...(opts.includeUnsupported ? [{ text: 'technical is weighted 50%', source: { kind: 'citation', ref: 'c_nonexistent' } }] : [])
        ]
      }];
      return { sectionType: context.sectionType, title: 'Technical Approach', blocks, citations: context.citationIds };
    }
  };
}
