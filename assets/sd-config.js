/* ═══════════════════════════════════════════════════════════════════════
   SourceDeck — commercial config + checkout resolver
   ─────────────────────────────────────────────────────────────────────
   Single source of truth for every commercial page. Stripe + Basin live
   here. Do not scatter Stripe or Basin values across the site.

   STATUS:
     Stripe  — LIVE price IDs wired, publishable key pending
     Basin   — LIVE endpoint wired (shared across every form)

   ──────── REMAINING SWAP POINT ────────
   STRIPE_PUBLISHABLE_KEY  ← paste pk_live_... to activate self-serve
                             Checkout for Pro monthly / Pro annual.
   ──────── /REMAINING SWAP POINT ────────

   Until the publishable key is set, sdCheckout() falls back to the
   matching premium interim page (/quote/pro/ or /quote/operator/) so
   the buyer journey stays real and intentional — never a dead path.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  window.SD_CONFIG = {
    /* ── Stripe ─────────────────────────────────────────────────────── */
    STRIPE_PUBLISHABLE_KEY: 'pk_live_51TMPUEGwsCHM3Ft2VeAo6SSBmIhtb5XxbxJhPsPRIh4dzFUWnxlMC55LFpLqu0RTpBX7ibkhNAJKdZsDwsuJZUS100Yg8AlqLR',

    STRIPE_PRODUCTS: {
      core:     'prod_UL9cNLWwDAk9PG',
      pro:      'prod_UL6H0sF9QgT6by',
      operator: 'prod_UL6HphbFYbXHfG'
    },

    /* LIVE pricing (v2 — outcome-based $79 / $349 / $999).
       Legacy v1 IDs preserved in STRIPE_PRICES_LEGACY for any
       grandfathered checkouts that reference them. */
    STRIPE_PRICES: {
      core_monthly:     'price_1TMTKWGwsCHM3Ft22HGtJC8s',   // $79/mo
      pro_monthly:      'price_1TMTKXGwsCHM3Ft2tlG5n600',   // $349/mo
      pro_annual:       'price_1TMQ5tGwsCHM3Ft2O3jCnbce',   // legacy annual — still valid
      operator_monthly: 'price_1TMTKZGwsCHM3Ft2UQuF06fe'    // $999/mo
    },
    STRIPE_PRICES_LEGACY: {
      pro_monthly:      'price_1TMQ5ZGwsCHM3Ft215bvDkQv',   // $49/mo — do not delete, legacy subs
      operator_monthly: 'price_1TMQ6CGwsCHM3Ft2sNO1UyzL'    // $149/mo — do not delete, legacy subs
    },

    /* If the publishable key is missing, these interim pages take over. */
    INTERIM_ROUTES: {
      core:     '/app/demo/',
      pro:      '/quote/pro/',
      operator: '/quote/operator/'
    },

    /* Outbound funnel — SourceDeck Pricing Diagnosis Funnel (4-step).
       Drives cold outreach into /pricing/ via the Instantly campaign
       named below. Referenced by LCC outbound tooling. */
    FUNNEL: {
      name:           'SourceDeck | Pricing Diagnosis Funnel | 4-step',
      pricing_url:    'https://sourcedeck.app/#pricing',
      sender:         'charlie@digiarcgsystems.com',
      daily_cap:      25,
      /* Live Instantly campaign — 4-step diagnosis → pricing funnel. */
      instantly_campaign_id: 'e1d2d2e5-b3cd-4ee1-8dc5-9cc1a254bbe4'
    },

    /* Commercial posture.
       Operator stays sales-led by default; flip to true only when the
       premium architecture is ready for self-serve Operator purchase. */
    OPERATOR_SELF_SERVE_ENABLED: false,

    /* ── Basin (form handling) ─────────────────────────────────────── */
    BASIN_ENDPOINT: 'https://usebasin.com/f/c60baae0eef17516eca2bea81e419768',

    /* ── Calendar connection providers ───────────────────────────────
       Fill client_id for each provider to enable the OAuth buttons on
       /settings/calendar/. ICS URL feed works out of the box with no
       OAuth client registration. */
    CALENDAR: {
      google:    { client_id: null /* 'xxx.apps.googleusercontent.com' */ },
      microsoft: { client_id: null /* 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' */,
                   tenant: 'common',
                   /* Optional: once the calendar-oauth Worker is deployed,
                      set this to the exchange endpoint so refresh tokens
                      live server-side instead of browser session. */
                   worker_exchange_url: null }
    },

    /* ── Shared ────────────────────────────────────────────────────── */
    SALES_EMAIL: 'sales@arivergrop.com',
    SUCCESS_URL: 'https://sourcedeck.app/thanks/',
    CANCEL_URL:  'https://sourcedeck.app/app/#pricing'
  };

  /* ── Stripe.js loader (lazy, once per page) ─────────────────────── */
  var _stripePromise = null;
  function loadStripe(){
    if (_stripePromise) return _stripePromise;
    _stripePromise = new Promise(function(resolve, reject){
      if (window.Stripe && window.SD_CONFIG.STRIPE_PUBLISHABLE_KEY) {
        return resolve(window.Stripe(window.SD_CONFIG.STRIPE_PUBLISHABLE_KEY));
      }
      var s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = function(){
        if (!window.Stripe || !window.SD_CONFIG.STRIPE_PUBLISHABLE_KEY) {
          return reject(new Error('stripe_key_missing'));
        }
        resolve(window.Stripe(window.SD_CONFIG.STRIPE_PUBLISHABLE_KEY));
      };
      s.onerror = function(){ reject(new Error('stripe_load_failed')); };
      document.head.appendChild(s);
    });
    return _stripePromise;
  }

  /* ── Checkout resolver ──────────────────────────────────────────────
     plan    : 'pro' | 'operator'
     cadence : 'monthly' | 'annual'
     Behavior:
       1. If Operator is not enabled for self-serve, Operator always
          routes to the interim /quote/operator/ page (sales-led).
       2. If the publishable key is present and the requested price
          exists, open live Stripe Checkout (subscription mode).
       3. Otherwise route to the premium interim page for that plan.
  */
  /* ── sdAttribution: read UTM / campaign / source-page from URL + referrer
     and persist in sessionStorage so every Basin submission + checkout start
     carries the same attribution envelope. Called once per page load. */
  window.sdAttribution = function(){
    try {
      var p = new URLSearchParams(location.search);
      var pick = function(keys){
        for (var i=0;i<keys.length;i++){ var v=p.get(keys[i]); if(v) return v; }
        return '';
      };
      // Capture on first visit that has attribution signals; keep sticky across
      // the session so a later /quote/pro/ submission still credits the campaign.
      var stored = {};
      try { stored = JSON.parse(sessionStorage.getItem('sd_attribution')||'{}') || {}; } catch(_){}
      var fresh = {
        utm_source:   pick(['utm_source']),
        utm_medium:   pick(['utm_medium']),
        utm_campaign: pick(['utm_campaign']),
        utm_content:  pick(['utm_content']),
        utm_term:     pick(['utm_term']),
        campaign_id:  pick(['campaign_id','cid']),
        // Source page is the current path; referrer is captured for external-entry context.
        source_page:  location.pathname,
        referrer:     document.referrer || ''
      };
      // Merge: new UTM values win only if present; source_page always reflects the current page.
      var merged = {
        utm_source:   fresh.utm_source   || stored.utm_source   || '',
        utm_medium:   fresh.utm_medium   || stored.utm_medium   || '',
        utm_campaign: fresh.utm_campaign || stored.utm_campaign || '',
        utm_content:  fresh.utm_content  || stored.utm_content  || '',
        utm_term:     fresh.utm_term     || stored.utm_term     || '',
        campaign_id:  fresh.campaign_id  || stored.campaign_id  || '',
        source_page:  fresh.source_page  || stored.source_page  || '',
        referrer:     fresh.referrer     || stored.referrer     || ''
      };
      sessionStorage.setItem('sd_attribution', JSON.stringify(merged));
      return merged;
    } catch(_){ return {utm_source:'',utm_medium:'',utm_campaign:'',utm_content:'',utm_term:'',campaign_id:'',source_page:location.pathname,referrer:''}; }
  };
  // Run immediately so first-load UTM values are captured.
  var __sd_attr = window.sdAttribution();

  /* ── sdTrack: append a conversion event to localStorage.sd_events.
     Read by LCC Funnel Health dashboard. Same-origin only.
     Attribution from sdAttribution() is merged in automatically. */
  window.sdTrack = function(type, data){
    try {
      var key = 'sd_events';
      var arr = JSON.parse(localStorage.getItem(key) || '[]');
      var attr = {};
      try { attr = JSON.parse(sessionStorage.getItem('sd_attribution') || '{}') || {}; } catch(_){}
      arr.push(Object.assign({type: type, ts: Date.now()}, attr, data || {}));
      // cap at 1000 events to avoid unbounded growth
      if (arr.length > 1000) arr = arr.slice(-1000);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch(_){}
  };

  /* ── sdAttachAttribution: drop the current attribution envelope into any
     Basin form as hidden fields so the server-side PO handler can credit
     invoice revenue back to the campaign. Call once per form on DOMContentLoaded. */
  window.sdAttachAttribution = function(formEl){
    if (!formEl) return;
    var attr = window.sdAttribution ? window.sdAttribution() : {};
    var keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','campaign_id','source_page','referrer'];
    keys.forEach(function(k){
      // Don't clobber an existing hidden input with the same name (page may have set one).
      if (formEl.querySelector('input[name="'+k+'"]')) return;
      var v = attr[k] || '';
      if (!v && k !== 'source_page') return; // empty fields are noise; keep source_page always
      var el = document.createElement('input');
      el.type = 'hidden';
      el.name = k;
      el.value = v;
      formEl.appendChild(el);
    });
  };
  // Auto-wire every .sd-form on the page once the DOM is parsed.
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('form.sd-form').forEach(window.sdAttachAttribution);
  });

  window.sdCheckout = function(e, plan, cadence){
    if (e && e.preventDefault) e.preventDefault();
    var cfg = window.SD_CONFIG || {};
    var interim = (cfg.INTERIM_ROUTES || {})[plan] || '/app/#pricing';
    // Fire pricing_cta_clicked + checkout_started events for LCC Funnel Health
    window.sdTrack && window.sdTrack('pricing_cta_clicked', {plan: plan, cadence: cadence||'monthly'});
    window.sdTrack && window.sdTrack('checkout_started',   {plan: plan, cadence: cadence||'monthly'});

    // Operator stays sales-led unless explicitly flipped on.
    if (plan === 'operator' && !cfg.OPERATOR_SELF_SERVE_ENABLED) {
      window.location.href = interim;
      return false;
    }

    var priceKey = plan + '_' + (cadence || 'monthly');
    var priceId  = (cfg.STRIPE_PRICES || {})[priceKey];

    if (!cfg.STRIPE_PUBLISHABLE_KEY || !priceId) {
      // Not yet live — interim path keeps the journey real.
      window.location.href = interim;
      return false;
    }

    loadStripe()
      .then(function(stripe){
        return stripe.redirectToCheckout({
          lineItems: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          successUrl: cfg.SUCCESS_URL + '?plan=' + plan + '&cadence=' + (cadence || 'monthly'),
          cancelUrl:  cfg.CANCEL_URL
        });
      })
      .then(function(r){
        // Stripe returns { error } in-flight rather than throwing.
        if (r && r.error) {
          console.warn('[sdCheckout] Stripe error — falling back:', r.error.message);
          window.location.href = interim;
        }
      })
      .catch(function(err){
        console.warn('[sdCheckout] Falling back to interim page:', err && err.message);
        window.location.href = interim;
      });
    return false;
  };

  /* ── Basin helper (for forms that want JS progressive enhancement) ─
     Forms submit via standard POST to BASIN_ENDPOINT; this helper is
     only used if a form opts in with data-sd-form="ajax". Default path
     is a plain HTML POST with a _redirect field, which is the most
     reliable and the premium experience Basin expects. */
  window.sdBasinSubmit = function(formEl){
    if (!formEl) return;
    var data = new FormData(formEl);
    return fetch(window.SD_CONFIG.BASIN_ENDPOINT, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });
  };
})();
