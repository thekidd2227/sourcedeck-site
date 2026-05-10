# IBM watsonx Status — internal honesty note

This is the internal source of truth for what we can and cannot say
about IBM watsonx integration on SourceDeck public surfaces. Use this
doc to push back on any copy that overclaims.

## Current verified state

- **Code-side adapters:** present in both `sourcedeck-site/server/src/services/ai/`
  and `sourcedeck-app/services/ai/providers/watsonx.js`. Lint clean,
  tests green (mocked fetch).
- **Live IBM runtime association:** **NOT verified.**
- **Live watsonx smoke test:** **NOT verified.**

## What blocks live verification

1. Existing watsonx.ai Runtime instances under IBM account `3197096 - ARCG`
   are tagged `cpdaas` (the legacy Cloud Pak for Data context).
2. The SourceDeck project (project id `6b51cbcb-3dd7-4316-9bec-6a555c8f19cd`)
   is tagged `wx` (the new watsonx context). IBM forcibly rewrites
   `?context=cpdaas` URLs to `?context=wx` for this project.
3. The Associate-Service picker scopes by the project's active context.
   Under wx context the picker is empty because all four runtimes are
   `cpdaas`-tagged. Under cpdaas context the URL gets rewritten to wx,
   so the picker is empty there too.
4. App-side calls return HTTP 403 `no_associated_service_instance_error`
   because the project has no associated runtime.

## What we cannot say publicly

Until live runtime association + a successful smoke test:

| Forbidden phrasing | Why |
|---|---|
| "Production IBM watsonx ready" | Not verified end-to-end |
| "Powered by IBM watsonx" | Implies live integration |
| "IBM governance built in" | watsonx.governance is not wired |
| "Enterprise AI compliance guaranteed" | No certification |
| "SOC 2 ready" / "FedRAMP ready" / "HIPAA compliant" | Not certified |
| "Zero data retention" | Not implemented as a guarantee |
| "End-to-end encrypted" | Specific technical claim we don't meet today |
| "Fully governed by watsonx" | Live runtime not associated |

## What we can say publicly

| Acceptable phrasing | When |
|---|---|
| "AI-assisted workflows" | Always — covers mock + future live |
| "AI features available where configured" | Honest fallback wording |
| "watsonx configuration pending" | Direct + honest |
| "AI support planned" | Roadmap-only contexts |
| "Enterprise AI integrations available after implementation review" | For procurement |

## Path forward (no public claims until done)

1. Open IBM support ticket — see `docs/IBM_SUPPORT_TICKET_RUNTIME_ASSOCIATION.md`.
2. Ask IBM to migrate one existing Lite runtime (preference: `Runtime-wk`)
   from `cpdaas` to `wx` context, OR detach it from any prior project so
   it can be re-associated.
3. Associate the migrated runtime with the SourceDeck project under
   `?context=wx`.
4. Run the live smoke test (`server/scripts/verify-watsonx.mjs` from the
   `sourcedeck-site` repo).
5. Capture the green table output as evidence.
6. Only then update `/agents/`, `/security/`, and the homepage to say
   "live on watsonx" — and only with the smoke-test evidence linked.

## Owner-review items

- Don't let copy regress. Anyone proposing watsonx-readiness wording
  should be asked to attach the latest smoke-test output. If it's not
  green, the wording stays at "configuration pending."
- Do not market IBM/watsonx as production-ready until step 5 above
  succeeds. This is a hard rule.
