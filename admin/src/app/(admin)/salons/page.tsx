"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

interface Salon {
  id: string; name: string; owner: string; owner_phone: string;
  region: string; gov: string; phone: string; rating: number;
  status: string; frozen: boolean; banned: boolean; total_paid: number;
  address: string; welcome_msg: string; closed_days: number[];
  slot_min: number; services: string[]; prices: Record<string, number>;
  barbers: Array<{ name: string; photo?: string }>;
  shift_enabled: boolean; work_start: string; work_end: string;
  shift1_start: string; shift1_end: string; shift2_start: string; shift2_end: string;
  tone: string;
  social: { enabled: boolean; email: string; whatsapp: string; twitter: string; telegramUser: string };
  bookings: Array<{ status: string; total?: number }>;
}

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const TONE_OPTIONS = [
  { id: "scissors",   label: "✂️ مقص" },  { id: "razor",    label: "🪒 موس" },
  { id: "bell",       label: "🔔 جرس" },  { id: "cash",     label: "💵 كاشير" },
  { id: "welcome",    label: "🎵 ترحيب" },{ id: "chime3",   label: "🎐 رنين" },
  { id: "alert",      label: "⚠️ تنبيه" },{ id: "classic",  label: "📯 كلاسيكي" },
  { id: "barberpole", label: "💈 حلاقة" },{ id: "fanfare",  label: "🎺 احتفال" },
  { id: "vip",        label: "👑 VIP" },
];
const DEFAULT_SOCIAL = { enabled: false, email: "", whatsapp: "", twitter: "", telegramUser: "" };
const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "تنتظر مراجعة" },
  { value: "approved", label: "موافق عليها" },
  { value: "suspended", label: "موقوفة" },
  { value: "rejected", label: "مرفوضة" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    approved:  "bg-green-400/10 text-green-400 border-green-400/30",
    suspended: "bg-orange-400/10 text-orange-400 border-orange-400/30",
    rejected:  "bg-red-600/10 text-red-500 border-red-600/30",
  };
  const labels: Record<string, string> = { pending: "تنتظر", approved: "موافق", suspended: "موقوف", rejected: "مرفوض" };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function QuickMessageModal({ salon, onClose }: { salon: Salon; onClose: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salon_id: salon.id, text: text.trim(), from_admin: true }),
    });
    setSent(true);
    setSending(false);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1117] border border-border rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-white font-bold text-sm">✉ رسالة إلى: {salon.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {sent ? (
            <div className="text-center py-4 text-green-400 font-bold">✅ تم إرسال الرسالة</div>
          ) : (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="اكتب رسالتك للصالون..."
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold resize-none" />
              <div className="flex gap-3">
                <button onClick={send} disabled={sending || !text.trim()}
                  className="flex-1 bg-gold/10 border border-gold/30 text-gold py-2.5 rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-40">
                  {sending ? "جاري الإرسال..." : "📤 إرسال"}
                </button>
                <button onClick={onClose} className="px-5 py-2.5 border border-border text-gray-400 rounded-xl text-sm hover:text-white transition-colors">إلغاء</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonModal({ salon, onClose, onSave }: { salon: Salon; onClose: () => void; onSave: (s: Salon) => void }) {
  const [sec, setSec] = useState("info");
  const [f, setF] = useState({
    name: salon.name ?? "", owner: salon.owner ?? "", phone: salon.phone ?? "",
    owner_phone: salon.owner_phone ?? "", address: salon.address ?? "",
    rating: salon.rating ?? 5, welcome_msg: salon.welcome_msg ?? "",
    closed_days: salon.closed_days ?? [], slot_min: salon.slot_min ?? 40,
    services: [...(salon.services ?? [])], prices: { ...(salon.prices ?? {}) },
    barbers: JSON.parse(JSON.stringify(salon.barbers ?? [])),
    shift_enabled: salon.shift_enabled ?? false,
    work_start: salon.work_start ?? "09:00", work_end: salon.work_end ?? "22:00",
    shift1_start: salon.shift1_start ?? "08:00", shift1_end: salon.shift1_end ?? "13:00",
    shift2_start: salon.shift2_start ?? "16:00", shift2_end: salon.shift2_end ?? "23:00",
    tone: salon.tone ?? "bell",
    social: { ...DEFAULT_SOCIAL, ...(salon.social ?? {}) },
  });
  const [saving, setSaving] = useState(false);
  const [newSvc, setNewSvc] = useState("");
  const [newBarber, setNewBarber] = useState("");

  const upd = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/salons/${salon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name, owner: f.owner, phone: f.phone, owner_phone: f.owner_phone,
          address: f.address, rating: f.rating, welcome_msg: f.welcome_msg,
          closed_days: f.closed_days, slot_min: f.slot_min,
          services: f.services, prices: f.prices, barbers: f.barbers,
          shift_enabled: f.shift_enabled,
          work_start: f.work_start, work_end: f.work_end,
          shift1_start: f.shift1_start, shift1_end: f.shift1_end,
          shift2_start: f.shift2_start, shift2_end: f.shift2_end,
          tone: f.tone, social: f.social,
        }),
      });
      onSave({ ...salon, ...f });
    } catch (e) { alert("خطأ: " + (e as Error).message); }
    setSaving(false);
  };

  const tabs = [
    { id: "info",     label: "المعلومات" }, { id: "hours",   label: "الأوقات" },
    { id: "services", label: "الخدمات"  }, { id: "barbers", label: "الحلاقون" },
    { id: "social",   label: "التواصل"  },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1117] border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-[#0f1117]">
          <h2 className="text-white font-bold">✏ تعديل: {salon.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5">
          <div className="flex gap-2 mb-5 flex-wrap">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setSec(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${sec === t.id ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {sec === "info" && (
            <div className="space-y-4">
              {[["اسم الصالون", "name"], ["اسم المالك", "owner"], ["جوال الصالون", "phone"], ["جوال المالك", "owner_phone"], ["العنوان", "address"]].map(([lbl, k]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">{lbl}</label>
                  <input value={(f as Record<string, unknown>)[k] as string ?? ""}
                    onChange={(e) => upd(k, e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-semibold">التقييم ⭐</label>
                <input type="number" min="1" max="5" step="0.1" value={f.rating}
                  onChange={(e) => upd("rating", Number(e.target.value))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-semibold">💬 رسالة الترحيب</label>
                <input value={f.welcome_msg} onChange={(e) => upd("welcome_msg", e.target.value)}
                  placeholder="مثال: أهلاً بك 👋"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">📅 أيام الإغلاق</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => {
                    const closed = f.closed_days.includes(i);
                    return (
                      <button key={i} onClick={() => upd("closed_days", closed ? f.closed_days.filter((x) => x !== i) : [...f.closed_days, i])}
                        className={`px-3 py-1 rounded-lg text-xs border transition-all ${closed ? "bg-red-500/15 border-red-500/40 text-red-400" : "border-border text-gray-500 hover:border-gray-500"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">⏱ مدة الموعد</label>
                <div className="flex gap-2">
                  {[20, 30, 40, 60].map((m) => (
                    <button key={m} onClick={() => upd("slot_min", m)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${f.slot_min === m ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-500"}`}>
                      {m} د
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">🔔 نغمة التنبيه</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button key={t.id} onClick={() => upd("tone", t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${f.tone === t.id ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-500 hover:border-gray-500"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sec === "hours" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="shift" checked={f.shift_enabled} onChange={(e) => upd("shift_enabled", e.target.checked)} className="w-4 h-4 accent-yellow-400" />
                <label htmlFor="shift" className="text-sm text-white">تفعيل وردية مزدوجة</label>
              </div>
              {f.shift_enabled ? (
                <>
                  {[["الوردية الأولى", "shift1_start", "shift1_end"], ["الوردية الثانية", "shift2_start", "shift2_end"]].map(([lbl, s, e]) => (
                    <div key={lbl}>
                      <label className="block text-xs text-gray-400 mb-2 font-semibold">{lbl}</label>
                      <div className="flex gap-3">
                        <input type="time" value={(f as Record<string, unknown>)[s] as string} onChange={(ev) => upd(s, ev.target.value)}
                          className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                        <input type="time" value={(f as Record<string, unknown>)[e] as string} onChange={(ev) => upd(e, ev.target.value)}
                          className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">وقت العمل</label>
                  <div className="flex gap-3">
                    <input type="time" value={f.work_start} onChange={(e) => upd("work_start", e.target.value)}
                      className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                    <input type="time" value={f.work_end} onChange={(e) => upd("work_end", e.target.value)}
                      className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                  </div>
                </div>
              )}
            </div>
          )}

          {sec === "services" && (
            <div className="space-y-3">
              {f.services.map((svc, i) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-white">{svc}</span>
                  <input type="number" placeholder="السعر" value={f.prices[svc] ?? ""} onChange={(e) => upd("prices", { ...f.prices, [svc]: Number(e.target.value) })}
                    className="w-24 bg-[#0d0d1a] border border-border rounded px-2 py-1 text-xs text-gold text-center focus:outline-none" />
                  <span className="text-xs text-gray-500">ر.س</span>
                  <button onClick={() => { const ns = f.services.filter((_, j) => j !== i); const np = { ...f.prices }; delete np[svc]; upd("services", ns); upd("prices", np); }}
                    className="text-red-400 hover:text-red-300 text-sm font-bold">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newSvc} onChange={(e) => setNewSvc(e.target.value)} placeholder="اسم الخدمة"
                  onKeyDown={(e) => { if (e.key === "Enter" && newSvc.trim()) { upd("services", [...f.services, newSvc.trim()]); setNewSvc(""); }}}
                  className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
                <button onClick={() => { if (newSvc.trim()) { upd("services", [...f.services, newSvc.trim()]); setNewSvc(""); }}}
                  className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors">
                  ➕
                </button>
              </div>
            </div>
          )}

          {sec === "barbers" && (
            <div className="space-y-3">
              {f.barbers.map((b: { name: string }, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-white">💈 {b.name}</span>
                  <button onClick={() => upd("barbers", f.barbers.filter((_: unknown, j: number) => j !== i))}
                    className="text-red-400 hover:text-red-300 text-sm font-bold">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newBarber} onChange={(e) => setNewBarber(e.target.value)} placeholder="اسم الحلاق"
                  onKeyDown={(e) => { if (e.key === "Enter" && newBarber.trim()) { upd("barbers", [...f.barbers, { name: newBarber.trim() }]); setNewBarber(""); }}}
                  className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
                <button onClick={() => { if (newBarber.trim()) { upd("barbers", [...f.barbers, { name: newBarber.trim() }]); setNewBarber(""); }}}
                  className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors">
                  ➕
                </button>
              </div>
            </div>
          )}

          {sec === "social" && (
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm text-white font-semibold">إظهار روابط التواصل للعملاء</div>
                  <div className="text-xs text-gray-500">تظهر في صفحة الصالون</div>
                </div>
                <div onClick={() => upd("social", { ...f.social, enabled: !f.social.enabled })}
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${f.social.enabled ? "bg-gold" : "bg-gray-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${f.social.enabled ? "right-1" : "left-1"}`} />
                </div>
              </label>
              {[
                { key: "email",       label: "📧 البريد الإلكتروني", placeholder: "info@salon.com" },
                { key: "whatsapp",    label: "💬 واتساب",             placeholder: "966501234567" },
                { key: "twitter",     label: "🐦 تويتر / X",          placeholder: "@salon" },
                { key: "telegramUser",label: "📱 تيليجرام",           placeholder: "@salon" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">{label}</label>
                  <input value={(f.social as Record<string, unknown>)[key] as string ?? ""}
                    onChange={(e) => upd("social", { ...f.social, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-gold/10 border border-gold/30 text-gold py-2.5 rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 border border-border text-gray-400 rounded-xl text-sm hover:text-white transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalonsPage() {
  const [salons,    setSalons]    = useState<Salon[]>([]);
  const [status,    setStatus]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Salon | null>(null);
  const [messaging, setMessaging] = useState<Salon | null>(null);
  const [pinned,    setPinned]    = useState<string[]>([]);
  const [weekSalon, setWeekSalon] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = sb
        .from("salons")
        .select("id,name,owner,owner_phone,region,gov,phone,rating,status,frozen,banned,total_paid,address,welcome_msg,closed_days,slot_min,services,prices,barbers,shift_enabled,work_start,work_end,shift1_start,shift1_end,shift2_start,shift2_end,tone,social,bookings")
        .order("id", { ascending: false });

      if (status && status !== "all") query = query.eq("status", status);
      if (search) query = query.or(`name.ilike.%${search}%,owner.ilike.%${search}%`);

      const { data, error } = await query.limit(200);
      if (error) throw new Error(error.message);
      setSalons(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading salons:", e);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((s) => {
        setPinned(Array.isArray(s.pinned) ? s.pinned : []);
        setWeekSalon(s.week_salon ? String(s.week_salon) : "");
      })
      .catch((e) => console.error("Error loading settings:", e));
  }, []);

  const togglePin = async (id: string) => {
    const np = pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id];
    setPinned(np);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: np }) });
  };

  const toggleWeek = async (id: string) => {
    const nw = weekSalon === id ? "" : id;
    setWeekSalon(nw);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week_salon: nw || null }) });
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/salons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  };

  const toggleFreeze = async (s: Salon) => {
    await fetch(`/api/salons/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozen: !s.frozen }),
    });
    load();
  };

  const toggleBan = async (s: Salon) => {
    if (!confirm(s.banned ? "رفع الحظر عن هذا الصالون؟" : "حظر هذا الصالون نهائياً؟")) return;
    await fetch(`/api/salons/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !s.banned }),
    });
    load();
  };

  const deleteSalon = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الصالون؟")) return;
    await fetch(`/api/salons/${id}`, { method: "DELETE" });
    load();
  };

  const sorted = [...salons].sort((a, b) => {
    const aw = weekSalon === a.id ? 2 : 0, bw = weekSalon === b.id ? 2 : 0;
    const ap = pinned.includes(a.id) ? 1 : 0, bp = pinned.includes(b.id) ? 1 : 0;
    return (bw + bp) - (aw + ap);
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {editing   && <SalonModal salon={editing} onClose={() => setEditing(null)} onSave={(s) => { setSalons((p) => p.map((x) => x.id === s.id ? s : x)); setEditing(null); }} />}
      {messaging && <QuickMessageModal salon={messaging} onClose={() => setMessaging(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">الصالونات</h1>
        <p className="text-gray-400 text-sm mt-1">{salons.length} صالون</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث باسم الصالون أو المالك..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${status === s.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && status === "pending" && sorted.length > 1 && (
        <div className="mb-4">
          <button
            onClick={() => { if (confirm(`قبول جميع الصالونات المعلقة (${sorted.length}) دفعة واحدة؟`)) sorted.forEach((s) => updateStatus(s.id, "approved")); }}
            className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl font-bold text-sm hover:bg-green-500/20 transition-colors">
            ✅ قبول الكل ({sorted.length} صالونات)
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">لا توجد صالونات</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s, i) => {
            const isPinned  = pinned.includes(s.id);
            const isWeek    = weekSalon === s.id;
            const isFrozen  = s.frozen;
            const isBanned  = s.banned;
            const earned    = (s.bookings ?? []).filter((b) => b.status === "approved").reduce((a, b) => a + (b.total ?? 0), 0);
            const paid      = s.total_paid ?? 0;
            const balance   = earned - paid;

            return (
              <div key={s.id} className={`bg-card border-2 rounded-2xl p-5 transition-all ${isBanned ? "border-red-800" : isWeek ? "border-yellow-400/50" : isPinned ? "border-purple-500/40" : isFrozen ? "border-red-500/40" : s.status === "approved" ? "border-green-500/30" : s.status === "rejected" ? "border-red-600/40" : s.status === "suspended" ? "border-orange-500/30" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{i + 1}. ✂ {s.name}</span>
                    <StatusBadge status={s.status} />
                    {isWeek && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-bold">🏅 الأسبوع</span>}
                    {isPinned && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">📌 مثبّت</span>}
                    {isFrozen && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">🔒 مجمّد</span>}
                    {isBanned && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30 font-bold">🚫 محظور</span>}
                  </div>
                  {s.rating ? <span className="text-gold font-bold text-sm">★ {s.rating}</span> : null}
                </div>

                <div className="text-sm text-gray-400 space-y-0.5 mb-3">
                  <div>👤 {s.owner} · 📞 {s.phone}</div>
                  {s.owner_phone && s.owner_phone !== s.phone && <div>📱 {s.owner_phone}</div>}
                  {(s.gov || s.region) && <div>📍 {[s.gov, s.region].filter(Boolean).join(" - ")}</div>}
                  {s.status === "pending" && (
                    <div>🕐 {s.shift_enabled ? `${s.shift1_start}-${s.shift1_end} | ${s.shift2_start}-${s.shift2_end}` : `${s.work_start || "09:00"} - ${s.work_end || "22:00"}`}</div>
                  )}
                  {balance !== 0 && (
                    <div className={`font-semibold ${balance > 0 ? "text-red-400" : "text-green-400"}`}>
                      💰 {balance > 0 ? `متبقي ${balance.toLocaleString("ar-SA")} ر.س` : "✅ الرصيد مسدد"}
                    </div>
                  )}
                </div>
                {s.status === "pending" && (s.services ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(s.services ?? []).slice(0, 6).map((svc) => (
                      <span key={svc} className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{svc}</span>
                    ))}
                    {(s.services ?? []).length > 6 && <span className="text-[11px] text-gray-500 self-center">+{(s.services ?? []).length - 6}</span>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {s.status !== "approved" && (
                    <button onClick={() => updateStatus(s.id, "approved")}
                      className="px-3 py-1.5 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors font-semibold">
                      ✅ موافقة
                    </button>
                  )}
                  {s.status === "pending" && (
                    <button onClick={() => {
                      const reason = window.prompt(`سبب رفض "${s.name}" (اختياري):`);
                      if (reason !== null) updateStatus(s.id, "rejected");
                    }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600/20 transition-colors font-semibold">
                      ❌ رفض
                    </button>
                  )}
                  {s.status === "approved" && (
                    <button onClick={() => updateStatus(s.id, "suspended")}
                      className="px-3 py-1.5 rounded-lg text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors font-semibold">
                      ⏸ تعليق
                    </button>
                  )}
                  {(s.status === "suspended" || s.status === "rejected") && (
                    <button onClick={() => updateStatus(s.id, "pending")}
                      className="px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors font-semibold">
                      🔄 إعادة مراجعة
                    </button>
                  )}
                  <button onClick={() => setEditing(s)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors font-semibold">
                    ✏ تعديل
                  </button>
                  <button onClick={() => setMessaging(s)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors font-semibold">
                    ✉ مراسلة
                  </button>
                  <button onClick={() => toggleFreeze(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs border font-semibold transition-colors ${isFrozen ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>
                    {isFrozen ? "🔓 رفع التجميد" : "🔒 تجميد"}
                  </button>
                  <button onClick={() => toggleBan(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs border font-semibold transition-colors ${isBanned ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-900/20 text-red-400 border-red-800/30 hover:bg-red-900/30"}`}>
                    {isBanned ? "✅ رفع الحظر" : "🚫 حظر"}
                  </button>
                  <button onClick={() => togglePin(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border font-semibold transition-colors ${isPinned ? "bg-purple-500/15 text-purple-400 border-purple-500/30" : "border-border text-gray-500 hover:border-purple-500/30"}`}>
                    📌 {isPinned ? "إلغاء التثبيت" : "تثبيت"}
                  </button>
                  <button onClick={() => toggleWeek(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border font-semibold transition-colors ${isWeek ? "bg-yellow-400/15 text-yellow-400 border-yellow-400/30" : "border-border text-gray-500 hover:border-yellow-400/30"}`}>
                    🏅 {isWeek ? "إلغاء الأسبوع" : "صالون الأسبوع"}
                  </button>
                  <button onClick={() => deleteSalon(s.id)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-900/20 text-red-400 border border-red-800/30 hover:bg-red-900/30 transition-colors font-semibold">
                    🗑 حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
