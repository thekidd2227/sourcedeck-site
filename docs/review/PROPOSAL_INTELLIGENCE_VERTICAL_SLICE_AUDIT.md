# Proposal Intelligence — Vertical Slice Audit

**Date:** 2026-06-30 · **Branch:** `feat/proposal-intelligence-v1` @ HEAD (post-persistence)

## Verified state
- On `feat/proposal-intelligence-v1`, descends from the full feature lineage
  (solicitation + cost + subcontractor + national-license). Not pushed/merged.
- Retained the prior deterministic core (`services/proposal/intelligence.js`, 11 tests).

## Two prior errors, corrected
1. **"No Proposal section exists" was wrong** — it exists as the Electron
   `sourcedeck-app` "Proposal Workspace" (located with evidence; see the canonical
   runtime map).
2. **"Environment blocked" was asserted without attempting setup.** This run
   **attempted setup with evidence**:
   - `open -a Docker` → **Docker daemon came up (28.3.2)**.
   - Started disposable **Postgres 16.13** in Docker (`sd-pg-test`, port 55432).
   - `npm install pg` (8.22.0) → Node↔Postgres connectivity verified.
   - Playwright is **not installed** and requires a browser download
     (`npx playwright` canceled: missing package, no-yes option) — attempted, not yet run.
   - `apps/web` is Next.js 15 with a **minimal `node_modules` (22 pkgs)** — a full
     `next build` needs a dependency install; not completed this run.

## Delivered this run (REAL, verified — not "blocked")
- **Compact 5-table migration** (`infra/sql/proposal.sql` + `proposal_rollback.sql`):
  `proposal_project`, `proposal_section`, `proposal_team_selection`,
  `proposal_draft_version`, `proposal_source_link` — tenant-scoped, FKs, indexes,
  optimistic_version, version history. **Applied to live Postgres; rollback verified.**
- **Postgres repository** (`services/proposal/repo.pg.js`): tenant isolation,
  optimistic locking, transaction-safe version creation (`FOR UPDATE` on the section
  row; retry-safe single `is_current`), restore-as-new-version, source links.
- **Integration tests** (`test/proposal-persistence.pg.test.js`, 6) — **pass against
  live Postgres**; skip cleanly when `PROPOSAL_PG_TEST_URL` is unset (default suite
  stays green: 225 total / 219 pass / 6 skipped / 0 fail; `npm test` exit 0).

## Reproduce the DB integration tests
```
docker run -d --name sd-pg-test -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test \
  -e POSTGRES_DB=sourcedeck_test -p 55432:5432 postgres:16-alpine
cd server && PROPOSAL_PG_TEST_URL="postgres://test:test@127.0.0.1:55432/sourcedeck_test" \
  node --test test/proposal-persistence.pg.test.js
```

## Still NOT delivered (honest — the browser workflow is not done)
- Next.js three-panel Proposal **editor UI** in `apps/web` (section selector,
  evaluation map, team-mode modal, editor, traceability, validation, export views).
- The **durable generation worker** + the canonical **proposal API routes**.
- The **AI generation pipeline** wiring (governed gateway + mock provider) end-to-end.
- **Exports** (DOCX/PDF), **Electron bridge**, **Playwright e2e**, **screenshots**.

The working browser interface is **not** complete. This run advanced the
foundational, previously-deferred persistence to a real, tested state against actual
Postgres, and corrected the two prior errors — but the UI + worker + APIs + e2e
remain the bulk of the work.
