# SourceDeck — Security

This document covers the SourceDeck API backend (in `server/`) and the
public static site (everything else in this repo). The static site is
intentionally credential-free — all sensitive logic lives behind the API.

## Reporting a vulnerability

Email **security@arivergrop.com** with steps to reproduce. Please do
not file public GitHub issues for security reports. We respond within 1
business day for acknowledgement and 5 business days for triage.

---

## Threat model (summary)

| Attacker                          | What they want                              | Primary mitigation                         |
|-----------------------------------|---------------------------------------------|--------------------------------------------|
| Untrusted internet user           | Crash, exfiltrate, escalate                 | Auth + RBAC + rate limit + input validation|
| Authenticated tenant A            | Read tenant B's data                         | Server-side tenant assertion on every read |
| Compromised user account          | Bulk pull / mass action                      | Rate limit + audit + role minimization     |
| Insider w/ credentials            | Silent data exfiltration                     | Audit log w/ no document content + WORM    |
| Compromised dependency            | Supply-chain code execution                  | Pinned deps, `--omit=dev` runtime, Snyk    |
| Prompt-injection in a document    | Make AI exfiltrate prior context / secrets   | No secrets in prompts; output schema check |

## Auth / session

- The API expects `req.user` to be populated by an upstream auth layer.
- In production, set `AUTH_PROVIDER=ibm_iam` (IBM Cloud App ID, IAM, or
  IBM Verify) or `AUTH_PROVIDER=oidc` for a generic OIDC IdP.
- Sessions are JWT-bound (signed with `JWT_SECRET`); session cookies use
  `Secure; HttpOnly; SameSite=Lax`.
- The local-dev shim that reads `x-user-id` / `x-user-role` headers is
  **disabled in production** by config (no fallback when `APP_ENV=production`).

## Role model

`owner > admin > analyst > viewer` (numeric ranks 4..1).

- `owner`   — billing, RBAC, tenant settings
- `admin`   — workspace settings, integrations, approvals
- `analyst` — upload, process, view results, draft outbound
- `viewer`  — read-only

Server-side enforcement: every route uses `requireRole(...)`. Client-side
chrome (greying out a button) is convenience only; the server is the
boundary.

## Tenant isolation

- Every customer-data record carries `tenantId`.
- Every read passes through `assertSameTenant(req, resource)`.
- Cross-tenant attempts emit a `cross_tenant_attempt` risk flag and a
  `403 cross_tenant_blocked` response.
- Database queries must include `WHERE tenant_id = $1` — enforced via
  query helpers, not via reviewer discipline.

## Upload security

- Validated MIME against `ALLOWED_UPLOAD_TYPES`.
- Validated size against `MAX_UPLOAD_MB`.
- Rejects path-traversal patterns in `originalFilename`.
- Rejects MIME/extension mismatch.
- Storage keys are server-generated; the user-supplied filename is kept
  only as metadata.
- The container's root filesystem is read-only; uploads land in
  `/app/.data` (emptyDir / ephemeral), then ship to COS.

## Storage security

- Provider abstraction supports `local` (dev) and `ibm_cos` (prod).
- IBM COS credentials come from env / k8s Secret / Code Engine secret —
  never the image.
- Bucket policy: tenant-id isolation via key prefixes + IAM scope.
- Versioning + WORM bucket for regulated tenants (see GOVERNANCE.md).
- No object content is logged anywhere.

## AI prompt / data handling

- Prompts are versioned and stored only as templates with `{{content}}`
  placeholders.
- Document content is interpolated at call time and never logged, never
  cached, never stored alongside the prompt template.
- AI provider responses are stored as the parsed JSON output. The raw
  response body is not persisted.
- watsonx.ai calls go over TLS to a region pinned by `WATSONX_URL`.

## Governance / audit logging

See `docs/GOVERNANCE.md`. Every state-changing call emits a structured
JSON event to stdout, which the platform log router ships to an
append-only sink. Forbidden metadata keys are stripped before emit.

## Secrets handling

- Never commit secrets. `.env`, `.env.*`, `config.env`, and credential
  JSON files are gitignored.
- In production, secrets come from:
  - Code Engine: `ibmcloud ce secret`
  - OpenShift / k8s: sealed-secrets, External Secrets Operator backed
    by IBM Secrets Manager or HashiCorp Vault
- Logger redacts any object key matching `/secret|key|token|password/i`.

## IBM IAM assumptions

- Service IDs receive only the IAM roles required for the resource:
  - COS: `Writer` on the specific bucket; not `Manager` on the instance
  - watsonx.ai: minimum scope on the project / space
  - Postgres: a service-credential-issued role, not the master role
- Trusted profiles bind the API workload to its service ID via
  workload identity (no static IBM_CLOUD_API_KEY in production where
  trusted profiles are available).

## Rate limiting

Built-in per-IP token bucket (60 req/min default for the limited bucket).
Production should front the API with:

- IBM Cloud Internet Services (CIS) WAF + rate-limiting rules, or
- An API Gateway tier with quota policies

The in-process limiter is single-replica only — replace with Redis-backed
or edge-enforced limits when running multi-replica.

## Secure HTTP headers

Helmet defaults: HSTS, no-sniff, X-Frame-Options DENY (via
`frame-ancestors 'none'`), referrer policy `no-referrer`,
`x-powered-by` removed.

## PWA caching risks

The service worker (`sw.js`) is intentionally minimal:

- Only caches the static shell (HTML, CSS, fonts, icon assets).
- **Never** caches `/api/*` responses.
- **Never** caches authenticated content.
- **Never** caches uploaded documents or AI outputs.
- Versioned cache name; old caches purged on activate.

If PWA caching boundaries are ever broadened, add an ADR + governance
review before merging.

## Incident response

1. Acknowledge within 1 business day to security@arivergrop.com.
2. Triage: severity (S1 outage / data exposure → S4 cosmetic).
3. Containment: revoke compromised credentials, rotate secrets, block
   abused tokens at the edge.
4. Recovery: roll back via image-tag re-point (Code Engine) or
   `oc rollout undo` (OpenShift).
5. Postmortem: blameless write-up within 5 business days, filed in
   `docs/incidents/`.

## Enterprise hardening checklist

- [ ] `AUTH_PROVIDER=ibm_iam` (or hardened OIDC) in prod
- [ ] `STORAGE_PROVIDER=ibm_cos` with bucket-level IAM
- [ ] `AI_PROVIDER=watsonx` with project-scoped service ID
- [ ] `GOVERNANCE_ENABLED=true` with watsonx.governance project bound
- [ ] All secrets in Code Engine / k8s Secret — none in env files
- [ ] Trusted Profile bound to the workload — no long-lived IBM API key
- [ ] CIS / API Gateway WAF + rate limit in front of the app
- [ ] Log forwarding to LogDNA / Splunk / OpenSearch
- [ ] Audit bucket WORM-locked for regulated tenants
- [ ] Postgres PITR + encrypted-at-rest (BYOK if required)
- [ ] Tenant-id on every customer-data row + query helper enforcement
- [ ] Penetration test before any GA enterprise customer
