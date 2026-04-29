# BYOK setup — IBM Cloud Secrets Manager

This is the operator's runbook for enabling **bring-your-own-key (BYOK)**
in SourceDeck against **IBM Cloud Secrets Manager**. It complements the
strategy doc (`docs/AI_PROVIDER_STRATEGY.md`) and the security doc
(`SECURITY.md`).

---

## 1. What BYOK is used for in SourceDeck

BYOK lets a workspace use **its own** API key for an approved third-party
AI provider (currently OpenAI, Anthropic, Google) on **drafting**
workflows. It exists because some customers prefer to:

- keep AI usage on their own billing relationship with a provider,
- pin to a specific model version their internal review approved, or
- segregate provider data routing per business unit.

BYOK is **never** a substitute for SourceDeck's official AI provider.

## 2. BYOK is disabled by default

- `AI_ENABLE_BYOK=false` ships in `.env.example`.
- New tenants are created with `byokEnabled: false`.
- Even on tiers that allow BYOK, a tenant admin must explicitly enable
  it via `PUT /api/v1/ai/policy { "byokEnabled": true }`.

## 3. BYOK is only allowed for approved `user_drafting` workflows

Workflows currently in this category (full list in
`server/src/services/ai/workflows.js`):

- `email_draft`, `rewrite_text`, `marketing_copy`, `social_post`,
  `brainstorm`, `tone_adjust`

Anything outside this list is treated as governed.

## 4. BYOK is forbidden for governed workflows

Governed workflows always run on watsonx via the platform-managed
credential. The gateway enforces this in code (`policy.js`), not config:

- Document analysis, summarization, field extraction, classification,
  scope-of-work, bid package, compliance review, action checklist, and
  any "shared deliverable" workflow.
- Even if a BYOK key is registered for the tenant, the gateway emits
  `GOVERNED_WORKFLOW_ENFORCED` and routes the call to watsonx.
- Verified by `server/test/process-gateway.test.js`:
  *"BYOK never reaches /process even if user has key"*.

## 5. Government tenants are watsonx-only

`subscriptionTier === 'government'` short-circuits the policy engine:

- All providers other than watsonx are rejected with
  `GOVERNMENT_PROVIDER_RESTRICTED` (HTTP 403, `policy_rejected`).
- `tier.byokAllowed === false`; BYOK keys cannot be registered.
- Cannot be overridden via tenant policy.

## 6. How IBM Secrets Manager is used

The BYOK store is a pluggable interface (`server/src/services/ai/byok.js`).
Production binds an external implementation; dev runs against an
in-memory shim that refuses to start in production.

The IBM Cloud Secrets Manager adapter
(`server/src/services/ai/byokIbmSecretsManager.js`) stores each BYOK key
as an **arbitrary** secret, named:

```
sourcedeck/byok/<tenantId>/<userId>/<providerId>
```

with labels `tenant:<id>`, `user:<id>`, `provider:<id>` and a
`custom_metadata` block containing the same identifiers (used for
listing). The adapter:

- Exchanges `IBM_SECRETS_MANAGER_API_KEY` for an IAM bearer token at
  `iam.cloud.ibm.com/identity/token`. Token cached in process memory
  until ~60s before expiry.
- `PUT` upserts via `POST /api/v2/secrets`; on `409 conflict` it falls
  through to `POST /api/v2/secrets/:id/versions`.
- `GET` reads `payload` from `GET /api/v2/secrets/:id`.
- `DELETE` removes via `DELETE /api/v2/secrets/:id`; idempotent on 404.
- `LIST` filters by labels and returns `{ providerId, addedAt, masked: '****' }`
  records — never the payload.

Identifiers are validated against `/^[A-Za-z0-9_-]+$/` before being used
as URL components.

## 7. Required environment variables

| Var                              | Required                | Description                                                          |
|----------------------------------|-------------------------|----------------------------------------------------------------------|
| `IBM_SECRETS_MANAGER_URL`        | yes (to bind adapter)   | e.g. `https://<instance-id>.<region>.secrets-manager.appdomain.cloud`|
| `IBM_SECRETS_MANAGER_API_KEY`    | yes (to bind adapter)   | Service-ID API key with **Reader + Writer** on the secret group only |
| `IBM_SECRETS_MANAGER_INSTANCE_ID`| recommended             | Used in the URL above; useful when reconstructing region/instance    |

Optional:

- `IBM_SECRETS_MANAGER_GROUP_ID` — the Secrets Manager **group** to scope
  the SourceDeck secrets into. Defaults to `default`. Use a dedicated
  group so IAM policies can restrict access to just `sourcedeck/byok/*`.

These belong in your platform secret store (Code Engine `ce secret`,
OpenShift `Secret`, k8s External Secrets Operator) — not in a checked-in
`.env`. The `.env.example` lists them only as placeholders.

## 8. How keys are stored, retrieved, masked, and deleted

| Action                    | Surface                                           |
|---------------------------|---------------------------------------------------|
| Add a BYOK key            | `POST /api/v1/ai/byok` — admin role required, validates tier eligibility, validates min length, calls `addByokKey()` which masks then writes to the bound store. Returns the masked record only. |
| Read keys (UI)            | `GET /api/v1/ai/byok` — returns array of `{ providerId, addedAt, masked }`. Raw key never leaves the server. |
| Use a key (gateway)       | The gateway calls `fetchByokKey()` only when the policy engine has selected `credentialMode: 'user_byok'`. The fetched plaintext is held in a short-lived variable and passed straight to the provider adapter; it is never logged. |
| Remove a key              | `DELETE /api/v1/ai/byok/:providerId` — admin role required. Idempotent. |

Masking format: ``<first3>…<last3>``  (e.g. `sk-…lue`). Audit events
record only the masked form.

## 9. What is **never** logged

- Raw BYOK API keys
- IBM IAM bearer tokens
- Secrets Manager `payload` fields
- Provider request bodies that contain document text
- Provider response bodies that contain customer content

The audit module's denylist explicitly redacts: `apiKey`, `api_key`,
`apikey`, `authorization`, `token`, `secret`,
`WATSONX_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`GOOGLE_AI_API_KEY`, `CUSTOM_AI_API_KEY`. The logger module redacts
any object key matching `/secret|key|token|password/i`.

## 10. Production activation checklist

Run through this before flipping `AI_ENABLE_BYOK=true` in production:

- [ ] Provision an IBM Cloud Secrets Manager instance in the same region
      as the SourceDeck API.
- [ ] Create a dedicated **secret group**, e.g. `sourcedeck-byok`.
      Note its id for `IBM_SECRETS_MANAGER_GROUP_ID`.
- [ ] Create a service ID with IAM access to the Secrets Manager
      instance scoped to that group only:
      - role: **SecretsReader** + **SecretsWriter**
      - resource: `secret-group: <id>`
- [ ] Issue a service-ID API key for the service ID.
- [ ] Set `IBM_SECRETS_MANAGER_URL`, `IBM_SECRETS_MANAGER_API_KEY`,
      `IBM_SECRETS_MANAGER_INSTANCE_ID` (and `IBM_SECRETS_MANAGER_GROUP_ID`
      if non-default) via Code Engine `ce secret create` (or k8s Secret).
- [ ] In your bootstrap (e.g. a thin `boot.js` in front of `server.js`),
      call:
      ```js
      import { bindExternalStore } from './src/services/ai/byok.js';
      import { createIbmSecretsManagerByokStore } from './src/services/ai/byokIbmSecretsManager.js';
      bindExternalStore(createIbmSecretsManagerByokStore({
        url:    process.env.IBM_SECRETS_MANAGER_URL,
        apiKey: process.env.IBM_SECRETS_MANAGER_API_KEY,
        groupId: process.env.IBM_SECRETS_MANAGER_GROUP_ID
      }));
      ```
      *(This bootstrap shim is intentionally not in the repo yet — wiring
      it now would risk a process that boots in `production` without a
      bound store on a misconfigured deploy. Add the call alongside the
      ops env-var change.)*
- [ ] Smoke test from a non-production tenant:
      ```
      curl -X POST $API/api/v1/ai/byok \
        -H 'authorization: Bearer <admin-jwt>' \
        -H 'content-type: application/json' \
        -d '{"providerId":"openai","apiKey":"<test-key>"}'
      curl     $API/api/v1/ai/byok \
        -H 'authorization: Bearer <admin-jwt>'
      curl -X DELETE $API/api/v1/ai/byok/openai \
        -H 'authorization: Bearer <admin-jwt>'
      ```
- [ ] Flip `AI_ENABLE_BYOK=true` (per-tenant via `PUT /api/v1/ai/policy`,
      not global) for the tenants that asked for it.
- [ ] Confirm `BYOK_KEY_ADDED` / `BYOK_PROVIDER_USED` audit events
      reach your log sink with **no key material** in the payload.

## 11. Local / dev behavior

- `byok.js` defaults to an in-memory `Map`-backed store keyed by
  `tenant:user:provider`.
- The dev store **refuses to start the process** when
  `APP_ENV=production` and no external store is bound — guarded by
  `ensureProductionExternalStore()`.
- Dev contract is identical to production: same masking, same
  denylist, same `addByokKey/fetchByokKey/removeByokKey/listByokKeys` API.
- Tests use the dev store; they cover tier rejection, provider
  eligibility, masking, key length validation, and add/list/remove flow
  (`server/test/tiers-byok.test.js`).

## 12. Known limitations

- **No live integration test against a real Secrets Manager instance is
  in CI.** The adapter is unit-tested for argument validation and URL
  shaping but not for round-trip behavior — that needs a real instance
  + service-ID key. Add as `test:integration` gated by env-var presence.
- **Bootstrap call is not committed.** `bindExternalStore()` is
  intentionally not invoked from `server.js` yet — see step 10. This
  prevents a misconfigured deploy from silently falling through to the
  in-memory store.
- **No automatic key rotation.** Customers rotate BYOK keys via the
  `POST /api/v1/ai/byok` endpoint, which upserts a new version. We do
  not yet expose the version history or schedule rotation.
- **Listing is best-effort.** `list({ tenantId, userId })` filters by
  labels in Secrets Manager; if labels are stripped by ops policy, the
  list will be empty even when keys exist. The masked `GET` endpoint
  will still work for keys you know exist.

## 13. How to verify the adapter is bound at boot

Two ways:

1. **Log line.** When `bindExternalStore(store)` is called, the BYOK
   module logs:
   ```
   { "msg": "byok.external_store_bound", "name": "ibm_secrets_manager" }
   ```
   *(grep your log sink for this; absence ⇒ not bound)*.

2. **Health endpoint.** `GET /api/v1/ai/health` returns per-provider
   status. Until a separate boot-state field is added (planned), the
   simplest verification in production is the log line above plus a
   live `POST /api/v1/ai/byok` round-trip from a non-production tenant.

If you boot with `APP_ENV=production` and the in-memory store, the
process will **throw at first BYOK call** with:
```
byok: in-memory store is dev-only. Bind an external secrets store before production.
```
This is by design — fail loudly rather than silently store secrets in
a non-durable, single-replica `Map`.

---

## See also

- `docs/AI_PROVIDER_STRATEGY.md` — full provider strategy + matrix
- `SECURITY.md` — threat model + hardening checklist
- `docs/GOVERNANCE.md` — audit event shape
- `server/src/services/ai/byok.js` — BYOK service implementation
- `server/src/services/ai/byokIbmSecretsManager.js` — Secrets Manager adapter
