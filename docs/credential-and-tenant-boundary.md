# Credential And Tenant Boundary

## Credential Ownership

- **Personal/private Charlie instance:** may use local private `.env` credentials. This is not a commercial release mode.
- **Commercial BYOK users:** provide their own provider credentials through SourceDeck settings or tenant-managed secret storage.
- **Federal/Hyatt/Enterprise managed users:** may receive ARCG-managed IBM Watson only when entitlement explicitly allows it.

## Deployment Modes

`SOURCEDECK_DEPLOYMENT_MODE`:

- `personal`
- `commercial`
- `federal_managed`
- `hyatt_managed`
- `enterprise_managed`

Default: `commercial`.

## Default Behavior

Commercial mode ships blank. Missing credentials return `no_credential` plus a setup prompt. There is no hidden fallback to Charlie or ARCG keys.

## Provider Behavior

| Provider | Status UI | Raw key returned | Missing key | Revocation |
|---|---|---:|---|---|
| OpenAI | configured true/false, optional last4 | Never | `no_credential` | delete vault record and audit |
| Anthropic / Claude | configured true/false, optional last4 | Never | `no_credential` | delete vault record and audit |
| IBM Watson | configured true/false or managed enabled | Never | `no_credential` unless entitled managed | delete BYOK vault record or revoke entitlement |
| Airtable | configured true/false, optional last4 | Never | `no_credential` | delete vault record and audit |
| Apollo / Hunter / SerpAPI | configured true/false, optional last4 | Never | `no_credential` | delete vault record and audit |
| Buffer | configured true/false, optional last4 | Never | `no_credential` | delete vault record and audit |

API failures return normalized provider errors without echoing request headers, bearer tokens, or raw provider response bodies that may contain secrets.

## IBM Watson Entitlement Gate

Managed IBM Watson is allowed only when:

- deployment mode is `federal_managed`, `hyatt_managed`, or `enterprise_managed`
- user tier is `federal`, `hyatt_highest`, or `enterprise_managed`
- organization entitlement `ibm_watson_managed` is true

Otherwise IBM Watson is BYOK only.

## Tenant Isolation

- `workspace_id` is required on all tenant-scoped records.
- `user_id` is required on all user-scoped credentials.
- Cross-workspace reads are denied.
- Commercial users do not share global credentials.
- Credential status changes produce audit events.

## Frontend Safety

Frontend may see:

- provider configured true/false
- optional last4
- provider label
- setup required message

Frontend must not see:

- full key
- `Authorization` header
- bearer token
- `x-api-key`
- raw env value

## Release Checks

Commercial release fails if:

- `.env` is included
- a real-looking key appears
- deployment mode defaults to `personal`
- commercial provider key is non-empty
- ARCG-managed IBM is enabled without entitlement
- seeded Charlie/private operating data exists
