# License Provider Catalog

**Date:** 2026-06-30. Source of truth: `server/src/services/subcontractor/license/catalog.js`
(`PROVIDER_CATALOG`). Coverage is **honest** — the framework supports every US
jurisdiction, but only catalogued authorities have automation; everything else
falls back to guided official manual verification. `nationalCoverageSummary()`
returns `claimsAutomatedNationwide: false`.

## Coverage classes
- `automated_verified` — official API/dataset, working.
- `automated_limited` — official public lookup, partial/rate-limited.
- `manual_official_verification` — official source, human-in-the-loop.
- `provider_planned` — catalogued, not yet implemented.
- `unsupported` — no catalog entry yet → manual plan generated on demand.
- `not_applicable` — no license required for the work/jurisdiction.

## Current seed catalog (this branch)
| Jurisdiction | Authority | Occupations | Lookup method | Automation (this branch) |
|---|---|---|---|---|
| CA | Structural Pest Control Board | structural_pest_control | official_api | automated_verified* |
| FL | FDACS | pest_control | official_downloadable_dataset | automated_verified* |
| TX | Texas Dept. of Agriculture (SPCS) | structural_pest_control | official_public_lookup | automated_limited* |
| VA | DPOR — Board for Contractors | contractor, pest_control | official_public_lookup | automated_limited* |
| MD | DLLR — Occupational & Professional Licensing | pest_control, hvac, electrical | official_public_lookup | manual_official_verification |
| DC | DLCP — Business Licensing | general_services, pest_control | official_public_lookup | manual_official_verification |
| NY | NYS DEC — Pesticide Business Registration | pest_control | official_public_lookup | manual_official_verification |
| any other | (generated on demand) | — | — | unsupported → guided manual plan |

\* **Important honesty note:** the `automated_*` adapters are **contract-accurate
test adapters** in this branch. They implement the official interface and
normalize official-shape data, but **no live official API/site was called** (no
credentials/approved access in this environment). Live retrieval is the only
blocked step; flipping an adapter to production requires wiring the official
source + credentials and respecting its access rules (no CAPTCHA/access-control
bypass, robots/ToS-compliant). Until then, treat `automated_*` here as "interface
proven, live access pending".

## Extending coverage
Add a `PROVIDER_CATALOG` entry + a contract adapter (or rely on the manual
fallback). No schema change, no per-state table.
