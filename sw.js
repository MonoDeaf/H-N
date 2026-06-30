importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDD7I03wQtn9JZEgN9GLO7-KIvOfR8xt8Y",
    authDomain: "hn-app-cb931.firebaseapp.com",
    projectId: "hn-app-cb931",
    storageBucket: "hn-app-cb931.firebasestorage.app",
    messagingSenderId: "813740870093",
    appId: "1:813740870093:web:688831769c0a3843cfdc84"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Us - Update';
  const notificationOptions = {
    body: payload.notification?.body || 'Check the app for details.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Look for existing window and focus it or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});