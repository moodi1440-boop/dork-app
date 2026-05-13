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
          // Save token to database
          // Note: In a real app, you'd get the actual user info from auth
          await saveFCMTokenToDB("admin", 1, token, "Admin Panel");

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
