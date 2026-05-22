import React, { useState, useEffect, useCallback } from "react";
import { G } from "../styles";
import { supabase, sb } from "../../core/supabase";

function NotifPanel({ salon, refreshSalonBookings }) {
  const [localNotifs, setLocalNotifs] = useState([]);

  // 1. دالة جلب البيانات المبدئية للصالون
  const loadNotifications = useCallback(async () => {
    if (!salon?.id) return;
    try {
      const data = await sb("bookings", "GET", null, `?salon_id=eq.${salon.id}&order=created_at.desc&limit=10`);
      if (Array.isArray(data)) {
        setLocalNotifs(data);
      }
    } catch (err) {
      console.error("Error loading docs:", err);
    }
  }, [salon?.id]);

  // تشغيل الجلب المبدئي عند تحميل المكون
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 2. إعادة حقن الـ Realtime الذهبي والنظيف الشامل (يربط العميل والصالون والخلفية)
  useEffect(() => {
    if (!salon?.id) return;

    // أ) قناة الحجوزات اللحظية للصالون الحالي
    const bookingChannel = supabase.channel(`realtime-bookings-${salon.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `salon_id=eq.${salon.id}` }, () => {
        loadNotifications();
        if (refreshSalonBookings) refreshSalonBookings(salon.id);
      })
      .subscribe();

    // ب) قناة إشعارات النظام والـ FCM (مستوحاة بالكامل من كودك النظيف الـ 5000)
    const notifChannel = supabase.channel(`realtime-notifications-${salon.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new;
        if (!n) return;
        
        // إذا كان الإشعار مخصص لعميل آخر، لا تعرضه في لوحة الصالون هنا ولكن دعه يمر للخلفية
        if (n.target_type === "customer") return; 

        // تحديث العداد والتخزين المحلي في الـ LocalStorage كما كنت تفعل بكودك النظيف
        const count = parseInt(localStorage.getItem("dork_notif_count") || "0");
        localStorage.setItem("dork_notif_count", String(count + 1));
        
        try {
          const notifs = JSON.parse(localStorage.getItem("dork_notifs") || "[]");
          notifs.unshift({
            id: n.id || Date.now(),
            title: n.title,
            body: n.body,
            icon: n.icon || "🔔",
            time: new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
            read: false
          });
          localStorage.setItem("dork_notifs", JSON.stringify(notifs.slice(0, 50)));
        } catch {}

        // إطلاق إشعار النظام الفوري (لويندوز / أندرويد / آيفون في الخلفية)
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`${n.icon || "🔔"} ${n.title}`, { body: n.body || "", dir: "rtl", lang: "ar" });
          } catch {}
        }
      })
      .subscribe();

    // ج) قناة إعدادات التطبيق اللحظية للهوية البصرية
    const settingsChannel = supabase.channel(`realtime-app-settings-${salon.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        if (window.loadAppSettings) window.loadAppSettings({ silent: true });
      })
      .subscribe();

    // د) قناة التقييمات اللحظية
    const reviewsChannel = supabase.channel(`realtime-reviews-${salon.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        if (window.pollReviews) window.pollReviews();
      })
      .subscribe();

    // التنظيف الصارم لمنع تكرار القنوات والصفحات البيضاء عند التنقل
    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [salon?.id, loadNotifications, refreshSalonBookings]);

  return (
    <div style={{ padding: "10px", direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        <h3 style={{ color: "var(--p)", margin: 0, fontSize: "14px" }}>🔔 الإشعارات الفورية الحالية</h3>
        <button 
          onClick={() => setLocalNotifs([])} 
          style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "12px" }}
        >
          🗑️ مسح القائمة مؤقتاً
        </button>
      </div>

      {localNotifs.length === 0 ? (
        <div style={G.empty}>لا توجد إشعارات جديدة حالياً</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {localNotifs.map((b) => (
            <div key={b.id} style={{ ...G.bItem, borderRight: "3px solid var(--p)", padding: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff" }}>
                {b.status === "pending" ? "⏳ طلب حجز جديد" : b.status === "approved" ? "✅ تم قبول الحجز" : "❌ تم إلغاء حجز"}
              </div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>
                العميل: {b.customer_name || b.name} | الموعد: {b.date} {b.time}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { NotifPanel };
