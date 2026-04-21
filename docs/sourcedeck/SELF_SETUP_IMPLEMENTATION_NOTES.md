# Self-Setup Implementation Notes

_Running log of what was built, where it lives, what is scaffolded vs fully integrated, and what remains. Updated at every implementation pass. Source of truth for execution handoff._

---

## Status at persistence of this spec (docs v1)

**Phase:** Specification persisted in repo; implementation not yet started against the backend schema defined in `SELF_SETUP_SQL_AND_API_SPEC.md`.

**What exists in the repo today that is aligned to this spec:**

| Area | File(s) | State |
|---|---|---|
| Settings hub (frontend) | `/settings/index.html` | Live — 6 cards linking to Calendar, Integrations, Agents, Webhooks, Command, Onboarding. Reads live calendar connection count from `localStorage.sd_calendars`. |
| Calendar connection UI | `/settings/calendar/index.html` + `/auth/callback/index.html` + `assets/sd-calendar.js` | Live — Google OAuth (implicit), Microsoft Graph (PKCE), ICS URL feed (zero-setup), iCloud via public ICS. Client-side only; see §"Production hardening required" below. |
| Integrations marketplace | `/integrations/index.html` | Live — 21-connector surface with live/beta/soon tags and category filter. Placeholder OAuth buttons; backend OAuth handlers still to build. |
| AI Agents library | `/agents/index.html` | Live — 9 agents catalogued with event-bus mappings. |
| Webhooks docs | `/webhooks/index.html` | Live — 12-event catalog + signed payload sample. No server yet. |
| Onboarding wizard | `/onboarding/index.html` + `/activate/index.html` | Live — 5-step wizard; activation lands post-Stripe. |
| Stripe webhook scaffold | `_workers/stripe-webhook.js` + `_workers/wrangler.toml` | Scaffolded — needs Cloudflare deploy + secrets. |
| Command Center | `/command/` (marketing) + LCC Command Center tab | Live — operational inbox, revenue path, connector health, readiness gauge. LCC mirror wired into `app/demo/index.html` and `sourcedeck-app/sourcedeck.html`. |
| Status taxonomy | `assets/sd-theme.css` (`.sd-pill.*`) | Live — 10 unified state pills consumed by `/command/`, `/portal/`, `/settings/calendar/`, LCC Command Center. |
| Portal foundations | `/portal/index.html` | Live — client-tab demo with explicit permissions scope. |
| Docs | `/docs/sourcedeck/SELF_SETUP_ENGINEERING_PRD.md`, `/docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md`, `/docs/sourcedeck/SELF_SETUP_BUILD_COMMAND_CLAUDE.md`, `/docs/sourcedeck/SELF_SETUP_BUILD_COMMAND_CODEX.md`, `/docs/sourcedeck/SELF_SETUP_IMPLEMENTATION_NOTES.md` (this file) | Live — authoritative execution handoff. |

**What is NOT yet implemented (entirely scaffolded or missing):**

| Area | Gap |
|---|---|
| Relational backend | No Postgres database, no migrations. The DDL in §19.1 has not been applied. |
| REST API `/api/v1/*` | Not implemented. Client pages currently read from `localStorage` or static data. |
| Lead Generator settings surface | ICP profile form does not exist as a dedicated screen. |
| Ad Engine settings surface | Channel connection UI exists on the marketplace page; no per-channel OAuth handler. |
| Daily Ops settings surface | Calendar is shipped; work-hours / responsibilities / prioritization / follow-up rules are not yet a settings screen. |
| Client Delivery templates | No editable templates surface; portal shows a static demo client only. |
| GovCon engine | No SAM connection, no saved searches, no solicitation parser, no compliance-matrix generator, no proposal sections. Entirely remaining. |
| Explainability endpoint | `/api/v1/explainability/*` not live. |
| Plan gating enforcement | Plan caps respected in UI copy only; no server-side enforcement yet. |
| RBAC | Workspace/user/membership model exists on paper, not in data. |
| Seeded top-40 industries | Not seeded yet. |

---

## Authoritative execution handoff

For the next implementation pass, use the commands in these files verbatim:

- **Claude** → `/docs/sourcedeck/SELF_SETUP_BUILD_COMMAND_CLAUDE.md`
- **Codex / GPT-class** → `/docs/sourcedeck/SELF_SETUP_BUILD_COMMAND_CODEX.md`

Both commands reference this file, the PRD, and the SQL/API spec as their source of truth.

---

## Production hardening required (calendar path specifically)

The client-side Google/Microsoft OAuth flow currently stores tokens in `localStorage.sd_calendars`. This is acceptable for self-serve read-only preview but **must not** be the long-term production path. Before onboarding paying Operator-tier or Enterprise customers:

1. Deploy a `_workers/calendar-oauth` Cloudflare Worker using the same pattern as `_workers/stripe-webhook.js` (KV-backed, signed, retried).
2. Move refresh tokens server-side; client keeps only a `connection_id`.
3. Set `SD_CONFIG.CALENDAR.microsoft.worker_exchange_url` in `assets/sd-config.js`.
4. Encrypt token storage at rest; the Worker should never echo tokens in responses.
5. Add audit-log writes on connect/disconnect/refresh per PRD §4.4.

---

## Priority build order (matches PRD §15)

### Phase 1 — must-have
1. Migrations for all tables in §19.1.
2. `/api/v1/settings/status` + Settings hub status tiles.
3. Lead Generator settings screen + PUT endpoint + seed top-40 industries.
4. Ad channel connection framework (OAuth handlers for Facebook + Instagram + LinkedIn).
5. Daily Ops core settings screen (calendar path is already live; wire it to the server model and add work-hours + responsibilities UI).
6. Client Delivery templates: basic CRUD.
7. GovCon: SAM connection + saved search + opportunity review. Proposal ingest skeleton.
8. Setup completion state logic end-to-end.
9. Explainability endpoint + UI consumer.

### Phase 2 — high leverage
- Approval workflows on posting rules and proposal sections.
- Recurring reporting engine.
- Saved search notifications.
- Proposal section locking + regeneration.
- Task rule engine.
- Compliance-matrix-before-drafting guard.

### Phase 3 — scale / enterprise
- Multi-brand support.
- Advanced audit logs.
- Granular RBAC + SSO.
- Cross-workspace templating.
- Richer pricing and compliance libraries.

---

## Verification checklist for next pass

Before closing out Phase 1, every item must be demonstrably true:

- [ ] `pnpm run migrate` (or repo equivalent) applies all migrations cleanly; rollback to previous head also works.
- [ ] `GET /api/v1/settings/status` returns all six modules with valid status values.
- [ ] Saving an ICP profile with no target roles produces a 400 with field-level detail.
- [ ] Calendar disconnect flips Daily Ops readiness gauge downward without page reload.
- [ ] Creating a proposal without `solicitation_file_id` returns 400.
- [ ] Attempting `POST /api/v1/govcon/proposals/{id}/sections/{key}/draft` before ExecSum approval returns 409 with reason code `exec_summary_required`.
- [ ] Autopublish POST rejected when `approval_required=true && approver_user_ids=[]`.
- [ ] Top-40 industry seed applies per workspace and is editable without mutating the global seed row.
- [ ] `GET /api/v1/explainability/actions/autopublish` returns structured reasons when blocked.
- [ ] Local `lint`, `typecheck`, and `test` targets all pass.

---

## Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-21 | Initial persistence of PRD, SQL/API spec, Claude + Codex build commands, and this notes file under `/docs/sourcedeck/`. Documented current live state (calendar, settings hub, command center, portal foundations, Stripe webhook scaffold) and enumerated phase-1 build targets. | SourceDeck team |
