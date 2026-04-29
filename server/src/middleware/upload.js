// server/src/middleware/upload.js
// Secure upload validator. Wraps multer with size/type/path-traversal checks.

import multer from 'multer';
import { extname } from 'node:path';
import { validateUpload, EXT_BY_MIME } from './uploadValidation.js';
export { validateUpload };

export function createUploadMiddleware(cfg) {
  const limits = { fileSize: cfg.upload.maxMb * 1024 * 1024, files: 1 };
  const allowed = new Set(cfg.upload.allowedTypes.map(t => t.toLowerCase()));

  const multerInst = multer({
    storage: multer.memoryStorage(),
    limits,
    fileFilter(req, file, cb) {
      const mime = (file.mimetype || '').toLowerCase();
      if (!allowed.has(mime)) {
        return cb(new UploadError('upload: unsupported content type', 415));
      }
      // Reject names with path traversal hints. We never use these as paths
      // (storage IDs are server-generated), but reject anyway.
      const name = file.originalname || '';
      if (name.includes('..') || name.includes('/') || name.includes('\\') || name.includes('\0')) {
        return cb(new UploadError('upload: invalid filename', 400));
      }
      // Sanity: extension should match declared mime when present.
      const ext = extname(name).toLowerCase();
      const expected = EXT_BY_MIME[mime];
      if (ext && expected && ext !== expected) {
        return cb(new UploadError('upload: extension/mime mismatch', 400));
      }
      cb(null, true);
    }
  }).single('file');

  return function uploadHandler(req, res, next) {
    multerInst(req, res, (err) => {
      if (err instanceof UploadError) return res.status(err.status).json({ error: err.message });
      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'upload: file too large', maxMb: cfg.upload.maxMb });
      }
      if (err) return res.status(400).json({ error: 'upload: ' + (err.code || err.message) });
      if (!req.file) return res.status(400).json({ error: 'upload: file field required' });
      next();
    });
  };
}

export class UploadError extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}
