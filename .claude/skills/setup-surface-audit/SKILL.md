---
name: setup-surface-audit
description: Audit the self-setup surface (settings hub, calendar, integrations, agents, webhooks, onboarding, activate) against docs/sourcedeck/SELF_SETUP_ENGINEERING_PRD.md. Use after any edit to /settings/*, /onboarding/, /integrations/, or /assets/sd-*.js.
---

# Setup Surface Audit

The self-setup surface must stay aligned with the PRD at `docs/sourcedeck/SELF_SETUP_ENGINEERING_PRD.md`. This audit is a mechanical check — it does not evaluate prose, only structure, required fields, dependency gates, and explainability.

## Surfaces in scope

```
/settings/                       settings hub
/settings/calendar/              calendar connections
/integrations/                   connector marketplace
/agents/                         AI agents library
/webhooks/                       event bus docs
/onboarding/                     5-step workspace wizard
/activate/                       magic-link activation
assets/sd-config.js              commercial config + calendar OAuth swap points
assets/sd-calendar.js            provider-agnostic calendar helper
```

## Checks

### 1. Settings hub coverage
`/settings/index.html` must link to Calendar, Integrations, Agents, Webhooks, Command, Onboarding. Verify:
```
grep -oE 'href="/(settings/calendar|integrations|agents|webhooks|command|onboarding)/"' settings/index.html | sort -u
```
Expect 6 unique destinations.

### 2. Required-setup banner on Daily Ops
Search for the exact required-setup sentence wherever Daily Ops is surfaced:
```
grep -n "required for the system to successfully automate daily operations" settings/calendar/index.html app/demo/index.html
```
Must appear in every Daily Ops setup surface.

### 3. Calendar helper API surface
`assets/sd-calendar.js` must export `list`, `upsert`, `remove`, `fetchEvents`, `fetchAllEvents`, `googleConnect`, `microsoftConnect`, `randomId`, `parseICS` on `window.sdCalendar`:
```
grep -E "sdCalendar\s*=\s*\{" assets/sd-calendar.js
grep -E "(list|upsert|remove|fetchEvents|fetchAllEvents|googleConnect|microsoftConnect|randomId|parseICS)," assets/sd-calendar.js
```

### 4. OAuth null-safe
Google + Microsoft connect buttons must fall through gracefully when `client_id` is null, with a clear user-facing message that points to the ICS route. Confirm:
```
grep -nE "client_id" assets/sd-calendar.js
```
Every provider check must precede any redirect.

### 5. Integrations connector counts
`/integrations/` catalog should list at least 21 connector cards. Count them:
```
grep -c 'class="ig-card"' integrations/index.html
```

### 6. AI agents catalog
`/agents/` must catalog the 9 shipped agents with event-bus mappings. Each card must reference an `EVENT · …` tag:
```
grep -c 'class="ag-card"' agents/index.html
grep -c 'EVENT ·' agents/index.html
```

### 7. Webhook event catalog
`/webhooks/` must document at least 12 events. Verify:
```
grep -c 'class="evt"' webhooks/index.html
```

### 8. Onboarding steps
`/onboarding/` must render 5 panels. Verify:
```
grep -c 'class="panel' onboarding/index.html
```
Expect at least 5.

### 9. Activation round-trip
`/activate/` must read `?token=` + `?ws=`, write `sd_workspace_id` + `sd_activation_token` to `localStorage`, fire `workspace_activated` event, and auto-redirect to `/onboarding/`.
```
grep -E "sd_workspace_id|sd_activation_token|workspace_activated|/onboarding/" activate/index.html
```

### 10. Fresh-blank integrity
`app/demo/index.html` sanitization gate must still block the sensitive-key families and the known API hosts:
```
grep -E "BLOCKED_KEYS|BLOCK_HOSTS" app/demo/index.html
```

## Output

For each check: pass / fail + grep output.

For any PRD field that has no corresponding UI element (for example a Lead Generator form, which is not yet shipped), list it under **PRD gaps not yet surfaced**. This list is expected to be long — it drives the Phase 1 build order.

End with:
- surfaces aligned with PRD: count
- surfaces drifted from PRD: count with file:line for each
- PRD gaps not yet surfaced: count
