# Scope & Cost Intelligence — Continuation Audit

**Date:** 2026-06-30 · **Branch:** `feat/solicitation-intelligence-workspace-v2` · **HEAD:** `32ec0d8`

## 1. Verified current state

- Active branch is `feat/solicitation-intelligence-workspace-v2` (as expected).
- `git rev-list --left-right --count HEAD...origin/main` = **6 / 0** — 6 solicitation
  commits ahead, **0 inherited from elsewhere**; cleanly based on `origin/main` (`bccb714`).
- No stash. Only untracked path is `.claude/commands/` (harness; ignored).
- No ChartNav / marketing / demo-clips / audit-agent residue. No secrets in the diff.
- `cd server && npm test` was green (146/146 `node --test` + privacy + demo parity, exit 0).

### Commits (all solicitation-specific)
`e5445d0` docs · `42a6326` Milestone-A engine · `3ece10c` Step-2 flag guards ·
`799a4d4` D2 sidecar gating · `9ba1364` real PDF/XLSX parsing · `32ec0d8` privacy id fix.

## 2. Existing state by area (no valid work will be lost)

| Area | State |
|---|---|
| Parsers | Real PDF (ported), real XLSX (shared strings, formulas, blank cells), guarded ZIP, CSV. ✅ |
| Engine | Tenant-scoped grouping, findings+citation contract, conflicts, compliance matrix, analysis Sections 1–5, versioning. ✅ (in-memory store) |
| Feature flag | Default OFF; prod-mount blocked without persistent repo + storage + auth + tenant + durable worker. ✅ |
| Persistence | DDL only (`infra/sql/solicitation.sql`); **no Postgres adapter**, no migration runner. ❌ |
| Worker | In-process pipeline; **no durable `processing_job` worker**. ❌ |
| Upload route | Exists (auth+tenant+audit); **no route-level integration tests**. ⚠️ |
| Frontend | **None** (`apps/web` is scaffold). ❌ |
| Scope & Cost | **None** before this continuation. ❌ |

## 3. Environment constraints affecting this continuation (honest)

- **No Postgres** in this environment (`psql`/`pg` absent) → the Postgres repository
  adapter + forward/rollback **migration integration tests cannot be executed here**.
  They can be implemented and documented as *not executed* (never claimed passing).
- **No browser / Playwright runner + no running stack** → browser e2e and **real
  screenshots cannot be produced** in this environment.
- **No SAM.gov / USAspending credentials** configured → automated prior-award
  **benchmark research cannot run**; manual + user-entered benchmarks must work offline.

## 4. This continuation's scope (what is actually delivered vs deferred)

Given the constraints above and to avoid any fabrication, this continuation delivers
the **deterministic core that is fully implementable and unit-testable here**:

**Delivered (tested):**
- Deterministic **scope metrics** from findings (reliable vs provisional square footage,
  building/location counts, visits/year, durations, CLIN counts, missing pricing cells,
  scope-without-CLIN / CLIN-without-scope), conflict-aware (never silently picks a value).
- Deterministic **cost engine**: annualized value, annual cost/sf (reliable inputs only),
  government-bid-from-cost, gross profit, gross margin, maximum vendor cost, option-year
  escalation, walk-away vendor price — with **calculation lineage** and missing/zero/
  conflict handling. **No AI in the arithmetic.**
- Deterministic **pricing scenarios** (Aggressive / Balanced / Margin-Protected) with
  year-by-year tables, **vendor targets**, "What the current contract should cost"
  ranges (with explicit *insufficient-data* behavior), and a **rule-based recommendation**
  (BID / CONDITIONAL BID / NO-BID / MORE INFORMATION REQUIRED) derived from facts +
  metrics + thresholds, not a model opinion.
- **Benchmark value model** that keeps obligations / current / potential / ceiling
  **distinct** (never merged), with deterministic annualization, similarity scoring,
  and verification-status labeling. Manual / user-entered benchmarks work without research.

**Deferred / blocked (NOT delivered — not disguised):**
- Postgres repository adapter + migration runner + migration integration tests
  (blocked: no DB here; will be implemented + documented as not executed).
- Durable `processing_job` worker (lease/heartbeat/retry/recovery).
- `apps/web` three-panel frontend, PDF/XLSX viewers, citation navigation, full Cost
  Summary UI, editable scenarios — **no frontend built**.
- Automated benchmark research via SAM.gov/USAspending (no creds).
- Exports (PDF/Word/Excel/JSON), Playwright e2e, real screenshots.
- AI-provider-boundary tests beyond the deterministic level.

The end-to-end browser-to-source and full-cost-summary workflows are therefore **not
complete**, and are not represented as such. The cost engine is real, deterministic, and
tested, and is structured to wire into the persistence/worker/API/UI layers as those land.
