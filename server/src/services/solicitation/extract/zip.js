// server/src/services/solicitation/extract/zip.js
// Minimal, dependency-free, READ-ONLY ZIP reader (node:zlib only). Used to
// parse real .xlsx bytes (an XLSX is a ZIP of XML parts) and, in Milestone B,
// to safely extract solicitation .zip packages.
//
// Security: reads the central directory (no reliance on local headers for
// names), enforces a max entry count, max single-entry inflated size, and a
// max total inflated size (zip-bomb guard), and rejects absolute paths and
// "../" traversal in entry names.

import zlib from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CEN_SIG  = 0x02014b50;

const DEFAULTS = {
  maxEntries: 2000,
  maxEntrySize: 50 * 1024 * 1024,   // 50 MB inflated per entry
  maxTotalSize: 200 * 1024 * 1024   // 200 MB inflated total (zip-bomb guard)
};

export function isUnsafeEntryName(name) {
  if (!name) return true;
  if (name.startsWith('/') || name.startsWith('\\')) return true;
  if (/^[A-Za-z]:[\\/]/.test(name)) return true;           // C:\ ...
  const parts = name.split(/[\\/]/);
  return parts.includes('..');
}

/**
 * Parse a ZIP buffer's central directory.
 * @returns Array<{ name, compMethod, compSize, uncompSize, localOffset }>
 */
export function readCentralDirectory(buf, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const eocd = findEOCD(buf);
  if (!eocd) throw new Error('zip: end-of-central-directory not found (not a zip?)');
  const { count, cdOffset } = eocd;
  if (count > o.maxEntries) throw new Error(`zip: too many entries (${count} > ${o.maxEntries})`);

  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CEN_SIG) throw new Error('zip: bad central directory signature');
    const compMethod = buf.readUInt16LE(p + 10);
    const compSize   = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen    = buf.readUInt16LE(p + 28);
    const extraLen   = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({ name, compMethod, compSize, uncompSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Inflate one entry to a Buffer, enforcing size guards.
 */
export function readEntry(buf, entry, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (entry.uncompSize > o.maxEntrySize) {
    throw new Error(`zip: entry "${entry.name}" too large (${entry.uncompSize} > ${o.maxEntrySize})`);
  }
  // Local file header: 30 bytes + name + extra, then data.
  const lo = entry.localOffset;
  if (buf.readUInt32LE(lo) !== 0x04034b50) throw new Error('zip: bad local header');
  const nameLen  = buf.readUInt16LE(lo + 26);
  const extraLen = buf.readUInt16LE(lo + 28);
  const dataStart = lo + 30 + nameLen + extraLen;
  const comp = buf.subarray(dataStart, dataStart + entry.compSize);

  let out;
  if (entry.compMethod === 0) out = Buffer.from(comp);        // stored
  else if (entry.compMethod === 8) out = zlib.inflateRawSync(comp); // deflate
  else throw new Error(`zip: unsupported compression method ${entry.compMethod}`);

  if (out.length > o.maxEntrySize) throw new Error(`zip: inflated entry exceeds limit`);
  return out;
}

/**
 * Read selected (or all) entries into a Map<name, Buffer>, enforcing the
 * zip-bomb total-size guard and rejecting unsafe names.
 * @param wanted optional predicate(name) to limit which entries are inflated.
 */
export function readZip(buf, { wanted = null, ...opts } = {}) {
  const o = { ...DEFAULTS, ...opts };
  const entries = readCentralDirectory(buf, o);
  const out = new Map();
  let total = 0;
  for (const e of entries) {
    if (isUnsafeEntryName(e.name)) throw new Error(`zip: unsafe entry name "${e.name}"`);
    if (e.name.endsWith('/')) continue; // directory
    if (wanted && !wanted(e.name)) continue;
    const data = readEntry(buf, e, o);
    total += data.length;
    if (total > o.maxTotalSize) throw new Error('zip: total inflated size exceeds limit (possible zip bomb)');
    out.set(e.name, data);
  }
  return out;
}

function findEOCD(buf) {
  // EOCD is at the end; scan back up to 64KB + 22 for the signature.
  const min = Math.max(0, buf.length - (0xffff + 22));
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      return { count: buf.readUInt16LE(i + 10), cdOffset: buf.readUInt32LE(i + 16) };
    }
  }
  return null;
}
