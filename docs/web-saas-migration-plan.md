# Web SaaS Migration Plan

## Target Architecture

- **Web frontend:** Next.js app under `apps/web`, deployed at `https://app.sourcedeck.app`.
- **Backend API:** existing `server/` API or Next.js API routes, selected per workflow as migration proceeds.
- **Database:** Postgres planned for tenants, workspaces, pipeline records, audit logs, and non-secret settings.
- **Auth:** Clerk, Auth.js, Supabase Auth, or Keycloak behind an auth abstraction. No provider is hardwired in Phase 1.
- **Tenant model:** every workspace-scoped record requires `workspace_id`; every user-scoped credential requires `user_id`.
- **Provider integrations:** provider calls run only in backend/service code.
- **Credential vault:** encrypted per-user/per-workspace storage. Frontend receives status only.
- **Audit logging:** credential status changes, provider calls, entitlement decisions, and bid/export actions.
- **PWA install:** manifest and installable shell, with minimal offline behavior.
- **Billing:** Stripe planned; no live billing in Phase 1.

## Migration Phases

### Phase 0: Audit and Docs

Document delivery decision, credential boundary, PWA plan, Electron deprecation, and commercial release checks.

### Phase 1: Web Scaffold

Create web scaffold, auth shell, workspace shell, dashboard shell, settings shell, and provider status shell.

### Phase 2: BYOK Credential Vault

Implement encrypted credential storage, provider presence status, `no_credential` behavior, revocation, and audit events.

### Phase 3: Core Workflows

Migrate:

- sourcing workflow
- opportunity tracking
- research notes
- follow-up status
- pipeline visibility
- AI draft support

### Phase 4: Billing and Tiers

Wire Stripe subscription states, tier entitlements, usage limits, and admin-visible billing status.

### Phase 5: Managed IBM Watson

Add Federal, Hyatt/highest-tier, and enterprise-managed entitlement checks for ARCG-managed IBM Watson.

### Phase 6: PWA Polish

Add install prompts, icon polish, version display, and carefully scoped offline affordances.

### Phase 7: Dedicated Tenant

Support isolated deployment, optional custom domain, customer-owned keys, and stricter logging/retention controls.

### Phase 8: Browser Extension

Consider only if web dashboard workflows need browser-page capture support.

## Electron Mapping

| Electron | Web SaaS Equivalent |
|---|---|
| `electron-store` | Postgres plus encrypted credential vault |
| `ipcMain` / preload IPC | Backend API routes/service layer |
| localStorage brand profile | Workspace settings |
| desktop release check | web commercial release check |
| GitHub releases | hosted deployment pipeline |
| auto-updater | web deploy/versioning |
| OS keychain | server-side secret manager/vault |
| single HTML renderer | Next.js route-based UI |

## Risks

- credential leakage
- tenant isolation bugs
- BYOK UX confusion
- IBM managed-tier entitlement mistakes
- migration of Electron-only features
- data portability gaps
- billing/entitlement drift
- PWA offline overpromising

## Non-Goals

- no App Store delivery for V1
- no desktop installer as primary commercial product
- no live provider calls in the scaffold
- no fake data
- no bundled secrets
