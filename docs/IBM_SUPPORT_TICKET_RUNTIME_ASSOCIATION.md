# IBM Support Ticket — runtime association draft

Paste the content below into `https://cloud.ibm.com/unifiedsupport/cases/add`
when filing the ticket. Pick **Watson Machine Learning** / **watsonx.ai
Runtime** as the affected service. Severity: 3 (no production impact yet,
but blocks platform onboarding).

---

## Title

Unable to associate existing cpdaas-tagged watsonx.ai Runtime with wx-context SourceDeck project

## Body

We have an IBM watsonx project named **SourceDeck** with project id
`6b51cbcb-3dd7-4316-9bec-6a555c8f19cd` under account
`3197096 - ARCG` in **Dallas (us-south)**.

Existing Lite watsonx.ai Runtime instances appear to be `cpdaas`-tagged:

- watsonx.ai Runtime-wk
- watsonx.ai Runtime-wc
- watsonx.ai Runtime-of
- WatsonMachineLearning

When opening the project services page with `?context=cpdaas`, IBM
redirects the URL to `?context=wx`. Under wx context, the
**Associate Service** picker shows no available runtimes (filter is
correct: Default resource group + Dallas + Global). App-side calls
return HTTP 403 with `no_associated_service_instance_error` because the
project has no associated runtime.

## Diagnostic evidence

```
HTTP 403
{"errors":[{"code":"no_associated_service_instance_error",
            "message":"project_id 6b51cbcb-3dd7-4316-9bec-6a555c8f19cd is not associated with a WML instance",
            "more_info":"https://cloud.ibm.com/apidocs/watsonx-ai#text-generation"}],
 "trace":"1413b61981839b7112f55615f6c64513","status_code":403}
```

The IAM token exchange against `iam.cloud.ibm.com/identity/token`
succeeds (200). The 403 is from `/ml/v1/text/generation`. So the
account + API key are valid; only the project↔runtime association is
missing.

## Request

Please advise whether IBM can:

1. **Migrate or retag one existing Lite watsonx.ai Runtime** —
   preference: **`watsonx.ai Runtime-wk`** — from `cpdaas` to `wx`
   context so it can be associated with the SourceDeck project; **or**
2. **Detach** the runtime from whatever existing project may be
   silently holding it, so we can re-associate it with SourceDeck
   ourselves.

## What we'd like to avoid

- Deleting any existing runtime (breaks the per-RG Lite limit and could
  impact unrelated workloads).
- Upgrading to a paid plan as a workaround — we are pre-revenue and the
  Lite plan is sufficient for current usage.
- Creating a second SourceDeck project in cpdaas context (would
  fragment our setup).

## Account / contact

- **Account:** 3197096 - ARCG
- **Region:** Dallas (us-south)
- **Project id:** `6b51cbcb-3dd7-4316-9bec-6a555c8f19cd`
- **Project name:** SourceDeck
- **Trace id from the latest 403:** `1413b61981839b7112f55615f6c64513`

Reply to: sales@arivergrop.com.

---

**Do not include any API keys, IAM tokens, or HMAC secrets in the
ticket.** The trace id above is sufficient for IBM to correlate.
