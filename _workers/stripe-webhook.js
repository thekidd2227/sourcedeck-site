/*  ═══════════════════════════════════════════════════════════════════════════
    SourceDeck · Stripe Webhook Handler (Cloudflare Worker)
    ───────────────────────────────────────────────────────────────────────────
    Deploys to:  events.sourcedeck.app/stripe
    Purpose:     Accept checkout.session.completed → provision workspace →
                 send magic-link activation email → fan out event to
                 downstream subscribers (webhooks, Airtable ledger, etc.)

    Required secrets (via `wrangler secret put`):
      STRIPE_WEBHOOK_SECRET  — whsec_…  (Stripe → Developers → Webhooks)
      POSTMARK_TOKEN         — Postmark Server API token (magic-link email)
      AIRTABLE_TOKEN         — Airtable PAT scoped to the Workspaces table
      AIRTABLE_BASE_ID       — base where the Workspaces table lives
      WORKSPACES_TBL         — tbl… ID of the Workspaces table
      SESSION_SIGNING_SECRET — any 32+ byte random string (magic-link HMAC)

    Required bindings (wrangler.toml):
      EVENTS_KV              — KV namespace for event dedup + retry queue

    Route (in Cloudflare Dashboard or wrangler.toml):
      events.sourcedeck.app/stripe*  →  this Worker

    In Stripe Dashboard:
      Developers → Webhooks → Add endpoint →
        URL: https://events.sourcedeck.app/stripe
        Events: checkout.session.completed, customer.subscription.updated,
                customer.subscription.deleted, invoice.paid, invoice.payment_failed
    ═══════════════════════════════════════════════════════════════════════════ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/stripe') {
      return json({ error: 'not_found' }, 404);
    }

    // 1. Verify Stripe signature
    const sig = request.headers.get('stripe-signature');
    const raw = await request.text();
    const ok = await verifyStripeSignature(raw, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!ok) return json({ error: 'invalid_signature' }, 400);

    const event = JSON.parse(raw);

    // Idempotency: skip if already processed
    const seen = await env.EVENTS_KV.get('stripe:' + event.id);
    if (seen) return json({ ok: true, dedup: true });
    await env.EVENTS_KV.put('stripe:' + event.id, String(Date.now()), { expirationTtl: 60 * 60 * 24 * 7 });

    // 2. Route by event type
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object, env, ctx);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(event.data.object, env);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object, env);
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionChange(event.data.object, event.type, env);
          break;
      }
      return json({ ok: true, type: event.type });
    } catch (err) {
      console.error('[stripe-webhook]', event.type, err);
      // Return 200 to prevent Stripe retries for app-level errors we can recover from
      // Return 500 only for infrastructure failures
      return json({ error: 'handler_failure', detail: String(err).slice(0, 200) }, 500);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Handler: checkout.session.completed
// Creates a workspace, seeds it with the purchased plan, sends activation email.
// ─────────────────────────────────────────────────────────────────────────────
async function handleCheckoutCompleted(session, env, ctx) {
  const email = session.customer_details?.email || session.customer_email;
  const customer = session.customer;
  const subscription = session.subscription;
  const plan = derivePlanFromSession(session);

  if (!email) throw new Error('no_customer_email');

  // Generate workspace
  const workspaceId = 'ws_' + randomHex(10);
  const activationToken = await signToken({ wsid: workspaceId, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 }, env.SESSION_SIGNING_SECRET);

  // Persist workspace record in Airtable (or swap for D1/KV/external DB)
  await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.WORKSPACES_TBL}`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.AIRTABLE_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'Workspace ID': workspaceId,
        'Email': email,
        'Plan': plan,
        'Stripe Customer': customer,
        'Stripe Subscription': subscription,
        'Status': 'pending_activation',
        'Created': new Date().toISOString()
      }
    })
  });

  // Send magic-link activation email via Postmark
  const activateUrl = `https://sourcedeck.app/activate/?token=${encodeURIComponent(activationToken)}&ws=${workspaceId}`;
  await sendMagicLinkEmail(email, plan, activateUrl, env);

  // Fan out to the internal event bus so Funnel Health + Slack alerts pick it up
  await fanoutEvent({
    event: 'checkout_completed',
    workspace_id: workspaceId,
    timestamp: new Date().toISOString(),
    data: {
      email,
      plan,
      cadence: session.mode === 'subscription' ? 'monthly' : 'one-time',
      revenue_usd: session.amount_total ? session.amount_total / 100 : null,
      stripe_session: session.id
    }
  }, env);
}

async function handleInvoicePaid(invoice, env) {
  // Fire a 'subscription_renewed' event. Could also update workspace Active status.
  await fanoutEvent({
    event: 'subscription_renewed',
    timestamp: new Date().toISOString(),
    data: {
      customer: invoice.customer,
      amount_usd: invoice.amount_paid / 100,
      invoice_id: invoice.id
    }
  }, env);
}

async function handlePaymentFailed(invoice, env) {
  await fanoutEvent({
    event: 'payment_failed',
    timestamp: new Date().toISOString(),
    data: {
      customer: invoice.customer,
      attempt: invoice.attempt_count,
      invoice_id: invoice.id
    }
  }, env);
}

async function handleSubscriptionChange(sub, type, env) {
  await fanoutEvent({
    event: type === 'customer.subscription.deleted' ? 'subscription_cancelled' : 'subscription_updated',
    timestamp: new Date().toISOString(),
    data: {
      customer: sub.customer,
      subscription_id: sub.id,
      status: sub.status,
      plan: derivePlanFromSubscription(sub)
    }
  }, env);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function derivePlanFromSession(session) {
  // Tags added as Stripe metadata on the Payment Link / Price. Fallback = 'pro'.
  return session.metadata?.plan || 'pro';
}
function derivePlanFromSubscription(sub) {
  return sub.metadata?.plan || (sub.items?.data?.[0]?.price?.metadata?.plan) || 'pro';
}

async function sendMagicLinkEmail(email, plan, activateUrl, env) {
  if (!env.POSTMARK_TOKEN) return; // no-op when token not configured
  const body = {
    From: 'SourceDeck <welcome@sourcedeck.app>',
    To: email,
    Subject: 'Activate your SourceDeck workspace',
    HtmlBody: activationEmailHtml(plan, activateUrl),
    TextBody: `Welcome to SourceDeck (${plan.toUpperCase()}).\n\nActivate your workspace:\n${activateUrl}\n\nThe link is valid for 7 days.`,
    MessageStream: 'outbound'
  };
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': env.POSTMARK_TOKEN
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('postmark_send_failed: ' + r.status);
}

function activationEmailHtml(plan, url) {
  return `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,Inter,sans-serif;background:#fff;color:#0a0a0a;margin:0;padding:40px 24px">
  <div style="max-width:520px;margin:0 auto">
    <div style="font-size:13px;color:#6e6e73;font-family:monospace;letter-spacing:0.14em;text-transform:uppercase">SourceDeck · ARCG Systems</div>
    <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:16px 0 10px">Welcome to SourceDeck.</h1>
    <p style="color:#505058;line-height:1.6">Your <strong>${plan.toUpperCase()}</strong> subscription is active. Tap the button below to activate your workspace. The link is valid for 7 days.</p>
    <div style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:14px 28px;background:#0071e3;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Activate workspace →</a></div>
    <p style="font-size:12px;color:#86868b;line-height:1.6">If the button doesn't work, paste this URL into your browser:<br><span style="word-break:break-all;color:#505058">${url}</span></p>
    <hr style="border:none;border-top:1px solid #e5e5e7;margin:32px 0">
    <p style="font-size:11px;color:#86868b">Sent from events.sourcedeck.app · Every workspace ships blank — we never seed prior operator data.</p>
  </div></body></html>`;
}

async function fanoutEvent(evt, env) {
  // Persist the event for replay + push to any configured webhook subscribers.
  const key = 'evt:' + Date.now() + ':' + randomHex(6);
  await env.EVENTS_KV.put(key, JSON.stringify(evt), { expirationTtl: 60 * 60 * 24 * 30 });
  // TODO: look up per-workspace subscriber URL from the Workspaces table + POST with HMAC.
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe signature verification (no SDK — pure Web Crypto)
// ─────────────────────────────────────────────────────────────────────────────
async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map(kv => kv.split('=')));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const payload = `${t}.${rawBody}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  // constant-time compare
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

async function signToken(payload, secret) {
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const sig = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return body + '.' + sig;
}

function randomHex(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
