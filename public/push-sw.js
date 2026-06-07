// Service Worker — Web Push بدون Firebase
self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json() || {};
    event.waitUntil(
      self.registration.showNotification(data.title || 'إشعار جديد', {
        body: data.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || ('dork-' + Date.now()),
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data,
      })
    );
  } catch (e) {
    console.error('[push-sw]', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return clients.openWindow('/');
    })
  );
});
