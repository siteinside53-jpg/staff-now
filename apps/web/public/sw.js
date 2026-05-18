/**
 * StaffNow Service Worker
 *
 * Strategy:
 * - App shell (static assets under /_next/static) → cache-first, long-lived
 * - HTML pages → network-first with offline fallback
 * - API calls → network-only (never cached, always fresh)
 * - Images & fonts → cache-first
 *
 * Versioned cache keys allow clean upgrades on new deploys.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `staffnow-static-${CACHE_VERSION}`;
const PAGES_CACHE = `staffnow-pages-${CACHE_VERSION}`;
const IMAGE_CACHE = `staffnow-images-${CACHE_VERSION}`;

// Assets pre-cached on install
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
];

// ---------- Install: pre-cache critical assets ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ---------- Activate: clean up old versions ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.endsWith(`-${CACHE_VERSION}`))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------- Fetch: routing based on request type ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Never cache API calls (workers.dev or /admin routes on external host)
  if (url.hostname.includes('workers.dev') || url.hostname.includes('wixapis')) {
    return; // let the browser handle directly
  }

  // Cross-origin fonts (Google Fonts)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Same-origin only from here on
  if (url.origin !== self.location.origin) return;

  // Static Next.js assets — cache-first, immutable
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Images
  if (/\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // HTML navigation — network-first with offline fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(req, PAGES_CACHE));
    return;
  }

  // Default: try network, fall back to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// ---------- Strategies ----------

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('', { status: 504 });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Offline fallback
    const fallback = await cache.match('/');
    return fallback || new Response('Εκτός σύνδεσης', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

// ---------- Message handler (for manual cache busting) ----------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
