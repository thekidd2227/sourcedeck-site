# Subcontractor Intelligence — Continuation Audit

**Date:** 2026-06-30 · **Child branch:** `feat/subcontractor-intelligence-v1` (from v2 `758c58b`)

## 1. Repository & merge status (verified)

- Parent branch `feat/solicitation-intelligence-workspace-v2` @ **`758c58b`** (present),
  **ahead 7 / behind 0** of `origin/main`.
- HEAD is **not on any remote** (not pushed). Neither `feat/subcontractor-intelligence-v1`
  nor `...-v2` exist on `origin`. No solicitation/subcontractor branch merged into `origin/main`.
- No stash; only `.claude/commands/` untracked. No unrelated files.
- The v2 branch's upstream is `origin/main` (from its checkout) — **do not `git push` bare**.
- Child branch `feat/subcontractor-intelligence-v1` created **from v2 HEAD `758c58b`** (not from origin/main). v2 preserved (not rebased/rewritten).

## 2. Existing subcontractor/vendor feature audit (the key finding)

- **There is no existing user-facing subcontractor-search feature in `sourcedeck-site`.**
  All `apps/web` "vendor" matches are `.next/` **build artifacts**, not source. `apps/web`
  routes (`settings/pipeline/workspace/dashboard/sources/login`) are scaffold; none are
  vendor/subcontractor screens. No top-level static vendor/subcontractor pages.
- In `server/src`, "subcontractor/vendor" appears only in (a) the solicitation analysis
  Section 3 ("Subcontractor Identification and Proposal Preparation") and (b) the cost
  engine's vendor targets (this session's prior work).
- The **mature** vendor/subcontractor logic (vendor-quote-workflow, prime-partner-finder,
  vendor sourcing) lives in the Electron **`sourcedeck-app`** — a *port reference only*
  (out of scope to modify).

**Consequence:** in `sourcedeck-site`, Subcontractor Intelligence is **additive** — there
is no canonical legacy nav item, route, API, or vendor table to destructively replace.
The §12 "replace legacy" obligations are therefore largely **N/A in this repo** (no
duplicate nav/API to remove); they remain documented for the Electron surface. No
existing production vendor data in this repo to migrate.

## 3. This continuation's scope (delivered vs deferred — honest)

**Delivered (tested, deterministic, browser/DB-free):**
- Vendor **distance** screening (great-circle; unverified coordinates can never be "within radius").
- Deterministic **fit/risk scoring** with exposed weights + **mandatory-license disqualification**.
- Vendor **deduplication** by weighted identity (never merges on name alone).
- Vendor **quote classification** vs the existing cost-engine targets (ideal/acceptable/max/walk-away).
- **Requirements classification** helpers: mandatory-vs-recommended, FAR flow-down as
  *conditional* (not universal), insurance-silence → `not_stated`, vetting-checklist generation.
- Synthetic pest-control fixture (8 candidates with the specified edge cases) + tests.

**Deferred / blocked (NOT delivered — not disguised):**
- Persistent repository + migrations for the ~40 subcontractor/vendor tables (no Postgres here).
- Durable vendor-discovery worker jobs (no durable worker exists yet).
- The two **Screen A / Screen B UIs** in `apps/web` (no frontend built).
- Vendor-search **providers** (SAM.gov / state licensing / geocoding) — no credentials configured;
  automated discovery cannot run.
- The subcontractor/vendor **API endpoints**, outreach/RFQ wiring, exports.
- AI-provider-boundary tests; Playwright e2e; real screenshots (no browser/runtime).

**Therefore the two screens do NOT work end-to-end**, and this is not represented as
complete. The deterministic engines are real and tested, structured to wire into the
persistence/worker/API/UI layers as they land.
