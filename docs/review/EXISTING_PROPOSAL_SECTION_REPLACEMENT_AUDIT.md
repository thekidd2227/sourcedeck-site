# Existing Proposal Section — Replacement Audit

**Date:** 2026-06-30 · **Branch:** `feat/proposal-intelligence-v1` (from verified `41d0c4c`)

## Branch lineage (verified)
Cut from `feat/subcontractor-intelligence-vertical-slice-v2` @ `41d0c4c`, which
contains all required lineage: Solicitation Intelligence (`services/solicitation/*`),
Scope & Cost Intelligence (`services/cost/*`), Subcontractor Intelligence
(`services/subcontractor/*`), and the national license framework
(`services/subcontractor/license/*`). Ahead 11/0 of `origin/main`; not pushed/merged.

## Key finding: there is NO existing user-facing Proposal section in `sourcedeck-site`

Evidence (searched `apps/web` source, `server/src`, static dirs, `.html`):
- **No** proposal route/component in `apps/web/app` or `apps/web/src` (the app-router
  routes are `settings/pipeline/workspace/dashboard/sources/login` — all scaffold).
- **No** top-level static Proposal page; **no** Proposal nav item anywhere in source.
- The only "proposal" references in `server/src` are **backend AI building blocks**,
  not a user-facing section:
  - `services/ai/prompts.js` → `proposal_draft_v1` (governed generate prompt) + an
    RFP-analyst prompt.
  - `services/ai/agents.js` → `proposal_drafter` agent (`workflowType: 'proposal_draft'`).
  - `services/ai/workflows.js` → `proposal_draft` = GOVERNED workflow.
  - `services/solicitation/analysis.js` → Section 3 (Subcontractor/Proposal Prep).

The mature, user-facing proposal workspace lives in the Electron `sourcedeck-app`
(out of scope to modify — port reference only).

## Consequence for this task
The prompt's premise ("SourceDeck already has a Proposal section … replace it
**in place**") is **not true for this repo**. There is:
- no Proposal nav item to keep/relabel,
- no Proposal route to redirect,
- no Proposal UI to remove,
- **no durable Proposal data to migrate** (no proposal projects/drafts persisted in
  `sourcedeck-site`).

Per the prompt's own rules ("When none exists: state that replacement is additive…"
and "When the existing implementation has no durable data, document that finding
with evidence rather than inventing a migration"), this work is **additive** in
`sourcedeck-site`: there is no in-place UI swap to perform and **no migration is
fabricated**.

## Classification of existing items
| Item | Path | Disposition |
|---|---|---|
| `proposal_draft_v1` prompt | `server/src/services/ai/prompts.js` | **Reuse/extend** (do not duplicate) |
| `proposal_drafter` agent / `proposal_draft` workflow | `services/ai/{agents,workflows}.js` | **Reuse** (governed gateway) |
| Governed AI gateway + tenant AI config + BYOK | `services/ai/*` | **Reuse** (one AI config; no new key form) |
| Solicitation citation/findings + compliance + cost + vendor/license engines | `services/{solicitation,cost,subcontractor}/*` | **Reuse** as the generation context source of truth |
| `apps/web` Proposal UI | — | **None exists** → additive (UI deferred; see below) |
| Legacy Proposal route/nav/data | — | **None** → nothing to redirect/remove/migrate |

## Environment blockers (unchanged, material to Definition of Done)
No Postgres (`psql`/`pg` absent) · no Playwright/browser runtime · `apps/web` UI is
scaffold · no AI/provider credentials. Therefore the in-place UI replacement,
Postgres persistence, durable generation worker, Playwright e2e, and real
screenshots **cannot be built/validated here** and are not claimed.

## What this branch delivers (tested, achievable)
The **deterministic, anti-fabrication proposal core** that needs no DB/browser/AI/
creds: section derivation from the solicitation (not auto-all), team-mode +
structured-placeholder lifecycle, claim-sourcing enforcement (every claim traces to
a citation / saved company fact / vendor evidence / user input / placeholder;
unsupported model claims are downgraded to placeholders), output-schema validation
(malformed rejected), section validation, and the partner-selected-later impact
report. The editor UI, persistence, durable worker, APIs, exports, Playwright and
screenshots are deferred/blocked.
