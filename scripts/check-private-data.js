#!/usr/bin/env node
// scripts/check-private-data.js
//
// Automated private-data leak detector for the SourceDeck static site.
//
// Why this exists:
//   Prevents owner / user contact data from being shipped in public
//   demo, download, or runtime defaults. Manual QA can miss things;
//   this script fails the build whenever a banned literal or a risky
//   live-contact pattern appears in user-facing surfaces.
//
// Usage:
//   node scripts/check-private-data.js
//
// Exit code:
//   0 = clean
//   1 = at least one violation
//
// No external dependencies. Pure Node.

'use strict';
const fs   = require('fs');
const path = require('path');

// ── Repo-root detection: walk up until we find .git so the script
//    works no matter what cwd the npm wrapper is run from. ──────────
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return start;
}
const REPO = findRepoRoot(__dirname);

// ── Banned literals — exact substring match, case-sensitive where
//    case carries meaning, case-insensitive otherwise. Each entry is a
//    {pattern, flags, reason} record. ──────────────────────────────
const BANNED_LITERALS = [
  // Owner / personal handles
  { pattern: '@arcg.ai',                     flags: 'i', reason: 'owner social handle must not ship' },
  { pattern: 'arcg.ai',                      flags: 'i', reason: 'owner brand domain must not ship as demo data' },
  { pattern: 'jeanmaxc',                     flags: 'i', reason: 'owner LinkedIn handle / personal id must not ship' },
  { pattern: 'jean-max',                     flags: 'i', reason: 'owner personal name must not ship' },
  { pattern: 'Jean Max',                     flags: '',  reason: 'owner personal name must not ship' },
  { pattern: 'Jean-Max',                     flags: '',  reason: 'owner personal name must not ship' },
  { pattern: 'Jeanmax',                      flags: '',  reason: 'owner personal id must not ship' },
  { pattern: 'thekidd2227',                  flags: 'i', reason: 'owner GitHub handle must not ship in user-facing surfaces' },
  { pattern: 'ARCG Business',                flags: '',  reason: 'owner Facebook page name must not ship' },

  // Specific phone / IDs
  { pattern: '100066907957468',              flags: '',  reason: 'owner Facebook page id must not ship' },
  { pattern: '555-906-3676',                 flags: '',  reason: 'owner phone number must not ship' },
  { pattern: '15559063676',                  flags: '',  reason: 'owner phone number (no separators) must not ship' },
  { pattern: '+1 555-906-3676',              flags: '',  reason: 'owner phone number must not ship' },

  // Owner brand / personal infrastructure
  // NOTE: bare "arcgsystems.com" is intentionally NOT banned. It is the
  // legitimate parent-company URL that appears in every page footer
  // ("SourceDeck is an ARCG Systems product") and in vercel.json as the
  // chartnavmd redirect destination. The leak the user cared about
  // (demo "Open Site" card auto-pointing to arcgsystems.com) was fixed
  // by replacing the demo card with "— not configured —" placeholders.
  { pattern: 'arcgsystems.com/assessment',   flags: 'i', reason: 'owner intake form URL must not ship as demo data' },
  { pattern: 'charlie@digiarcgsystems.com',  flags: 'i', reason: 'real owner email must not ship in demo / default state' },
  { pattern: 'digiarcgsystems.com',          flags: 'i', reason: 'owner internal domain must not ship' },
  { pattern: 'DigiARCG',                     flags: 'i', reason: 'owner internal brand must not ship' }
];

// ── Risky pattern checks — flagged in user-facing surfaces unless the
//    matched value is on the explicit safe-list below. ────────────────
const RISKY_PATTERNS = [
  { name: 'instagram_url',     rx: /\binstagram\.com\/[A-Za-z0-9._%-]+/g,                    reason: 'live Instagram link in user-facing surface — use placeholder' },
  { name: 'linkedin_in_url',   rx: /\blinkedin\.com\/in\/[A-Za-z0-9._%-]+/g,                 reason: 'live LinkedIn profile link in user-facing surface — use placeholder' },
  { name: 'facebook_profile',  rx: /\bfacebook\.com\/profile\.php\?id=\d+/g,                 reason: 'live Facebook profile id in user-facing surface — use placeholder' },
  { name: 'whatsapp_link',     rx: /\bwa\.me\/\d+/g,                                          reason: 'live WhatsApp link in user-facing surface — use placeholder' },
  { name: 'tel_link',          rx: /\btel:\+?\d[\d\s().-]{5,}/g,                             reason: 'live tel: link in user-facing surface — use placeholder' },
  { name: 'mailto_link',       rx: /\bmailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, reason: 'mailto link — only company allowlist may ship' },
  { name: 'real_email',        rx: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,    reason: 'real-looking email address in user-facing surface' },
  { name: 'us_phone',          rx: /(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?[2-9]\d{2}[\s.-]?\d{4}\b/g, reason: 'raw US-shaped phone number — use placeholder' }
];

// ── Safe values that can appear inside risky patterns without flagging. ──
const SAFE_EMAIL_ALLOWLIST = new Set([
  // Company-owned addresses already used intentionally throughout the site
  // (legacy typo'd domain — kept allowlisted only for any operational
  //  references that may still exist in non-user-facing files)
  'sales@arivergrop.com',
  'api@arivergrop.com',
  'security@arivergrop.com',
  // Current commercial-access + ops addresses on the correctly-spelled domain
  'info@arivergroup.com',
  'sales@arivergroup.com',
  'security@arivergroup.com',
  'api@arivergroup.com',
  // SourceDeck product addresses (welcome / system mail)
  'welcome@sourcedeck.app',
  'noreply@sourcedeck.app',
  'support@sourcedeck.app',
  // Synthetic / docs placeholders
  'user@example.com', 'demo@example.com', 'placeholder@example.com',
  'test@example.com', 'no-reply@example.com', 'noreply@example.com',
  'name@example.com', 'someone@example.org',
  // Internal automated co-author trailer
  'noreply@anthropic.com'
]);
// Email *domains* that are safe by construction (synthetic, reserved,
// or product-internal). Anything matching `*@<safe-domain>` is allowed.
const SAFE_EMAIL_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net',
  'example.invalid', 'example1.invalid', 'example2.invalid',
  'company.com',          // generic placeholder used in inbound demo
  'acmeprop.com',         // synthetic operator example in webhooks demo
  'examplerealty.com',    // synthetic case-study domain in demo prompts
  'example.realty',       // synthetic alternate-TLD case-study domain in demo prompts
  'sourcedeck.app',       // product-owned addresses
  'anthropic.com'         // co-author trailers
]);
// LinkedIn / social URLs that are explicit placeholders, not real handles.
const SAFE_SOCIAL_URLS = new Set([
  'linkedin.com/in/example-contact',
  'linkedin.com/in/example',
  'linkedin.com/in/...'
]);
// Fictional NANP subscriber blocks reserved for use in fiction
// (NXX = 555, subscriber 0100-0199 and 1000-1999). Skip these in
// the us_phone risky check.
function isReservedFictionalNANP(s) {
  const digits = String(s).replace(/\D+/g, '');
  // strip leading country code 1
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (ten.length !== 10) return false;
  const exch = ten.slice(3, 6);
  const sub  = ten.slice(6);
  if (exch !== '555') return false;
  // 555-0100 through 555-0199 — reserved for fiction (FCC)
  if (sub.startsWith('01')) return true;
  // 555-1000 through 555-1999 — historically reserved / commonly used in fiction
  if (sub.startsWith('1')) return true;
  return false;
}
const SAFE_DOMAIN_FRAGMENTS = ['example.com', 'example.org', 'example.net', 'sourcedeck.app', 'arivergrop.com', 'arivergroup.com'];

// ── Scope: directories to scan and skip. ────────────────────────────
const SCAN_DIRS = [
  // user-spec list:
  'app', 'assets', 'public', 'src', 'components', 'pages',
  'enterprise', 'security', 'agents', 'command', 'compliance',
  'portal', 'm', 'server',
  // also worth scanning, all user-facing surfaces:
  'inbound', 'packs', 'pricing', 'quote', 'settings', 'status',
  'changelog', 'api', 'auth', 'download', 'onboarding', 'activate',
  'thanks', 'invoice', 'checkout', 'sales', 'webhooks',
  'integrations', 'variants', '_workers'
];
const SCAN_ROOT_FILES = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'sw.js'];

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.vercel', 'dist', 'build', 'coverage',
  '.data', '.next', 'docs',                  // docs allowed to discuss banned values
  // server-side test/script subtrees: tests/scripts may contain deliberate fixtures
  'server/test', 'server/scripts', 'server/node_modules'
]);

const SCAN_EXTS = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

// Files where a banned literal is allowed (the script itself).
const SELF_PATH = path.relative(REPO, __filename);
const ALLOW_BANNED_IN_FILES = new Set([SELF_PATH, 'scripts/check-private-data.js']);

// ── Collect files. ──────────────────────────────────────────────────
function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(REPO, abs);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || SKIP_DIRS.has(rel)) continue;
      walk(abs, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!SCAN_EXTS.has(ext)) continue;
      out.push(abs);
    }
  }
}

const files = [];
for (const f of SCAN_ROOT_FILES) {
  const abs = path.join(REPO, f);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) files.push(abs);
}
for (const d of SCAN_DIRS) {
  const abs = path.join(REPO, d);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) walk(abs, files);
}
// Always scan the project's other top-level HTML files we may have missed.
{
  let topEntries;
  try { topEntries = fs.readdirSync(REPO, { withFileTypes: true }); } catch { topEntries = []; }
  for (const e of topEntries) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!SCAN_EXTS.has(ext)) continue;
    const abs = path.join(REPO, e.name);
    if (!files.includes(abs)) files.push(abs);
  }
}

// ── Run the scan. ──────────────────────────────────────────────────
const violations = [];

function pushViolation(file, rule, match, reason) {
  const rel = path.relative(REPO, file);
  violations.push({ file: rel, rule, match, reason });
}

function checkBannedLiterals(file, content) {
  const rel = path.relative(REPO, file);
  if (ALLOW_BANNED_IN_FILES.has(rel)) return;
  for (const { pattern, flags, reason } of BANNED_LITERALS) {
    const haystack = (flags || '').includes('i') ? content.toLowerCase() : content;
    const needle   = (flags || '').includes('i') ? pattern.toLowerCase() : pattern;
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      // Context-aware exception: "thekidd2227" is the owner's GitHub
      // username and is part of legitimate repo URLs that get rendered
      // as "view source on GitHub" links. Allow it only when wrapped
      // in `github.com/thekidd2227/`. Any other appearance still fails.
      if (pattern === 'thekidd2227') {
        const ctxStart = Math.max(0, idx - 12);
        const ctxEnd   = Math.min(haystack.length, idx + needle.length + 1);
        const ctx = haystack.slice(ctxStart, ctxEnd);
        if (ctx.includes('github.com/thekidd2227/')) {
          idx = haystack.indexOf(needle, idx + needle.length);
          continue;
        }
      }
      pushViolation(file, 'banned_literal', pattern, reason);
      idx = haystack.indexOf(needle, idx + needle.length);
    }
  }
}

function checkRiskyPatterns(file, content) {
  for (const { name, rx, reason } of RISKY_PATTERNS) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(content)) !== null) {
      const matched = m[0];
      // Allow safe email addresses + safe domains.
      if (name === 'real_email' || name === 'mailto_link') {
        const email = matched.replace(/^mailto:/, '').toLowerCase();
        if (SAFE_EMAIL_ALLOWLIST.has(email)) continue;
        // Allow query-stringy "?subject=..." companions to allowlisted addresses
        const stripped = email.split('?')[0];
        if (SAFE_EMAIL_ALLOWLIST.has(stripped)) continue;
        // Allow any email whose domain is in the safe-domain set.
        const at = stripped.lastIndexOf('@');
        if (at !== -1) {
          const domain = stripped.slice(at + 1);
          if (SAFE_EMAIL_DOMAINS.has(domain)) continue;
        }
      }
      if (name === 'linkedin_in_url') {
        // Allow explicit synthetic placeholders.
        const lower = matched.toLowerCase();
        const trimmed = lower.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        if (SAFE_SOCIAL_URLS.has(trimmed)) continue;
      }
      if (name === 'us_phone') {
        // Skip false positives that look phone-shaped but are obviously not:
        // - 4-or-fewer digits in a row → already excluded by regex
        // - inline year like 2026-04-30 → still might match; allowlist common date-like sequences
        if (/^20\d{2}[-/.]\d{2}[-/.]\d{2}/.test(matched)) continue;
        // NANP-reserved fictional subscriber blocks (555-01xx, 555-1xxx) are
        // explicitly safe to ship in demo data.
        if (isReservedFictionalNANP(matched)) continue;
        // Explicit test fixtures: skip 555-906-3676 here so the BANNED_LITERAL
        // rule is the one that flags it (cleaner output, single hit).
      }
      pushViolation(file, name, matched.slice(0, 80), reason);
    }
  }
}

for (const f of files) {
  let content;
  try { content = fs.readFileSync(f, 'utf8'); }
  catch { continue; }
  checkBannedLiterals(f, content);
  checkRiskyPatterns(f, content);
}

// ── Output. ────────────────────────────────────────────────────────
if (violations.length === 0) {
  console.log('PRIVATE DATA CHECK: clean (' + files.length + ' files scanned)');
  process.exit(0);
}

console.log('PRIVATE DATA CHECK FAILED');
console.log('  files scanned: ' + files.length);
console.log('  violations:    ' + violations.length);
console.log('');

for (const v of violations) {
  console.log('PRIVATE DATA CHECK FAILED');
  console.log('file:   ' + v.file);
  console.log('rule:   ' + v.rule);
  console.log('match:  ' + v.match);
  console.log('reason: ' + v.reason);
  console.log('');
}

process.exit(1);
