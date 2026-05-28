# Electron Deprecation Plan

## Current Position

Electron remains legacy/internal during the migration. It is useful as a prototype, reference implementation, and feature migration source. It is not the preferred commercial delivery path.

## Current Electron Packaging

The desktop app currently uses:

- macOS DMG/ZIP
- Windows NSIS
- GitHub release publishing
- auto-updater
- signing/notarization configuration

## Why Electron Is Not Preferred Commercially

- installer friction
- signing and notarization overhead
- slower updates
- harder subscription/tenant control
- harder BYOK credential UX across devices
- more platform-specific support surface

## Reusable Code

- deterministic GovCon/Fed Agent logic
- provider wrappers
- credential-boundary patterns
- release/privacy checks
- business logic tests
- UI copy and workflow models

## Code To Retire Or Replace

- Electron main/preload-specific IPC assumptions
- desktop auto-updater assumptions
- OS-keychain-only credential assumptions
- localStorage-only critical state
- single-file renderer architecture
- desktop filesystem assumptions

## Conditions Before Deprecating Electron

- web auth exists
- workspace model exists
- credential vault exists
- sourcing workflow exists
- pipeline workflow exists
- provider settings exist
- export/import exists
- PWA install path is stable
- commercial release checks pass

No forced user migration should happen until the web product is stable.
