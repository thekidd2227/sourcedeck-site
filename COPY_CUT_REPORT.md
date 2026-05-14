# COPY_CUT_REPORT.md

Branch: `revamp/copy-diet-70`  
Total visible words: 11154 → 3178 (71.5% reduction)

| Page | Before | Target | After | % Cut | Status |
|------|--------|--------|-------|-------|--------|
| `index.html` | 2178 | ≤654 (70%) | 296 | 86.4% | PASS |
| `demo-walkthrough/index.html` | 1119 | ≤560 (50%) | 369 | 67.0% | PASS |
| `sample-source-deck/index.html` | 1856 | ≤1114 (40%) | 873 | 53.0% | PASS |
| `request-access/index.html` | 886 | ≤443 (50%) | 245 | 72.3% | PASS |
| `pricing/index.html` | 988 | ≤494 (50%) | 290 | 70.6% | PASS |
| `agents/index.html` | 602 | ≤301 (50%) | 148 | 75.4% | PASS |
| `integrations/index.html` | 632 | ≤316 (50%) | 117 | 81.5% | PASS |
| `federal/index.html` | 832 | ≤416 (50%) | 232 | 72.1% | PASS |
| `methodology/index.html` | 734 | ≤367 (50%) | 198 | 73.0% | PASS |
| `data-sources/index.html` | 622 | ≤311 (50%) | 142 | 77.2% | PASS |
| `compare/index.html` | 517 | ≤259 (50%) | 129 | 75.0% | PASS |
| `resources/index.html` | 188 | ≤94 (50%) | 139 | 26.1% | MISS |
| **TOTAL** | **11154** | — | **3178** | **71.5%** | — |

## Notes

- **index.html**: Full rewrite. KPI cards, six-stage explanation, pain-point list, flow strip, and duplicate CTAs removed. Preserved: 5-chip trust row, 4-output grid, 5-step workflow, proof block, audience bullets, pricing teaser, safety note.
- **demo-walkthrough**: Rewritten to 7 stages. Removed all 'why it matters' blocks, verbose KV rows, long table columns. Mock UIs tightened to 3–4 rows each. Proof value retained.
- **sample-source-deck**: Proof artifact page. Section 09 (follow-up email) removed. Stakeholder table cut to 3 rows. Compliance matrix to 4 rows. Capture actions to 4 rows. KV grid trimmed 3 rows.
- **request-access**: Form intact. Full product-preview pp-section block removed.
- **pricing**: All tiers and prices preserved. ROI calculator, leak diagnostic, and long scope-rules prose removed.
- **Support pages (agents, integrations, federal, methodology, data-sources, compare, resources)**: All rewritten from scratch, lean. No long paragraphs, no repeated explanations.
- **resources/index.html** misses 50% target because the original (188 words) was already a short card index — cutting below 94 words would make it non-functional.

## SEO
All 12 pages have updated GovCon-first title, meta description, og:title, og:description, and canonical URL.

## Hygiene
No arivergrop.com. No raw email CTAs. No cold CO outreach advice. No false certification claims (SOC 2 / FedRAMP / ISO / HIPAA / HITRUST). CMMC appears only as a compliance requirement reference in sample-source-deck (not a platform claim). Homepage nav has 4 links (≤5 limit).