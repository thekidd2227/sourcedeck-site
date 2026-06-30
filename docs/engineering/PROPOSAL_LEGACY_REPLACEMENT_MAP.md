# Proposal Legacy Replacement Map

**Date:** 2026-06-30 · **Branch:** `feat/proposal-intelligence-v1`

Per the existing-Proposal audit, **`sourcedeck-site` has no user-facing Proposal
section** (no nav item, route, component, or persisted Proposal data). There is
therefore nothing to remove, redirect, or migrate in-place; this work is
**additive** in this repo. (The mature Proposal UI lives in the Electron
`sourcedeck-app` — out of scope.)

| Path / item | Disposition | Notes |
|---|---|---|
| `apps/web` Proposal route/nav/UI | **does not exist** | nothing to remove/redirect; UI is deferred |
| Legacy Proposal route | **none** | no redirect needed |
| Persisted Proposal projects/drafts | **none** | no migration (documented, not fabricated) |
| `services/ai/prompts.js` `proposal_draft_v1` | **retain + reuse** | extend with `proposal_generation` workflow later; no duplicate prompt |
| `services/ai/agents.js` `proposal_drafter` / `workflows.js` `proposal_draft` (GOVERNED) | **retain + reuse** | one AI config / governed gateway; no new key form |
| Governed AI gateway, tenant AI config, BYOK, metering, audit | **retain + reuse** | single AI-provider integration |
| Solicitation citations/findings, compliance, cost, vendor/license engines | **retain + reuse** | server-side generation context (no browser-trusted facts) |
| `services/proposal/intelligence.js` (this branch) | **new (additive)** | deterministic proposal core: section derivation, team modes, placeholder lifecycle, claim-sourcing, output validation, partner-later impact |

## "One Proposal experience" status
Trivially satisfied: there is exactly one (and only one) proposal surface in
`sourcedeck-site` — none existed before; this branch adds backend logic only, no
second nav item, route, generator, key form, or vendor store. No duplicate
Proposal feature flag. The editor UI is **not built** (deferred), so there is no
"old vs new" UI to reconcile.

## Removed legacy items
**None** — nothing legacy exists in this repo to remove.
