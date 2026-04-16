# SourceDeck — Chatwoot Setup Handoff

## What is already done

1. **Tidio removed** from all 12 customer-facing pages on sourcedeck.app.
2. **Chatwoot widget loader** installed via `/assets/chatwoot.js` — loaded on every page with `<script src="/assets/chatwoot.js" defer>`.
3. **Canned responses** generated from the 100-row SourceDeck knowledge base CSV, saved as `chatwoot-canned-responses.json`.
4. The loader includes a safe guard: if the website token is still the placeholder, it silently skips loading and logs an info message to console (no errors, no broken widget).

## What you need to do (5-minute setup)

### Step 1 — Create or sign in to a Chatwoot account

- **Free hosted:** https://app.chatwoot.com → Sign up (free tier includes 1 agent, website widget, canned responses).
- **Self-hosted:** deploy Chatwoot via Docker (see https://www.chatwoot.com/docs/self-hosted/deployment/docker) and use your own URL as `CHATWOOT_BASE` in Step 3.

### Step 2 — Create a Website Inbox

1. Go to **Settings → Inboxes → Add Inbox → Website**.
2. Set these values:
   - **Website name:** `SourceDeck`
   - **Website URL:** `https://sourcedeck.app`
   - **Welcome tagline:** `Hi — ask us anything about SourceDeck, plans, or getting started.`
   - **Welcome message:** `I can answer questions about SourceDeck features, pricing, setup, and workflows. What can I help with?`
   - **Widget color:** `#0071e3` (matches site CTA blue) — or `#C9941A` (ARCG gold) if you prefer the gold brand.
   - **Reply time:** `A few minutes`
3. Click **Create Inbox**.
4. Chatwoot shows your **Website Token** — a string like `abc123XYZdef456`. Copy it.

### Step 3 — Paste the token into the widget loader

Open `/assets/chatwoot.js` and replace:

```js
var CHATWOOT_TOKEN = 'PASTE_YOUR_WEBSITE_TOKEN_HERE';
```

with your real token:

```js
var CHATWOOT_TOKEN = 'abc123XYZdef456';  // replace with your actual token
```

If self-hosting, also change:

```js
var CHATWOOT_BASE = 'https://your-chatwoot.example.com';
```

### Step 4 — Import canned responses

Canned responses let agents reply with one keystroke to common questions. 100 are prepared from the SourceDeck knowledge base.

**Option A — Bulk API import (recommended)**

```bash
# From the sourcedeck-site repo root:
CHATWOOT_BASE="https://app.chatwoot.com"
ACCOUNT_ID=1       # your Chatwoot account ID (visible in URL after login)
API_TOKEN="your_agent_api_token"   # Settings → Account → API Access Token

cat docs/chatwoot-canned-responses.json | python3 -c "
import json, sys, urllib.request
data = json.load(sys.stdin)
for c in data:
    body = json.dumps({'short_code': c['short_code'], 'content': c['content']}).encode()
    req = urllib.request.Request(
        '${CHATWOOT_BASE}/api/v1/accounts/${ACCOUNT_ID}/canned_responses',
        data=body,
        headers={'api_access_token': '${API_TOKEN}', 'Content-Type': 'application/json'},
        method='POST')
    try:
        urllib.request.urlopen(req)
        print(f'  ✓ {c[\"short_code\"]}')
    except Exception as e:
        print(f'  ✗ {c[\"short_code\"]}: {e}')
"
```

**Option B — Manual entry (small batch)**

Open Chatwoot → Settings → Canned Responses → Add. Use `chatwoot-canned-responses.json` as your reference: `short_code` = the slash-command trigger, `content` = the reply text, `label` = the original question for your reference.

### Step 5 — Commit and push

```bash
cd ~/sourcedeck-site
git add assets/chatwoot.js
git commit -m "chat: activate Chatwoot with live website token"
git push origin main
```

GitHub Pages will deploy within ~60 seconds. The widget appears on every page automatically.

### Step 6 — Verify

1. Open https://sourcedeck.app in an incognito window.
2. You should see the Chatwoot chat bubble in the bottom-right corner.
3. Click it — the welcome message from Step 2 appears.
4. Type a question — if a human agent is online, they can reply with canned responses using `/short_code`.

## File locations

| Asset | Path | Purpose |
|---|---|---|
| Widget loader | `/assets/chatwoot.js` | Single source of truth for all pages. Edit token/base here only. |
| Knowledge base CSV | `/docs/sourcedeck-knowledge-base.csv` | 100 Q&A rows — the canonical SourceDeck support answers. |
| Canned responses JSON | `/docs/chatwoot-canned-responses.json` | Import-ready for Chatwoot API or manual entry. |
| Knowledge base audit | `/docs/sourcedeck-knowledge-base-audit.md` | Source evidence, coverage map, excluded topics. |
| This setup note | `/docs/chatwoot-setup.md` | You are reading it. |

## Chatwoot Help Center (optional, for self-service)

Chatwoot's Help Center feature (Settings → Help Center → New Portal) lets you create public articles that the widget can surface. If you want to expose the knowledge base as self-service articles:

1. Create a portal named `SourceDeck Help`.
2. Create categories: `Getting Started`, `Plans & Pricing`, `Integrations`, `Campaigns`, `Desktop App`, `Account & Data`, `Support`.
3. Create articles from the CSV Q&A rows — each row becomes one article (question = title, answer = body).
4. Associate the portal with the Website inbox — the widget then shows a "Help Center" tab alongside live chat.

This is manual in Chatwoot's admin UI. The CSV and canned-responses JSON give you the exact content to paste.

## Widget appearance settings

The widget color is set inside the Chatwoot admin inbox settings, not in code. Recommended:

- **Color:** `#0071e3` (SourceDeck site blue, matches CTA buttons) or `#C9941A` (ARCG gold)
- **Position:** Bottom-right (default)
- **Business hours:** set in Settings → Business Hours if you want the widget to show "away" outside operating hours

## What Chatwoot does NOT do (honest boundaries)

- Chatwoot does **not** auto-train an AI on your CSV the way Tidio/Lyro can. The canned responses are agent-assist tools, not customer-facing bot answers.
- For AI-powered auto-reply, Chatwoot supports OpenAI integration (Settings → Integrations → OpenAI) which can suggest replies to agents but does not autonomously answer customers in the free tier.
- Full AI chatbot behavior (where the bot answers directly from your knowledge base) requires either Chatwoot's OpenAI integration with an API key, or a custom bot agent integration.
