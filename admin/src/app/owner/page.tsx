"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmojiIcon } from "@/components/Icons";

interface Salon {
  id: string | number; name: string; address?: string; welcome_msg?: string;
  work_start?: string; work_end?: string; slot_min?: number; cancellation_window?: number;
  social?: string;
}

interface Booking {
  id: string; customer_name: string; customer_phone: string; barber_name?: string;
  service?: string; date: string; time: string; total: number; status: string; attendance: string | null;
}

interface Message { id: string; text: string; from_admin: boolean; created_at: string; }
interface WaitingEntry { id: string; name: string; phone?: string; created_at: string; }
interface SupportTicket { id: string; subject: string; message: string; status: string; priority: string; admin_reply: string | null; created_at: string; }

const TABS = [
  { value: "bookings", label: "الحجوزات",      icon: "📅" },
  { value: "messages",  label: "الرسائل",       icon: "💬" },
  { value: "waiting",   label: "قائمة الانتظار", icon: "⏳" },
  { value: "support",   label: "الدعم",          icon: "🎫" },
  { value: "settings",  label: "إعدادات الصالون", icon: "⚙️" },
];

const BOOKING_STATUSES = [
  { value: "all",       label: "الكل"   },
  { value: "pending",   label: "معلقة"  },
  { value: "approved",  label: "مؤكدة"  },
  { value: "rejected",  label: "مرفوضة" },
  { value: "cancelled", label: "ملغاة"  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30", approved: "bg-blue-400/10 text-blue-400 border-blue-400/30", rejected: "bg-orange-400/10 text-orange-400 border-orange-400/30", cancelled: "bg-red-400/10 text-red-400 border-red-400/30" };
  const labels: Record<string, string> = { pending: "معلقة", approved: "مؤكدة", rejected: "مرفوضة", cancelled: "ملغاة" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>{labels[status] ?? status}</span>;
}

function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status,   setStatus]   = useState("all");
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = status !== "all" ? `?status=${status}` : "";
    const data = await fetch(`/api/owner/bookings${params}`).then((r) => r.json());
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch("/api/owner/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: newStatus }) });
    load();
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {BOOKING_STATUSES.map((s) => (
          <button key={s.value} onClick={() => setStatus(s.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${status === s.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : bookings.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد حجوزات</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["العميل","التاريخ","الوقت","الإجمالي","الحالة","إجراءات"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{b.customer_name}</div><div className="text-gray-400 text-xs">{b.customer_phone}</div></td>
                    <td className="px-4 py-3 text-gray-300">{b.date}</td>
                    <td className="px-4 py-3 text-gray-300">{b.time}</td>
                    <td className="px-4 py-3 text-gold font-bold">{b.total} ر.س</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {b.status === "pending" && <button onClick={() => updateStatus(b.id, "approved")} className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">تأكيد</button>}
                        {b.status === "pending" && <button onClick={() => updateStatus(b.id, "rejected")} className="px-2.5 py-1 rounded-lg text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20">رفض</button>}
                        {(b.status === "pending" || b.status === "approved") && <button onClick={() => updateStatus(b.id, "cancelled")} className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">إلغاء</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    const data = await fetch("/api/owner/messages").then((r) => r.json());
    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    await fetch("/api/owner/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.trim() }) });
    setText("");
    load();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
       : (
        <div className="flex flex-col gap-2 mb-4 max-h-[60vh] overflow-y-auto">
          {messages.length === 0
            ? <div className="text-center py-16 text-gray-500">لا توجد رسائل بعد</div>
            : messages.map((m) => (
              <div key={m.id} className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.from_admin ? "self-start bg-navy border border-border text-white" : "self-end bg-gold/10 border border-gold/30 text-gold"}`}>
                {m.text}
              </div>
            ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب رسالة للإدارة..."
          className="flex-1 bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <button onClick={send} className="px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">إرسال</button>
      </div>
    </div>
  );
}

function WaitingTab() {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetch("/api/owner/waiting-list").then((r) => r.json());
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    await fetch("/api/owner/waiting-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
    setName(""); setPhone("");
    load();
  };

  const remove = async (id: string) => {
    await fetch("/api/owner/waiting-list", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العميل"
          className="flex-1 min-w-40 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="الجوال (اختياري)"
          className="flex-1 min-w-40 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <button onClick={add} className="px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">➕ إضافة</button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : entries.length === 0 ? <div className="text-center py-16 text-gray-500">قائمة الانتظار فارغة</div>
         : (
          <div className="divide-y divide-border/50">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div><div className="font-semibold text-white text-sm">{e.name}</div>{e.phone && <div className="text-gray-400 text-xs">{e.phone}</div>}</div>
                <button onClick={() => remove(e.id)} className="px-2.5 py-1 rounded-lg text-xs bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20">إزالة</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const data = await fetch("/api/owner/support-tickets").then((r) => r.json());
    setTickets(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    await fetch("/api/owner/support-tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: subject.trim(), message: message.trim() }) });
    setSubject(""); setMessage("");
    setSending(false);
    load();
  };

  const statusLabel: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", resolved: "محلولة" };
  const statusColor: Record<string, string> = { open: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30", in_progress: "bg-blue-400/10 text-blue-400 border-blue-400/30", resolved: "bg-green-400/10 text-green-400 border-green-400/30" };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-3">فتح تذكرة دعم جديدة</h2>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="العنوان"
          className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold mb-3" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="تفصيل المشكلة أو الطلب" rows={3}
          className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold mb-3" />
        <button onClick={submit} disabled={sending || !subject.trim() || !message.trim()}
          className="px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50">
          {sending ? "جاري الإرسال..." : "إرسال للدعم"}
        </button>
      </div>
      {loading ? <div className="text-center py-10 text-gold animate-pulse">جاري التحميل...</div>
       : tickets.length === 0 ? <div className="text-center py-10 text-gray-500">لا توجد تذاكر بعد</div>
       : tickets.map((t) => (
        <div key={t.id} className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="font-bold text-white">{t.subject}</div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor[t.status] ?? ""}`}>{statusLabel[t.status] ?? t.status}</span>
          </div>
          <p className="text-gray-300 text-sm mb-2 whitespace-pre-wrap">{t.message}</p>
          {t.admin_reply && (
            <div className="bg-navy border border-gold/20 rounded-xl px-4 py-2.5 text-sm text-gold">
              <div className="text-xs text-gray-500 mb-1">رد الإدارة:</div>{t.admin_reply}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ salon, onSaved }: { salon: Salon; onSaved: (s: Salon) => void }) {
  const [form,    setForm]    = useState(salon);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const field = (key: keyof Salon) => (form[key] as string | number | undefined) ?? "";
  const set   = (key: keyof Salon) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/owner/salon", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, address: form.address, welcome_msg: form.welcome_msg,
        work_start: form.work_start, work_end: form.work_end,
        slot_min: form.slot_min ? Number(form.slot_min) : undefined,
        cancellation_window: form.cancellation_window ? Number(form.cancellation_window) : undefined,
        social: form.social,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); onSaved(form); setTimeout(() => setSaved(false), 3000); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-xl">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-semibold">اسم الصالون</label>
        <input value={field("name")} onChange={(e) => set("name")(e.target.value)}
          className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-semibold">العنوان</label>
        <input value={field("address")} onChange={(e) => set("address")(e.target.value)}
          className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-semibold">رسالة الترحيب</label>
        <input value={field("welcome_msg")} onChange={(e) => set("welcome_msg")(e.target.value)}
          className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-semibold">بداية الدوام</label>
          <input type="time" value={field("work_start")} onChange={(e) => set("work_start")(e.target.value)}
            className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-semibold">نهاية الدوام</label>
          <input type="time" value={field("work_end")} onChange={(e) => set("work_end")(e.target.value)}
            className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold [color-scheme:dark]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-semibold">مدة الموعد (دقيقة)</label>
          <input type="number" min="0" value={field("slot_min")} onChange={(e) => set("slot_min")(e.target.value)}
            className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-semibold">نافذة الإلغاء (دقيقة)</label>
          <input type="number" min="0" value={field("cancellation_window")} onChange={(e) => set("cancellation_window")(e.target.value)}
            className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-semibold">روابط التواصل الاجتماعي</label>
        <input value={field("social")} onChange={(e) => set("social")(e.target.value)} placeholder="رابط انستقرام/سناب..."
          className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
      </div>
      <p className="text-gray-600 text-xs">تعديل الخدمات والأسعار والحلاقين متاح حاليًا من تطبيق الصالون فقط.</p>
      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
        {saving ? "جاري الحفظ..." : saved ? <><EmojiIcon icon="✅" size={16}/> تم الحفظ</> : "حفظ التغييرات"}
      </button>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [salon,   setSalon]   = useState<Salon | null>(null);
  const [tab,     setTab]     = useState("bookings");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/salon").then((r) => r.json()).then((data) => {
      setSalon(data);
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner-login");
    router.refresh();
  };

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center text-gold animate-pulse">جاري التحميل...</div>;
  if (!salon) return null;

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">{salon.name}</h1>
          <p className="text-gray-500 text-xs mt-0.5">لوحة مالك الصالون</p>
        </div>
        <button onClick={logout} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all">
          <EmojiIcon icon="🚪" size={16}/> تسجيل خروج
        </button>
      </div>

      <div className="px-6 pt-4 flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === t.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
            <EmojiIcon icon={t.icon} size={16}/> {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "bookings" && <BookingsTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "waiting"  && <WaitingTab />}
        {tab === "support"  && <SupportTab />}
        {tab === "settings" && <SettingsTab salon={salon} onSaved={setSalon} />}
      </div>
    </div>
  );
}
