# SourceDeck PO → Invoice Pipeline — operator runbook

This doc is the canonical walk-through for the end-to-end invoice flow:

```
Basin form ──▶ Worker /api/basin/po ──▶ Stripe DRAFT invoice ──▶ operator reviews
                                                                     │
                                                                     ▼
                                                             operator clicks Send
                                                                     │
                                                                     ▼
client pays ──▶ Stripe invoice.paid webhook ──▶ Airtable Invoice Requests row patched
                                                                     │
                                                                     ▼
                                                       LCC Funnel Health shows:
                                                         · PO drafts awaiting approval
                                                         · Invoices sent (open)
                                                         · Invoices paid + revenue
                                                         · Revenue by campaign
                                                         · Recent activity labeled
                                                           "Paid (Invoice)"
```

Everything server-side lives in `sourcedeck-proxy` (Cloudflare Worker bound to
`proxy.sourcedeck.app`). Client-side changes live here. Stripe keys never touch
the client.

## One-time setup (do once, in this order)

### 1. Create the Airtable `Invoice Requests` table

Base `appfQRV1tGk3sWMCb`. Full schema is in
`~/sourcedeck-proxy/docs/invoice-pipeline.md`. Copy the new table id from
Airtable (the `tbl…` segment of the table URL).

### 2. Wire the table id into the Worker

In `~/sourcedeck-proxy/wrangler.toml` replace **two** occurrences of
`tblInvoiceRequests`:
- `ALLOWED_TABLES` — trailing entry
- `INVOICE_REQUESTS_TABLE`

### 3. Set server-side secrets

```bash
cd ~/sourcedeck-proxy
wrangler secret put STRIPE_SECRET_KEY         # sk_live_...
wrangler secret put STRIPE_WEBHOOK_SECRET     # whsec_...
wrangler secret put BASIN_SHARED_SECRET       # openssl rand -hex 32
# (AIRTABLE_PAT was already set when the proxy was first deployed)
wrangler deploy
```

### 4. Configure Basin to forward submissions to the Worker

Basin dashboard → form `pro-invoice` → **Settings → Webhooks → Forward to URL**:

| Field         | Value |
| ------------- | ----- |
| URL           | `https://proxy.sourcedeck.app/api/basin/po` |
| Method        | POST |
| Format        | JSON |
| Custom header | Name `X-Basin-Secret`, Value = the `BASIN_SHARED_SECRET` you set in step 3 |

Optional: do the same for `operator-proposal` if you want Operator submissions
to also create draft invoices. By default we recommend leaving Operator as a
sales-led proposal (no auto-draft).

### 5. Configure Stripe webhook endpoint

Stripe Dashboard → Developers → Webhooks → **Add endpoint**.

| Field    | Value |
| -------- | ----- |
| URL      | `https://proxy.sourcedeck.app/api/stripe/webhook` |
| Events   | `invoice.paid`, `invoice.sent`, `invoice.finalized`, `invoice.payment_failed`, `invoice.voided`, `invoice.marked_uncollectible` |

Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` if you didn't
already in step 3.

### 6. Wire the table id into LCC

In `app/downloads/sourcedeck-lcc.html` the constant `INVOICE_REQ_TBL` defaults
to `tblInvoiceRequests`. For a per-operator override without editing source,
an operator can run once in DevTools on the LCC page:

```js
localStorage.setItem('INVOICE_REQ_TBL_OVERRIDE', 'tblABCDEF012345');
```

For the committed default, edit the constant in the file to match the real
Airtable id and push.

### 7. Verify end-to-end

1. Submit a test PO from `/quote/pro/` with a real email you own and a
   test PO like `PO-TEST-001`.
2. Confirm: Worker logs show `[basin/po] created`, an `Invoice Requests` row
   appears in Airtable with Stripe customer + invoice IDs, and the Stripe
   dashboard shows a **draft** invoice (not sent).
3. In Stripe dashboard, click **Send invoice**. Webhook fires
   `invoice.finalized` + `invoice.sent`; Airtable row flips to `open`.
4. Pay the test invoice. Webhook fires `invoice.paid`; Airtable row flips to
   `paid`, `Paid At` stamped, `Ready To Provision = true`.
5. LCC Funnel Health → counts move into the invoice tiles, "Paid (Invoice)"
   row appears in Recent Activity, revenue-by-campaign populates.
6. Operator provisions the workspace and stamps `Provisioned At`.

## Day-to-day operator workflow

1. **Check the LCC operator queue**: *Funnel Health → PO drafts awaiting approval*.
   Each row links to the draft invoice in Stripe.
2. **Click the link** → opens the draft in Stripe.
3. **Verify** the business (Email, Business ID, PO number, company match expected).
4. **Click Send invoice** in Stripe. The webhook flips the row to `open` in Airtable.
5. **When the client pays**, the `invoice.paid` webhook auto-sets
   `Ready To Provision = true`.
6. **Provision the workspace** (your existing process — create user, send access
   details), then stamp `Provisioned At` on the row so it leaves the queue.

## Don'ts (enforced in code — don't try to work around them)

- Do **not** enable `auto_advance=true` on invoice creation. `basin.ts` hardcodes
  `false`. The whole point of the pipeline is the operator approval gate.
- Do **not** provision the workspace before `Ready To Provision = true`. That
  flag is only flipped by a signature-verified `invoice.paid` event.
- Do **not** put Stripe secrets in `sd-config.js` or any client file. Only the
  **publishable** key is client-side; everything else is in the Worker.
- Do **not** fabricate campaign attribution. Invoice rows with no UTM / campaign
  id show as `(direct / unknown)` in LCC.

## Current pricing — single source of truth

`~/sourcedeck-proxy/src/lib/basin.ts` `PLAN_CENTS`:

| Plan     | Cents   | USD  |
| -------- | ------- | ---- |
| core     | 7,900   | $79  |
| pro      | 34,900  | $349 |
| operator | 99,900  | $999 |

Keep this in sync with `assets/sd-config.js` `STRIPE_PRICES` (the Stripe price
IDs referenced by card checkout).
