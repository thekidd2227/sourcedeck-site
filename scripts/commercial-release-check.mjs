#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DEPLOYMENT_MODE, canUseManagedIbmWatson } from '../packages/core/src/deploymentMode.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['apps/web', 'packages/core', 'server/src'];
const SKIP = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.vercel']);

function fail(message) {
  console.error('[commercial-check] FAIL: ' + message);
  process.exit(1);
}

function info(message) {
  console.log('[commercial-check] ' + message);
}

function walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

function redact(value) {
  if (!value) return '[REDACTED]';
  if (value.length <= 8) return '[REDACTED]';
  return value.slice(0, 3) + '...[REDACTED]...' + value.slice(-3);
}

function checkEnvExample() {
  const p = path.join(ROOT, '.env.example');
  if (!fs.existsSync(p)) fail('.env.example is missing');
  const text = fs.readFileSync(p, 'utf8');
  const env = Object.fromEntries(text.split(/\r?\n/)
    .filter(line => line && !line.trim().startsWith('#'))
    .map(line => {
      const i = line.indexOf('=');
      return i >= 0 ? [line.slice(0, i), line.slice(i + 1)] : [line, undefined];
    }));

  if (env.SOURCEDECK_DEPLOYMENT_MODE !== 'commercial') {
    fail('.env.example must set SOURCEDECK_DEPLOYMENT_MODE=commercial');
  }
  for (const key of [
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'IBM_WATSON_API_KEY', 'IBM_WATSON_URL',
    'AIRTABLE_TOKEN', 'APOLLO_API_KEY', 'HUNTER_API_KEY', 'SERPAPI_KEY',
    'BUFFER_ACCESS_TOKEN', 'STRIPE_SECRET_KEY', 'DATABASE_URL', 'AUTH_SECRET'
  ]) {
    if (!Object.prototype.hasOwnProperty.call(env, key)) fail('.env.example missing ' + key);
    if (env[key] !== '') fail('.env.example must leave ' + key + ' blank');
  }
}

function checkSource() {
  const patterns = [
    { rx: /sk-(?:live|test|proj|ant|ant-api03)[A-Za-z0-9_\-]{12,}/g, label: 'AI key' },
    { rx: /\bBearer\s+[A-Za-z0-9._\-]{12,}/g, label: 'Bearer token' },
    { rx: /\bpat[A-Za-z0-9_\-]{24,}/g, label: 'Airtable PAT' },
    { rx: /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|IBM_WATSON_API_KEY|AIRTABLE_TOKEN|APOLLO_API_KEY|HUNTER_API_KEY|SERPAPI_KEY|BUFFER_ACCESS_TOKEN|STRIPE_SECRET_KEY|PASSWORD|SECRET|TOKEN)\s*=\s*\S+/g, label: 'non-empty secret assignment' },
    { rx: /\/Users\/jean-maxcharles|Charlie['’]s private|digiarcgsystems/i, label: 'private operator reference' }
  ];
  for (const rel of SCAN_DIRS.flatMap(walk)) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const rule of patterns) {
      const match = rule.rx.exec(text);
      rule.rx.lastIndex = 0;
      if (match) fail(`${rel} contains ${rule.label}: ${redact(match[0])}`);
    }
  }
}

function checkDeploymentGate() {
  if (DEFAULT_DEPLOYMENT_MODE !== 'commercial') fail('default deployment mode must be commercial');
  if (canUseManagedIbmWatson({
    deploymentMode: 'commercial',
    userTier: 'federal',
    entitlements: { ibm_watson_managed: true }
  })) fail('commercial users must not receive managed IBM Watson');
  if (!canUseManagedIbmWatson({
    deploymentMode: 'enterprise_managed',
    userTier: 'enterprise_managed',
    entitlements: { ibm_watson_managed: true }
  })) fail('enterprise managed entitled users should pass IBM Watson gate');
}

checkEnvExample();
checkSource();
checkDeploymentGate();
info('PASS: commercial web source is blank-key, BYOK-first, and IBM managed access is entitlement-gated.');
