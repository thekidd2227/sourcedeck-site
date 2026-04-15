# SourceDeck Homepage Variants

Alternate homepage copy versions for A/B testing. **Not wired to sourcedeck.app root** — the live control is `/index.html`.

## Variants

| File | Angle | Purpose |
|------|-------|---------|
| `founder-agency.html` | Sharper, more commercial. Targets founders and agency owners directly. Leans into revenue-leakage and operational-chaos pain. | Test conversion vs. the broader small-team control. |

## How to deploy a variant

Option A — full swap (manual test):
```bash
mv index.html index.control.html
cp variants/founder-agency.html index.html
git commit -am "Test: deploy founder-agency variant as homepage"
```

Option B — route-based split (recommended for real A/B):
Serve the variant at `/v/founder-agency` (GitHub Pages + 404 fallback, or Netlify/Cloudflare edge rule), send 50% of visitors via redirect or link tag, measure against a conversion event.

## Differences from live control

- Title + meta rewritten to emphasize "founders and agencies"
- Hero H1: "Stop losing leads and revenue between disconnected tools."
- Why-section: Revenue leakage framing ("margin leaving your business")
- Audience cards: Front-loaded with Founders / Agencies / Small Teams, sharper pain-forward copy
- Pain points: Harder-edged, team-and-revenue focused
- Final CTA: "Your pipeline is leaking. Fix it today." + urgency support line
- Design, CSS, and CTA targets: identical to control
