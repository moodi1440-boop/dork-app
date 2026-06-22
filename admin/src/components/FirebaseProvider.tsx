"use client";
import { useEffect } from "react";
import {
  initializeFirebase,
  requestNotificationPermission,
  saveFCMTokenToDB,
  listenToMessages,
} from "@/lib/firebase-client";

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Firebase
    initializeFirebase();

    // Request notification permission and setup FCM
    const setupFCM = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          // هوية الأدمن الحقيقية من جلسته (حساب RBAC فرعي) — لا تسجيل
          // بدون id حقيقي، لتجنّب خلط كل المتصفحات تحت هوية وهمية واحدة
          const me = await fetch("/api/me").then((r) => r.json()).catch(() => null);
          if (!me?.id) return;
          await saveFCMTokenToDB("admin", me.id, token, me.username || "Admin Panel");

          // Listen to messages in foreground
          const unsubscribe = listenToMessages((message) => {
            console.log("[FCM] Message received in foreground:", message);
          });

          return () => {
            if (unsubscribe) unsubscribe();
          };
        }
      } catch (error) {
        console.error("[Firebase] Setup error:", error);
      }
    };

    // Only setup on client side and if not already done
    if (typeof window !== "undefined") {
      const timeout = setTimeout(setupFCM, 2000);
      return () => clearTimeout(timeout);
    }
  }, []);

  return <>{children}</>;
}
