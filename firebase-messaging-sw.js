// firebase-messaging-sw.js — Required by Firebase Messaging SDK (compat)
// The SDK auto-registers this file as the default service worker for push.
// We delegate all push/notification handling to sw.js (which already has
// push + notificationclick listeners) and just need to satisfy the SDK's
// requirement that this file exists and loads the messaging library.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBeBOyADRqJPLfGGREE8vNWBW051hQJKCo',
  authDomain: 'pinthip-checkin.firebaseapp.com',
  databaseURL: 'https://pinthip-checkin-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pinthip-checkin',
  storageBucket: 'pinthip-checkin.firebasestorage.app',
  messagingSenderId: '281531263382',
  appId: '1:281531263382:web:282eaac91c9d64249695b7',
  measurementId: 'G-FWKZ4L2LST'
});

// Delegate background push handling to our own showNotification logic
// (same as sw.js). Firebase messaging will call this SW's 'push' event,
// so we add a listener here too for completeness.
const messaging = firebase.messaging();

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { title: 'ปิ่นทิพย์', body: event.data ? event.data.text() : '' } };
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'ปิ่นทิพย์ เช็กอิน';
  const options = {
    body: notification.body || data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'pinthip-notification',
    data: { url: data.url || './' },
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});