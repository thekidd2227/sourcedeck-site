# QA — First-run privacy

Manual test plan. Run before any release. Static site has no JS test
framework, so this is the standing checklist.

## Goal

Prove that:

1. A first-time visitor sees a blank workspace.
2. A logged-out user sees no saved data.
3. A new user never inherits another user's localStorage / sessionStorage.
4. No personal information (email, phone, social handle, real name)
   appears as the default state.
5. Demo / sample data only loads after an explicit user click.

## Steps

### A. Brand-new browser profile (incognito or fresh profile)

1. Open `https://sourcedeck.app/` in a brand-new private window.
2. ✅ Confirm hero CTA reads **Book Enterprise Demo** + **Join for Free**.
3. ✅ Confirm no real customer names appear in the trust strip
   (no "RiverTide Property Mgmt", "Halcyon Federal", etc.).
4. ✅ Confirm the capability ticker shows qualitative attributes only
   ("Blank workspace by default", "User-controlled data") — no
   percentage retention claims, no $X-leaked-revenue stat.
5. Open `https://sourcedeck.app/app/demo/`.
6. ✅ Confirm the **Socials** tab shows "— not configured —" placeholders
   for Instagram / LinkedIn / Facebook / WhatsApp / Website / Intake
   Form.
7. ✅ Confirm no real email address (e.g. `charlie@`) appears as the
   sender in the seed-data system-flow viewer.
8. ✅ Confirm no real phone number (e.g. `+1 555-906-3676`) appears.

### B. Click the homepage video

1. Open `https://sourcedeck.app/`.
2. Click the video frame.
3. ✅ Confirm the page does **not** redirect to `/app/demo/` or anywhere
   else.
4. ✅ Confirm an inline placeholder appears with the message
   "Walkthrough video — Coming soon" plus links to the demo and to
   request a guided demo.

### C. localStorage / sessionStorage cross-user check

1. In private window 1: navigate to `/app/demo/`. Interact with one or
   two surfaces so client-side state writes a key.
2. Inspect `Application → Local Storage` in DevTools. Note all
   `sd_*` / SourceDeck-prefixed keys.
3. Open private window 2 (separate isolated profile).
4. Navigate to `/app/demo/`.
5. ✅ Confirm window 2 does not see any of the keys from window 1.
6. ✅ Confirm window 2's workspace renders as blank / first-run state.

### D. Demo workspace load is opt-in

1. Brand-new profile, navigate to `/app/demo/`.
2. ✅ Confirm the demo workspace does NOT auto-fill with personal data.
3. The demo intentionally seeds synthetic / fixture data — that is
   acceptable as long as no real personal info appears (see step A.6
   through A.8).

## Artifacts — what to capture if a step fails

- Browser version + OS.
- Screenshot of the failing step.
- DevTools → Application → Storage → Local Storage screenshot
  (with values redacted if sensitive).
- The exact URL.
- File this as a regression in `docs/INCIDENTS/` with severity
  proportional to the data leaked (real email = S1; UI-only quirk = S4).

## Pass criteria

All ✅ checkboxes in sections A–D pass on a fresh browser profile.
Any single ❌ blocks release.
