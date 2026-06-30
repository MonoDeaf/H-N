const CACHE_NAME = 'us-app-v1';
const ASSETS = [
  './',
  'index.html',
  'App.js',
  'Home.js',
  'lib/firebase.js',
  'hunter.png',
  'nate.png',
  'manifest.json',
  'icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Handle simple push notifications if triggered from outside
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Us App', body: 'New update!' };
  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});