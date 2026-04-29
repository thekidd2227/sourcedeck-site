# Virtual workspace — fallback delivery model

> **This is documentation only.** SourceDeck is API-first and ships as a
> web SaaS app. Virtual workspaces are not the primary delivery model and
> are not implemented as code in this repository.

## When this applies

Some customers — typically federal, defense, regulated healthcare, or
multinationals with strict data-residency rules — block standard browser
SaaS or require all interaction to happen inside a managed virtual
desktop. In those situations, SourceDeck is delivered as a normal web
app accessed from inside the customer-controlled VDI session.

Common environments:

- Citrix Virtual Apps and Desktops
- Microsoft Azure Virtual Desktop
- Amazon WorkSpaces
- VMware Horizon
- Browser-isolation services (Cloudflare Browser Isolation, Menlo,
  Island, Talon) acting as a remote-rendered shell
- Government-issued VDI (DoD CCP, JCC2-style)

## What SourceDeck looks like inside a VDI

Identical to the public web experience. The user opens a managed
browser inside the VDI session and visits either:

- the SaaS hostname (e.g. `sourcedeck.app`), or
- a private hostname pointing at the customer's deployment of the API
  + UI inside their own VPC / Satellite location.

The VDI provides the controlled-access wrapper — endpoint posture,
copy-paste restrictions, screen-recording, audit. SourceDeck does not
re-implement those controls; it relies on the VDI to enforce them.

## Required architecture-side commitments

Even though SourceDeck doesn't ship a virtual-workspace runtime, the
SaaS architecture must support it cleanly. These are already present in
this repo:

- API-first: every operation the UI does has a documented `/api/v1/*`
  endpoint, so customers can integrate from inside their VDI without a
  browser if needed.
- No client-side persistence of sensitive content (see PWA section in
  `SECURITY.md`). The service worker explicitly never caches
  authenticated API responses, uploaded documents, or AI outputs.
- Tenant isolation enforced server-side, so "VDI users" and "non-VDI
  users" of the same tenant share the same workspace state.
- All deployment paths in `ENTERPRISE_DEPLOYMENT.md` (ROKS, Satellite,
  on-prem) work behind a VDI without changes.

## What we do NOT do

- We do not ship a Citrix / AVD / WorkSpaces image.
- We do not bundle a thick client.
- We do not embed a remote-desktop protocol.
- We do not relax browser-isolation policies on behalf of the customer.

## Procurement positioning

If a procurement question asks "does SourceDeck run inside our virtual
workspace?", the answer is:

> Yes. SourceDeck is web-first and API-first. It runs unchanged inside
> any managed virtual desktop or browser-isolation session. Sensitive
> data never leaves the controlled environment because: (a) we don't
> cache documents or AI outputs offline, (b) we honor the VDI's
> copy-paste / screen-share policies, and (c) the same workspace can be
> deployed to ROKS or IBM Cloud Satellite inside the customer's
> sovereign location if they require it.
