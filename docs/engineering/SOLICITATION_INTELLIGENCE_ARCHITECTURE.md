# Solicitation Intelligence Workspace — Architecture

**Date:** 2026-06-30 · **Branch:** `feat/solicitation-intelligence-workspace`

This document reflects the **actual** SourceDeck repositories as audited on
2026-06-30, not a hypothetical architecture.

## 1. Repository audit & target selection

Three SourceDeck repositories exist locally and on `github.com/thekidd2227`:

| Repo | What it actually is | Role for this feature |
|---|---|---|
| **`sourcedeck-site`** (`sourcedeck-commercial`) | Static marketing site **plus** a real additive backend at `server/` (Express 4, Node 20): OIDC/JWT auth (`server/src/middleware/oidc.js`), RBAC (`auth.js`), tenant resolution + `assertSameTenant` (`tenant.js`), object storage (IBM COS + local fallback, `services/storage/`), watsonx-default governed AI gateway (`services/ai/{gateway,watsonx,policy,agents,prompts}.js`), persistence repo-abstraction (`services/persistence/`, in-memory default + Postgres adapter), routes `/api/v1/{files,process,results,ai,agents}`, audit log (`services/audit.js`), Docker/k8s/OpenShift/IBM Code Engine deploy. Frontend `apps/web/` is Next.js 15 + React 19 **scaffold**. | **IMPLEMENTATION TARGET** — backend in `server/`, UI in `apps/web/`. |
| **`sourcedeck-app`** | Electron desktop app (single-user). Mature **deterministic solicitation engine**: `services/govcon/solicitation-package-extract.js` (PDF/DOCX/XLSX/CSV/TXT/XML/ZIP, FAR Sections A–M with `sourceFile`/`sourceLocation`), `solicitation-import.js` (validated multi-file intake), compliance matrix, requirements→source linking, `deadline-extraction.js` (amendment override). Electron-free `api/index.js` adapter designed to be hosted on HTTP. No tenants/jobs/migrations. | **REUSE SOURCE** — port extraction logic to `server/` as plain Node services. |
| **`sourcedeck-proxy`** | Cloudflare Worker: Airtable/Stripe/Basin invoice-funnel edge + CF Access. No R2/D1. | Not the target. |

### Documented Phase-0 finding (CLAUDE.md staleness)

`sourcedeck-site/CLAUDE.md` still describes the repo as "static HTML + CSS +
vanilla JS. No bundler, no framework, no `package.json`" and lists "Real backend
API … out of scope … ships client-side only." This is **stale**: a root
`package.json`, `server/` (with 17 `node --test` suites, Dockerfile, k8s
manifests), and `apps/web/` (Next.js) all exist, and `server/server.js`
explicitly charters itself as "an additive backend for the existing static
SourceDeck site." We treat `server/` as the real, intended backend and build
there, while honoring CLAUDE.md's still-valid working rules (secrets rule,
no-`localStorage`-as-authoritative-store, pricing taxonomy, status-pill
taxonomy, and **not** modifying the static site or the `app/demo/` LCC mirror).
The static product surface remains untouched.

## 2. Why the prompt's premise mostly fits — and where it doesn't

The prompt assumes a tenant-scoped web product with object storage, signed
URLs, DB migrations, and background jobs. `server/` already provides
auth + tenant scoping + object storage (signed URLs via IBM COS) + the
persistence adapter seam for Postgres. **Gaps vs. the prompt's premise:**

- **No background-job runtime in-process.** `server/` is synchronous; the
  Cloudflare `_workers/agent-runtime.js`/`reporting-engine.js` are scaffolds.
  → We implement an in-process, idempotent **pipeline runner** with explicit
  status states behind a `JobRunner` interface that can later be backed by a
  real queue (Graphile Worker / BullMQ / Cloudflare Queues) without changing
  callers. Processing is kicked off asynchronously (fire-and-track) so the HTTP
  request returns immediately and the client polls status.
- **No ORM migrations yet.** Only `tenant_ai_policy` DDL is deployed; the full
  schema is documented in `docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md`.
  → New domain tables are added as **DDL + an in-memory repo adapter** following
  the existing `services/persistence` pattern; the in-memory adapter is the
  dev/test default and a Postgres adapter is the production seam. This matches
  how `tenantPolicyRepo` already works.
- **Provider must stay watsonx-default & governed.** The feature routes all
  model calls through the existing `services/ai/gateway.js` with
  `workflowType: 'rfp_response'` (governed → watsonx-only, no BYOK, audited).

## 3. Component architecture (this feature)

```
apps/web (Next.js)  ── authenticated three-panel workspace UI (Milestone A+)
        │  fetch (Bearer JWT)
        ▼
server/ (Express)
  routes/solicitation.js            mounted at /api/v1/solicitation
    POST   /batches                 create batch (tenant-scoped)
    POST   /batches/:id/files       add file(s) to batch (reuses storage.put)
    POST   /batches/:id/process     kick off pipeline (async, idempotent)
    GET    /batches/:id             batch + opportunities + per-doc status
    POST   /batches/:id/grouping    apply manual grouping corrections
    GET    /opportunities/:id       opportunity + analysis (latest version)
    GET    /opportunities/:id/versions[/:v]   analysis version history
    POST   /opportunities/:id/reprocess       new analysis version
    POST   /documents/:id/retry     retry one failed document
    GET    /documents/:id/render    render payload (pages/sheets) for the viewer
    GET    /citations/:id/resolve   resolve a citation → doc + locator + source text
  services/solicitation/
    pipeline.js        idempotent stage runner + status machine
    extract/           deterministic per-format extractors (ported from app)
    grouping.js        evidence-based opportunity grouping
    analysis.js        Sections 1–7 synthesis (deterministic + governed AI)
    conflicts.js       cross-document conflict & ambiguity engine
    compliance.js      compliance matrix builder
    citations.js       citation creation + validation against stored extraction
    findings.js        finding/citation contract + fact-status helpers
    store.js           in-memory repo (Postgres adapter seam)
  services/storage/    REUSED (IBM COS + local)
  services/ai/gateway  REUSED (watsonx governed)
  middleware/{auth,tenant,oidc,upload}  REUSED
  services/audit.js    REUSED (new EVENT_TYPES added)
```

## 4. Data model (domain → storage)

Tenant-scoped records, persisted via the repo abstraction. Concepts map to the
documented SQL spec; we consolidate where it fits the real code rather than
creating one table per noun. Core entities:

- **SolicitationUploadBatch** `{ id, tenant_id, name, created_by, status, created_at }`
- **SolicitationOpportunity** `{ id, tenant_id, batch_id, title, solicitation_number,
  agency, sub_agency, grouping_confidence, grouping_evidence[], analysis_version,
  recommendation, overall_risk }`
- **SolicitationDocument** `{ id, tenant_id, batch_id, opportunity_id, original_filename,
  normalized_file_type, content_hash, storage_key, storage_provider, classification,
  document_version, amendment_number, processing_status, page_count, sheet_names[],
  extraction_method, warnings[] }`
- **SolicitationExtraction** (per document): pages[`{page_number, printed_page_label,
  text, bounding_boxes?}`], sheets[`{sheet_name, rows, formulas, merged_cells,
  blank_required_cells}`], FAR sections A–M `{letter, found, confidence, sourceFile,
  sourceLocation, text}`.
- **SolicitationFinding** `{ id, tenant_id, opportunity_id, analysis_version, section,
  key, value, normalized_value, status (confirmed|inferred|conflicting|missing|
  not_applicable), confidence, citation_id }`
- **SolicitationCitation** `{ id, tenant_id, document_id, page_number, printed_page_label,
  sheet_name, cell_range, section_reference, source_text, source_bounding_box,
  confidence, extraction_method, extracted_at, validated }`
- **SolicitationConflict** `{ id, tenant_id, opportunity_id, severity, title,
  explanation, source_a (citation), source_b (citation?), confidence,
  recommended_action, suggested_rfi, resolution_status }`
- **SolicitationComplianceRequirement** `{ id, requirement, category, mandatory,
  citation_id, responsible, status, due_date, risk_level, consequence, notes }`
- **SolicitationAnalysisRun** `{ id, tenant_id, opportunity_id, version, provider,
  model, inputs_hash, started_at, completed_at, status, token_usage }`

Every record is tenant-scoped directly (`tenant_id`) or via a parent guarded by
`assertSameTenant`. DDL lives in `infra/sql/solicitation.sql`; the in-memory
adapter (`services/solicitation/store.js`) is the dev/test default.

## 5. Finding & citation contract

Defined in `services/solicitation/findings.js`; see the product spec and the
implementation plan. A model-produced citation that cannot be validated against
stored extraction text is **not** shown as `confirmed` — `citations.validate()`
downgrades it to `inferred` or drops it.

## 6. AI architecture (evidence-first)

1. Deterministic extraction (text/tables/dates/contacts/CLINs/metadata) — no model.
2. Document classification (deterministic signals + governed AI tiebreak).
3. Structured chunking with provenance.
4. Candidate fact extraction (deterministic) → findings with citations.
5. Cross-document reconciliation (`conflicts.js`).
6. Schema-constrained governed AI synthesis for narrative sections via
   `gateway.execute({ workflowType: 'rfp_response' })` (watsonx, audited).
7. Citation validation; reject/quarantine malformed model output.

## 7. Security

Reuses tenant isolation, RBAC, signed URLs, MIME/signature validation
(`middleware/uploadValidation.js`), and audit logging. Adds: content-hash dedup,
safe ZIP extraction (path-traversal/zip-bomb guards — Milestone B), CSV/Excel
formula-injection-safe exports (Milestone B), HTML sanitization for rendered
DOCX (Milestone B), and prompt-injection-resistant prompt construction (uploaded
text passed only as `{{content}}` data, never as instructions — matching the
existing `prompts.js` convention).

## 8. Deviations from the prompt's assumed architecture (explicit)

- Background jobs are an **in-process idempotent runner** (queue-swappable),
  not a deployed external worker, because no such runtime exists yet.
- Storage of batch/document/finding metadata uses the **in-memory repo adapter**
  by default (Postgres adapter is the production seam) because the full DB
  schema is documented but not yet deployed. This mirrors `tenantPolicyRepo`.
- OCR, ZIP, image rendering, exports, and enrichment are Milestone B/C and are
  feature-flagged with explicit disabled states, not stubbed as "done."
