# Phase 25K — Website Commercial Truth Cleanup

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-site`
**Companion (app repo):** `sourcedeck-app/docs/audits/phase-25k-website-app-parity-audit.md`.

---

## 1. What this PR fixes

Manus second-pair-of-eyes audit flagged that website public claims were misaligned with `sourcedeck-app/docs/product/pricing-source-of-truth.md` (V3 canonical) and with `security/index.html` (the unified "we don't claim certifications we don't hold" voice).

### 1.1 Compliance copy aligned to security voice

`compliance/index.html` is rewritten so the three previously overclaimed cards now match `security/index.html`:

| Card | Pre-25K | Post-25K |
|---|---|---|
| SOC 2 Type II | `<div class="status progress">SOC 2 Type II · in progress</div>` + "Remediation phase targeting completion in FY2026" | `<div class="status planned">SOC 2 Type II · not held</div>` + "Not certified. No active audit is currently open." |
| HIPAA BAA | `<div class="status progress">MedPilot vertical · in progress</div>` + "Limited availability in Operator tier" | `<div class="status planned">HIPAA · not held</div>` + "Not certified. No signed BAA is currently offered." |
| FedRAMP | `<div class="status planned">Planned · FY2026 H2</div>` + "Targeting FedRAMP Moderate equivalency" | `<div class="status planned">FedRAMP · not held</div>` + "Not FedRAMP authorized. No ATO. Not currently pursuing." |

The page-intro paragraph also gets a new lead sentence: "SourceDeck does not currently claim SOC 2, HIPAA, FedRAMP, CMMC, ISO 27001, or HITRUST certification."

The remaining `Live` cards (DPA, MSA/SOW, retention/deletion, security review questionnaire, subprocessor list, insurance) are unchanged — those are real artifacts produced today.

### 1.2 Pricing-config reframe

`assets/sd-config.js` comment on the V2 Stripe Price IDs is reframed:

| Pre-25K | Post-25K |
|---|---|
| `/* LIVE pricing (v2 — outcome-based $79 / $349 / $999). Legacy v1 IDs preserved in STRIPE_PRICES_LEGACY for any grandfathered checkouts that reference them. */` | `/* Stripe Price IDs — V2 (legacy, GRANDFATHERED SERVER-SIDE ONLY). These IDs remain valid for existing subscriptions that were created at V2 amounts ($79 / $349 / $999). They are NOT the current published pricing. Live published pricing is V3 [...] Authoritative source: sourcedeck-app/docs/product/pricing-source-of-truth.md (Phase 22A-P V3 canonical). */` |

V2 Stripe Price IDs themselves are **preserved** (grandfathered subscriptions still bill against them) but they are no longer described as "LIVE pricing." The comment now points at the V3 source-of-truth.

### 1.3 V2 pricing in active buyer-facing copy

| File | Fix |
|---|---|
| `assets/social/capture.html` line 68 | `Core $79 · Pro $349 · Operator $999` → `Solo Capture $149 · GovCon Operator $499 · Operator Plus $997` |
| `assets/social/capture.html` lines 148–150 | Full V2 pricing cards (Core $79 / Pro $349 / Operator $999) → V3 (Solo Capture $149 / GovCon Operator $499 / Operator Plus $997) |
| `variants/founder-agency.html` lines 638–665 | V2 pricing cards (Core $79 / Pro $349 / Operator $999) → V3 |
| `quote/operator/index.html` line 106 | `FROM $999 / SEAT / MONTH` → `FROM $997 / MONTH · $9,970 / YEAR` |
| `quote/pro/index.html` lines 103, 106 | `$349/seat/month` → `$499/month or $4,990/year` (mapped to V3 GovCon Operator) |

### 1.4 Intentionally NOT changed

| File / line | Reason |
|---|---|
| `changelog/index.html` line 156 historical entry "Core $79 (Visibility) · Pro $349 (Control) · Operator $999 (Revenue System)" | Changelog records what was once published. Historical context preserved. |
| `server/src/services/ai/mock.js` line 61 mock tier `'Operator', price: '$999/mo'` | Server-side mock service, not a buyer-facing surface. Out of Phase 25K scope. |
| `assets/sd-config.js` `STRIPE_PRICES` map | V2 Stripe Price IDs preserved — grandfathered subs still bill against them. Only the comment is reframed. |
| `assets/sd-config.js` `STRIPE_PRICES_LEGACY` map | V1 Stripe Price IDs preserved — grandfathered subs still bill against them. |

### 1.5 Out of scope (separate phase)

| Concern | Status |
|---|---|
| New V3 Stripe Product / Price ID creation in Stripe dashboard | **Operator action.** Phase 25K does not create Stripe Products. The operator must create V3 Products + Price IDs before any self-serve checkout can be flipped to V3. |
| `sd-config.js` `STRIPE_PRICES` map update to new V3 Price IDs | Out of scope — pending operator's Stripe dashboard work. |
| Phase 25J Team 5 tier publication | Out of scope — pending owner approval per `sourcedeck-app/docs/product/phase-25j-enterprise-pricing-recommendation.md` §18. |

## 2. Files changed

| File | Lines changed |
|---|---|
| `compliance/index.html` | ~30 lines (4 cards + intro) |
| `assets/sd-config.js` | ~15 lines (comment reframe) |
| `assets/social/capture.html` | ~5 lines (1 tag chip + 3 pricing cards) |
| `variants/founder-agency.html` | ~6 lines (3 pricing cards) |
| `quote/operator/index.html` | 1 line |
| `quote/pro/index.html` | 2 lines |
| `docs/audits/phase-25k-website-commercial-truth-cleanup.md` (this file) | new |

## 3. Stale-pricing scan result

```
$ grep -rnE '\$79|\$349|\$999' --include="*.html" .
./changelog/index.html:156:    [historical changelog entry; preserved as record]
./quote/pro/index.html: [no buyer-facing $349 hits remain]
./assets/sd-config.js: [V2 amounts appear only inside the new "GRANDFATHERED SERVER-SIDE ONLY" comment + as commented Price ID labels]
```

Zero hits remain in active buyer-facing HTML markup.

## 4. Routes touched

| Route | HTTP 200 expected |
|---|---|
| `/compliance/` | ✅ |
| `/quote/operator/` | ✅ |
| `/quote/pro/` | ✅ |
| `/variants/founder-agency.html` (A/B variant) | ✅ |
| `/assets/social/capture.html` (social card template, no route) | n/a |
| `/assets/sd-config.js` (config asset) | n/a |

## 5. Parity between `app/demo/` and `app/downloads/`

Not touched by this PR (CLAUDE.md working rule #1 preserved).

## 6. Safety

- ✅ No new feature
- ✅ No public checkout added
- ✅ No public download CTA added
- ✅ No `Free demo` / `Try now` / `Get started free` / `Start free` CTA added
- ✅ No deploy (this PR commit triggers GitHub Pages redeploy on merge — site lands at sourcedeck.app)
- ✅ Stripe configuration not changed (V2 Price IDs preserved; new V3 Products are operator's Stripe dashboard work)
- ✅ V2 pricing references retained as documented deprecation context only
- ✅ V1 legacy Stripe Price IDs preserved (server-side grandfathered)
- ✅ No certified-compliance / FedRAMP / SOC 2 / HIPAA / CMMC / HITRUST / ISO 27001 / signed-and-notarized / production-signed / guaranteed-award / guaranteed-revenue claim introduced
- ✅ Request Access posture preserved
- ✅ Phase 25A / Phase 25C / Phase 25D site invariants preserved

---

## Signature

Phase 25K website cleanup reconciles the public commercial surface with the V3 pricing source-of-truth and the unified security/compliance voice. V2 Stripe Price IDs remain server-side for grandfathered subs; they no longer appear as "LIVE pricing" anywhere in the buyer-facing surface.
