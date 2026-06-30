// server/src/services/proposal/repo.pg.js
// Postgres repository for Proposal Intelligence. Tenant-scoped (no method can
// return another tenant's row), optimistic concurrency on editable records, and
// transaction-safe version creation. pg Pool injected for testability.

let _seq = 0;
function id(prefix) { _seq += 1; return `${prefix}_${Date.now().toString(36)}${_seq.toString(36)}`; }

export function createPostgresProposalRepo(pool) {
  const q = (text, params) => pool.query(text, params);

  return {
    name: 'postgres-proposal-repo',
    isInMemory: false,

    async createProject({ tenantId, opportunityId, title, createdBy }) {
      const rec = id('prop');
      const { rows } = await q(
        `INSERT INTO proposal_project (id, tenant_id, opportunity_id, title, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
        [rec, tenantId, opportunityId, title || 'Untitled proposal', createdBy || null]);
      return rows[0];
    },

    async getProject(tenantId, projectId) {
      const { rows } = await q(`SELECT * FROM proposal_project WHERE id=$1 AND tenant_id=$2`, [projectId, tenantId]);
      return rows[0] || null;
    },

    // Optimistic update: fails if optimistic_version doesn't match.
    async updateProject(tenantId, projectId, patch, expectedVersion) {
      const { rows } = await q(
        `UPDATE proposal_project SET title=COALESCE($3,title), status=COALESCE($4,status),
           updated_at=now(), optimistic_version=optimistic_version+1
         WHERE id=$1 AND tenant_id=$2 AND optimistic_version=$5 RETURNING *`,
        [projectId, tenantId, patch.title ?? null, patch.status ?? null, expectedVersion]);
      if (!rows[0]) { const e = new Error('optimistic_conflict'); e.code = 'OPTIMISTIC_CONFLICT'; throw e; }
      return rows[0];
    },

    async createSection({ tenantId, projectId, sectionType, title, displayOrder = 0, evaluationFactorIds = [], requirementIds = [], createdBy }) {
      const rec = id('sec');
      const { rows } = await q(
        `INSERT INTO proposal_section (id, tenant_id, proposal_project_id, section_type, title, display_order, evaluation_factor_ids, requirement_ids, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
        [rec, tenantId, projectId, sectionType, title || null, displayOrder, JSON.stringify(evaluationFactorIds), JSON.stringify(requirementIds), createdBy || null]);
      return rows[0];
    },

    async getSection(tenantId, sectionId) {
      const { rows } = await q(`SELECT * FROM proposal_section WHERE id=$1 AND tenant_id=$2`, [sectionId, tenantId]);
      return rows[0] || null;
    },

    // Transaction-safe new version: increments version_number, flips is_current,
    // and updates the section pointer. A retry with the same base does not create
    // a duplicate "current" — the latest version_number wins atomically.
    async createDraftVersion({ tenantId, sectionId, contentJson, plainText, generationSource, baseVersionId, createdBy }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Lock the parent section row to serialize concurrent version creates
        // (FOR UPDATE is not allowed with aggregates, so lock the row first).
        const { rows: secRows } = await client.query(
          `SELECT id FROM proposal_section WHERE id=$2 AND tenant_id=$1 FOR UPDATE`, [tenantId, sectionId]);
        if (!secRows[0]) { const e = new Error('section_not_found'); e.code = 'NOT_FOUND'; throw e; }
        const { rows: maxRows } = await client.query(
          `SELECT COALESCE(MAX(version_number),0) AS maxv FROM proposal_draft_version
           WHERE tenant_id=$1 AND proposal_section_id=$2`, [tenantId, sectionId]);
        const next = Number(maxRows[0].maxv) + 1;
        const vid = id('ver');
        await client.query(
          `UPDATE proposal_draft_version SET is_current=false WHERE tenant_id=$1 AND proposal_section_id=$2`, [tenantId, sectionId]);
        const { rows } = await client.query(
          `INSERT INTO proposal_draft_version (id, tenant_id, proposal_section_id, version_number, content_json, plain_text, generation_source, base_version_id, created_by, is_current)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING *`,
          [vid, tenantId, sectionId, next, JSON.stringify(contentJson || {}), plainText || null, generationSource || null, baseVersionId || null, createdBy || null]);
        await client.query(
          `UPDATE proposal_section SET current_version_id=$3, status='draft', updated_at=now(), optimistic_version=optimistic_version+1
           WHERE id=$2 AND tenant_id=$1`, [tenantId, sectionId, vid]);
        await client.query('COMMIT');
        return rows[0];
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
    },

    async listVersions(tenantId, sectionId) {
      const { rows } = await q(
        `SELECT id, version_number, is_current, generation_source, created_at
         FROM proposal_draft_version WHERE tenant_id=$1 AND proposal_section_id=$2 ORDER BY version_number`,
        [tenantId, sectionId]);
      return rows;
    },

    async restoreVersion(tenantId, sectionId, versionId) {
      // Restoring creates a NEW current version from the restored content (preserves history).
      const { rows } = await q(
        `SELECT content_json, plain_text FROM proposal_draft_version WHERE id=$1 AND tenant_id=$2 AND proposal_section_id=$3`,
        [versionId, tenantId, sectionId]);
      if (!rows[0]) { const e = new Error('version_not_found'); e.code = 'NOT_FOUND'; throw e; }
      return this.createDraftVersion({ tenantId, sectionId, contentJson: rows[0].content_json,
        plainText: rows[0].plain_text, generationSource: 'restore', baseVersionId: versionId });
    },

    async setTeamSelection({ tenantId, projectId, mode, primaryVendorId = null, additionalVendorIds = [], confirmedBy = null }) {
      const rec = id('team');
      const { rows } = await q(
        `INSERT INTO proposal_team_selection (id, tenant_id, proposal_project_id, mode, primary_vendor_id, additional_vendor_ids, confirmed_by, confirmed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $7 IS NULL THEN NULL ELSE now() END) RETURNING *`,
        [rec, tenantId, projectId, mode, primaryVendorId, JSON.stringify(additionalVendorIds), confirmedBy]);
      return rows[0];
    },

    async addSourceLink({ tenantId, draftVersionId, blockId, sourceType, citationId = null, companyFactId = null, vendorEvidenceId = null, userInputId = null, verificationStatus = 'unverified' }) {
      const rec = id('src');
      const { rows } = await q(
        `INSERT INTO proposal_source_link (id, tenant_id, proposal_draft_version_id, block_id, source_type, citation_id, company_fact_id, vendor_evidence_id, user_input_id, verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [rec, tenantId, draftVersionId, blockId, sourceType, citationId, companyFactId, vendorEvidenceId, userInputId, verificationStatus]);
      return rows[0];
    }
  };
}
