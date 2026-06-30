# Subcontractor Feature Replacement Map

**Date:** 2026-06-30 · **Branch:** `feat/subcontractor-intelligence-v1`

Audited `sourcedeck-site` for any existing subcontractor/vendor-search surface to
replace. **Finding: none exists in this repo** (see continuation audit §2). The
mature implementation lives in the Electron `sourcedeck-app` (port reference only).

| Existing item (where) | Disposition | Compatibility requirement |
|---|---|---|
| `apps/web` "vendor" hits | **N/A** — `.next/` build artifacts, not source | none |
| `apps/web` routes (settings/pipeline/workspace/…) | **Keep** — scaffold; add new subcontractor routes alongside | new routes must follow the app-router convention |
| `server` solicitation analysis Section 3 (Subcontractor Identification) | **Keep / extend** — becomes the entry point that enqueues `extract_subcontractor_requirements` | reuse its findings + citations |
| `server` cost engine vendor targets (`cost/scenarios.js`) | **Keep / reuse** — Vendor Shortlist reads ideal/max/walk-away from it; do **not** build a second pricing engine | quote classification calls the existing engine |
| `sourcedeck-app` vendor-quote-workflow, prime-partner-finder, vendor sourcing | **Port reference only** (Electron; out of scope to modify here) | port Electron-independent logic into `server/src/services/subcontractor/*` |
| Legacy nav item / route / vendor API in `sourcedeck-site` | **None to remove** | the new feature is the only canonical vendor-search surface by construction |
| Existing production vendor records in `sourcedeck-site` | **None** | no destructive migration needed; future data uses the canonical vendor entity + dedup |

## Replacement obligations (§12) status in this repo

- Replace legacy nav item → **N/A** (none exists).
- Redirect old routes → **N/A** (none exists).
- Map old saved searches / vendor records → **N/A** (none exist); the dedup model is
  ready to ingest external/manual vendors without merging on name alone.
- Preserve outreach/quote history → **N/A** here (lives in the Electron app / proxy/Airtable funnel).
- "Only one canonical vendor-search service registered" → satisfied trivially (the new
  service is the only one in `sourcedeck-site`).

## Rollback

Additive + flag-gated under the solicitation workspace flag. Revert the child branch to
remove all subcontractor modules; no existing schema, route, or nav is altered.
