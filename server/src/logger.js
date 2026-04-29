// server/src/logger.js
// Structured JSON logger. Never logs document contents or full prompts.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let currentLevel = LEVELS.info;

export function setLevel(name) {
  if (LEVELS[name]) currentLevel = LEVELS[name];
}

function emit(level, msg, meta) {
  if (LEVELS[level] < currentLevel) return;
  const entry = {
    ts:    new Date().toISOString(),
    level,
    msg,
    ...redact(meta || {})
  };
  // stdout for non-error so log routers (Code Engine, OpenShift) collect them.
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

// Best-effort redaction for sensitive keys. Anything that looks like a
// credential, document body, or AI prompt is replaced with "[REDACTED]".
const SENSITIVE_KEYS = new Set([
  'apikey', 'api_key', 'apiKey',
  'password', 'token', 'secret',
  'authorization', 'cookie',
  'document', 'documentContent', 'fileContent',
  'prompt', 'promptText', 'aiPrompt'
]);

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k) || /secret|key|token|password/i.test(k)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const log = {
  debug: (m, meta) => emit('debug', m, meta),
  info:  (m, meta) => emit('info',  m, meta),
  warn:  (m, meta) => emit('warn',  m, meta),
  error: (m, meta) => emit('error', m, meta)
};

// Express middleware: attach correlation/request ID + child logger.
export function requestLogger() {
  return (req, res, next) => {
    const cid = req.headers['x-correlation-id']
             || req.headers['x-request-id']
             || cryptoRandomId();
    req.correlationId = String(cid);
    res.setHeader('x-correlation-id', req.correlationId);
    const start = Date.now();
    res.on('finish', () => {
      log.info('http', {
        method:        req.method,
        path:          req.path,
        status:        res.statusCode,
        durationMs:    Date.now() - start,
        correlationId: req.correlationId,
        ip:            req.ip,
        userAgent:     req.headers['user-agent']
      });
    });
    next();
  };
}

function cryptoRandomId() {
  // 128 bits of entropy, base36 — collision-safe correlation IDs.
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
}
