import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('config: dev defaults', () => {
  const cfg = loadConfig({});
  assert.equal(cfg.appEnv, 'development');
  assert.equal(cfg.storage.provider, 'local');
  assert.equal(cfg.ai.provider, 'mock');
  assert.equal(cfg.upload.maxMb, 25);
  assert.ok(cfg.upload.allowedTypes.includes('application/pdf'));
});

test('config: production requires secrets', () => {
  assert.throws(() => loadConfig({ APP_ENV: 'production' }), /missing required production env vars/);
});

test('config: rejects unknown enum values', () => {
  assert.throws(() => loadConfig({ STORAGE_PROVIDER: 'azure' }), /STORAGE_PROVIDER/);
  assert.throws(() => loadConfig({ AI_PROVIDER: 'gpt' }),       /AI_PROVIDER/);
});

test('config: production with required secrets succeeds', () => {
  const cfg = loadConfig({
    APP_ENV: 'production',
    SESSION_SECRET: 'x'.repeat(32),
    JWT_SECRET:     'y'.repeat(32)
  });
  assert.equal(cfg.isProduction, true);
});

test('config: parses ALLOWED_UPLOAD_TYPES list', () => {
  const cfg = loadConfig({ ALLOWED_UPLOAD_TYPES: 'application/pdf, text/plain ,text/csv' });
  assert.deepEqual(cfg.upload.allowedTypes, ['application/pdf', 'text/plain', 'text/csv']);
});
