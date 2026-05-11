"use client";
import { useEffect } from "react";
import { sb } from "@/lib/supabase-browser";

export default function NotifListener() {
  useEffect(() => {
    // تسجيل Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // طلب إذن الإشعارات
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // الاستماع للإشعارات الجديدة عبر Supabase Realtime
    const channel = sb
      .channel("admin-realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as { title?: string; body?: string; icon?: string };
          if (!n?.title) return;
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`${n.icon ?? "🔔"} ${n.title}`, {
                body: n.body ?? "",
                icon: "/Logo.svg",
                dir: "rtl",
                lang: "ar",
              });
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  return null;
}
