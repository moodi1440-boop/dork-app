import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: any = null;
let messaging: Messaging | null = null;

// Initialize Firebase
export const initializeFirebase = () => {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      console.log("[Firebase] Initialized successfully");
    }
    return app;
  } catch (error) {
    console.error("[Firebase] Initialization error:", error);
    return null;
  }
};

// Get Firebase Messaging instance
export const getFirebaseMessaging = (): Messaging | null => {
  try {
    if (!messaging) {
      initializeFirebase();
      if (app && "Notification" in window) {
        messaging = getMessaging(app);
        console.log("[Firebase] Messaging initialized");
      }
    }
    return messaging;
  } catch (error) {
    console.error("[Firebase] Error getting messaging:", error);
    return null;
  }
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.warn("[FCM] Notifications not supported in this browser");
      return null;
    }

    // Check if Service Worker is supported
    if (!("serviceWorker" in navigator)) {
      console.warn("[FCM] Service Workers not supported");
      return null;
    }

    // Request permission
    if (Notification.permission === "granted") {
      console.log("[FCM] Permission already granted");
      return await getAndStoreFCMToken();
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("[FCM] Permission granted by user");
        return await getAndStoreFCMToken();
      } else {
        console.log("[FCM] Permission denied by user");
        return null;
      }
    } else {
      console.log("[FCM] Permission previously denied");
      return null;
    }
  } catch (error) {
    console.error("[FCM] Error requesting permission:", error);
    return null;
  }
};

// Get and store FCM token
export const getAndStoreFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.error("[FCM] Messaging not available");
      return null;
    }

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("[FCM] Service Worker registered:", registration);
      } catch (error) {
        console.error("[FCM] Service Worker registration error:", error);
      }
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token);
      // Store token locally
      localStorage.setItem("fcm_token", token);
      return token;
    } else {
      console.warn("[FCM] No token obtained");
      return null;
    }
  } catch (error) {
    console.error("[FCM] Error getting token:", error);
    return null;
  }
};

// Listen to incoming messages
export const listenToMessages = (
  callback: (message: any) => void
): (() => void) | null => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.error("[FCM] Messaging not available");
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Message received in foreground:", payload);
      callback(payload);

      // Show notification in foreground
      if (payload.notification) {
        new Notification(`${payload.notification.title}`, {
          body: payload.notification.body,
          icon: payload.notification.icon || "/Logo.svg",
          dir: "rtl",
          lang: "ar",
        });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("[FCM] Error listening to messages:", error);
    return null;
  }
};

// Save FCM token to database
export const saveFCMTokenToDB = async (
  userType: "salon" | "admin" | "customer",
  userId: number,
  token: string,
  deviceName?: string
): Promise<boolean> => {
  try {
    const response = await fetch("/api/fcm-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_type: userType,
        user_id: userId,
        device_token: token,
        device_name: deviceName || navigator.userAgent.substring(0, 50),
      }),
    });

    if (response.ok) {
      console.log("[FCM] Token saved to database");
      return true;
    } else {
      console.error("[FCM] Failed to save token:", await response.json());
      return false;
    }
  } catch (error) {
    console.error("[FCM] Error saving token to DB:", error);
    return false;
  }
};

// Unsubscribe from notifications
export const unsubscribeFromNotifications = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch("/api/fcm-tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_token: token }),
    });

    if (response.ok) {
      console.log("[FCM] Unsubscribed successfully");
      localStorage.removeItem("fcm_token");
      return true;
    }
    return false;
  } catch (error) {
    console.error("[FCM] Error unsubscribing:", error);
    return false;
  }
};

// Check if user has notification permission
export const hasNotificationPermission = (): boolean => {
  if (!("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
};

// Get stored FCM token
export const getStoredFCMToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fcm_token");
};

// Clear FCM token from localStorage
export const clearStoredFCMToken = (): void => {
  localStorage.removeItem("fcm_token");
};
