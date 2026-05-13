// استقبال Push Notifications في الخلفية
self.addEventListener("push", (e) => {
  console.log("[Service Worker] Push notification received:", e.data);

  try {
    const payload = e.data?.json() ?? {};
    const { notification = {}, data = {} } = payload;

    const options = {
      body: notification.body ?? "",
      icon: notification.icon ?? "/Logo.svg",
      badge: notification.badge ?? "/Logo.svg",
      dir: "rtl",
      lang: "ar",
      tag: notification.tag ?? "dork-notification",
      requireInteraction: false,
      vibrate: notification.vibrate ?? [200, 100, 200],
      sound: notification.sound ?? "default",
      data: {
        ...data,
        click_action: notification.click_action ?? "/notifications",
      },
    };

    // إضافة الصورة إذا كانت موجودة
    if (notification.image) {
      options.image = notification.image;
    }

    e.waitUntil(
      self.registration.showNotification(
        notification.title ?? "إشعار جديد",
        options
      )
    );
  } catch (error) {
    console.error("[Service Worker] Error handling push notification:", error);
    e.waitUntil(
      self.registration.showNotification("إشعار من DORK", {
        body: "حدث خطأ في استقبال الإشعار",
        icon: "/Logo.svg",
        dir: "rtl",
      })
    );
  }
});

// التعامل مع نقر الإشعار
self.addEventListener("notificationclick", (e) => {
  console.log("[Service Worker] Notification clicked:", e.notification.tag);

  e.notification.close();

  const clickAction = e.notification.data?.click_action ?? "/notifications";
  const bookingId = e.notification.data?.booking_id;
  const salonId = e.notification.data?.salon_id;

  // إنشاء URL مناسب بناءً على نوع الإشعار
  let targetUrl = clickAction;
  if (bookingId) {
    targetUrl = `/bookings?booking_id=${bookingId}`;
  } else if (salonId) {
    targetUrl = `/salons/${salonId}`;
  }

  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // البحث عن نافذة مفتوحة بالفعل
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // فتح نافذة جديدة إذا لم تكن موجودة
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// التعامل مع إغلاق الإشعار
self.addEventListener("notificationclose", (e) => {
  console.log("[Service Worker] Notification closed:", e.notification.tag);
});

// تحديث الـ Service Worker
self.addEventListener("install", (e) => {
  console.log("[Service Worker] Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activating...");
  e.waitUntil(clients.claim());
});

// معالج عام للأخطاء
self.addEventListener("error", (e) => {
  console.error("[Service Worker] Error:", e.error);
});
