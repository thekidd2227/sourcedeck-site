# Governance & audit

SourceDeck records every state-changing action in an append-only audit
stream. The shape is governance-export-ready: it can be ingested by IBM
watsonx.governance, a customer SIEM, or a regulated-records archive
without transformation.

## Event shape

Each audit event is a single JSON object:

```json
{
  "eventId":       "evt_<hex>",
  "eventType":     "FILE_UPLOADED",
  "tenantId":      "t_<id>",
  "userId":        "u_<id>",
  "resourceType":  "file",
  "resourceId":    "file_<id>",
  "correlationId": "<request-id>",
  "ip":            "1.2.3.4",
  "userAgent":     "Mozilla/...",
  "status":        "ok",
  "riskFlags":     ["pii_present"],
  "metadata":      { "...": "non-sensitive context only" },
  "timestamp":     "2026-04-29T11:00:00.000Z",
  "governance": {
    "schemaVersion": "1",
    "modelId":       "ibm/granite-13b-chat-v2",
    "promptVersion": 1
  }
}
```

## Event types

| Type                          | Emitted when                                                       |
|-------------------------------|--------------------------------------------------------------------|
| `USER_LOGIN`                  | Successful authentication                                          |
| `FILE_UPLOADED`               | A file passes validation and is stored                             |
| `FILE_PROCESSING_STARTED`     | An AI run is queued for a stored file                              |
| `WATSONX_REQUEST_CREATED`     | The AI provider is about to be called                              |
| `WATSONX_RESPONSE_RECEIVED`   | The AI provider returned (ok or error)                             |
| `FILE_PROCESSING_COMPLETED`   | Result persisted                                                   |
| `FILE_PROCESSING_FAILED`      | Run failed (network, parse, denied)                                |
| `RESULT_VIEWED`               | A user fetches a result                                            |
| `ADMIN_ROLE_CHANGED`          | Role grant/revoke in admin UI                                      |
| `CONFIG_CHANGED`              | Server-side config / policy mutation                               |
| `AI_PROVIDER_SELECTED`           | Gateway resolved a provider for a request                       |
| `AI_PROVIDER_REJECTED_BY_POLICY` | A request was denied by the policy engine                       |
| `AI_PROVIDER_FALLBACK_USED`      | Selected provider unavailable → watsonx fallback                |
| `AI_REQUEST_CREATED`             | Gateway is about to call the provider                           |
| `AI_RESPONSE_RECEIVED`           | Provider returned a response                                    |
| `AI_REQUEST_FAILED`              | Provider call failed                                            |
| `BYOK_KEY_ADDED`                 | Tenant admin added a BYOK key (masked-only)                     |
| `BYOK_KEY_REMOVED`               | Tenant admin removed a BYOK key                                 |
| `BYOK_PROVIDER_USED`             | A request executed against a user-BYOK provider                 |
| `GOVERNED_WORKFLOW_ENFORCED`     | Non-watsonx requested for a governed workflow → forced watsonx  |
| `GOVERNMENT_PROVIDER_RESTRICTED` | Government tenant attempted a non-watsonx provider              |
| `TENANT_AI_POLICY_UPDATED`       | Tenant admin changed AI policy via /api/v1/ai/policy            |

## How AI policy decisions are audited

Every AI request triggers at least three audit events, all sharing the
same `correlationId` so a chain is reconstructable end-to-end:

1. `AI_PROVIDER_SELECTED` — emitted before execution. Carries
   `requestedProvider`, `selectedProvider`, `credentialMode`,
   `policyDecision`, `policyReason`, and `subscriptionTier`.
2. `AI_REQUEST_CREATED` — gateway is about to invoke the chosen provider.
3. `AI_RESPONSE_RECEIVED` (or `AI_REQUEST_FAILED`) — provider returned.
   Carries `modelId`, `promptVersion`, `latencyMs`, and `usage` (token
   counts only). Never carries prompt or response body.

Additional events surface policy decisions explicitly:

- `GOVERNED_WORKFLOW_ENFORCED` — a non-watsonx provider was requested
  for a governed workflow and was forced to watsonx.
- `GOVERNMENT_PROVIDER_RESTRICTED` — a government-tenant request asked
  for a non-watsonx provider and was rejected.
- `AI_PROVIDER_FALLBACK_USED` — selected drafting provider couldn't be
  reached (missing key, etc.); fell back to watsonx.
- `BYOK_PROVIDER_USED` — request executed against a user's BYOK key.

This lets compliance reconstruct, for any AI output: who requested
what, what policy decided, which provider actually ran it, what model
served it, what version of the prompt was used, and how many tokens
were consumed — all without ever storing the actual prompt or output.

## Sensitive-data minimization

Events **never** include:

- raw uploaded document bytes
- extracted document text
- full AI prompts containing document content
- AI output bodies (only metadata: model, version, tokens, latency)
- secrets, credentials, or session tokens

The audit service strips a denylist of forbidden metadata keys
(`document`, `prompt`, `aiPrompt`, `rawText`, etc.) before emit. Strings
longer than 2 KB are truncated to `[TRUNCATED]`.

## Model metadata capture

Every AI run captures, at minimum:

- `modelId`            — e.g. `ibm/granite-13b-chat-v2`
- `promptVersion`      — integer, monotonically increased per registry
- `usage.inputTokens`  — when provider returns it
- `usage.outputTokens`
- `latencyMs`
- `provider`           — `watsonx` or `mock`

Prompts are versioned in `server/src/services/ai/prompts.js`. Bumping a
prompt creates a new entry; old entries stay so historical events are
reproducible.

## watsonx.governance readiness

Set `GOVERNANCE_ENABLED=true` and provide:

- `GOVERNANCE_PROJECT_ID`
- `GOVERNANCE_POLICY_SET_ID`

The audit stream is shaped to map directly into watsonx.governance
factsheets:

| Audit field                  | Governance field        |
|------------------------------|-------------------------|
| `governance.modelId`         | model id                |
| `governance.promptVersion`   | prompt template version |
| `eventType`                  | lifecycle stage         |
| `metadata.usage`             | runtime metrics         |
| `riskFlags`                  | risk indicators         |
| `correlationId`              | trace id                |

A separate exporter job (out of scope for this commit) reads the audit
stream and posts factsheets to watsonx.governance via its REST API.

## Risk flags

`riskFlags` is an array of short tokens. Suggested vocabulary:

- `pii_present`         — extractor flagged PII in the document
- `phi_present`         — health information detected
- `low_confidence`      — classifier confidence below threshold
- `auto_approved`       — workflow auto-approved without human review
- `cross_tenant_attempt`— blocked attempt to access another tenant
- `prompt_injection`    — suspicious instructions in document content

## Human review hooks

Approval gates live in the workflow layer (`/app/approvals/` UI +
`/api/v1/approvals/*` endpoints documented in
`docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md`). Every gate emits an
audit event when:

- the gate is created (`FILE_PROCESSING_STARTED` with `status:pending`)
- the gate is decided (`approval.decided` — to be added in the workflow
  service when wired)

## Explainability hooks

Each AI result includes:

- the prompt id + version that produced it
- the model id
- the token usage
- (planned) attribution: which fields in the output came from which
  span of the source document

The explainability span data is the eventual integration point with
watsonx.governance's drift / fairness monitors.

## Approval workflow hooks

Per spec, approvals support: proposals, deliverables, invoices, posts,
and playbook steps. Each approved or rejected item emits an audit event
referencing the original processing record's `correlationId` so a full
chain (upload → process → result → approval → action) is reconstructable.

## Audit export strategy

1. Stream stdout JSON via the platform log router (Code Engine →
   IBM Log Analysis; OpenShift → LogDNA agent / Fluent Bit).
2. Daily batch from the log store into a write-once COS bucket with
   bucket-level retention + WORM lock for regulated tenants.
3. (Optional) On-write fan-out to the customer SIEM via syslog-forward.

## What is not logged

- Document contents
- Full AI prompts containing document contents
- AI output bodies
- User passwords / tokens
- Database connection strings
- OAuth client secrets

If a future change risks adding any of these, the PR must include a
governance review and an explicit ADR.
