# Phase 25D — Website Logo Standardization Audit

**Date:** 2026-06-09
**Repo:** `thekidd2227/sourcedeck-site`
**Branch:** `fix/phase-25d-approved-logo-standardization`
**Base:** `main @ 8a4a863` (post-Phase-25A pricing alignment).

---

## 1. Approved canonical asset

| Asset | Role |
|---|---|
| `assets/sourcedeck-mark.svg` | Approved canonical SourceDeck mark — dark stone tile + four gold chevron quadrants converging on a center void. ViewBox 200×200. Uses `linearGradient(#sd-gold)` for the gold-on-dark palette. |
| `favicon.svg` | Approved simplified 64×64 variant of the canonical mark (corner brackets only). |
| `favicon-16.png` / `favicon-32.png` / `apple-touch-icon.png` (180×180) / `icon-192.png` / `icon-512.png` / `favicon.ico` | Rasterized variants of the approved mark, already present and referenced by `site.webmanifest` and `sw.js`. **No change.** |
| `site.webmanifest`, `apps/web/public/manifest.webmanifest` | PWA manifests reference the rasterized icon set above. **No change.** |
| `sw.js` cache list | Service worker pre-caches the rasterized icon set above. **No change.** |

## 2. Pre-Phase-25D inventory of violators

The following user-facing surfaces displayed the old textual `S` icon (or referenced the deprecated `assets/sourcedeck-logo.png` horizontal wordmark):

| File | Line(s) | Pattern | Fix |
|---|---|---|---|
| `index.html` | 285 | `<div class="sd-brand-mark">S</div>` (header) | Replaced with `<img src="/assets/sourcedeck-mark.svg" alt="SourceDeck logo" width="28" height="28">` |
| `index.html` | 578 | `<div class="foot-brand-mark">S</div>` (footer) | Replaced with `<img src="/assets/sourcedeck-mark.svg" alt="SourceDeck logo" width="26" height="26">` |
| `index.html` | 12 | `og:image` → `assets/og-preview.png` (file does not exist on `main`) | Updated to `og:image` → `/icon-512.png` (real, served, approved-mark raster) |
| `index-new.html` | 12, 283, 576 | Variant of `index.html` (only differs in 2 i18n script lines) | Same three fixes applied |
| `m/index.html` | 72 | `<div class="brand"><span class="g">S</span> <span>SourceDeck</span></div>` | Replaced `<span class="g">S</span>` with `<img src="/assets/sourcedeck-mark.svg" alt="SourceDeck logo" width="22" height="22">` |
| `sourcedeck-web.html` | 548 | `<div class="auth-logo">S</div>` (auth-loading screen) | Replaced inner `S` with `<img src="/assets/sourcedeck-mark.svg" alt="" style="width:100%;height:100%;display:block">` |
| `sourcedeck-web.html` | 558 | `<div class="logo-mark"><img src="sourcedeck-logo.png" onerror="this.parentElement.textContent='S'"></div>` | Replaced with `<div class="logo-mark"><img src="/assets/sourcedeck-mark.svg" alt="SourceDeck logo"></div>` |
| `sourcedeck-web.html` | 42 | `.logo-mark img{... object-position:17% center}` (cropped horizontal wordmark) | Updated to `object-fit:contain` so the square approved mark renders correctly |
| `assets/social/capture.html` | 63, 79, 102, 126, 146, 163 | `<div class="brand-chip"><span class="gl">S</span> SourceDeck</div>` (6× — `.gl` used a blue/purple Apple-style gradient that didn't match the SourceDeck palette) | All 6 replaced with `<img src="/assets/sourcedeck-mark.svg" alt="SourceDeck logo" width="36" height="36" style="border-radius:9px">` |
| `variants/founder-agency.html` | 14 | `og:image` → `assets/sourcedeck-logo.png` | Updated to `og:image` → `/icon-512.png` |
| `variants/founder-agency.html` | 18 | `twitter:image` → `assets/sourcedeck-logo.png` | Updated to `twitter:image` → `/icon-512.png` |

## 3. Already-correct surfaces (untouched)

The following pages already used the approved mark before Phase 25D and were not touched:

- `agencies/index.html`, `agencies/department-of-defense/`, `agencies/department-of-health-and-human-services/`, `agencies/department-of-homeland-security/`, `agencies/department-of-veterans-affairs/`, `agencies/general-services-administration/`
- `set-asides/index.html`, `set-asides/small-business/`, `set-asides/8a/`, `set-asides/sdvosb/`, `set-asides/wosb/`, `set-asides/hubzone/`
- `methodology/index.html`, `invoice/index.html`, `federal/index.html`, `sales/index.html`, `enterprise/index.html`, `agents/index.html`, `auth/callback/index.html`, `request-access/index.html`
- **`app/demo/index.html`** and **`app/downloads/sourcedeck-lcc.html`** — both already use the approved mark. **Parity rule preserved** (CLAUDE.md working rule #1 — the two files remain byte-identical to each other; their canonical-mark usage was already correct pre-Phase-25D).

## 4. Favicon / manifest / PWA status

| Surface | Status |
|---|---|
| `<link rel="icon" href="/favicon.svg">` (all pages) | ✅ Already approved-mark SVG. No change. |
| `<link rel="manifest" href="/site.webmanifest">` | ✅ Manifest already references approved-mark raster set. No change. |
| Apple touch icon (`/apple-touch-icon.png`) | ✅ Already approved-mark raster. No change. |
| Service worker pre-cache (`sw.js`) | ✅ Already pre-caches approved-mark raster set. No change. |
| OG / Twitter card images | ✅ Updated `index.html` + `index-new.html` + `variants/founder-agency.html` to point at `/icon-512.png` (a real, served, approved-mark raster). |

## 5. Active old-`S`-icon usage remaining

✅ **Zero active hits.** Post-Phase-25D `grep` for `>S<` / `textContent='S'` / `sourcedeck-logo` across `*.html` returns zero matches in user-facing markup. The `assets/sourcedeck-logo.png` file itself is retained on disk (in case other tooling references it externally) but is no longer linked from any active site surface.

## 6. CSS class definitions

The following CSS classes are now defined but not used in markup after this PR:

- `.sd-brand-mark` (in `index.html`, `index-new.html`)
- `.foot-brand-mark` (in `index.html`, `index-new.html`)
- `.brand-chip .gl` (in `assets/social/capture.html` — was the blue/purple gradient palette)

**Decision:** retained as dead CSS for now. Removing them is out of scope for Phase 25D (a follow-up cleanup PR may delete them; doing so here adds risk without benefit). They do not render anywhere because no markup references them.

## 7. Pre-existing residue noted (not fixed in this PR)

| Residue | Location | Risk | Recommended phase |
|---|---|---|---|
| Deprecated V2 pricing `Core $79 · Pro $349 · Operator $999` | `assets/social/capture.html` line 68 (and possibly other social card text) | Phase 22A-P/Phase 25A residue — social-card template uses V2 amounts. **Out of scope for Phase 25D (brand only).** | Follow-up site PR to align social-card text to V3 (Solo Capture $149 · GovCon Operator $499 · Operator Plus $997). |

## 8. Screenshots

❌ **None committed.** Phase 25D follows the repo hygiene rule: no screenshots, no videos, no `.qa/` output, no build artifacts.

## 9. No-deploy confirmation

❌ **No deploy performed by this phase.** GitHub Pages will redeploy automatically when this PR merges to `main`, per the standard CLAUDE.md working rule #9. Phase 25D itself only opens a draft PR; merge is the operator's explicit step.

## 10. Request Access posture preserved

✅ **The primary CTA on every page remains `Request Access` / `Contact ARCG` / `Request a Quote` / `Schedule a Call`.** No public download CTA introduced. No `Free demo` / `Try now` / `Download now` / `Get started free` / `Start free` CTA introduced. Phase 25C master delivery method invariants hold.

## 11. Verification

Post-edit verification:

| Check | Result |
|---|---|
| `grep ">S<" *.html` (user-facing) | ✅ 0 hits |
| `grep "textContent='S'"` | ✅ 0 hits |
| `grep "sourcedeck-logo"` | ✅ 0 hits in active site markup |
| `grep "sourcedeck-mark.svg"` | ✅ Present in every previously-violating surface |
| Parity (`app/demo/` ↔ `app/downloads/`) | ✅ Both already use the approved mark; not touched by this PR |
| Phase 25A no-send/no-submit copy | ✅ Untouched |
| V3 pricing on `pricing/index.html` | ✅ Untouched |
| Request Access posture | ✅ Untouched |

---

## Signature

Phase 25D website-side logo standardization is complete. The approved gold geometric mark (`assets/sourcedeck-mark.svg`) is now used consistently across every active site surface. Old `S` icon usage has been eliminated from user-facing markup. Parity between `app/demo/` and `app/downloads/` is preserved. No deploy performed. No CTA / pricing / delivery-method change introduced.
