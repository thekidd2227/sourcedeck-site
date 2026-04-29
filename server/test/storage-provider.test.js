import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createStorage } from '../src/services/storage/index.js';
import { createLocalStorage } from '../src/services/storage/local.js';

test('storage: dev default selects local provider', async () => {
  const cfg = loadConfig({});
  const s = await createStorage(cfg);
  assert.equal(s.name, 'local');
});

test('storage.local: put generates server-side key, preserves filename as metadata', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sd-store-'));
  const s = createLocalStorage({ dir });
  const buf = Buffer.from('hello world');

  const meta = await s.put({
    buffer: buf,
    contentType: 'text/plain',
    originalFilename: '../etc/passwd' // attempted path traversal
  });
  // Stored key never echoes the user-supplied filename.
  assert.match(meta.key, /^obj_[a-f0-9]+$/);
  assert.equal(meta.originalFilename, '../etc/passwd');

  const round = await s.getBuffer(meta.key);
  assert.equal(round.toString(), 'hello world');

  await s.remove(meta.key);
  await rm(dir, { recursive: true, force: true });
});

test('storage.local: rejects path-traversal in storage keys', async () => {
  const s = createLocalStorage({ dir: '/tmp/sd-storage-test-x' });
  await assert.rejects(() => s.getBuffer('../../etc/passwd'), /path traversal/);
});
