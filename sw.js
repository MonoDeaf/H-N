// --- Firebase Messaging Service Worker ---
// This handles background push notifications via FCM.
// importScripts must use the compat libraries in service workers.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDD7I03wQtn9JZEgN9GLO7-KIvOfR8xt8Y",
    authDomain: "hn-app-cb931.firebaseapp.com",
    projectId: "hn-app-cb931",
    storageBucket: "hn-app-cb931.firebasestorage.app",
    messagingSenderId: "813740870093",
    appId: "1:813740870093:web:688831769c0a3843cfdc84",
    databaseURL: "https://hn-app-cb931-default-rtdb.firebaseio.com/"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'H+N';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'New update!',
        icon: 'extension_icon@192px (2).png',
        badge: 'extension_icon@192px (2).png',
        vibrate: [100, 50, 100],
        tag: 'hn-alert',
        renotify: true,
        data: { url: payload.data?.url || self.registration.scope }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Cache for offline support
const CACHE_NAME = 'hn-app-v2';
const ASSETS = [
    './',
    'index.html',
    'manifest.json',
    'extension_icon@192px (2).png',
    'extension_icon (5).png',
    'hunter.png',
    'nate.png',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(err => console.log('Cache addAll error (non-fatal):', err)))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only cache GET requests for same-origin assets
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Prioritize URL from notification data, fall back to the app's scope (PWA root)
    const urlToOpen = (event.notification.data && event.notification.data.url) 
        ? event.notification.data.url 
        : self.registration.scope;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open at the correct URL, focus it
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, focus any existing window or open a new one at the app's scope
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});