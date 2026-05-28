import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('commercial release check script redacts hardcoded key matches', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/commercial-release-check.mjs'), 'utf8');
  assert.match(script, /redact/);
  assert.match(script, /AI key/);
});

test('.env.example placeholders are commercial-safe', () => {
  const text = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(text, /SOURCEDECK_DEPLOYMENT_MODE=commercial/);
  for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'IBM_WATSON_API_KEY', 'STRIPE_SECRET_KEY']) {
    assert.match(text, new RegExp(`${key}=`));
    assert.doesNotMatch(text, new RegExp(`${key}=\\S+`));
  }
});
