---
name: handoff-report
description: Produce a structured operator-grade handoff report at the end of a change. Use after landing any substantive edit, before declaring a task complete.
---

# Handoff Report

Use this skill to produce the final report for any non-trivial change in this repo.

## When to trigger
- Immediately after the last edit of a substantive task.
- Before announcing the task complete.
- When the operator asks for a "report," "summary," "handoff," or "status."

## Required structure

Return the report in this exact order:

1. **FILES CHANGED**
   Table: file path · change type (new / modified / renamed / deleted) · line-count delta.

2. **ROUTES TOUCHED**
   For every URL path this change affects, list the path and the HTTP status returned by a local static server probe. Use:
   ```
   (cd ~/sourcedeck-site && python3 -m http.server 8778 --bind 127.0.0.1 >/tmp/sd.log 2>&1 &); sleep 1
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8778<path>
   pkill -f 'http.server 8778' 2>/dev/null
   ```
   Any non-200 must be explained.

3. **RESIDUE SCAN**
   Run and report counts for each:
   - Legacy pricing: `grep -rnE '\$49\b|\$149\b|\$588\b' --include="*.html" . | grep -v 'legacy subs\|price_1TMQ\|app/demo\|app/downloads'`
   - `/sales/` nav links: `grep -n '/sales/' index.html`
   - Real Airtable base ID leaked to demo: `grep -c 'appfQRV1tGk3sWMCb' app/demo/index.html app/downloads/sourcedeck-lcc.html`
   - Hardcoded secrets (`sk_live`, `whsec_`, `patOV9`, `INSTANTLY_API_KEY=[A-Z]`): must be 0.
   All expected to be 0. Any non-zero blocks the report from being marked complete.

4. **PARITY STATUS**
   md5 of `app/demo/index.html` and `app/downloads/sourcedeck-lcc.html` — must match.

5. **JS SYNTAX**
   For every `.html` edited, parse each `<script>` block with `new Function()` and report block count + error count (must be 0).

6. **COMMIT**
   Commit SHA on `main`, push result, GitHub Pages ETA (~2 min).

7. **REMAINING MANUAL STEPS**
   Only items that genuinely require operator action outside this repo: Stripe Dashboard toggles, DNS, Worker deploy, OAuth app registration, KV namespace creation, Cloudflare Access, Tidio content upload, etc. Keep this list as short as physically possible.

## Non-negotiables
- No marketing language.
- No "looks good" without evidence.
- No claim of deployment without a commit SHA and push confirmation.
- If any residue scan returns non-zero, the report ends with **NO-GO** and names the fix.
