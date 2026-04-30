/* SourceDeck Service Worker — minimal, safety-first.
 *
 * Caches the public marketing shell only:
 *   - Top-level navigation HTML for landing
 *   - Stylesheets, fonts, manifest, icon assets
 *
 * NEVER caches:
 *   - /api/* responses (authenticated)
 *   - /app/*  (operator surfaces — auth-bound state)
 *   - /portal/*, /command/*, /settings/*, /m/*
 *   - Uploaded documents
 *   - AI outputs
 *
 * Strategy: stale-while-revalidate for the marketing shell, network-only
 * for everything else.
 */

const VERSION = 'sd-v3';
const SHELL_CACHE = `${VERSION}-shell`;

const SHELL_ALLOWLIST = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/site.webmanifest',
  '/assets/sd-theme.css'
];

// Paths we will never cache, even if the request happens to be GET.
const NEVER_CACHE_PATHS = [
  '/api/',
  '/app/',
  '/portal/',
  '/command/',
  '/settings/',
  '/m/',
  '/inbound/',
  '/approvals/',
  '/checkout/',
  '/auth/callback/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ALLOWLIST))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isNeverCache(url) {
  const u = new URL(url);
  // Only same-origin gets cached.
  if (u.origin !== self.location.origin) return true;
  if (u.search) return true; // queries imply dynamic / personalized
  return NEVER_CACHE_PATHS.some(p => u.pathname.startsWith(p));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.get('authorization')) return;          // never cache authed
  if (req.headers.get('cookie')) {
    // Cookie-bearing requests may be auth-state-dependent — pass through.
    return;
  }
  if (isNeverCache(req.url)) return;                     // pass-through

  // Stale-while-revalidate for the marketing shell.
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then(resp => {
      // Only cache 200 OK basic responses.
      if (resp && resp.status === 200 && resp.type === 'basic') {
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    }).catch(() => cached);
    return cached || networkPromise;
  })());
});
