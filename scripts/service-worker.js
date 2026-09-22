// Build replaces the file list and revision. No third-party or user data is cached.
const FILES = __PRECACHE_FILES__;
const ROOT = new URL('./', self.location.href);
const PREFIX = `gbh-${ROOT.pathname}-`;
const CACHE = `${PREFIX}__CACHE_VERSION__`;
const URLS = new Set(FILES.map(file => new URL(file, ROOT).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Atomic activation: a failed download keeps the previous version active.
    await cache.addAll([...URLS].map(url => new Request(url, { cache: 'reload' })));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  const entry = new URL('index.html', ROOT).href;
  const isEntry = url.pathname === ROOT.pathname || url.pathname === new URL(entry).pathname;
  const key = event.request.mode === 'navigate' && isEntry ? entry : `${url.origin}${url.pathname}`;
  if (!URLS.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(key) || fetch(event.request);
  })());
});
