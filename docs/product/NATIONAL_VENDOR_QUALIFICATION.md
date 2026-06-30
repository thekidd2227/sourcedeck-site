# National Vendor Qualification (Product)

A vendor is qualified **per jurisdiction**, never nationally-by-assumption.

## Rules (deterministic; `license/qualification.js`)
- A license in **State A does not qualify State B** — a verified license record
  for that jurisdiction is required.
- **Reciprocity** counts only with official reciprocity **evidence** AND an
  active source-jurisdiction license; otherwise the target jurisdiction is
  `unresolved`.
- **Territories** (PR/VI/GU/MP/AS) and DC are first-class jurisdictions.
- **Unknown/uncatalogued** jurisdiction → a guided manual-verification plan
  (official authority + lookup URL + evidence upload), never a silent failure.
- **Mandatory unresolved** or **expired/revoked/disciplined/mismatch** license
  → blocks overall qualification.
- **Expiring** (renewal approaching) → `qualified_warning` (still qualified).
- **Business vs individual** licenses are not interchangeable (`both` satisfies
  either).
- **County/municipal overlay** is evaluated separately — a state license never
  satisfies a required local business license.

## UI surfaces (deferred — design only)
Screen A "National License Requirements" (jurisdiction/authority/required
license/category/business-vs-individual/reciprocity/local overlay/mandatory
status/source/verification date/action) and Screen B candidate cards
(qualified/unqualified/unresolved jurisdictions, active/expiring/expired
licenses, reciprocity relied upon, local/business/individual gaps, evidence
source, last verified) + a multi-state coverage view and filters. These consume
the implemented qualification engine; the UI itself is not built in this branch.
