import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const app = initializeApp({
  apiKey: "AIzaSyD2apyCKbR8tczHA-62Cl3R_2THHut7Jo0",
  authDomain: "dork-app-c1011.firebaseapp.com",
  projectId: "dork-app-c1011",
  storageBucket: "dork-app-c1011.firebasestorage.app",
  messagingSenderId: "341759447687",
  appId: "1:341759447687:web:148ba8f895d6aa7f271e22",
  measurementId: "G-4BXDWKXYQ2"
});

const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title || 'إشعار جديد';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.type || 'notification-' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
