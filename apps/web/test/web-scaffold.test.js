import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('PWA manifest uses SourceDeck app identity and standalone display', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.name, 'SourceDeck');
  assert.equal(manifest.short_name, 'SourceDeck');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/dashboard');
});

test('provider settings are blank by default', () => {
  const providers = read('src/lib/providers.ts');
  for (const id of ['openai', 'anthropic', 'ibm_watson', 'airtable', 'enrichment', 'buffer']) {
    assert.match(providers, new RegExp(id));
  }
  assert.doesNotMatch(providers, /configured['"]?\s*:\s*true/);
});

test('web scaffold contains no seeded private operating data', () => {
  const files = [
    'app/page.tsx',
    'app/dashboard/page.tsx',
    'app/pipeline/page.tsx',
    'app/settings/providers/page.tsx',
    'public/manifest.webmanifest'
  ];
  const text = files.map(read).join('\n');
  assert.doesNotMatch(text, /seeded private workspace|private operator data|personal env/i);
});

test('service worker does not cache tenant data in phase 1', () => {
  const sw = read('public/sw.js');
  assert.match(sw, /does not cache tenant data/i);
  assert.doesNotMatch(sw, /caches\.open/);
});
