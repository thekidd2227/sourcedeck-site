# Subcontractor Intelligence — Architecture

**Date:** 2026-06-30 · **Branch:** `feat/subcontractor-intelligence-v1`

## Component layout (target)
```
apps/web (Next.js app-router)
  /app/solicitations/[id]/subcontractors/requirements   (Screen A)  — DEFERRED (no UI yet)
  /app/solicitations/[id]/subcontractors/vendors        (Screen B)  — DEFERRED (no UI yet)
        │ fetch (Bearer JWT)
server/ (Express)
  routes/subcontractor.js        (requirements + vendor-search + vendor APIs) — DEFERRED
  services/subcontractor/
    requirements.js   deterministic requirements classification (mandatory/recommended),
                      FAR flow-down (conditional), SOW role map, vetting checklist  ✅ this branch
    distance.js       great-circle screening; verified-coordinate gating            ✅ this branch
    scoring.js        deterministic weighted fit/risk; mandatory-license disqualify  ✅ this branch
    dedup.js          weighted-identity dedup (never merge on name alone)            ✅ this branch
    quote.js          vendor quote classification vs cost targets (reuses cost/*)    ✅ this branch
    providers/        SAM.gov / state-licensing / geocoding adapters                 DEFERRED (no creds)
    worker.js         durable vendor-discovery jobs                                  DEFERRED (no worker)
    store.js / pg adapter + migrations                                              DEFERRED (no Postgres)
  services/cost/*     REUSED for vendor targets + quote classification               ✅ (existing)
  services/solicitation/*  REUSED for findings/citations/place-of-performance        ✅ (existing)
```

## What landed this branch (deterministic, tested, no DB/browser/creds)
- **`distance.js`** — `greatCircleMiles(a,b)`; `screenByRadius(origin, vendors, radiusMiles)`
  marks each vendor `withinRadius` only when its coordinates are *verified*; unverified
  coordinates are never counted as within radius (labeled `distanceMethod`).
- **`scoring.js`** — `scoreVendor(vendor, requirements, weights)` returns a breakdown
  with weight + input + evidence + points per category and a total; a missing **mandatory**
  license sets `disqualified=true` regardless of total. Weights are explicit (no hidden AI).
- **`dedup.js`** — `dedupeVendors(list)` merges only on strong identity signals (UEI/CAGE/
  domain/phone/exact-address/license-number); name similarity alone yields a *possible
  duplicate for human review*, never an automatic merge. Preserves evidence/notes/quotes.
- **`quote.js`** — `classifyQuote(quote, costTargets)` → within_ideal / acceptable /
  above_maximum / below_minimum_margin / walk_away / incomplete, with the resulting gross
  profit/margin computed via the existing deterministic cost engine. Does **not** mutate
  the selected scenario (requires explicit confirmation upstream).
- **`requirements.js`** — `classifyRequirement`, `farFlowdownApplicability` (conditional
  by clause + threshold + commercial/noncommercial + tier), `buildVettingChecklist`,
  `insuranceFromSilence` (stays `not_stated`).

## Data model
~40 tenant-scoped tables specified in the prompt (RequirementAnalysis/…/VendorFitScore/
VendorQuote/…). **DDL + repository adapter + migrations are deferred** (no Postgres in
this environment); the deterministic engines operate on plain objects and are structured
to persist via the same repo-abstraction pattern as the solicitation store.

## AI boundary
Reuses the governed watsonx gateway. AI classifies/summarizes/matches/explains/drafts
only; it never produces the authoritative score, distance, or any unsupported vendor
fact. Strict output schemas; unsupported claims rejected/downgraded; requirements resolve
to immutable parser output; vendor claims resolve to source/user evidence. **AI-boundary
tests are deferred** (beyond the deterministic level).

## Honest status
The two screens do **not** work end-to-end (no UI, no persistence, no durable worker, no
search providers). The deterministic decision core is complete and tested.
