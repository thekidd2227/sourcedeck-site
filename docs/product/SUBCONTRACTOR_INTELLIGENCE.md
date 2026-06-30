# Subcontractor Intelligence — Product Spec

**Status:** in development · branch `feat/subcontractor-intelligence-v1` (child of v2)
**Surface:** authenticated SourceDeck web product (`server/` backend + `apps/web` frontend).

## Outcome
After a solicitation opportunity is grouped and analyzed, SourceDeck helps the prime
(ARCG) decide *what* must be subcontracted and *who* can do it — as two separate,
connected screens, never one undifferentiated AI report:

- **Screen A — Subcontractor Requirements:** schema-driven extraction of specialized
  expertise, licenses/certs/standards, geographic & performance constraints, required
  business type, equipment/materials, insurance/bonding, past-performance, a **FAR
  flow-down matrix** (conditional, not universal), a **SOW→subcontractor role map**
  (ARCG retains prime responsibilities), and an editable **vetting checklist**.
- **Screen B — Vendor Shortlist:** a *source-driven* search + verification workflow
  (not a language-model list) — deterministic distance screening (default 25 mi, ≥8
  targets), license/insurance verification, capability matching, **deterministic
  weighted fit/risk scoring** (mandatory-license failure disqualifies), a ranked
  shortlist, and **cost-target/quote** comparison against the existing Scope & Cost
  Intelligence engine.

## Hard guardrails (anti-fabrication)
Never invent vendors, emails, licenses, certifications, distances, awards, prices, or
business designations. Missing email → **"NOT PUBLICLY FOUND"**. Unverified address →
**cannot** be "within radius". A website claim of "licensed" is **not** verification.
FAR clauses are **not** all flow-downs. Insurance silence stays **"not stated"**. The
AI may classify/summarize/explain/draft, but may **not** create the authoritative fit
score, distance, or any unsupported vendor fact; every requirement resolves to immutable
parser output and every vendor claim to external-source or user-provided evidence.

## Routes (apps/web app-router)
- `/app/solicitations/[opportunityId]/subcontractors/requirements`
- `/app/solicitations/[opportunityId]/subcontractors/vendors`

## Workflow
On analysis completion, enqueue `extract_subcontractor_requirements` (always, when source
text suffices) and `search_vendor_shortlist` (only when place of performance is reliable,
coordinates/address verified, an approved provider is configured, tenant policy permits
enrichment, and the opportunity is not enrichment-disabled). When vendor search cannot
run, show a **specific** blocked state (PoP missing / address unverified / provider not
configured / enrichment disabled / none within 25 mi) — never a silent empty list.

See the architecture doc for component layout and the continuation audit for the honest
delivered-vs-deferred split.
