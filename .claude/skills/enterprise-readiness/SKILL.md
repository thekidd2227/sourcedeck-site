---
name: enterprise-readiness
description: Assess SourceDeck against the enterprise-gate criteria — multi-tenant boundaries, secrets handling, auditability, plan-cap enforcement, connector OAuth hygiene, data export, and DPA-ready artifacts. Use before quoting an Operator or Enterprise deal.
---

# Enterprise Readiness

Enterprise buyers disqualify platforms that ship with any of the following visible in the codebase. Audit produces a ruthless ready / not-ready verdict per dimension.

## Dimensions

### 1. Tenancy isolation
Every user-scoped state must key by a workspace identifier, never by a hardcoded operator identity.
```
grep -rnE "localStorage\.(getItem|setItem)" --include="*.html" --include="*.js" . | grep -v 'app/demo\|app/downloads\|sanitization gate'
```
Every hit must read/write a key under one of the documented namespaces (`sd_workspace`, `sd_workspace_id`, `sd_events`, `sd_calendars`, `sd_activation_token`, or `lcc_*` legacy). Flag any key that does not match.

### 2. Secrets hygiene
The following must **never** appear in this repo:
```
grep -rnE "sk_live_|whsec_|patOV9|AIRTABLE_TOKEN=[A-Za-z0-9]|INSTANTLY_API_KEY=[A-Za-z0-9]{10}" .
```
Expected: 0 hits. Publishable keys (`pk_live_…`) and Basin endpoint hash are the only live credentials permitted in-repo, and only inside `assets/sd-config.js`.

### 3. Auditability
Every Stripe webhook event and every server-side state change must be persisted. Confirm `_workers/stripe-webhook.js` writes to `EVENTS_KV` with 30-day retention and records `audit_log` events. If the Worker is not deployed, this dimension is **not ready**.

### 4. Plan-cap enforcement
Plan caps must be server-enforced, not only UI-hinted. Today this repo has no server, so plan caps are UI-only. For enterprise sign-off, this must be moved to the Worker or a real backend. State this honestly.

### 5. Connector OAuth hygiene
For each OAuth provider referenced in `/integrations/` and `/settings/calendar/`:
- tokens never render in DOM after save
- refresh tokens never live in `localStorage` for paying Operator / Enterprise customers (client-side implicit flow is acceptable for Core / Pro preview only)
- disconnect invalidates queued downstream work

Current state: Google + Microsoft calendar OAuth uses implicit / PKCE client-only tokens. For Enterprise, flip `CALENDAR.microsoft.worker_exchange_url` to a deployed exchange Worker so refresh tokens live server-side.

### 6. Data export
Every workspace must be able to export its own data. Document the export route (pending). Enterprise RFPs fail without this.

### 7. DPA-ready artifacts
- MSA + SOW + DPA references in the Operator proposal flow: confirm `/quote/operator/` form captures `procurement requirements` field.
- Security review + SOC 2 questionnaire intake: confirm `/sales/` Basin form routes with `_form_source=sales` so procurement tickets are tagged.

### 8. Fresh-blank guarantee
Confirm the demo sanitization gate in `app/demo/index.html` still intercepts real API egress:
```
grep -c "SOURCEDECK DEMO SANITIZATION GATE" app/demo/index.html app/downloads/sourcedeck-lcc.html
```
Both files must return 1.

### 9. Reset / workspace purge
Document the exact reset behavior — which `localStorage` keys are cleared on `sd_workspace` removal. Enterprise buyers ask this in Q1 of due diligence.

## Output

For each dimension: **ready** / **partial** / **not ready** with a one-line reason and the exact file path.

Close with:
- **Enterprise-ready for sign-off today:** yes / no
- **Operator-tier ready with caveats:** yes / no
- **Top 3 gaps blocking Enterprise** (ordered by dollar impact on the close)
