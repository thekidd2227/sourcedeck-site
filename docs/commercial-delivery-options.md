# Commercial Delivery Options

## Final Decision

SourceDeck commercial delivery is **Web SaaS + installable PWA** at:

- App: `https://app.sourcedeck.app`
- Marketing site: `https://sourcedeck.app`

Electron remains legacy/internal during migration. It is a reference implementation and migration source, not the primary commercial delivery path.

## Options Compared

| Option | Fit | Notes |
|---|---:|---|
| Web SaaS + PWA install | Best | Primary path. Supports instant updates, subscriptions, BYOK settings, tenant/workspace controls, and browser install without desktop packaging friction. |
| Dedicated tenant cloud | Strong later | Good for Federal, Hyatt/highest-tier, and enterprise dedicated deployments after the shared SaaS path stabilizes. |
| Browser extension + web dashboard | Later | Useful only if capture workflows need page-level browser augmentation. Not required for V1. |
| Self-hosted Docker / private deployment | Later | Enterprise option after tenant model, credential vault, and release checks mature. |
| Desktop wrapper later | Optional | Can wrap the web app if a customer requires a desktop icon, but it should not become the default product path. |

## Why Web SaaS + PWA

- avoids Apple approval
- avoids macOS notarization as the primary distribution gate
- avoids desktop installer friction
- enables instant updates
- supports subscriptions and entitlement checks
- supports BYOK provider settings
- supports tenant/workspace controls
- works for consumers and enterprises
- can be installed like an app via PWA
- keeps users on one commercial product path

## Packaging Rule

Commercial releases ship blank. No Charlie keys, Charlie `.env`, seeded Charlie workspace data, ARCG operating data, or hidden provider fallback may ship in the SaaS/PWA product.
