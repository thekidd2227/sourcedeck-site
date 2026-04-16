/**
 * SourceDeck — Chatwoot website chat widget loader
 *
 * Single source of truth for the chat widget across all sourcedeck.app pages.
 * To change the Chatwoot instance or inbox, edit the two values below.
 *
 * Setup:
 *   1. Create a Chatwoot account at https://app.chatwoot.com (free tier) or self-host.
 *   2. Create a Website inbox in Chatwoot → Settings → Inboxes → Add Inbox → Website.
 *   3. Copy the "Website Token" from the inbox config page.
 *   4. Paste it below as CHATWOOT_TOKEN.
 *   5. If self-hosting, change CHATWOOT_BASE to your instance URL.
 *   6. Push this file — every page loads it automatically.
 */

(function () {
  // ──────────────────────────────────────────────
  // CONFIG — edit these two values after Chatwoot setup
  var CHATWOOT_TOKEN = 'W2KHym6M2383sUhpiS7R644v';
  var CHATWOOT_BASE  = 'https://app.chatwoot.com';
  // ──────────────────────────────────────────────

  // Bail silently if the token hasn't been set yet (avoids console errors
  // during the setup window between deploy and inbox creation).
  if (!CHATWOOT_TOKEN || CHATWOOT_TOKEN === 'W2KHym6M2383sUhpiS7R644v') {
    console.info('[SourceDeck] Chatwoot widget not loaded — website token not configured yet. See /assets/chatwoot.js.');
    return;
  }

  // Standard Chatwoot SDK loader
  var d = document, t = 'script';
  var g = d.createElement(t);
  var s = d.getElementsByTagName(t)[0];
  g.src = CHATWOOT_BASE + '/packs/js/sdk.js';
  g.defer = true;
  g.async = true;
  s.parentNode.insertBefore(g, s);
  g.onload = function () {
    window.chatwootSDK.run({
      websiteToken: CHATWOOT_TOKEN,
      baseUrl: CHATWOOT_BASE
    });

    // Widget appearance settings (applied after SDK init)
    window.addEventListener('chatwoot:ready', function () {
      // Set dark launcher styling to match SourceDeck brand
      window.$chatwoot.setCustomAttributes({
        product: 'SourceDeck',
        site: 'sourcedeck.app'
      });
    });
  };
})();
