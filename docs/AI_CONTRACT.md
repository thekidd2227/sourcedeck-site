# SourceDeck AI Contract — Electron ↔ Web alignment

This is the **single source of truth** for the AI provider, workflow,
audit, and policy vocabulary used across SourceDeck. Both the Electron
desktop client (`sourcedeck-app`) and the web backend (`sourcedeck-site/server/`)
must conform to this contract so the two surfaces never drift.

If you change a constant here, update both repositories in the same PR
or open a contract-only PR first and let both sides catch up.

The web/backend implementation in `server/src/services/ai/` is the
**authoritative reference**. The Electron service layer
(`services/ai/*` in `sourcedeck-app`) mirrors this contract.

A machine-readable schema lives at `docs/schemas/ai-contract.schema.json`
for any future validators (CI checks, API client generation, etc.).

---

## 1. Provider IDs

```
watsonx     ← default / core / governed-eligible
openai      ← optional, drafting-only
anthropic   ← optional, drafting-only
google      ← optional, drafting-only
custom      ← future placeholder; never governed-eligible by default
mock        ← local development only ("local" alias accepted)
```

Source of truth: `server/src/services/ai/types.js` (`PROVIDER_IDS`).

## 2. Workflow categories

```
governed                ← document analysis, summarization, extraction,
                          classification, scope-of-work, bid package,
                          compliance review, action checklist, shared
                          deliverable. Watsonx-only.
user_drafting           ← email draft, rewrite, marketing copy, social
                          post, brainstorm, tone-adjust. BYOK-eligible
                          on tiers that allow it.
enterprise_configurable ← reserved for tenant-defined workflows. Tenant
                          admin policy decides; governed sub-actions
                          remain locked.
government_restricted   ← applied implicitly when tenant tier is
                          "government". Watsonx-only.
```

Source of truth: `server/src/services/ai/workflows.js` + `types.js`
(`WORKFLOW_CATEGORIES`).

**Unknown workflow → governed.** This is a fail-safe. A workflow id the
gateway does not recognize is treated as governed, forced to watsonx,
and audited with `policyReason: "unknown_workflow_default_governed"`.

## 3. Provider credential modes

```
platform_managed   ← SourceDeck-owned credentials (default for governed).
tenant_managed     ← Tenant-supplied credentials, admin-controlled.
                     Real key material lives in the secret store; the
                     tenant policy table only stores presence flags.
user_byok          ← User-supplied credentials. Disabled by default.
                     Allowed only on Business / Enterprise tiers, and
                     only for `user_drafting` workflows.
mock               ← Local dev mode only.
```

Source of truth: `server/src/services/ai/types.js` (`CREDENTIAL_MODES`).

## 4. Subscription tiers

```
starter      ← watsonx default, no BYOK, basic limits
pro          ← watsonx default, no BYOK, audit logs
business     ← watsonx default, BYOK allowed (admin), team roles
enterprise   ← watsonx default, BYOK allowed (admin), governance
                exports, SSO ready, Satellite ready
government   ← watsonx ONLY, no BYOK ever, governance ready,
                Satellite ready
```

Source of truth: `server/src/services/ai/tiers.js` (`TIER_POLICY`).

## 5. Standard AI request shape

```ts
type AiRequest = {
  // Identity
  tenantId:           string;     // a.k.a. workspaceId
  userId:             string;
  role?:              'owner' | 'admin' | 'analyst' | 'viewer';

  // What to run
  workflowType:       string;     // see workflows.js
  taskType:           'summarize' | 'extract' | 'classify' | 'checklist' | 'generate';
  promptId:           string;     // versioned id, e.g. "document_summary_v1"
  promptVersion?:     number;

  // Provider selection (caller intent — final decision is policy-driven)
  requestedProvider?: ProviderId;
  selectedProvider?:  ProviderId; // populated by gateway after policy
  modelId?:           string;     // optional pin
  credentialMode?:    CredentialMode;

  // Payload
  input:              string;     // text or document ref
  metadata?:          Record<string, unknown>;  // non-sensitive only

  // Tracing
  requestId:          string;     // a.k.a. correlationId
  subscriptionTier?:  SubscriptionTier;
}
```

## 6. Standard AI response shape

```ts
type AiResponse = {
  providerId:    ProviderId;
  modelId:       string;
  promptId:      string;
  promptVersion: number;
  output:        unknown;          // parsed JSON when possible, else { raw: string }
  usage?:        {
    inputTokens?:  number | null;
    outputTokens?: number | null;
    inputChars?:   number | null;
    outputChars?:  number | null;
  };
  latencyMs:     number;
  status:        'ok' | 'error';
  error?:        string;
  requestId:     string;
  createdAt:     string;           // ISO-8601 UTC
  policy?: {
    decision:           'allowed' | 'forced_watsonx' | 'rejected' | 'fallback';
    reason:             string;
    credentialMode:     CredentialMode;
    requestedProvider?: ProviderId;
  };
}
```

## 7. Audit event vocabulary

Both repos must emit these event types with this spelling:

```
AI_PROVIDER_SELECTED
AI_PROVIDER_REJECTED_BY_POLICY
AI_PROVIDER_FALLBACK_USED
AI_REQUEST_CREATED
AI_RESPONSE_RECEIVED
AI_REQUEST_FAILED
BYOK_KEY_ADDED
BYOK_KEY_REMOVED
BYOK_PROVIDER_USED
GOVERNED_WORKFLOW_ENFORCED
GOVERNMENT_PROVIDER_RESTRICTED
TENANT_AI_POLICY_UPDATED
```

Source of truth: `server/src/services/audit.js` (`EVENT_TYPES`).

Each event carries — at minimum — `eventId`, `eventType`, `tenantId`,
`userId`, `correlationId`, `timestamp`, `status`, and a `metadata`
object that has been run through the audit denylist (no raw secrets,
no document content, no AI prompt body).

## 8. Non-negotiable policy rules

These rules are enforced in code on the web/backend side
(`server/src/services/ai/policy.js`) and **must** also be enforced
client-side in the Electron app:

1. **watsonx is the default and core provider.** Tenant admins cannot
   change the platform default. They can pick a different *drafting*
   default for `user_drafting` workflows when their tier allows.
2. **Governed workflows always run on watsonx.** Even with a tenant key,
   even with a user BYOK key, even with `requestedProvider` set —
   policy emits `GOVERNED_WORKFLOW_ENFORCED` and routes the call to
   watsonx.
3. **Government tenants are watsonx-only.** Any non-watsonx provider
   request is rejected with `GOVERNMENT_PROVIDER_RESTRICTED` and HTTP
   `403 policy_rejected`. Cannot be overridden.
4. **BYOK is disabled by default.** Tenant admins must explicitly enable
   it. Tier must allow it. Provider must be in
   `{openai, anthropic, google}` — never `watsonx`, never `custom`.
5. **BYOK is only for `user_drafting` workflows.** Never governed.
6. **No raw secrets in logs.** The audit denylist explicitly redacts
   `apiKey`, `api_key`, `apikey`, `authorization`, `token`, `secret`,
   and provider env-var names. The structured logger redacts any object
   key matching `/secret|key|token|password/i`.
7. **No raw document content in audit logs.** Forbidden metadata keys
   include `document`, `documentContent`, `fileContent`, `fileBody`,
   `body`, `prompt`, `promptText`, `aiPrompt`, `rawText`. Strings
   longer than 2 KB are truncated to `[TRUNCATED]`.

## 9. Mapping table — backend ↔ Electron

| Concept               | Backend (sourcedeck-site/server/) | Electron (sourcedeck-app/services/) |
|-----------------------|-------------------------------------|-------------------------------------|
| Provider abstraction  | `src/services/ai/gateway.js`        | `services/ai/provider-factory.js`   |
| Watsonx adapter       | `src/services/ai/watsonx.js`        | `services/ai/providers/watsonx.js`  |
| Policy engine         | `src/services/ai/policy.js`         | `services/ai/policy.js` *(should mirror)* |
| Storage abstraction   | `src/services/storage/index.js`     | `services/storage/storage-factory.js`|
| Audit log             | `src/services/audit.js`             | `services/audit/audit-log.js`       |
| Tenant/role context   | `src/middleware/{auth,tenant}.js`   | `services/context/context.js`       |
| Upload validation     | `src/middleware/uploadValidation.js`| `services/security/upload-validation.js`|
| Tier policy           | `src/services/ai/tiers.js`          | *(should mirror)*                   |
| BYOK store interface  | `src/services/ai/byok.js`           | *(safeStorage IPC + electron-store)*|

**Why two implementations?** They serve different runtimes — the web
backend handles multi-tenant SaaS traffic; the Electron app handles
local single-user / power-user workflows with optional cloud sync. The
*contract* is shared; the implementations are not.

**Critical alignment points:**
- Provider IDs must match exactly (case-sensitive).
- Workflow category enums must match exactly.
- Audit event type names must match exactly.
- Policy rules in §8 must be enforced on both sides.
- Credential-mode names must match exactly.

## 10. Future custom provider notes

The `custom` provider is wired as a placeholder
(`server/src/services/ai/custom.js`) targeting an OpenAI-compatible
chat-completions endpoint. Activating a real custom provider requires:

1. Security review.
2. Documented data-residency, retention, and training-on-data terms.
3. Explicit allowlist entry per tier in `tiers.js`.
4. `supportsWorkflow()` updated to declare which categories it can serve.
5. Governance review before being marked governed-eligible (default: never).

The Electron app should NOT enable `custom` automatically; it must
require the same explicit allowlist + review.

## 11. Versioning this contract

This contract is at version `1.0.0`. Bump rules:

- **Patch** (1.0.x): editorial / clarification only. No code change required.
- **Minor** (1.x.0): additive — new event type, new tier, new credential mode, etc. Backward compatible.
- **Major** (x.0.0): breaking — renamed enum, removed event type, changed shape. Both repos must bump in lockstep with a coordinated release.

Current contract files:
- `docs/AI_CONTRACT.md` (this file)
- `docs/schemas/ai-contract.schema.json` (machine-readable)

Tests that prove the backend matches the contract live at
`server/test/contract.test.js`.
