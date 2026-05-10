"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Salon {
  id: number; name: string; owner: string; phone: string;
  services: string[]; prices: Record<string, number>;
  barbers: Array<{ name: string }>;
  shift_enabled: boolean; work_start: string; work_end: string;
  shift1_start: string; shift1_end: string; shift2_start: string; shift2_end: string;
  address: string; location_url: string; closed_days: number[]; slot_min: number;
  tone: string;
}
interface Booking {
  id: string; name: string; phone: string; services: string[];
  barber_name: string; date: string; time: string; total: number; status: string;
}
interface WaitItem { id: number; name: string; phone: string; created_at: string; }
interface Message { id: number; from_admin: boolean; text: string; created_at: string; }

const TABS = [
  { id: "bookings", label: "الحجوزات", icon: "🔔" },
  { id: "waiting",  label: "الانتظار", icon: "⏳" },
  { id: "messages", label: "الرسائل",  icon: "💬" },
  { id: "calendar", label: "التقويم",  icon: "🗓" },
  { id: "stats",    label: "الإحصائيات", icon: "📊" },
  { id: "settings", label: "الإعدادات", icon: "⚙" },
];

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:   ["⏳ معلق",   "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"],
    confirmed: ["✅ مؤكد",   "bg-green-400/10 text-green-400 border-green-400/30"],
    completed: ["🎉 مكتمل", "bg-blue-400/10 text-blue-400 border-blue-400/30"],
    cancelled: ["❌ ملغي",  "bg-red-400/10 text-red-400 border-red-400/30"],
  };
  const [label, cls] = map[status] ?? [status, "bg-gray-500/10 text-gray-400 border-gray-400/30"];
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export default function OwnerPage() {
  const router  = useRouter();
  const [tab, setTab]   = useState("bookings");
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bkFilter, setBkFilter] = useState("all");

  // Waiting list
  const [waiting, setWaiting] = useState<WaitItem[]>([]);
  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Calendar
  const [calDate, setCalDate] = useState(new Date());

  // Settings
  const [settings, setSettings] = useState<Partial<Salon>>({});
  const [settingsTab, setSettingsTab] = useState("info");
  const [savingSettings, setSavingSettings] = useState(false);
  const [newSvc, setNewSvc] = useState("");
  const [newBarber, setNewBarber] = useState("");

  const logout = async () => {
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner-login");
    router.refresh();
  };

  const loadSalon = useCallback(async () => {
    const res = await fetch("/api/owner/salon");
    if (!res.ok) { router.push("/owner-login"); return; }
    const data = await res.json();
    setSalon(data);
    setSettings({
      name: data.name, phone: data.phone, address: data.address, location_url: data.location_url,
      services: data.services ?? [], prices: data.prices ?? {}, barbers: data.barbers ?? [],
      shift_enabled: data.shift_enabled, work_start: data.work_start, work_end: data.work_end,
      shift1_start: data.shift1_start, shift1_end: data.shift1_end,
      shift2_start: data.shift2_start, shift2_end: data.shift2_end,
      closed_days: data.closed_days ?? [], slot_min: data.slot_min ?? 40, tone: data.tone,
    });
    setLoading(false);
  }, [router]);

  const loadBookings = useCallback(async () => {
    const res = await fetch(`/api/owner/bookings?status=${bkFilter}`);
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
  }, [bkFilter]);

  const loadWaiting = useCallback(async () => {
    const res = await fetch("/api/owner/waiting-list");
    const data = await res.json();
    setWaiting(Array.isArray(data) ? data : []);
  }, []);

  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/owner/messages");
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { loadSalon(); }, [loadSalon]);
  useEffect(() => { if (tab === "bookings") loadBookings(); }, [tab, loadBookings]);
  useEffect(() => { if (tab === "waiting")  loadWaiting(); }, [tab, loadWaiting]);
  useEffect(() => { if (tab === "messages") loadMessages(); }, [tab, loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const updateBooking = async (id: string, status: string) => {
    await fetch("/api/owner/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadBookings();
  };

  const addToWaiting = async () => {
    if (!wName.trim()) return;
    await fetch("/api/owner/waiting-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wName.trim(), phone: wPhone.trim() }),
    });
    setWName(""); setWPhone("");
    loadWaiting();
  };

  const removeFromWaiting = async (id: number) => {
    await fetch("/api/owner/waiting-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadWaiting();
  };

  const sendMessage = async () => {
    if (!msgText.trim() || sending) return;
    setSending(true);
    await fetch("/api/owner/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msgText.trim() }),
    });
    setMsgText("");
    await loadMessages();
    setSending(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    await fetch("/api/owner/salon", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    await loadSalon();
    setSavingSettings(false);
  };

  const updS = (k: string, v: unknown) => setSettings((p) => ({ ...p, [k]: v }));

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
      <div className="text-gold animate-pulse text-xl">جاري التحميل...</div>
    </div>
  );

  // Calendar data
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const pending = bookings.filter((b) => b.status === "pending");

  return (
    <div className="min-h-screen bg-[#0d0d1a]" dir="rtl">
      {/* Header */}
      <header className="bg-[#13131f] border-b border-[#2a2a3a] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-lg">💈</div>
          <div>
            <div className="font-black text-sm gold-text">{salon?.name}</div>
            <div className="text-gray-600 text-xs">{salon?.owner}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="text-xs bg-gold text-black font-black px-2 py-0.5 rounded-full">{pending.length} حجز جديد</span>
          )}
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1">خروج</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-3 pb-2 overflow-x-auto border-b border-[#2a2a3a]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${tab === t.id ? "bg-gold/10 border-gold/30 text-gold" : "border-transparent text-gray-500 hover:text-white"}`}>
            {t.icon} {t.label}
            {t.id === "bookings" && pending.length > 0 && (
              <span className="text-xs bg-gold text-black font-black px-1 rounded-full">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {/* ===== BOOKINGS ===== */}
        {tab === "bookings" && (
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {[["all", "الكل"], ["pending", "معلقة"], ["confirmed", "مؤكدة"], ["completed", "مكتملة"], ["cancelled", "ملغاة"]].map(([k, l]) => (
                <button key={k} onClick={() => { setBkFilter(k); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${bkFilter === k ? "bg-gold/10 border-gold/30 text-gold" : "border-[#2a2a3a] text-gray-500"}`}>
                  {l}
                </button>
              ))}
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-16 text-gray-600">لا توجد حجوزات</div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className={`bg-[#13131f] border rounded-xl p-4 ${b.status === "pending" ? "border-gold/30" : "border-[#2a2a3a]"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-white text-sm">{b.name}</div>
                        <div className="text-xs text-gray-500">{b.phone}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-xs text-gray-400 space-y-1 mb-3">
                      <div>🗓 {b.date} · ⏰ {b.time}</div>
                      <div>✂ {(b.services ?? []).join("، ")}  {b.barber_name ? `· 💈 ${b.barber_name}` : ""}</div>
                      <div className="text-gold font-bold">💰 {b.total} ر.س</div>
                    </div>
                    {b.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => updateBooking(b.id, "confirmed")}
                          className="flex-1 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-colors">
                          ✅ قبول
                        </button>
                        <button onClick={() => updateBooking(b.id, "cancelled")}
                          className="flex-1 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">
                          ❌ رفض
                        </button>
                      </div>
                    )}
                    {b.status === "confirmed" && (
                      <button onClick={() => updateBooking(b.id, "completed")}
                        className="w-full py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-colors">
                        🎉 تأكيد الاكتمال
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== WAITING LIST ===== */}
        {tab === "waiting" && (
          <div>
            <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-400 font-semibold mb-3">إضافة للقائمة</div>
              <div className="flex gap-2 mb-2">
                <input value={wName} onChange={(e) => setWName(e.target.value)} placeholder="الاسم *"
                  className="flex-1 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
                <input value={wPhone} onChange={(e) => setWPhone(e.target.value)} placeholder="الجوال"
                  className="flex-1 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
              </div>
              <button onClick={addToWaiting} disabled={!wName.trim()}
                className="w-full py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-40">
                ➕ إضافة
              </button>
            </div>

            {waiting.length === 0 ? (
              <div className="text-center py-12 text-gray-600">قائمة الانتظار فارغة</div>
            ) : (
              <div className="space-y-2">
                {waiting.map((w, i) => (
                  <div key={w.id} className="bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-xs font-black text-gold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-semibold">{w.name}</div>
                      {w.phone && <div className="text-xs text-gray-500">{w.phone}</div>}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(w.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <button onClick={() => removeFromWaiting(w.id)} className="text-red-400 hover:text-red-300 transition-colors text-sm font-bold">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== MESSAGES ===== */}
        {tab === "messages" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
            <div className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl overflow-hidden flex flex-col mb-3">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-600 py-16 text-sm">لا توجد رسائل</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.from_admin ? "bg-[#1a1a2e] border border-[#2a2a3a] rounded-tl-sm" : "bg-gold/10 border border-gold/20 rounded-tr-sm"}`}>
                        <div className="text-xs text-gray-500 mb-1">{m.from_admin ? "الإدارة" : "أنت"}</div>
                        <div className="text-sm text-white">{m.text}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="flex gap-3">
              <input value={msgText} onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="راسل الإدارة..."
                className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
              <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                className="px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-40">
                {sending ? "..." : "إرسال"}
              </button>
            </div>
          </div>
        )}

        {/* ===== CALENDAR ===== */}
        {tab === "calendar" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="w-8 h-8 rounded-lg bg-[#13131f] border border-[#2a2a3a] text-gray-400 hover:text-white flex items-center justify-center">‹</button>
              <span className="text-white font-bold">{MONTHS_AR[month]} {year}</span>
              <button onClick={() => setCalDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="w-8 h-8 rounded-lg bg-[#13131f] border border-[#2a2a3a] text-gray-400 hover:text-white flex items-center justify-center">›</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["أح", "إث", "ثل", "أر", "خم", "جم", "سب"].map((d) => (
                <div key={d} className="text-center text-xs text-gray-600 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day  = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayBks  = bookings.filter((b) => b.date === dateStr);
                const isToday = dateStr === todayStr;
                return (
                  <div key={day} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs border transition-all ${isToday ? "border-gold/40 bg-gold/10" : dayBks.length > 0 ? "border-blue-500/30 bg-blue-500/5" : "border-[#2a2a3a] bg-[#13131f]"}`}>
                    <span className={`font-bold ${isToday ? "text-gold" : "text-white"}`}>{day}</span>
                    {dayBks.length > 0 && <span className="text-[10px] text-blue-400 font-bold">{dayBks.length}</span>}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-2">
              {bookings.filter((b) => b.date === `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`).map((b) => (
                <div key={b.id} className="bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="text-xs text-gray-400 w-12 text-center flex-shrink-0">{b.time}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-semibold">{b.name}</div>
                    <div className="text-xs text-gray-500">{(b.services ?? []).join("، ")}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== STATS ===== */}
        {tab === "stats" && (
          <div>
            {(() => {
              const total     = bookings.length;
              const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
              const revenue   = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((a, b) => a + (b.total ?? 0), 0);
              const todayBks  = bookings.filter((b) => b.date === todayStr);
              return (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "إجمالي الحجوزات", value: total, color: "text-gold", icon: "📅" },
                    { label: "حجوزات اليوم",    value: todayBks.length, color: "text-blue-400", icon: "🕐" },
                    { label: "الإيرادات الكلية", value: revenue.toLocaleString("ar-SA") + " ر.س", color: "text-green-400", icon: "💰" },
                    { label: "نسبة القبول",     value: total ? Math.round((confirmed / total) * 100) + "%" : "—", color: "text-purple-400", icon: "📊" },
                  ].map((item) => (
                    <div key={item.label} className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-5 text-center">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <div className={`text-2xl font-black ${item.color} mb-1`}>{item.value}</div>
                      <div className="text-xs text-gray-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {tab === "settings" && (
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[{ id: "info", label: "📋 المعلومات" }, { id: "hours", label: "🕐 الأوقات" }, { id: "services", label: "✂ الخدمات" }, { id: "barbers", label: "💈 الحلاقون" }].map((t) => (
                <button key={t.id} onClick={() => setSettingsTab(t.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${settingsTab === t.id ? "bg-gold/10 border-gold/30 text-gold" : "border-[#2a2a3a] text-gray-500"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {settingsTab === "info" && (
              <div className="space-y-3">
                {[["اسم الصالون", "name"], ["رقم الجوال", "phone"], ["العنوان", "address"], ["رابط الخريطة", "location_url"]].map(([lbl, k]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">{lbl}</label>
                    <input value={(settings as Record<string, unknown>)[k] as string ?? ""}
                      onChange={(e) => updS(k, e.target.value)}
                      className="w-full bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                  </div>
                ))}
              </div>
            )}

            {settingsTab === "hours" && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.shift_enabled ?? false} onChange={(e) => updS("shift_enabled", e.target.checked)} className="w-4 h-4 accent-yellow-400" />
                  <span className="text-sm text-white">وردية مزدوجة</span>
                </label>
                {settings.shift_enabled ? (
                  [["الوردية الأولى", "shift1_start", "shift1_end"], ["الوردية الثانية", "shift2_start", "shift2_end"]].map(([lbl, s, e]) => (
                    <div key={lbl}>
                      <div className="text-xs text-gray-400 mb-2 font-semibold">{lbl}</div>
                      <div className="flex gap-3">
                        <input type="time" value={(settings as Record<string, unknown>)[s] as string ?? ""}
                          onChange={(ev) => updS(s, ev.target.value)}
                          className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                        <input type="time" value={(settings as Record<string, unknown>)[e] as string ?? ""}
                          onChange={(ev) => updS(e, ev.target.value)}
                          className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <div className="text-xs text-gray-400 mb-2 font-semibold">وقت العمل</div>
                    <div className="flex gap-3">
                      <input type="time" value={settings.work_start ?? "09:00"} onChange={(e) => updS("work_start", e.target.value)}
                        className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                      <input type="time" value={settings.work_end ?? "22:00"} onChange={(e) => updS("work_end", e.target.value)}
                        className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400 mb-2 font-semibold">أيام الإغلاق</div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d, i) => {
                      const closed = (settings.closed_days ?? []).includes(i);
                      return (
                        <button key={i} onClick={() => updS("closed_days", closed ? (settings.closed_days ?? []).filter((x) => x !== i) : [...(settings.closed_days ?? []), i])}
                          className={`px-3 py-1 rounded-lg text-xs border transition-all ${closed ? "bg-red-500/15 border-red-500/40 text-red-400" : "border-[#2a2a3a] text-gray-500"}`}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "services" && (
              <div className="space-y-2">
                {(settings.services ?? []).map((svc, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm text-white">{svc}</span>
                    <input type="number" placeholder="السعر" value={(settings.prices ?? {})[svc] ?? ""}
                      onChange={(e) => updS("prices", { ...(settings.prices ?? {}), [svc]: Number(e.target.value) })}
                      className="w-20 bg-[#0d0d1a] border border-[#2a2a3a] rounded px-2 py-1 text-xs text-gold text-center focus:outline-none" />
                    <span className="text-xs text-gray-500">ر.س</span>
                    <button onClick={() => { const ns = (settings.services ?? []).filter((_, j) => j !== i); const np = { ...(settings.prices ?? {}) }; delete np[svc]; updS("services", ns); updS("prices", np); }}
                      className="text-red-400 hover:text-red-300 text-sm font-bold">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={newSvc} onChange={(e) => setNewSvc(e.target.value)} placeholder="اسم الخدمة"
                    className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
                  <button onClick={() => { if (newSvc.trim()) { updS("services", [...(settings.services ?? []), newSvc.trim()]); setNewSvc(""); }}}
                    className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">➕</button>
                </div>
              </div>
            )}

            {settingsTab === "barbers" && (
              <div className="space-y-2">
                {(settings.barbers ?? []).map((b, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm text-white">💈 {b.name}</span>
                    <button onClick={() => updS("barbers", (settings.barbers ?? []).filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-300 text-sm font-bold">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={newBarber} onChange={(e) => setNewBarber(e.target.value)} placeholder="اسم الحلاق"
                    className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
                  <button onClick={() => { if (newBarber.trim()) { updS("barbers", [...(settings.barbers ?? []), { name: newBarber.trim() }]); setNewBarber(""); }}}
                    className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">➕</button>
                </div>
              </div>
            )}

            <button onClick={saveSettings} disabled={savingSettings}
              className="mt-5 w-full py-3 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
              {savingSettings ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
