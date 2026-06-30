# National License Provider Architecture

**Date:** 2026-06-30 · **Branch:** `feat/subcontractor-intelligence-vertical-slice-v2`

SourceDeck is a **national** GovCon platform: license/regulatory verification is
**jurisdiction-neutral** in the core. Texas is one adapter, not a platform
assumption.

## Layers
1. **Normalized contract** (`license/contract.js`) — every provider returns one
   shape regardless of jurisdiction. Supports all 50 states + DC + PR/VI/GU/MP/AS;
   authority levels `federal|state|territory|tribal|county|municipal|professional_board|special_district|other`;
   verification methods `official_api|official_downloadable_dataset|official_public_lookup|official_document|approved_connector|manual_official_verification|user_provided|unavailable`. Manual/user evidence is never labeled "officially verified".
2. **Provider registry** (`license/registry.js`, `JurisdictionLicenseProviderRegistry`) —
   `selectProviders({jurisdiction, requirementType, occupation, naics})` chooses
   applicable adapters; `verify(...)` uses the first automated provider and
   otherwise returns a **guided manual-verification plan** (official authority +
   lookup URL + what-to-search + evidence-upload). Never fabricates a result; an
   unknown jurisdiction yields a plan, not a failure.
3. **Provider catalog** (`license/catalog.js`) — configurable data (not per-state
   code branches) recording authority metadata + **honest** automation coverage.
4. **Adapters** (`license/adapters/`) — implement the common contract. Seven
   contract-accurate adapters span different regulatory patterns:
   - TX: state agency (TDA/SPCS), business + technician, public lookup.
   - VA: Board for Contractors, CLASS A/B/C category, business.
   - FL: official downloadable dataset.
   - DC: basic business license overlay (municipal-style).
   - CA: official API + result normalization from a distinct raw shape (co_name/lic_no), business **and** individual.
   - NY: manual-only (no automation) → registry routes to a manual plan.
   - MD: individual professional board (manual official).
5. **Qualification** (`license/qualification.js`) — per-jurisdiction; see the
   product doc for the rules.

## License-requirement determination (not NAICS alone)
Requirement detection considers solicitation/SOW text, place of performance,
work type, statute/board rules, business-vs-individual, prime-vs-subcontractor,
federal-facility exceptions, reciprocity, local overlays, and thresholds — each
rule carrying jurisdiction, authority, official source, effective date, last
verification date, confidence, and limitations (no hardcoded legal thresholds
without dated source metadata).

## Data-model impact
Zero new per-state tables. Jurisdiction differences live in `vendor_license`
columns + typed `vendor_evidence` + validated JSONB (see the compact data model).

## Honest status
The framework + adapters + qualification are implemented and unit-tested
(`test/license-national.test.js`, 21 tests). **No live state-license site or
official API was contacted** (no credentials/approved access in this
environment) — live retrieval is the only blocked step; adapters are
contract-accurate test adapters that the production interface will back with the
official source. The UI, persistence, jobs, and APIs that consume this framework
are deferred (see continuation audit).
