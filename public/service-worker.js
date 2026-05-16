// Service Worker للتعامل مع FCM notifications
const CACHE_NAME = 'dork-app-v1';

self.addEventListener('install', (event) => {
  const timestamp = new Date().toISOString();
  console.log(`[Main SW] Installing at ${timestamp}`);
  event.waitUntil(
    self.skipWaiting().then(() => {
      console.log('[Main SW] Install completed');
    })
  );
});

self.addEventListener('activate', (event) => {
  const timestamp = new Date().toISOString();
  console.log(`[Main SW] Activating at ${timestamp}`);
  event.waitUntil(
    self.clients
      .claim()
      .then(() => {
        console.log('[Main SW] Activation completed');
        return self.clients.matchAll().then((clientList) => {
          console.log(
            `[Main SW] Active clients count: ${clientList.length}`
          );
          clientList.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              timestamp: timestamp,
            });
          });
        });
      })
      .catch((err) => {
        console.error('[Main SW] Error during activation:', err);
      })
  );
});

// معالجة الإشعارات الواردة من FCM
self.addEventListener('push', (event) => {
  const timestamp = new Date().toISOString();
  console.log(`[Main SW] Push notification at ${timestamp}:`, event.data);

  if (!event.data) {
    console.warn('[Main SW] Push event with no data');
    return;
  }

  try {
    const data = event.data.json();
    const { notification, data: messageData } = data;

    if (!notification) {
      console.log('[Main SW] No notification data in push event');
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
      data: {
        ...messageData,
        timestamp: timestamp,
      },
    };

    console.log(`[Main SW] Displaying: "${title}"`);
    event.waitUntil(
      self.registration
        .showNotification(title, options)
        .then(() => {
          console.log('[Main SW] Notification displayed successfully');
        })
        .catch((err) => {
          console.error('[Main SW] Error displaying notification:', err);
        })
    );
  } catch (error) {
    console.error('[Main SW] Error parsing push:', error);
    event.waitUntil(
      self.registration
        .showNotification('إشعار جديد', {
          body: 'حدث خطأ في استقبال الإشعار',
          icon: '/favicon.ico',
        })
        .catch((err) => {
          console.error('[Main SW] Error showing fallback notification:', err);
        })
    );
  }
});

// معالجة الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[Main SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const data = event.notification.data;
  const booking_id = data?.booking_id;

  let targetUrl = '/';
  if (booking_id) {
    targetUrl = `/bookings/${booking_id}`;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            console.log('[Main SW] Focusing existing window');
            return client.focus();
          }
        }
        console.log('[Main SW] Opening new window:', targetUrl);
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.error('[Main SW] Error handling click:', err);
      })
  );
});

// معالجة إغلاق الإشعار
self.addEventListener('notificationclose', (event) => {
  console.log('[Main SW] Notification closed:', event.notification.tag);
});

// معالج الرسائل من التطبيق
self.addEventListener('message', (event) => {
  console.log('[Main SW] Message received:', event.data);
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
