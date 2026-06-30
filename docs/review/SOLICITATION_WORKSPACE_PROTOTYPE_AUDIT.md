# Solicitation Workspace — Prototype Audit & v2 Reconciliation

**Date:** 2026-06-30 · **Auditor branch:** `feat/solicitation-intelligence-workspace-v2`

## 1. Branch provenance

| Ref | Commit | Meaning |
|---|---|---|
| Prototype branch tip | `a1139fb` | feat(solicitation): Milestone A backend vertical slice |
| Prototype docs commit | `30665cf` | docs(solicitation): Phase 0 audit + architecture + plan |
| Prototype base | `33cebf9` | **feat(site): add GovCon demo clip section** — the `feat/phase-23k-govcon-demo-clips` tip the prototype was branched from |
| Old merge-base w/ main | `bf3dc6f` | main tip when the prototype was cut |
| Current `origin/main` | `bccb714` | advanced by 3 site-fix commits (pricing/brand/compliance) since |

`git rev-list --left-right --count HEAD...origin/main` = **3 / 3**. The prototype's
3 "ahead" commits were `33cebf9` (inherited demo-clips) + `30665cf` + `a1139fb`.

### Inherited / unrelated
- **`govcon-demo/index.html`** (164 lines) — introduced by `33cebf9`, a marketing
  demo-clips page. **Unrelated** to the solicitation feature. Excluded from v2.

### Solicitation-specific
- `30665cf` — three architecture docs. **Independently valid → cherry-picked clean.**
- `a1139fb` — backend engine + route + DDL + tests. **Valid concepts, unsafe wiring**
  (see §3). Cherry-picked to preserve the engine, then corrected on v2.

### Cherry-pick decision
v2 = `origin/main` + cherry-pick `30665cf` + cherry-pick `a1139fb`. This brings the
solicitation work **without** the inherited `govcon-demo/index.html`. Both picks
applied cleanly (origin/main already contains `server/`). The prototype branch
`feat/solicitation-intelligence-workspace` is **preserved** (not deleted/rewritten).

## 2. What the prototype got right (preserve)

- Finding & citation **contract** with validation-against-stored-source and
  auto-downgrade of unverifiable "confirmed" findings (`findings.js`).
- Evidence-first deterministic field extraction with page/sheet **citations**.
- Multi-opportunity **grouping** by evidence + manual-correction operations.
- Cross-document **conflict/ambiguity** engine, **compliance matrix**, Sections 1–5
  assembly, executive brief, RFI generation, analysis **versioning** semantics.
- Tenant-scoped reads (cross-tenant returns null), feature-flag intent, additive DDL.
- 20 engine tests on synthetic fixtures.

## 3. What is unsafe / incomplete (correct, do not ship as-is)

| # | Defect | Correction (this v2) |
|---|---|---|
| D1 | `server.js` instantiates `createInMemorySolicitationStore()` unconditionally when the flag is on → volatile product data in prod. | Flag **default OFF**; in prod, refuse to mount unless a persistent repo + storage + auth + tenant + durable worker are configured; **never** instantiate in-memory in prod wiring. (Step 2) |
| D2 | `normalizedContent` sidecar can serve as **authoritative extraction** via the API. | Reject client-provided `normalizedContent` in the runtime API; it is a **test-only** injection. Confirmed citations must trace to parser output from the stored original. (Step 5) |
| D3 | **No real byte parsers** (only TXT/CSV; PDF/DOCX/XLSX were sidecar). | Port the proven parser modules from `sourcedeck-app`; parse actual PDF/XLSX bytes. (Steps 4–5) |
| D4 | **Request-bound** in-process pipeline (whole package processed inside the HTTP request). | Durable persisted `processing_job` worker; API enqueues and returns. (Step 6) |
| D5 | Persistence is **in-memory only**; analysis stored as a single snapshot. | Repository-abstraction adapter persisting structured records (batches, documents, pages, sheets, findings, citations, deadlines, compliance, versions, jobs); Postgres integration tests. (Step 3) |
| D6 | **No frontend.** | Authenticated `apps/web` three-panel workspace with PDF/XLSX viewers + citation navigation. (Step 8) |
| D7 | Prompt-injection claim rested on deterministic tests only. | Test the actual AI-provider boundary + schema validation + immutable-citation rule. (Step 12) |
| D8 | "Existing tests pass" was reported while the full `npm test` chain is red on a **pre-existing** `check:privacy` failure (`sourcedeck-web.html`, sample phone). | Report the full suite honestly; document the pre-existing failure separately; never label the chain green. (Step 11/13) |

## 4. Correction sequencing on v2

Step 2 (feature flag + prod guards) → Step 4 (parser inventory) → Step 5 (real
parsing) → Step 3 (persistence) → Step 6 (durable worker) → Step 7 (upload flow) →
Step 8 (frontend) → Steps 9–13 (integration, e2e, validation). Progress and the
honest done/not-done state are recorded in the final report; the vertical slice is
**not** declared complete until a user can upload real files in the browser, the
server parses real PDF/XLSX bytes in a durable worker, results persist, and a
citation opens the real source page/cell.
