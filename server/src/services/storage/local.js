// server/src/services/storage/local.js
// Local filesystem storage adapter for development. Generates storage IDs;
// never trusts user-supplied filenames as paths. Path-traversal safe.

import { mkdir, writeFile, readFile, stat, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, join } from 'node:path';

function randomKey(prefix = 'obj') {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return prefix + '_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function createLocalStorage(opts = {}) {
  const baseDir = resolve(opts.dir || './.data/uploads');

  async function ensureDir() {
    await mkdir(baseDir, { recursive: true });
  }

  function safeJoin(key) {
    // Storage keys are server-generated. Reject anything that escapes baseDir.
    const target = resolve(join(baseDir, key));
    if (!target.startsWith(baseDir + '/') && target !== baseDir) {
      throw new Error('storage: path traversal blocked');
    }
    return target;
  }

  return {
    name: 'local',

    async put({ buffer, contentType, originalFilename, tenantId }) {
      await ensureDir();
      const key = randomKey('obj');
      const path = safeJoin(key);
      await writeFile(path, buffer);
      return {
        provider:         'local',
        key,
        size:             buffer.length,
        contentType:      contentType || 'application/octet-stream',
        originalFilename: originalFilename || null,
        tenantId:         tenantId || null,
        createdAt:        new Date().toISOString()
      };
    },

    async getStream(key) {
      const path = safeJoin(key);
      await stat(path);
      return createReadStream(path);
    },

    async getBuffer(key) {
      const path = safeJoin(key);
      return readFile(path);
    },

    async remove(key) {
      const path = safeJoin(key);
      try { await unlink(path); } catch { /* idempotent */ }
    }
  };
}
