// server/src/middleware/uploadValidation.js
// Pure upload validator — no multer dependency. Used both by the multer
// fileFilter and by unit tests.

import { extname } from 'node:path';

export const EXT_BY_MIME = {
  'application/pdf':                                                          '.pdf',
  'application/msword':                                                       '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  '.docx',
  'text/plain':                                                               '.txt',
  'text/csv':                                                                 '.csv'
};

export function validateUpload({ mimetype, originalname, size }, cfg) {
  const allowed = new Set(cfg.upload.allowedTypes.map(t => t.toLowerCase()));
  const mime = (mimetype || '').toLowerCase();
  if (!allowed.has(mime))                                       return { ok: false, code: 'unsupported_type' };
  if (size > cfg.upload.maxMb * 1024 * 1024)                    return { ok: false, code: 'too_large' };
  if (!originalname)                                            return { ok: false, code: 'missing_filename' };
  if (originalname.includes('..') || originalname.includes('/') || originalname.includes('\\') || originalname.includes('\0')) {
    return { ok: false, code: 'invalid_filename' };
  }
  const ext = extname(originalname).toLowerCase();
  const expected = EXT_BY_MIME[mime];
  if (ext && expected && ext !== expected)                      return { ok: false, code: 'extension_mismatch' };
  return { ok: true };
}
