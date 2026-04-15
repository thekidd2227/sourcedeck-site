/* ═══════════════════════════════════════════════════════════════════════
   SourceDeck — commercial config + checkout resolver
   ─────────────────────────────────────────────────────────────────────
   Every commercial page (homepage, /app/, /invoice/, /quote/*) loads this
   file. To go live with Stripe, swap the three `null` values in
   SD_CONFIG.STRIPE_LINKS for real Payment Link URLs. No other code
   changes required.

   ──────── SWAP POINTS ────────
   STRIPE_LINKS.pro_monthly       ← Pro monthly Payment Link
   STRIPE_LINKS.pro_annual        ← Pro annual Payment Link (seat × 12)
   STRIPE_LINKS.operator_monthly  ← Operator monthly Payment Link (optional)
   ──────── /SWAP POINTS ────────

   Until a link is set, sdCheckout() falls back to the matching premium
   interim page (/quote/pro/ or /quote/operator/) so the journey stays
   real and intentional — never a dead mailto.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  window.SD_CONFIG = {
    STRIPE_LINKS: {
      pro_monthly:      null,   // e.g. 'https://buy.stripe.com/XXXXXXXXXXXX'
      pro_annual:       null,
      operator_monthly: null
    },
    INTERIM_ROUTES: {
      pro:      '/quote/pro/',
      operator: '/quote/operator/'
    },
    SALES_EMAIL: 'sales@arcgsystems.com'
  };

  window.sdCheckout = function(e, plan, cadence){
    if (e && e.preventDefault) e.preventDefault();
    var cfg = window.SD_CONFIG || {};
    var sk  = cfg.STRIPE_LINKS || {};
    var key = plan + '_' + (cadence || 'monthly');
    var url = sk[key] || (cfg.INTERIM_ROUTES || {})[plan] || '/app/#pricing';
    window.location.href = url;
    return false;
  };
})();
