# SourceDeck

SourceDeck commercial direction is **Web SaaS + installable PWA**.

- Commercial app: `https://app.sourcedeck.app`
- Marketing site: `https://sourcedeck.app`
- Electron desktop: legacy/internal until web parity is reached

## Commercial Rules

Commercial SourceDeck ships blank:

- no Charlie keys
- no Charlie `.env`
- no seeded Charlie data
- no hidden provider fallback
- no bundled OpenAI, Anthropic, IBM Watson, Airtable, Apollo, Hunter, SerpAPI, Buffer, Google, or Stripe secrets

Commercial users bring their own provider keys by default.

Managed IBM Watson is available only for entitled Federal, Hyatt/highest-tier, or enterprise-managed workspaces.

## Repo Shape

- `apps/web/` — Phase 1 Next.js SaaS/PWA scaffold
- `server/` — existing backend API
- `packages/core/` — shared deployment mode and entitlement logic
- `docs/` — commercial packaging and migration plans
- `scripts/commercial-release-check.js` — commercial release gate

## Commands

```bash
npm install
npm test
npm run commercial:check
npm run web:dev
npm run web:build
npm run server:test
```

The web scaffold does not make live provider calls. Provider setup screens show blank BYOK status by default.
