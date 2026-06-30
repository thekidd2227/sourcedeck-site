# National License Coverage Audit

**Date:** 2026-06-30. Honest coverage statement for the license framework.

## Framework vs automation (the key distinction)
- **Framework coverage:** ALL US jurisdictions (50 states + DC + PR/VI/GU/MP/AS)
  + tribal/county/municipal/federal authority levels are supported by the
  neutral contract, registry, and qualification engine. (Verified: `isValidJurisdiction`
  accepts every state + DC + 5 territories; unknown → manual plan.)
- **Automation coverage:** only catalogued authorities, and in this branch those
  adapters are **contract-accurate test adapters** (no live official call made —
  no credentials in this environment).

## Per-status inventory (this branch)
| Status | Jurisdictions/authorities |
|---|---|
| Automated and verified (live) | **none yet** — live official access is the blocked step |
| Automated but limited (interface proven, live pending) | CA, FL (API/dataset pattern); TX, VA (public-lookup pattern) — as **test adapters** |
| Manual official verification | MD, DC, NY (+ any catalogued public-lookup authority without an automated adapter) |
| Provider planned | extendable via `PROVIDER_CATALOG` |
| Unsupported (→ guided manual plan on demand) | every uncatalogued jurisdiction |
| Not applicable | work/jurisdiction with no license requirement |

## Explicit non-claims
- SourceDeck does **not** claim automated lookup for all 50 states.
- No CAPTCHA or access-control bypass is implemented or attempted (manual-only
  authorities route to a guided human workflow).
- `automated_*` in the catalog means "official interface implemented + normalized";
  it does **not** assert a live production integration until credentials + the
  official source are wired and ToS-compliant.

## Blocked for live validation (environment)
Live state-license API/site calls, SAM.gov/USAspending enrichment, and geocoding
require credentials/approved access not present here. The interfaces + test
adapters are complete; only live retrieval is blocked.
