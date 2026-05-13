"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

interface Notification {
  id: number; target_type: string; target_id: number | null;
  title: string; body: string; icon: string; read: boolean; created_at: string;
}

export default function NotificationsPage() {
  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [unread,   setUnread]   = useState(0);
  const [sendForm, setSendForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", icon: "🔔", target_type: "all", target_id: "" });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/notifications").then((r) => r.json());
    const list = Array.isArray(data) ? data : [];
    setNotifs(list);
    setUnread(list.filter((n: Notification) => !n.read).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = sb
      .channel("notifications-page-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifs((prev) => [newNotif, ...prev]);
        if (!newNotif.read) setUnread((prev) => prev + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
        const updated = payload.new as Notification;
        setNotifs((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n))
        );
        setUnread((prev) => {
          const oldUnread = payload.old as Notification;
          if (!oldUnread.read && updated.read) return Math.max(0, prev - 1);
          if (oldUnread.read && !updated.read) return prev + 1;
          return prev;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, (payload) => {
        const deleted = payload.old as Notification;
        setNotifs((prev) => prev.filter((n) => n.id !== deleted.id));
        if (!deleted.read) setUnread((prev) => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [load]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  };

  const markAsRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  const clearAll = async () => {
    if (!confirm("حذف جميع الإشعارات؟")) return;
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  };

  const sendNotif = async () => {
    if (!form.title.trim()) return;
    setSending(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        body: form.body,
        icon: form.icon,
        target_type: form.target_type,
        target_id: form.target_id ? Number(form.target_id) : null,
      }),
    });
    setForm({ title: "", body: "", icon: "🔔", target_type: "all", target_id: "" });
    setSendForm(false);
    setSending(false);
    load();
  };

  const fmt = (d: string) => new Date(d).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });

  const targetLabel: Record<string, string> = {
    all: "الكل", salon: "صالون", customer: "عميل", booking: "حجز",
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">الإشعارات</h1>
          <p className="text-gray-400 text-sm mt-1">
            {unread > 0 ? <span className="text-gold font-semibold">{unread} غير مقروء</span> : "جميع الإشعارات مقروءة"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSendForm(!sendForm)}
            className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">
            ➕ إرسال إشعار
          </button>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="px-4 py-2 border border-border text-gray-400 rounded-xl text-sm hover:text-white transition-colors">
              قراءة الكل
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll}
              className="px-4 py-2 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/10 transition-colors">
              مسح الكل
            </button>
          )}
        </div>
      </div>

      {sendForm && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h2 className="text-white font-bold mb-4">📤 إرسال إشعار جديد</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">العنوان *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="عنوان الإشعار"
                  className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">الأيقونة</label>
                <input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="🔔"
                  className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-gold" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">التفاصيل</label>
              <input value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="نص الإشعار (اختياري)"
                className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">المستهدف</label>
                <select value={form.target_type} onChange={(e) => setForm((p) => ({ ...p, target_type: e.target.value }))}
                  className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold">
                  <option value="all">الكل</option>
                  <option value="salon">صالون محدد</option>
                  <option value="customer">عميل محدد</option>
                </select>
              </div>
              {form.target_type !== "all" && (
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold">رقم المعرّف</label>
                  <input type="number" value={form.target_id} onChange={(e) => setForm((p) => ({ ...p, target_id: e.target.value }))} placeholder="ID"
                    className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                </div>
              )}
            </div>
            <button onClick={sendNotif} disabled={sending || !form.title.trim()}
              className="w-full py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-40">
              {sending ? "جاري الإرسال..." : "📤 إرسال"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">لا توجد إشعارات</div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`bg-card border rounded-xl p-4 flex gap-4 transition-all cursor-pointer hover:border-gold/40 ${!n.read ? "border-gold/20 bg-gold/[0.02]" : "border-border hover:bg-white/[0.02]"}`} onClick={() => !n.read && markAsRead(n.id)}>
              <div className="text-2xl flex-shrink-0 mt-0.5">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm text-white">{n.title}</div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />}
                </div>
                {n.body && <div className="text-xs text-gray-400 mt-0.5">{n.body}</div>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-600">{fmt(n.created_at)}</span>
                  <span className="text-xs text-gray-600 bg-[#0d0d1a] px-2 py-0.5 rounded-full">
                    {targetLabel[n.target_type] ?? n.target_type}
                    {n.target_id ? ` #${n.target_id}` : ""}
                  </span>
                </div>
              </div>
              <button onClick={(e) => {
                e.stopPropagation();
                fetch("/api/notifications", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: n.id }),
                });
              }} className="flex-shrink-0 text-gray-500 hover:text-red-400 transition-colors" title="حذف">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
