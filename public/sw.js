// MöbelStock24 service worker: makes the app installable and shows a
// "no connection" page offline. Order data is never cached on the device.
const CACHE = 'm24-v2';
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

// Push messages from the server: { title, body, url, tag }
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'MöbelStock24', body: event.data ? event.data.text() : '' };
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'MöbelStock24', {
            body: data.body || '',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: data.tag,
            data: { url: data.url || '/' },
        }),
    );
});

// Tapping a notification opens the right page (reusing an open window).
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            for (const client of windows) {
                if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
                    return client.focus().then(() => client.navigate(target));
                }
            }
            return self.clients.openWindow(target);
        }),
    );
});
