// Service Worker للتعامل مع FCM notifications
const CACHE_NAME = 'dork-app-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// معالجة الإشعارات الواردة من FCM
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push notification received but no data');
    return;
  }

  try {
    const data = event.data.json();
    const { notification, data: messageData } = data;

    if (!notification) {
      console.log('No notification data in push event');
      return;
    }

    const title = notification.title || 'إشعار جديد';
    const options = {
      body: notification.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: messageData?.booking_id || 'notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
      sound: 'default',
      data: messageData || {},
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// معالجة الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const booking_id = data?.booking_id;

  let targetUrl = '/';
  if (booking_id) {
    targetUrl = `/bookings/${booking_id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // تحقق من وجود نافذة مفتوحة
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // افتح نافذة جديدة إذا لم تكن هناك نافذة
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// معالجة إغلاق الإشعار
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
// Force Vercel redeploy
