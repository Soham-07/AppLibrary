const CACHE = 'hangar-shell-v1';

self.addEventListener('install', () => {
  // Wait for the user to confirm via the in-app "Refresh" button (see message handler)
  // rather than taking over immediately — avoids interrupting an in-progress dock/undock.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept GitHub data/API calls, or our own app manifest/app files —
  // these must always hit the network fresh, never served from cache.
  const isLiveData =
    url.hostname.includes('github.com') ||
    url.hostname.includes('githubusercontent.com') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.includes('/apps/');

  if(isLiveData || event.request.method !== 'GET') return;

  // Everything else (the shell itself, fonts): network-first, cache as a fallback for offline.
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
