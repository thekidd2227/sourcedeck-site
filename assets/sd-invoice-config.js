/**
 * SourceDeck — Invoice Pipeline Config (canonical, browser-side)
 *
 * Single source of truth for every invoice-pipeline value that needs to
 * agree between the LCC (browser), the docs, and the Worker.
 *
 * When any of these values change, update THIS file first, then mirror to
 * sourcedeck-proxy/wrangler.toml (Worker) in the matching field:
 *
 *     LCC (sd-invoice-config.js)      Worker (wrangler.toml)
 *     ──────────────────────────      ────────────────────────
 *     INVOICE_REQUESTS_TABLE      →   INVOICE_REQUESTS_TABLE
 *                                     + trailing entry in ALLOWED_TABLES
 *     INVOICE_DUE_DAYS            →   INVOICE_DUE_DAYS
 *     AT_BASE_ID                  →   AT_BASE_ID
 *
 * The Worker is still the authority for server-side behavior (it owns the
 * Stripe secret, the webhook signature, the schema validation). This file
 * just keeps the browser + docs aligned with what the Worker expects.
 *
 * NEVER put secrets here — this file is served publicly on sourcedeck.app.
 * Only IDs, table names, and policy strings belong here.
 */
(function(){
  window.SD_INVOICE_CONFIG = Object.freeze({
    // Airtable base the Worker proxies into. Must match wrangler.toml AT_BASE_ID.
    AT_BASE_ID: 'appfQRV1tGk3sWMCb',

    // Invoice Requests table id. Placeholder until the Airtable table is
    // created — see sourcedeck-proxy/docs/invoice-pipeline.md for schema.
    // When the operator creates the table in Airtable, they update this
    // string AND wrangler.toml's INVOICE_REQUESTS_TABLE.
    INVOICE_REQUESTS_TABLE: 'tblInvoiceRequests',

    // Default payment window on the Stripe invoice. Must match wrangler.toml
    // INVOICE_DUE_DAYS. If they disagree, the server wins (Stripe is the
    // payment authority), but UI copy in /invoice/ and /quote/pro/ should
    // reflect the real number.
    INVOICE_DUE_DAYS: 30,

    // Worker origin for the invoice approval API (send / void / provisioned).
    // The LCC posts to `${WORKER_BASE}/api/invoice/{id}/{action}` with
    // credentials: 'include' so the CF Access cookie rides along.
    WORKER_BASE: 'https://proxy.sourcedeck.app',

    // Canonical invoice policy strings — mirrored on every public-facing
    // page under docs/invoice-copy.md. Keep them in sync when policy changes.
    POLICY_SHORT: 'Invoice billing is available for verified businesses. Submit your PO and business details for review. After approval, we issue a branded Stripe invoice. Service begins only after the invoice is paid in full.',
    POLICY_ELIGIBILITY: [
      'Verified businesses only',
      'Valid PO required',
      'Business ID required',
      'Activation begins after payment clears',
    ],

    // Canonical Stripe invoice memo + footer. These are duplicated here for
    // reference and for any LCC-side copy display; the authoritative copies
    // live in sourcedeck-proxy/src/lib/basin.ts as
    // INVOICE_MEMO_TEXT / INVOICE_FOOTER_TEXT and are what actually end up
    // on the Stripe invoice. DO NOT edit them here without also editing
    // basin.ts in the same commit.
    INVOICE_MEMO_TEXT:
      'Thank you for choosing SourceDeck by ARCG Systems. ' +
      'This invoice reflects the approved service scope and billing terms for ' +
      'your selected plan. Please include your PO number with any payment or ' +
      'remittance communication.',
    INVOICE_FOOTER_TEXT:
      'SourceDeck · ARCG Systems\n' +
      'Invoice issued after business and PO verification.\n' +
      'Service activation begins only after payment clears in full.\n' +
      'For billing support or procurement coordination, reply to the invoice email.',

    // Required Airtable field names. The LCC schema health-check at
    // /health → /api/invoice/schema (Worker) verifies each of these exists
    // on INVOICE_REQUESTS_TABLE before the pipeline is considered live.
    REQUIRED_FIELDS: [
      'Company', 'Contact Name', 'Email', 'Plan', 'PO Number',
      'Business ID', 'Stripe Customer ID', 'Stripe Invoice ID',
      'Invoice Status', 'Amount Due (cents)', 'Amount Paid (cents)',
      'Paid At', 'Ready To Provision', 'Provisioned At',
      'Campaign ID', 'UTM Campaign', 'Attribution Type',
      'Created', 'Dedupe Key',
    ],

    // Canonical status values used by the operator queue. Keep in sync with
    // sourcedeck-proxy/src/lib/stripeWebhook.ts and
    // sourcedeck-proxy/src/lib/invoiceActions.ts.
    STATUSES: [
      'awaiting_approval',   // draft created, operator has not approved
      'open',                // operator approved + Stripe sent the invoice
      'paid',                // invoice.paid received; Ready To Provision = true
      'provisioned',         // operator has activated the workspace
      'payment_failed',      // invoice.payment_failed — needs review
      'uncollectible',       // invoice.marked_uncollectible — needs review
      'void',                // cancelled by operator
    ],
  });
})();
