# Solicitation Intelligence Workspace — Implementation Plan

**Date:** 2026-06-30 · **Branch:** `feat/solicitation-intelligence-workspace`

## 0. Honest scope statement

This is a multi-milestone enterprise feature. This branch delivers, end to end
and tested, the **Milestone A backend vertical slice** plus the three
architecture documents and the data/citation contracts. Milestones B and C are
specified here and sequenced, but are explicitly **not** claimed as complete.
The final delivery report enumerates exactly what is done vs. pending, with
test evidence. Nothing is fabricated.

## 1. Milestone A — backend vertical slice (this branch)

Built in `server/`, following existing conventions (DI'd routers, repo
abstraction, `requireAuth/requireRole/resolveTenant/assertSameTenant`, audit).

1. `services/solicitation/findings.js` — finding & citation contract + fact-status.
2. `services/solicitation/store.js` — in-memory tenant-scoped repo (Postgres seam).
3. `services/solicitation/extract/` — deterministic extractors:
   - `text.js` (txt), `csv.js`, `xlsx.js` (sheet/cell/formula/blank-required),
     `pdf.js` (page text + printed labels; OCR fallback flagged for B),
     `index.js` (dispatch by normalized type, content-hash, provenance).
   - Logic adapted from `sourcedeck-app/services/govcon/solicitation-package-extract.js`.
4. `services/solicitation/grouping.js` — evidence-based opportunity grouping
   (solicitation number, agency, title, filename, amendment refs, deadlines)
   with confidence + evidence trail; supports manual corrections (move/merge/
   split/rename/mark-supporting/mark-unrelated).
5. `services/solicitation/conflicts.js` — cross-document conflict & ambiguity
   engine (deadlines, timezones, PoP, set-aside, startup windows, tasks without
   CLINs, missing pricing attachments, malformed emails, blank required cells…).
6. `services/solicitation/compliance.js` — compliance matrix from extracted
   requirements with source citations + risk levels.
7. `services/solicitation/analysis.js` — Sections 1–5 (metadata/scope, place of
   performance, subcontracting/prep, compliance, site-visit) deterministic-first
   with governed-AI narrative synthesis via the existing gateway; Sections 6–7
   feature-flagged (Milestone C).
8. `services/solicitation/pipeline.js` — idempotent stage runner + status machine
   (`uploaded→validated→classified→grouped→normalizing→rendering→extracting→
   chunking→analyzing→cross_validating→citation_validating→completed[_with_warnings]
   |failed|cancelled`), per-document retry, analysis versioning on amendment add.
9. `routes/solicitation.js` — endpoints in the architecture doc, all
   tenant-scoped + RBAC + audited.
10. `infra/sql/solicitation.sql` — DDL for the new tables (Postgres seam).
11. Tests (`server/test/solicitation-*.test.js`) + fixtures
    (`server/test/fixtures/solicitation/`) modeled on the four-opportunity
    structures (CBP/USCG/VA/USDA-like) — sanitized, synthetic.

## 2. Milestone B — formats & workflow expansion

DOCX viewer/extraction (+ HTML sanitization), CSV polish, image/scanned support
+ OCR fallback, safe ZIP extraction (path-traversal/zip-bomb/size guards),
drawing/map viewer, RFI question generator, proposal & technical-approach
outlines, submission checklist, deliverables calendar, risk register, exports
(PDF/Word/Excel/JSON via platform export services; formula-injection-safe).

## 3. Milestone C — enrichment (feature-flagged)

Local subcontractor discovery, incumbent/prior-award research (SAM.gov +
USAspending, reusing the app's `sam-search`/`prime-partner-finder` approach),
vendor pipeline + outreach + RFQ + subcontractor comparison. Each behind a flag
with explicit disabled/error states when credentials are absent.

## 4. Feature flags & env

- `SOLICITATION_WORKSPACE_ENABLED` (default true in dev) — mounts the route.
- `SOLICITATION_OCR_ENABLED` (default false) — Milestone B.
- `SOLICITATION_ENRICHMENT_ENABLED` (default false) — Milestone C; requires
  `SAM_GOV_API_KEY` / web-search credentials.
- Reuses existing storage/AI/auth env (`IBM_COS_*`, watsonx, `AUTH_*`,
  `DATABASE_URL`, `MAX_UPLOAD_MB`).
- New limits: `SOLICITATION_MAX_FILES_PER_BATCH`, `SOLICITATION_MAX_ZIP_MB`,
  `SOLICITATION_MAX_PAGES`, `SOLICITATION_AI_TOKEN_BUDGET`, `SOLICITATION_STAGE_TIMEOUT_MS`.

## 5. Acceptance tests (31) → milestone mapping

A = Milestone A (tested here), B/C = later milestones.

| # | Acceptance criterion | Milestone |
|---|---|---|
| 1 | Multiple opportunities upload in one batch | A |
| 2 | Documents group correctly | A |
| 3 | User can correct grouping | A |
| 4 | Duplicate files detected (content hash) | A |
| 5 | PDF pages render | A (text/page model) / B (pixel render) |
| 6 | DOCX structure renders | B |
| 7 | XLSX sheets render | A |
| 8 | Formula & blank-cell inspection | A |
| 9 | Images render w/ zoom & rotation | B |
| 10 | Safe ZIP extraction | B |
| 11 | Sections 1–5 complete without enrichment creds | A |
| 12 | Sections 6–7 show feature-flagged states when creds absent | A (flag/state) |
| 13 | Every material confirmed finding has a validated citation | A |
| 14 | Clicking a citation opens the correct source | A (resolve API) / B (UI scroll+highlight) |
| 15 | Conflicting deadlines detected | A |
| 16 | Startup conflicts detected | A |
| 17 | Malformed email addresses flagged | A |
| 18 | Missing pricing attachments flagged | A |
| 19 | Unstated site visit NOT mislabeled as "no site visit" | A |
| 20 | Compliance requirements generated | A |
| 21 | Cross-opportunity executive brief generated | A |
| 22 | Bid calendar generated | A |
| 23 | RFI questions generated from conflicts | A |
| 24 | Failed extraction retried independently | A |
| 25 | Adding an amendment creates a new analysis version | A |
| 26 | Previous versions remain viewable | A |
| 27 | Tenant isolation enforced | A |
| 28 | Unauthorized signed-URL access fails | A (reuses storage tests) |
| 29 | Prompt-injection text cannot alter system behavior | A |
| 30 | PDF/Word/Excel/JSON exports authorized & tenant-scoped | B |
| 31 | Existing SourceDeck tests continue to pass | A |

## 6. Definition of done (per milestone)

Lint/format, type/contract tests, in-memory + (where configured) Postgres
adapter tests, `node --test` green for new + existing server suites, production
build of `apps/web` (when UI lands), browser console/network check (UI),
tenant-isolation + prompt-injection tests, no public object URLs, citation
validation against stored source, feature-flag verification, rollback notes.

## 7. Rollback

The feature is additive and flag-gated. Disable via
`SOLICITATION_WORKSPACE_ENABLED=false` (route not mounted). The new DDL is in a
separate file (`infra/sql/solicitation.sql`) and can be dropped independently;
no existing table is altered. The branch can be reverted wholesale without
touching the static site or existing `/api/v1/*` routes.
