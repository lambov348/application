// MöbelStock24 service worker: makes the app installable and shows a
// "no connection" page offline. Order data is never cached on the device.
const CACHE = 'm24-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])).then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Built assets have content hashes in their names: safe to keep.
    if (url.origin === self.location.origin && url.pathname.startsWith('/build/')) {
        event.respondWith(
            caches.match(request).then(
                (hit) => hit || fetch(request).then((res) => {
                    const copy = res.clone();
                    if (res.ok) caches.open(CACHE).then((c) => c.put(request, copy));
                    return res;
                }),
            ),
        );
        return;
    }

    // Full page loads: network only, offline page when there is no connection.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
});
