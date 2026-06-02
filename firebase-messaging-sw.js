// Service Worker for FCM push notifications - handles background & terminated state
const CACHE_NAME = 'dork-app-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let title = 'إشعار جديد';
  let options = {
    body: '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'notification-' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {},
  };

  try {
    const payload = event.data.json();

    if (payload.notification) {
      title = payload.notification.title || title;
      options.body = payload.notification.body || '';
    }

    if (payload.data) {
      options.data = payload.data;
      options.tag = payload.data.type + '-' + (payload.data.booking_id || Date.now());
    }

    if (payload.webpush && payload.webpush.notification) {
      const webNotif = payload.webpush.notification;
      title = webNotif.title || title;
      options.body = webNotif.body || options.body;
    }
  } catch (e) {
    try {
      const text = event.data.text();
      options.body = text;
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // no-op
});
