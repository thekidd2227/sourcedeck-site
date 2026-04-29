import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { validateUpload } from '../src/middleware/uploadValidation.js';

const cfg = loadConfig({});

test('upload: accepts allowed pdf', () => {
  const r = validateUpload({ mimetype: 'application/pdf', originalname: 'a.pdf', size: 1024 }, cfg);
  assert.equal(r.ok, true);
});

test('upload: rejects unsupported type', () => {
  const r = validateUpload({ mimetype: 'image/png', originalname: 'a.png', size: 1024 }, cfg);
  assert.deepEqual(r, { ok: false, code: 'unsupported_type' });
});

test('upload: rejects oversized', () => {
  const r = validateUpload({ mimetype: 'application/pdf', originalname: 'a.pdf', size: 999 * 1024 * 1024 }, cfg);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'too_large');
});

test('upload: rejects path traversal in filename', () => {
  const r1 = validateUpload({ mimetype: 'application/pdf', originalname: '../boot.pdf', size: 10 }, cfg);
  assert.equal(r1.ok, false);
  const r2 = validateUpload({ mimetype: 'application/pdf', originalname: 'a/b.pdf', size: 10 }, cfg);
  assert.equal(r2.ok, false);
  const r3 = validateUpload({ mimetype: 'application/pdf', originalname: 'a\\b.pdf', size: 10 }, cfg);
  assert.equal(r3.ok, false);
});

test('upload: rejects mime/extension mismatch', () => {
  const r = validateUpload({ mimetype: 'application/pdf', originalname: 'a.txt', size: 10 }, cfg);
  assert.deepEqual(r, { ok: false, code: 'extension_mismatch' });
});
