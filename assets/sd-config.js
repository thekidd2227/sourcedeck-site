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
    STRIPE_PUBLISHABLE_KEY: null,          // SWAP: 'pk_live_...'

    STRIPE_PRODUCTS: {
      pro:      'prod_UL6H0sF9QgT6by',
      operator: 'prod_UL6HphbFYbXHfG'
    },

    STRIPE_PRICES: {
      pro_monthly:      'price_1TMQ5ZGwsCHM3Ft215bvDkQv',
      pro_annual:       'price_1TMQ5tGwsCHM3Ft2O3jCnbce',
      operator_monthly: 'price_1TMQ6CGwsCHM3Ft2sNO1UyzL'
    },

    /* If the publishable key is missing, these interim pages take over. */
    INTERIM_ROUTES: {
      pro:      '/quote/pro/',
      operator: '/quote/operator/'
    },

    /* Commercial posture.
       Operator stays sales-led by default; flip to true only when the
       premium architecture is ready for self-serve Operator purchase. */
    OPERATOR_SELF_SERVE_ENABLED: false,

    /* ── Basin (form handling) ─────────────────────────────────────── */
    BASIN_ENDPOINT: 'https://usebasin.com/f/c60baae0eef17516eca2bea81e419768',

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
  window.sdCheckout = function(e, plan, cadence){
    if (e && e.preventDefault) e.preventDefault();
    var cfg = window.SD_CONFIG || {};
    var interim = (cfg.INTERIM_ROUTES || {})[plan] || '/app/#pricing';

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
