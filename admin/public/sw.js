self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "إشعار جديد", {
      body: data.body ?? "",
      icon: "/Logo.svg",
      dir: "rtl",
      lang: "ar",
      badge: "/Logo.svg",
      tag: data.tag ?? "dork-admin",
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/notifications"));
});
