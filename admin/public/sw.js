// استقبال Push Notifications في الخلفية
self.addEventListener("push", (e) => {
  const timestamp = new Date().toISOString();
  console.log(`[Service Worker] Push notification received at ${timestamp}:`, e.data);

  if (!e.data) {
    console.warn("[Service Worker] Push event received with no data");
    return;
  }

  try {
    const payload = e.data.json();
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
        timestamp: timestamp,
      },
    };

    if (notification.image) {
      options.image = notification.image;
    }

    const title = notification.title ?? "إشعار جديد";

    console.log(`[Service Worker] Displaying notification: "${title}"`);
    e.waitUntil(
      self.registration
        .showNotification(title, options)
        .then(() => {
          console.log("[Service Worker] Notification displayed successfully");
        })
        .catch((err) => {
          console.error("[Service Worker] Error displaying notification:", err);
        })
    );
  } catch (error) {
    console.error("[Service Worker] Error parsing push notification:", error);
    e.waitUntil(
      self.registration
        .showNotification("إشعار من DORK", {
          body: "حدث خطأ في استقبال الإشعار",
          icon: "/Logo.svg",
          dir: "rtl",
        })
        .catch((err) => {
          console.error("[Service Worker] Error showing fallback notification:", err);
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
  const timestamp = new Date().toISOString();
  console.log(`[Service Worker] Installing at ${timestamp}...`);
  e.waitUntil(
    self.skipWaiting().then(() => {
      console.log("[Service Worker] Install completed");
    })
  );
});

self.addEventListener("activate", (e) => {
  const timestamp = new Date().toISOString();
  console.log(`[Service Worker] Activating at ${timestamp}...`);
  e.waitUntil(
    clients
      .claim()
      .then(() => {
        console.log("[Service Worker] Activation completed");
        return self.clients.matchAll().then((clientList) => {
          console.log(
            `[Service Worker] Active clients count: ${clientList.length}`
          );
          clientList.forEach((client) => {
            client.postMessage({
              type: "SW_ACTIVATED",
              timestamp: timestamp,
            });
          });
        });
      })
      .catch((err) => {
        console.error("[Service Worker] Error during activation:", err);
      })
  );
});

// معالج الرسائل من التطبيق
self.addEventListener("message", (e) => {
  console.log("[Service Worker] Message received:", e.data);
  if (e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
