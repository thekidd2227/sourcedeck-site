---
name: pricing-and-packaging-audit
description: Audit SourceDeck pricing, plan tiers, Stripe price wiring, invoice language, and CTA consistency across landing + app + quote flows. Use before any pricing change and as a regression check after structural edits.
---

# Pricing & Packaging Audit

Canonical live pricing: **Core $79/mo · Pro $349/mo · Operator $999/mo**. Legacy $49/$149 price IDs are retained server-side only.

## Checks (all must pass)

### 1. Display parity
Grep every marketing surface for price references and confirm every instance is one of $79, $349, $999, $4,188 (Pro annual), or explicitly "Custom" for Enterprise:
```
grep -rnE '\$[0-9]+' --include="*.html" . \
  | grep -v 'app/demo\|app/downloads\|/pricing/\|variants/' \
  | grep -vE '\$(79|349|999|4,188|0)\b'
```
Expect zero hits outside of KPI dashboard contexts inside the LCC.

### 2. Stripe source of truth
`assets/sd-config.js` must contain all three live price IDs under `STRIPE_PRICES` and legacy IDs only under `STRIPE_PRICES_LEGACY`:
```
grep -E "core_monthly|pro_monthly|operator_monthly|pro_annual" assets/sd-config.js
grep -E "STRIPE_PRICES_LEGACY" assets/sd-config.js
```

### 3. CTA vocabulary
Approved labels: **Start with Demo · Choose Plan · Request Proposal · Talk to Sales · Purchase by Invoice**. Any other button copy is a violation. Grep:
```
grep -rnE '(Launch SourceDeck|Send to sales|Request quote|Contact Sales|Notify me when it ships|Get Started Free|Start Free Trial)' --include="*.html" . \
  | grep -v 'app/demo\|app/downloads\|variants/'
```
Expect zero hits.

### 4. Invoice-language integrity
PO-based language is banned. Grep:
```
grep -nE '\bPO\b|purchase order|\bP\.O\.|po_number|PO number' --include="*.html" --include="*.js" . \
  | grep -v 'docs/sourcedeck/'
```
Expect zero hits.

### 5. Plan-gating reflected in comparison matrix
Read `index.html` pricing grid and the `sd-matrix` comparison table. Every Core-tier row must use `class="check"`, every Pro-only row uses `class="dash"` in Core column, every Operator-only row uses `class="dash"` in Core and Pro columns. Flag any tier capability that claims Core coverage when the sd-config.js plan cap for that workspace is false.

### 6. Checkout path
For Core and Pro, `sdCheckout(event, 'core'|'pro', 'monthly')` must be the `onclick`. For Operator, the button must route to `/quote/operator/` — never to Stripe Checkout, regardless of `OPERATOR_SELF_SERVE_ENABLED` (operator self-serve flag must be `false`). Verify:
```
grep -E "OPERATOR_SELF_SERVE_ENABLED:\s*false" assets/sd-config.js
```

### 7. Legacy backward compat
Ensure `STRIPE_PRICES_LEGACY` block still contains `price_1TMQ5ZGwsCHM3Ft215bvDkQv` (legacy Pro $49) and `price_1TMQ6CGwsCHM3Ft2sNO1UyzL` (legacy Operator $149). Deleting these would break grandfathered subscribers.

## Output

Return:
- each check with pass / fail + grep counts
- any violation with the exact file:line
- a GO / NO-GO verdict

If any check fails, stop and call out which files need correction before proceeding.
