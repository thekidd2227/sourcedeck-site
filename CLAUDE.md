# sourcedeck-site · Claude Code Project Guide

Authoritative context for any Claude Code session operating inside this repository.

## Repository identity

- **Purpose:** the live website and LCC web mirror served at https://sourcedeck.app via GitHub Pages.
- **Remote:** `github.com/thekidd2227/sourcedeck-site`
- **CNAME:** `sourcedeck.app`
- **Stack:** static HTML + CSS + vanilla JS. No bundler, no framework, no `package.json`. GitHub Pages reads `main` directly.
- **Companion repos (out of scope for this one):**
  - `~/sourcedeck-app` — Electron desktop shell (LCC v6)
  - `~/arcg-live` — arcgsystems.com marketing site
  - `~/arcg_prod08/` — local lead discovery jobs

This repo is the **sourcedeck** product source of truth. Changes here propagate to sourcedeck.app on push to `main`.

## Authoritative directory map

```
/                       marketing landing
/app/                   decision page (Explore / Buy split)
/app/demo/              LCC web mirror (the product)
/app/downloads/         standalone HTML distribution of the LCC
/command/               operational command center demo
/portal/                client/vendor/sub portal foundation
/settings/              settings hub
/settings/calendar/     calendar connections (Google · Microsoft · ICS)
/integrations/          21-connector marketplace
/agents/                AI agents library
/webhooks/              event-bus documentation
/onboarding/            5-step post-purchase wizard
/activate/              magic-link activation landing
/thanks/                Stripe success + Basin form thank-you
/invoice/               invoice purchase overview
/quote/pro/             Pro annual invoice request
/quote/operator/        Operator proposal request
/pricing/               implementation-tier page
/auth/callback/         OAuth callback (calendar connect)
/download/{html,app}/   distribution pages
/sales/                 legacy — retained for external links; nav-purged
/assets/                sd-theme.css · sd-config.js · sd-calendar.js · social/
/_workers/              Cloudflare Worker scaffolds (Stripe webhook)
/docs/sourcedeck/       Self-Setup PRD · SQL/API spec · build commands · notes
/variants/              A/B marketing variants
```

## Single source of truth files

- **`assets/sd-config.js`** — Stripe product + price IDs, Basin endpoint, Calendar OAuth client IDs, funnel campaign ID, operator self-serve flag, success/cancel URLs. **Every commercial config flows through this file.** Do not scatter IDs across pages.
- **`assets/sd-theme.css`** — shared brand tokens + status pill taxonomy (`.sd-pill.healthy|warning|blocked|failed|wait-client|wait-internal|automated|manual|approved|escalated`) + universal object tags. Consumed by every marketing page and the LCC mirror.
- **`assets/sd-calendar.js`** — provider-agnostic calendar client (Google, Microsoft, ICS). `window.sdCalendar.{list,upsert,remove,fetchEvents,fetchAllEvents}`.
- **`docs/sourcedeck/SELF_SETUP_ENGINEERING_PRD.md`** — field-level product spec for the 5 self-setup modules.
- **`docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md`** — Postgres DDL + REST contracts (`/api/v1`).

## Working rules

1. **Parity rule.** The LCC mirror at `app/demo/index.html` and the downloadable copy at `app/downloads/sourcedeck-lcc.html` must stay byte-identical. After editing one, always `cp` to the other. The Electron app in `~/sourcedeck-app` mirrors the same surface; changes here should be ported there in a subsequent pass.
2. **Fresh-blank rule.** The demo ships a sanitization gate that blocks real API egress and scrubs sensitive `localStorage` keys. Any new feature touching `localStorage` must not bypass that gate; new blocked keys go into `BLOCKED_KEYS` inside `app/demo/index.html`.
3. **Pricing rule.** Live tiers are Core $79 / Pro $349 / Operator $999. Legacy $49 / $149 price IDs are retained in `STRIPE_PRICES_LEGACY` for grandfathered subs — never re-expose them in UI.
4. **Secrets rule.** Publishable keys (`pk_live_…`) and Basin endpoints may live in `sd-config.js`. Secret keys, Stripe `whsec_…`, Airtable PATs, Instantly API keys, Postmark tokens, and any refresh tokens must not appear in any file under this repo — they live only in Cloudflare Worker secrets or in the operator's private `~/arcg_prod08/config.env`.
5. **PO-language rule.** This site does not advertise PO-based payment. Never reintroduce "PO-friendly" / "PO number required" language. Invoice flow is: request → ARCG issues invoice → buyer pays via ACH / wire / check.
6. **/sales/ rule.** The `/sales/` page is redundant and nav-purged. Do not add nav links or CTAs to it. Route sales-adjacent CTAs to `/quote/operator/` (proposal) or `/invoice/`.
7. **Status taxonomy rule.** New UI must use `.sd-pill.*` tokens from `sd-theme.css`. Do not invent parallel status labels.
8. **Local validation.** There is no build system. Validate changes with:
   - `python3 -m http.server 8777 --bind 127.0.0.1` then curl each touched route expecting HTTP 200
   - `node -e "..."` parsing `<script>` blocks for syntax errors
   - `grep` for residual legacy pricing, `/sales/` nav links, real base ID `appfQRV1tGk3sWMCb` in the demo (must be 0 hits)
9. **Deploy.** Commit and push to `main`. GitHub Pages redeploys in ~2 min. There is no staging branch.

## Out of scope for this repo

- Electron packaging / signing — lives in `~/sourcedeck-app`.
- arcgsystems.com marketing pages — lives in `~/arcg-live`.
- Outbound lead discovery jobs (PROD-08 / PROD-09) — live in `~/arcg_prod08/`.
- Real backend API. This repo ships client-side only; `/api/v1/*` is specified in `docs/sourcedeck/` but has no implementation here.

## Operator handoff expectations

End every substantive change with:
- files changed (with line counts)
- routes touched and their HTTP 200 evidence
- legacy-pricing / stale-config residue scan (0 hits required)
- parity status between `app/demo/` and `app/downloads/`
- commit SHA on `main`

Use the `handoff-report` skill for this report shape.
