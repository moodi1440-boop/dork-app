// ========================================================
//  FIREBASE CLOUD MESSAGING - نظام الإشعارات النهائي
// ========================================================

// هذا الكود يُضاف داخل useEffect في App.jsx (بعد إنشاء الـ state والمتغيرات)
// السطر تقريباً 625 في الملف الحالي

useEffect(() => {
  initializeFirebaseNotifications();
}, []);

async function initializeFirebaseNotifications() {
  // 1. التحقق من دعم Service Worker
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("❌ Service Worker not supported");
    return;
  }

  try {
    // 2. مسح جميع تسجيلات Service Worker القديمة
    console.log("🔧 Cleaning up old Service Worker registrations...");
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log("✅ Old Service Worker unregistered");
    }

    // 3. تسجيل Service Worker الجديد
    console.log("📝 Registering new Service Worker...");
    await navigator.serviceWorker.register("/firebase-cloud-messaging-sw.js", {
      scope: "/"
    });
    console.log("✅ Service Worker registered successfully");

    // 4. تحميل Firebase SDK ديناميكياً
    console.log("📥 Loading Firebase SDK...");
    await loadFirebaseSDK();
    console.log("✅ Firebase SDK loaded");

    // 5. تهيئة Firebase App
    console.log("🔧 Initializing Firebase App...");
    const firebaseApp = initializeFirebaseApp();
    console.log("✅ Firebase App initialized");

    // 6. الحصول على Messaging Instance
    const messaging = window.firebase.messaging();

    // 7. طلب الحصول على FCM Token
    console.log("🔄 Requesting FCM Token...");
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ||
      "BPJC3oMO-HdxJa1WG7LjB1cP3k9qXMUTCIS2bKsAaWxbmK3uR0YQFiQRXHAWzwOJ64KlCXZ4X0YHmlYpQgVbla0";

    const token = await messaging.getToken({ vapidKey });

    if (token) {
      console.log("✅ FCM Token obtained:", token.substring(0, 30) + "...");

      // 8. حفظ الرمز محلياً
      localStorage.setItem("fcm_token", token);

      // 9. إرسال الرمز إلى الخادم
      try {
        console.log("📤 Registering token with server...");
        await sb("fcm_tokens", "POST", { token });
        console.log("✅ Token registered with server");
      } catch (error) {
        console.warn("⚠️ Failed to register token with server:", error.message);
        // الرمز حفظ محلياً، لا مشكلة إن فشل الخادم
      }
    } else {
      console.warn("❌ Failed to get FCM Token");
    }

    // 10. معالج الإشعارات في المقدمة (Foreground)
    messaging.onMessage((payload) => {
      console.log("📬 Foreground message received:", payload);

      const notification = payload.notification;
      if (notification) {
        console.log("🔔 Displaying notification:", notification.title);

        // عرض الإشعار باستخدام دالة sendNotif الموجودة
        const bookingId = payload.data?.booking_id;
        sendNotif(
          notification.title || "إشعار جديد",
          notification.body || "",
          "🔔",
          "all",
          bookingId
        );
      }
    });

    console.log("✅ Firebase Notifications initialized successfully");

  } catch (error) {
    console.error("❌ Error initializing Firebase Notifications:", error.message);
    if (error.stack) console.error("Stack:", error.stack);
  }
}

// Helper: تحميل Firebase SDK ديناميكياً
function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.firebase) {
      console.log("✅ Firebase already loaded");
      resolve();
      return;
    }

    // تحميل Firebase App SDK
    const script1 = document.createElement("script");
    script1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
    script1.onload = () => {
      console.log("✅ Firebase App SDK loaded");

      // تحميل Firebase Messaging SDK
      const script2 = document.createElement("script");
      script2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js";
      script2.onload = () => {
        console.log("✅ Firebase Messaging SDK loaded");
        resolve();
      };
      script2.onerror = (error) => {
        console.error("❌ Failed to load Firebase Messaging SDK:", error);
        reject(error);
      };
      document.head.appendChild(script2);
    };
    script1.onerror = (error) => {
      console.error("❌ Failed to load Firebase App SDK:", error);
      reject(error);
    };
    document.head.appendChild(script1);
  });
}

// Helper: تهيئة Firebase App
function initializeFirebaseApp() {
  const firebase = window.firebase;

  if (firebase.apps.length > 0) {
    console.log("✅ Firebase App already initialized");
    return firebase.apps[0];
  }

  firebase.initializeApp({
    apiKey: "AIzaSyBYCJYdJUi_oPfYlOzSukntj4YeLZFiVUY",
    projectId: "dork-app",
    messagingSenderId: "659823227621",
    appId: "1:659823227621:web:befaaa1b5063"
  });

  return firebase.apps[0];
}

// ========================================================
// ملاحظات:
// 1. ضع هذا الكود داخل App component قبل return JSX
// 2. تأكد من وجود دالة sendNotif المستخدمة للإشعارات
// 3. تأكد من وجود دالة sb للتواصل مع Supabase
// 4. تأكد من وجود ملف firebase-cloud-messaging-sw.js في public/
// 5. تأكد من وجود VITE_FIREBASE_VAPID_KEY في .env
// ========================================================
