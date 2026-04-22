---
name: starter-library-qc
description: QC for the starter / seed libraries a fresh SourceDeck workspace ships with — top-40 industry seed, demo data in the LCC web mirror, sample playbook/template content in /command/ and /portal/, and the 40-entry industry list referenced by the ICP profile spec. Use before shipping any change that touches seed data, demo content, or the LCC web mirror.
---

# Starter Library QC

Every new SourceDeck workspace opens blank. The starter libraries that DO ship — industry seed, demo content in the LCC mirror, sample rows in `/command/` and `/portal/` — must be operator-grade, non-leaky, and clearly distinguishable from real customer data.

## Libraries in scope

1. **Industry seed** — the 40 industries referenced in the PRD for ICP preload. Currently not yet shipped as data; track this as a Phase 1 gap.
2. **LCC demo seed** — the sample leads, deals, pipeline rows that render when no real workspace data exists.
3. **Command Center demo content** — the 15 operational inbox rows, 3 playbooks, 6 connector health tiles in `/command/index.html`.
4. **Portal demo content** — the client / vendor / sub view content in `/portal/index.html`.
5. **Sample prompts and content topics** — any hardcoded content-engine seeds in `app/demo/index.html` (ARCG topic families, etc.).

## Checks

### 1. No real customer data
Every name, company, email, phone, address, URL in the demo seed must be either:
- plausibly realistic but fictional (e.g. "RiverTide Property Mgmt", "Hargrove Property Services"), or
- clearly tagged with `demo`, `sample`, or `TBD` placeholders.

Run:
```
grep -nE "[a-z0-9._%+-]+@(digiarcgsystems|arcgsystems|arivergrop)\.com" --include="*.html" .
```
Any hit inside `/command/`, `/portal/`, or `app/demo/` (outside the sanitization gate block) is a violation.

### 2. No real phone or personal identifiers
```
grep -rnE "\b(347|202|212|301|443)[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}\b" --include="*.html" .
grep -rniE "jean-?max|jeanmax|charles" --include="*.html" . | grep -v 'Ariel.*River Contracting Group'
```
Expect zero hits outside the footer credit.

### 3. Real Airtable base ID never leaks
```
grep -c "appfQRV1tGk3sWMCb" app/demo/index.html app/downloads/sourcedeck-lcc.html
```
Both must return 0. Real base ID is replaced with `appDEMO0000000000` by the sanitization gate.

### 4. Real Instantly campaign ID never appears in demo seed
```
grep -c "72ca8b8b-3e1e-47d5-902c-49c140e5d677\|e1d2d2e5-b3cd-4ee1-8dc5-9cc1a254bbe4" app/demo/index.html app/downloads/sourcedeck-lcc.html
```
Both must return 0. Campaign IDs live only in `sd-config.js` marked as admin config.

### 5. Demo sample flags present
Any static JSON seed inside `app/demo/index.html` that represents "sample leads" or "sample deals" must carry a `_demo: true` field (or equivalent marker) so real downstream integrations never treat it as live data. Verify:
```
grep -cE '_demo\s*:\s*true|DEMO_SEED|seed_demo' app/demo/index.html
```

### 6. Parity between demo + download
```
md5 app/demo/index.html app/downloads/sourcedeck-lcc.html
```
Hashes must match. Any drift indicates a shipping mismatch.

### 7. `/command/` sample rows are operator-grade
Open `/command/index.html` and confirm every row in `Operational Inbox` renders with a severity pill (`.sd-pill.blocked|warning|failed|wait-client|wait-internal|escalated|approved`) + a `.sd-obj.*` object tag + an owner avatar. No row may be silently untyped:
```
grep -c 'class="sd-row"' command/index.html
grep -c 'class="sd-pill' command/index.html
```
Pill count must be ≥ row count.

### 8. `/portal/` scope fence is enforced in copy
Portal must explicitly state what the view cannot show:
```
grep -E "✗.*(Other clients|operator-internal|subcontractor rates|lead pipeline|internal playbooks)" portal/index.html
```
Expect multiple ✗ lines in the permissions block.

### 9. Industry seed readiness
Search the repo for the top-40 industry list (Phase 1 target):
```
grep -rlE "Property Management.*Staffing.*GovCon|INDUSTRIES\s*=\s*\[" --include="*.js" --include="*.json" --include="*.html" . | head
```
If no seed file exists, report as **Phase 1 gap** with file path suggestion: `assets/sd-industries.json` backing the ICP profile preload.

### 10. Content engine prompts
The content engine inside `app/demo/index.html` defines topic families (ARCG Diagnosis-First, MedPilot, SourceDeck, Legacy). Any new topic added must:
- belong to exactly one family set
- not reference a real operator's personal templates
- route through the existing `isMedPilot()` / `isSourceDeck()` gates

Sanity grep:
```
grep -cE 'isMedPilot|isSourceDeck|MEDPILOT_TOPICS|SOURCEDECK_TOPICS' app/demo/index.html
```

## Output

- per-check pass/fail with grep counts
- any PII / secret leak: stop everything and name the exact file:line
- industry seed status: present | pending
- parity hash match: yes | no
- final: **SHIP** or **HOLD** (HOLD if any #1–#4 fail)
