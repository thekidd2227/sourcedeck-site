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
 *
 * Behavior notes
 *   • Session reset — on every page load we call $chatwoot.reset() after the
 *     widget is ready. That wipes the previous conversation cookie/token, so a
 *     refresh (or re-entry after leaving) starts a clean session. No stale chat
 *     content is ever carried across page loads.
 *   • Compact launcher — the widget starts at ~50% of Chatwoot's default size
 *     (320 × 420). As messages accumulate it grows up to the full 400 × 640
 *     default. Grow is driven by the `chatwoot:on-message` SDK event.
 */

(function () {
  // ──────────────────────────────────────────────
  // CONFIG — edit these two values after Chatwoot setup
  var CHATWOOT_TOKEN = 'YpLcRBqSnmqrQKvQLVnc8tgN';
  var CHATWOOT_BASE  = 'https://app.chatwoot.com';
  // ──────────────────────────────────────────────

  // Widget size (px). Start is roughly half the default; max is the Chatwoot
  // default so the widget never exceeds normal UX bounds.
  var SIZE_START = { w: 320, h: 420 };
  var SIZE_MAX   = { w: 400, h: 640 };
  // Per-message growth step
  var SIZE_STEP  = { w: 16, h: 36 };

  // Bail silently if the token hasn't been set yet (avoids console errors
  // during the setup window between deploy and inbox creation).
  if (!CHATWOOT_TOKEN || CHATWOOT_TOKEN === 'PASTE_YOUR_WEBSITE_TOKEN_HERE') {
    console.info('[SourceDeck] Chatwoot widget not loaded — website token not configured yet. See /assets/chatwoot.js.');
    return;
  }

  // ── Size override — injected once, overrides Chatwoot's defaults ──
  // Chatwoot's holder element is #cw-widget-holder / .woot-widget-holder.
  // The internal iframe inherits these dimensions. We force-override with
  // !important because Chatwoot's own stylesheet sets inline styles.
  function injectSizeCss() {
    if (document.getElementById('sd-cw-size-css')) return;
    var style = document.createElement('style');
    style.id = 'sd-cw-size-css';
    style.textContent = [
      '.woot-widget-holder, #cw-widget-holder {',
      '  width: ' + SIZE_START.w + 'px !important;',
      '  height: ' + SIZE_START.h + 'px !important;',
      '  max-width: 95vw !important;',
      '  max-height: 80vh !important;',
      '  transition: width 0.22s ease, height 0.22s ease !important;',
      '}',
      '.woot-widget-holder iframe, #chatwoot_live_chat_widget {',
      '  width: 100% !important;',
      '  height: 100% !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // Grow the holder one step per observed message, up to SIZE_MAX.
  var growCount = 0;
  function growWidget() {
    var holder = document.querySelector('.woot-widget-holder, #cw-widget-holder');
    if (!holder) return;
    growCount += 1;
    var w = Math.min(SIZE_START.w + growCount * SIZE_STEP.w, SIZE_MAX.w);
    var h = Math.min(SIZE_START.h + growCount * SIZE_STEP.h, SIZE_MAX.h);
    holder.style.setProperty('width',  w + 'px', 'important');
    holder.style.setProperty('height', h + 'px', 'important');
  }

  // Reset the widget's conversation state. Wipes the Chatwoot cookie so the
  // next message creates a fresh contact + conversation.
  var resetDone = false;
  function resetChatwootSession() {
    if (resetDone) return;
    if (window.$chatwoot && typeof window.$chatwoot.reset === 'function') {
      try { window.$chatwoot.reset(); resetDone = true; } catch (_) {}
    }
  }

  // ── Standard Chatwoot SDK loader ─────────────────────────────────
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

    // Inject size overrides as soon as the holder appears. We also reapply
    // when the launcher toggles in case Chatwoot re-writes inline styles.
    var sizeApplyTimer = setInterval(function () {
      if (document.querySelector('.woot-widget-holder, #cw-widget-holder')) {
        injectSizeCss();
        // keep checking briefly — Chatwoot sometimes overwrites styles
        // on first open, so we reapply over ~2s then stop.
      }
    }, 200);
    setTimeout(function () { clearInterval(sizeApplyTimer); }, 2400);

    // Widget ready → reset session + wire growth observer.
    window.addEventListener('chatwoot:ready', function () {
      window.$chatwoot.setCustomAttributes({
        product: 'SourceDeck',
        site: 'sourcedeck.app'
      });

      // Fresh session on every page load. The previous conversation is
      // abandoned server-side; the widget starts blank.
      resetChatwootSession();

      // Ensure size CSS is in place post-reset.
      injectSizeCss();
    });

    // Grow the widget on every observed message (customer or bot).
    window.addEventListener('chatwoot:on-message', function () {
      growWidget();
    });

    // Belt-and-suspenders: reset on pageshow when the page is restored from
    // the back-forward cache. Without this, a user who hits Back would see
    // their prior conversation.
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        resetDone = false;
        resetChatwootSession();
      }
    });
  };
})();
