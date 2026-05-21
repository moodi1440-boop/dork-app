import React, { useState, useEffect, useCallback } from "react";
import { G } from "../styles";
import { supabase, sb } from "../../core/supabase";

function NotifPanel({ salon, refreshSalonBookings }) {
  const [localNotifs, setLocalNotifs] = useState([]);

  // 1. دالة جلب البيانات الصافية بدون تعقيد
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

  // 2. تشغيل الجلب المبدئي عند تحميل المكون
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 3. الـ Realtime النظيف والمحمي تماماً من تكرار الاتصال بفصل الشبكة
  useEffect(() => {
    if (!salon?.id) return;

    const channelName = `fcm-realtime-${salon.id}`;
    
    const realtimeChannel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `salon_id=eq.${salon.id}` },
        () => {
          loadNotifications();
          if (refreshSalonBookings) refreshSalonBookings(salon.id);
        }
      )
      .subscribe();

    // التنظيف الصارم عند إغلاق أو إعادة بناء الصفحة لمنع التكرار والصفحات البيضاء
    return () => {
      supabase.removeChannel(realtimeChannel);
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
