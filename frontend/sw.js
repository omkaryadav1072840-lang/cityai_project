// SmartCity AI — Service Worker v12
// Enhanced: High-Performance Stale-While-Revalidate, Background Sync, 0ms Cache Acceleration

const CACHE_NAME = 'smartcity-v12';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/script.js',
    '/auth.js',
    '/realtime.js',
    '/manifest.json',
    '/favicon.svg',
    '/favicon.png',
    '/apple-touch-icon.png',
    '/components/ui_components.css',
    '/components/ui_components.js',
    '/components/ai_widget.js',
    '/components/ai_widget.css',
    '/components/pwa_manager.js',
    '/logo.png',
    '/logo1.png',
    '/pages/emergency/emergency.html',
    '/pages/emergency/emergency.css',
    '/pages/emergency/emergency.js',
    '/pages/police/police.html',
    '/pages/police/police.css',
    '/pages/police/police.js',
    '/pages/traffic/traffic.html',
    '/pages/traffic/traffic.css',
    '/pages/traffic/traffic.js',
    '/pages/hospital/hospital.html',
    '/pages/hospital/hospital.css',
    '/pages/hospital/hospital.js',
    '/pages/hospital/blood_bank.html',
    '/pages/hospital/blood_bank.css',
    '/pages/hospital/blood_bank.js',
    '/pages/parking/parking.html',
    '/pages/parking/parking.css',
    '/pages/parking/parking.js',
    '/pages/waste/waste.html',
    '/pages/waste/waste.css',
    '/pages/waste/waste.js',
    '/pages/waste/control_center.html',
    '/pages/waste/control_center.css',
    '/pages/waste/control_center.js',
    '/pages/waste/worker_dashboard.html',
    '/pages/waste/worker_dashboard.css',
    '/pages/waste/worker_dashboard.js',
    '/pages/waste/bin_dashboard.html',
    '/pages/waste/bin_dashboard.css',
    '/pages/waste/bin_dashboard.js',
    '/pages/water/water.html',
    '/pages/water/water.css',
    '/pages/water/water.js',
    '/pages/famous/famous.html',
    '/pages/famous/famous.css',
    '/pages/famous/famous.js',
    '/pages/admin/gkp_admin.html'
];

// ===================== INSTALL =====================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => { });
        })
    );
    self.skipWaiting();
});

// ===================== ACTIVATE =====================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ===================== FETCH — Network First, Cache Fallback =====================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET, API calls, and cross-origin
    if (request.method !== 'GET') return;
    if (url.pathname.startsWith('/api/')) return;
    if (url.origin !== self.location.origin) return;

    if (url.pathname.endsWith('.html') || url.pathname === '/') {
        // HTML: Network First, fallback to cache, then index.html
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return res;
                })
                .catch(() =>
                    caches.match(request)
                        .then((cached) => cached || caches.match('/index.html'))
                )
        );
    } else {
        // High-Performance Stale-While-Revalidate: Instant Cache Delivery (0ms) + Background Revalidation
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return networkResponse;
                }).catch(() => null);

                return cachedResponse || fetchPromise;
            })
        );
    }
});

// ===================== PUSH NOTIFICATIONS =====================
self.addEventListener('push', (event) => {
    let data = { title: 'SmartCity AI Alert', body: 'New city update available.', icon: '/logo.png' };
    try {
        data = event.data ? event.data.json() : data;
    } catch (e) { }

    event.waitUntil(
        self.registration.showNotification(data.title || 'SmartCity AI', {
            body: data.body || 'New update',
            icon: data.icon || '/logo.png',
            badge: '/favicon.svg',
            tag: 'smartcity-alert',
            data: data.url || '/',
            actions: [
                { action: 'view', title: 'View Details' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        })
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const existingClient = clientList.find((c) => c.url === targetUrl && 'focus' in c);
            if (existingClient) return existingClient.focus();
            return clients.openWindow(targetUrl);
        })
    );
});

// ===================== BACKGROUND SYNC =====================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-emergency-sos') {
        // Will retry pending SOS requests when back online
        event.waitUntil(syncPendingSOS());
    }
});

async function syncPendingSOS() {
    try {
        const db = await openPendingDB();
        const pending = await db.getAll('pending-sos');
        for (const item of pending) {
            await fetch('/api/emergency/sos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }
    } catch (e) { }
}

function openPendingDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('smartcity-pending', 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore('pending-sos', { autoIncrement: true });
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = reject;
    });
}
