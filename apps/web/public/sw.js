// SourceDeck PWA service worker placeholder.
// Phase 1 intentionally does not cache tenant data, provider responses,
// credentials, API responses, AI outputs, or uploaded files.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
