# Proposal — Canonical Runtime & Replacement Map

**Date:** 2026-06-30 · **Branch:** `feat/proposal-intelligence-v1`

## Correction to the prior audit
The earlier conclusion ("there is no existing Proposal section") was **wrong as a
product statement** — it was scoped only to `sourcedeck-site/apps/web`. The user
confirmed a Proposal section exists, and it does: **in the Electron `sourcedeck-app`**.

## The actual existing Proposal surface (located, with evidence)
- **Runtime:** Electron desktop app (`sourcedeck-app`, `"main": "main.js"`, `electron .`).
- **Navigation:** "Proposal Workspace" — `sourcedeck.html` nav section
  `id="nav-section-execution"` / `data-section="proposal-workspace-nav"`, `nav-btn data-tab="execution"`.
- **Renderer:** the `execution` tab-pane in the monolithic `sourcedeck.html`.
- **Backend (in-process, main):** `services/proposal/index.js`; platform-neutral
  adapter `api/index.js` (`appApi.govcon.proposal.workspace` / `.costVolume`,
  `appApi.ai.draftProposalSection`).
- **IPC:** `govcon:proposal-workspace`, `govcon:proposal-cost-volume`,
  `ai:draft-proposal-section` (`app/main/ipc/register-feature-ipc.js`); preload
  `window.sd…proposal.{workspace,costVolume}`, `…draftProposalSection`.
- **Storage:** Electron `electron-store` / userData (single-user, local) — **not** multi-tenant.
- **AI:** main-process provider-factory (local/watsonx/openai/anthropic).

## Canonical replacement target
Per the prompt's architecture: shared server logic in **`sourcedeck-site/server`**,
canonical multi-tenant web UI in **`sourcedeck-site/apps/web`** (Next.js 15). The
Electron Proposal entry should become a bridge to the web workspace / shared API
(no separate Electron proposal generator). Reuse `sourcedeck-site`'s governed AI
gateway, tenant AI config, solicitation citations, and vendor/license models.

## Disposition
| Item (where) | Disposition |
|---|---|
| Electron "Proposal Workspace" nav (`sourcedeck.html`) | **Bridge** — re-point its destination to the canonical web workspace (deferred; UI not built yet) |
| `services/proposal/index.js`, `api/index.js` proposal methods (Electron) | **Port reference** — port Electron-independent logic into `sourcedeck-site/server`; remove the local generator only after the web replacement is operational |
| Electron IPC `govcon:proposal-*`, `ai:draft-proposal-section` | **Retain until bridge ships**, then route to the shared API |
| `sourcedeck-site/server` governed AI gateway / tenant AI / citations / vendor+license | **Reuse** (one AI config, one vendor store, one citation resolver) |
| `sourcedeck-site/server/src/services/proposal/intelligence.js` | **Retain/extend** (deterministic core) |

## Legacy data
The Electron Proposal Workspace stores drafts **locally per install** (electron-store/
userData), single-user. There is **no multi-tenant durable Proposal data** in
`sourcedeck-site`. A migration would be a per-install local import (Electron side),
out of scope for the `sourcedeck-site` web replacement; documented, not fabricated.

## "One Proposal experience" plan
After the web workspace + Electron bridge ship, exactly one canonical Proposal
generator exists (`sourcedeck-site/server`), the Electron entry links to it, and the
local Electron generator is disabled. **Not yet reached** — the web UI + bridge are
deferred (see the vertical-slice audit).
