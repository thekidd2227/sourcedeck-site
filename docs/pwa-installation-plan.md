# PWA Installation Plan

## What PWA Install Means

Users open `https://app.sourcedeck.app` in a supported browser and install SourceDeck from the browser install prompt. The installed app launches in a standalone window while still receiving normal web deployments.

## No Desktop Distribution Dependency

The commercial path does not depend on:

- Apple App Store approval
- macOS notarization
- DMG or ZIP installers
- Windows NSIS installers

## Phase 1 Scope

The scaffold includes:

- PWA manifest
- app name: `SourceDeck`
- short name: `SourceDeck`
- standalone display
- theme color
- start URL: `/dashboard`
- placeholder service worker that does not cache tenant data

## Offline Behavior

V1 should not overpromise offline work. The service worker must not cache:

- credentials
- provider responses
- tenant records
- API responses
- AI outputs
- uploaded files

Offline behavior can show a basic shell or browser-level unavailable state.

## Browser Support

Primary support:

- Chrome / Edge desktop
- Chrome / Edge Android
- Safari desktop and iOS where PWA limitations allow

## Updates

PWA users receive updates through normal web deployment. Version display and update prompts can be added after the SaaS shell stabilizes.

## Enterprise IT Notes

Enterprise deployments may require:

- custom domain
- SSO
- allowlisted origins
- CSP review
- data retention policy
- tenant-specific audit export
