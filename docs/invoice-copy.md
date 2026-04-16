# SourceDeck — Canonical invoice / PO copy blocks

Single source of truth for every user-facing string related to the invoice / PO
pipeline. **When you change wording, change it here first, then propagate.**

All invoice-related pages import from the same mental model:

1. The client submits an invoice / PO request.
2. The request is reviewed by the operator.
3. The business and PO details are verified.
4. A branded Stripe invoice is issued after approval.
5. Services begin only after the invoice is paid in full.

The Stripe invoice is the **official payment instrument** — branded to
SourceDeck / ARCG Systems, emailed directly by Stripe, payable by card or
ACH via the hosted payment page.

---

## Short policy block

Use this on the homepage pricing disclosure and anywhere a one-liner
is needed:

> Invoice billing is available for verified businesses. Submit your PO and
> business details for review. After approval, we issue a branded Stripe
> invoice. Service begins only after the invoice is paid in full.

## Short eligibility block

Use as a 4-line checklist inside disclosures / eligibility cards:

- Verified businesses only
- Valid PO required
- Business ID required
- Activation begins after payment clears

## "What happens next" block

Use on `/invoice/` and on the post-submit note for `/quote/pro/` and
`/quote/operator/`:

1. You submit your PO request and business details.
2. We verify the business and review the PO.
3. We issue a branded Stripe invoice after approval.
4. Your workspace and services activate after the invoice is paid in full.

## Prepayment emphasis line

Use once per page where prepayment policy might be misread. Do not repeat
multiple times on the same view:

> Service does not begin on PO submission, invoice issuance, or pending
> payment. Activation begins only after payment clears.

## Button / link language guidance

- **Request an Invoice** — for CTAs that open the PO form on `/quote/pro/`.
- **Pay by Invoice** — for CTAs and disclosure labels.
- **Submit PO for Review** — for the form's primary submit button.
- **Request Proposal** — only for Operator / Enterprise scoping paths.
- Avoid generic "Talk to Sales" unless the page is explicitly sales-led
  (e.g. `/sales/`).

---

## Stripe invoice memo (Stripe `description` field)

Wired automatically by `sourcedeck-proxy/src/lib/basin.ts`. The same string
is the canonical memo for any invoice created manually in the Stripe
dashboard — copy/paste it.

> Thank you for choosing SourceDeck by ARCG Systems. This invoice reflects
> the approved service scope and billing terms for your selected plan. Please
> include your PO number with any payment or remittance communication.

## Stripe invoice footer (Stripe `footer` field)

Wired automatically by `sourcedeck-proxy/src/lib/basin.ts`.

```
SourceDeck · ARCG Systems
Invoice issued after business and PO verification.
Service activation begins only after payment clears in full.
For billing support or procurement coordination, reply to the invoice email.
```

---

## Brand consistency for the Stripe invoice

- **Business name:** SourceDeck (with "by ARCG Systems" in memo text).
- **Logo:** ARCG Systems mark (upload in Stripe Dashboard → Settings → Branding).
- **Primary color:** `#C9941A` (SourceDeck gold).
- **Secondary color:** `#0071e3`.
- **Email sender:** whatever Stripe domain + display name is configured for
  the account. Set display name to "SourceDeck · ARCG Systems".
- **Hosted invoice page:** Stripe renders with the same branding. Include the
  ARCG Systems logo + name so procurement teams recognize the vendor at a
  glance.

These live in the **Stripe Dashboard only** — they are not configurable from
code. The one-time setup steps are listed in `docs/invoice-pipeline.md`
under "Stripe branding (one-time)".

---

## Confirmation tone (post-submit)

Use or adapt this exact tone on any confirmation / thanks state after an
invoice / PO submission:

> Your request has been received. We'll review the business and PO details,
> then issue a branded Stripe invoice if approved. Service begins only after
> payment clears.

Remove any wording that implies instant activation, automatic approval,
net-30 activation, or onboarding before payment.

---

## Where each block is currently used

| Block                        | File(s) |
| ---------------------------- | ------- |
| Short policy block           | `index.html` (pricing disclosure), `invoice/index.html` (hero)          |
| Short eligibility block      | `index.html` (core+pro disclosure), `quote/pro/index.html`, `quote/operator/index.html` |
| What happens next block      | `invoice/index.html`, `quote/pro/index.html` post-submit, `quote/operator/index.html` post-submit |
| Prepayment emphasis line     | `invoice/index.html`, `quote/pro/index.html`, `quote/operator/index.html` |
| Confirmation tone            | `thanks/index.html`                                                      |
| Stripe memo (description)    | `sourcedeck-proxy/src/lib/basin.ts` → `INVOICE_MEMO_TEXT`                |
| Stripe footer                | `sourcedeck-proxy/src/lib/basin.ts` → `INVOICE_FOOTER_TEXT` (env var `INVOICE_FOOTER` overrides) |
