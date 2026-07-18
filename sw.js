const CACHE_NAME = 'hn-app-v1';
const ASSETS = [
  './',
  'index.html',
  'App.js',
  'Home.js',
  'lib/firebase.js',
  'hunter.png',
  'nate.png',
  'manifest.json',
  'extension_icon@192px (1).png',
  'extension_icon (1).png'
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

// Handle background push notifications (FCM)
self.addEventListener('push', (event) => {
  let data = { title: 'H+N', body: 'New update!' };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      // FCM structures data differently depending on the sender
      data = payload.notification || payload.data || data;
    }
  } catch (e) {
    console.error('Push payload parse error', e);
  }

  const options = {
    body: data.body || data.text || 'New message from Nate/Hunter',
    icon: 'extension_icon@192px (1).png',
    badge: 'extension_icon@192px (1).png',
    vibrate: [100, 50, 100],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    // Ensure notification shows even if app is in background
    tag: 'hn-alert',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'H+N Update', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});