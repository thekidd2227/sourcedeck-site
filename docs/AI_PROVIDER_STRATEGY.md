# SourceDeck AI Provider Strategy

This document is the authoritative source for **how SourceDeck routes AI
calls** — which provider serves which workflow, when bring-your-own-key
(BYOK) is allowed, and how subscription tiers gate the choice.

> **TL;DR.** IBM **watsonx.ai** is SourceDeck's default and official
> AI provider. Every governed / audit-sensitive workflow runs on
> watsonx, period. Other providers (OpenAI, Anthropic, Google, future
> custom) are available **only** for low-risk user-drafting workflows,
> only on tiers that allow BYOK, only via tenant-admin policy, and
> never for governed workloads.

---

## 1. Provider abstraction

All AI calls go through one entry point — the **SourceDeck AI Gateway**
(`server/src/services/ai/gateway.js`). The gateway:

1. Resolves the workflow category (`workflows.js`).
2. Looks up the tenant's tier policy (`tiers.js`).
3. Asks the policy engine which provider + credential mode to use
   (`policy.js`).
4. Builds the chosen provider lazily.
5. Records governance audit events at every decision point.
6. Falls back safely for drafting; fails loudly for governed in
   production.

```
SourceDeck AI Gateway
│
├── watsonx provider — default / core (governed-eligible)
├── openai  provider — optional, drafting-only
├── anthropic provider — optional, drafting-only
├── google  provider — optional, drafting-only
├── custom  provider — placeholder, not enabled by default
└── mock    provider — local development
```

Each provider implements the same interface:

```
providerId, displayName, modelId,
supportsWorkflow(category),
generateText / summarizeDocument / extractFields / classifyDocument /
generateActionChecklist  (via .invoke({ promptId, content, parameters })),
healthCheck(),
redactForLogging(input)
```

## 2. Workflow categories

`server/src/services/ai/workflows.js` defines four categories:

| Category                    | Examples                                                            | Allowed providers                |
|-----------------------------|---------------------------------------------------------------------|----------------------------------|
| `governed`                  | document analysis, summarization, field extraction, classification, scope-of-work, bid package, compliance review, action checklist, shared deliverable | **watsonx only** |
| `user_drafting`             | email draft, rewrite, marketing copy, social post, brainstorm, tone | watsonx + (per tier) openai / anthropic / google |
| `enterprise_configurable`   | reserved for future tenant-defined workflows                        | tenant-admin policy              |
| `government_restricted`     | applied implicitly when tenant tier is `government`                 | **watsonx only**                 |

Unknown workflows fall through to `governed` as a fail-safe.

## 3. Provider policy matrix

| Scenario                                  | Default provider | BYOK allowed? | Notes                              |
|-------------------------------------------|------------------|---------------|------------------------------------|
| Any tenant, governed workflow             | watsonx          | **No**        | Force-watsonx with audit event     |
| Government tenant, any workflow           | watsonx          | **No**        | Reject other providers + audit     |
| Starter / Pro tenant, drafting workflow   | watsonx          | **No**        | Tier doesn't allow BYOK            |
| Business tenant, drafting + admin enabled | watsonx          | Yes (admin)   | OpenAI / Anthropic eligible        |
| Enterprise tenant, drafting + admin       | watsonx          | Yes (admin)   | + Google eligible                  |
| Any tier, unknown workflow                | watsonx          | No            | Treated as governed                |

The watsonx default is hard-coded; tenant admins cannot override it for
governed work even with `enterpriseDefaultProvider`.

## 4. Subscription tiers

Defined in `server/src/services/ai/tiers.js`.

| Tier         | Default | BYOK allowed | BYOK on by default | Drafting providers eligible              | Audit | Governance exports | Admin AI settings | SSO ready | Satellite ready |
|--------------|---------|--------------|--------------------|------------------------------------------|-------|--------------------|-------------------|-----------|-----------------|
| starter      | watsonx | no           | no                 | watsonx                                  | no    | no                 | no                | no        | no              |
| pro          | watsonx | no           | no                 | watsonx                                  | yes   | no                 | no                | no        | no              |
| business     | watsonx | yes          | no                 | watsonx, openai, anthropic               | yes   | no                 | yes               | no        | no              |
| enterprise   | watsonx | yes          | no                 | watsonx, openai, anthropic, google       | yes   | yes                | yes               | yes       | yes             |
| government   | watsonx | **no**       | no                 | **watsonx only**                         | yes   | yes                | no                | yes       | yes             |

Usage caps (`requestsPerDay`, `maxInputChars`) are config; replace with
real metering before billing tie-in.

## 5. BYOK rules

> Operator runbook for the IBM Cloud Secrets Manager adapter:
> [`docs/BYOK_SECRETS_MANAGER.md`](./BYOK_SECRETS_MANAGER.md).


- BYOK **disabled by default**, even on tiers that permit it.
- BYOK only for `user_drafting` workflows.
- BYOK never for `governed` workflows or `government` tenants.
- Tenant admin enables and configures the allowlist; regular users
  cannot override.
- BYOK keys live in `byok.js`'s store interface. The default in-memory
  implementation is **dev-only**; the module refuses to start in
  production unless an external secrets store has been bound via
  `bindExternalStore()`. The intended production path is IBM Secrets
  Manager (or HashiCorp Vault / KMS-encrypted Postgres column).
- Keys are never returned to the frontend. Only masked references
  (`sk-…lue`) are exposed.
- Keys are never logged. The audit denylist explicitly redacts
  `apiKey`, `api_key`, `authorization`, `token`, `secret`, and provider
  env-var names.

### Credential-priority cascade

For a user-drafting request, the gateway tries credentials in this order:

1. user BYOK (if tier + tenant + key present)
2. tenant-managed key (if tenant configured one for the requested provider)
3. platform-managed watsonx (always available unless config blocks it)
4. otherwise → `provider_unavailable` error

For a governed request, only step 3 is ever attempted.

## 6. watsonx as the default core provider

- Set via `AI_PROVIDER=watsonx` and `AI_DEFAULT_PROVIDER=watsonx`.
- Adapter at `server/src/services/ai/watsonx.js`. IAM token cached
  in-memory until ~60s before expiry.
- Document content is sent in the request body but **never logged**.
- Audit captures `modelId`, `promptVersion`, token usage, and latency —
  not prompt or response body.
- In dev, missing watsonx config falls back to mock with a warning.
- In production, missing watsonx config **fails at config load** —
  `loadConfig()` throws so the process never starts in a broken state.

## 7. Optional provider stubs

`openai.js`, `anthropic.js`, `google.js`, `custom.js` are fetch-based
adapters — no SDK dependencies, no global enablement. They:

- declare `supportsWorkflow()` returning `true` only for `user_drafting`
  (the custom placeholder returns `false` until reviewed)
- throw cleanly when the API key is missing (gateway catches and falls
  back to watsonx)
- redact `input` before any logging via `redactForLogging`
- never log the API key or response body

## 8. Government tenant restriction

When `subscriptionTier === 'government'`, the policy engine short-circuits:

- Requested provider must be `watsonx` (or omitted).
- Any other request emits `GOVERNMENT_PROVIDER_RESTRICTED` and returns a
  structured `policy_rejected` error to the route layer.
- Cannot be overridden via tenant policy — the restriction is enforced
  in code (`policy.js`), not config.

## 9. Enterprise policy configuration

Enterprise tenants can:

- Tighten the allowed-drafting list (e.g. drop OpenAI for compliance)
- Pin a tenant-default drafting provider (with a tenant-managed key)
- Pre-approve specific providers for `enterprise_configurable` workflows

They cannot:

- Promote a non-watsonx provider for governed workflows
- Disable watsonx as the platform default
- Bypass governance / audit emission

## 10. Future custom provider notes

`custom.js` is wired to an OpenAI-compatible chat endpoint by default
**only as a placeholder**. Any real custom provider must:

1. Be approved through a security review.
2. Document data residency, retention, and training-on-data terms.
3. Be added to the policy allowlist explicitly per tier.
4. Update its `supportsWorkflow()` to declare which categories it can
   serve.
5. Pass governance review before being marked governed-eligible
   (default is **never**).

## 11. API surface

| Method | Path                                     | Role     | Purpose                                                   |
|--------|------------------------------------------|----------|-----------------------------------------------------------|
| POST   | `/api/v1/ai/resolve`                     | viewer   | Returns the policy decision without executing             |
| GET    | `/api/v1/ai/allowed?workflowType=...`    | viewer   | Lists providers permitted for the user / workflow / tier  |
| POST   | `/api/v1/ai/execute`                     | analyst  | Runs an AI workflow through the gateway                   |
| GET    | `/api/v1/ai/byok`                        | viewer   | Lists masked BYOK keys for the current user               |
| POST   | `/api/v1/ai/byok`                        | admin    | Registers a BYOK key (tier must allow)                    |
| DELETE | `/api/v1/ai/byok/:providerId`            | admin    | Revokes a BYOK key                                        |
| GET    | `/api/v1/ai/policy`                      | admin    | Reads tenant AI policy                                    |
| PUT    | `/api/v1/ai/policy`                      | admin    | Updates tenant AI policy                                  |
| GET    | `/api/v1/ai/health`                      | admin    | Per-provider health summary                               |

All routes run through `requireAuth() + requireRole(...) + resolveTenant()`.

## 12. Environment variables

See `.env.example` for the full set. Highlights:

```
AI_PROVIDER=watsonx
AI_DEFAULT_PROVIDER=watsonx
AI_ENABLE_BYOK=false
AI_ALLOWED_DRAFTING_PROVIDERS=watsonx,openai,anthropic,google

WATSONX_API_KEY=  WATSONX_URL=  WATSONX_PROJECT_ID=  WATSONX_SPACE_ID=  WATSONX_MODEL_ID=
OPENAI_API_KEY=   OPENAI_MODEL=
ANTHROPIC_API_KEY=  ANTHROPIC_MODEL=
GOOGLE_AI_API_KEY=  GOOGLE_AI_MODEL=
CUSTOM_AI_ENDPOINT=  CUSTOM_AI_API_KEY=  CUSTOM_AI_MODEL=
```

Setting an optional provider's API key alone does **not** enable it for
governed workflows or for any tenant — it only makes the platform-managed
credential mode available when policy permits.
