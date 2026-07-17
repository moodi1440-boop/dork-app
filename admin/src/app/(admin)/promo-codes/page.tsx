"use client";
import { useEffect, useState, useCallback } from "react";
import { EmojiIcon } from "@/components/Icons";

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  note: string | null;
  max_uses: number | null;
  used_count: number;
  duration_days: number | null;
  expires_at: string | null;
  code_type: "app" | "whatsapp";
  wa_credits: number | null;
  used_by_salon_id: number | null;
  recipient_phone: string | null;
}

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genRandom(len = 5) {
  let r = "";
  for (let i = 0; i < len; i++) r += CHARS[Math.floor(Math.random() * CHARS.length)];
  return r;
}
const genApp = () => `DAWRAK-${genRandom()}`;
const genWa  = () => `WH-${genRandom()}`;

function getStatus(c: PromoCode): "unused" | "used" | "expired" {
  const now = new Date();
  if (!c.active || (!!c.expires_at && new Date(c.expires_at) < now) || (c.max_uses !== null && c.used_count >= c.max_uses)) return "expired";
  if (c.used_count > 0) return "used";
  return "unused";
}

const STATUS_CFG = {
  unused:  { dot: "⚫", label: "لم يُستخدم",  cls: "bg-gray-700/30 text-gray-400",   border: "border-gray-700/40"  },
  used:    { dot: "🟢", label: "مفعّل",        cls: "bg-green-500/10 text-green-400", border: "border-green-500/20" },
  expired: { dot: "🔴", label: "منتهي",        cls: "bg-red-500/10 text-red-400",     border: "border-red-500/20"   },
};

function buildWaMsg(c: PromoCode) {
  const credits  = c.wa_credits   ? `\n📲 ${c.wa_credits} رسالة WhatsApp مجانية` : "";
  const duration = c.duration_days ? `\n⏱ صالح ${c.duration_days} يوم من أول استخدام` : "";
  const type     = c.code_type === "app" ? "كود تطبيق دورك المجاني" : "كود WhatsApp في تطبيق دورك";
  return `مرحباً 👋\nهذا ${type}:\n\n🎟 ${c.code}${credits}${duration}\n\nاستخدمه في تطبيق دورك عند إرسال عرضك ✅`;
}

function fmt(d: string) { return new Date(d).toLocaleDateString("ar-SA"); }

function activatedAt(c: PromoCode): string | null {
  if (!c.expires_at || !c.duration_days) return null;
  const exp = new Date(c.expires_at).getTime();
  return fmt(new Date(exp - c.duration_days * 86400000).toISOString());
}

type FilterType = "all" | "unused" | "used" | "expired";

export default function PromoCodesPage() {
  const [codes, setCodes]         = useState<PromoCode[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"app" | "whatsapp">("app");
  const [filter, setFilter]       = useState<FilterType>("all");
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState<string | null>(null);

  // حقول النموذج
  const [fCode,     setFCode]     = useState("");
  const [fNote,     setFNote]     = useState("");
  const [fCount,    setFCount]    = useState("1");
  const [fMaxUses,  setFMaxUses]  = useState("1");
  const [fDuration, setFDuration] = useState("30");
  const [fWaCred,   setFWaCred]   = useState("20");
  const [fPhone,    setFPhone]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/promo-codes").then(r => r.json()).catch(() => []);
    setCodes((Array.isArray(data) ? data : []) as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFCode(tab === "app" ? genApp() : genWa());
    setFNote(""); setFCount("1"); setFMaxUses("1"); setFDuration("30");
    setFWaCred("20"); setFPhone(""); setError("");
  };

  useEffect(() => { if (showForm) resetForm(); }, [showForm, tab]);

  const save = async () => {
    setSaving(true); setError("");
    const count = Math.min(Math.max(parseInt(fCount) || 1, 1), 50);
    if (count === 1 && !fCode.trim()) { setError("الكود لا يمكن أن يكون فارغاً"); setSaving(false); return; }
    const rows = Array.from({ length: count }, () => ({
      code: count === 1 ? fCode.trim().toUpperCase() : (tab === "app" ? genApp() : genWa()),
      active: true,
      code_type: tab,
      note: fNote.trim() || null,
      max_uses: parseInt(fMaxUses) || 1,
      duration_days: parseInt(fDuration) || 30,
      expires_at: null,
      recipient_phone: fPhone.trim() || null,
      wa_credits: tab === "whatsapp" ? (parseInt(fWaCred) || 20) : null,
    }));
    const res = await fetch("/api/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "فشل الحفظ"); }
    else { setShowForm(false); load(); }
    setSaving(false);
  };

  const toggle = async (id: string, active: boolean) => {
    await fetch(`/api/promo-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    setCodes(p => p.map(x => x.id === id ? { ...x, active: !active } : x));
  };

  const renew = async (c: PromoCode) => {
    if (!c.duration_days) return;
    const newExp = new Date(Date.now() + c.duration_days * 86400000).toISOString();
    await fetch(`/api/promo-codes/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expires_at: newExp, active: true }) });
    setCodes(p => p.map(x => x.id === c.id ? { ...x, expires_at: newExp, active: true } : x));
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذا الكود نهائياً؟")) return;
    await fetch(`/api/promo-codes/${id}`, { method: "DELETE" });
    setCodes(p => p.filter(x => x.id !== id));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendWa = (c: PromoCode) => {
    const phone = c.recipient_phone?.replace(/\D/g, "") || "";
    if (!phone) { alert("لم يُسجَّل رقم جوال لهذا الكود"); return; }
    const msg   = encodeURIComponent(buildWaMsg(c));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const byTab    = codes.filter(c => c.code_type === tab);
  const filtered = filter === "all" ? byTab : byTab.filter(c => getStatus(c) === filter);

  const counts = {
    all:     byTab.length,
    unused:  byTab.filter(c => getStatus(c) === "unused").length,
    used:    byTab.filter(c => getStatus(c) === "used").length,
    expired: byTab.filter(c => getStatus(c) === "expired").length,
  };

  const appCount = codes.filter(c => c.code_type === "app"       && getStatus(c) === "unused").length;
  const waCount  = codes.filter(c => c.code_type === "whatsapp"  && getStatus(c) === "unused").length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white"><EmojiIcon icon="🎟" size={18}/> أكواد الخصم</h1>
        <p className="text-gray-400 text-sm mt-1">
          {appCount} كود تطبيق متاح · {waCount} كود واتساب متاح
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["app", "whatsapp"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); setFilter("all"); }}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all border ${
              tab === t
                ? t === "app"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                  : "bg-green-500/15 border-green-500/40 text-green-400"
                : "bg-transparent border-border text-gray-500 hover:text-white"
            }`}>
            {t === "app" ? <><EmojiIcon icon="📱" size={16}/> أكواد التطبيق</> : <><EmojiIcon icon="💬" size={16}/> أكواد WhatsApp</>}
          </button>
        ))}
        <button onClick={() => setShowForm(v => !v)}
          className="mr-auto px-4 py-2 rounded-xl text-sm font-bold bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors">
          {showForm ? <><EmojiIcon icon="✕" size={16}/> إغلاق</> : `+ إنشاء كود ${tab === "app" ? "تطبيق" : "واتساب"}`}
        </button>
      </div>

      {/* فلتر الحالة */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(["all", "unused", "used", "expired"] as FilterType[]).map(f => {
          const labels: Record<FilterType, string> = { all: "الكل", unused: "لم يُستخدم", used: "مفعّل", expired: "منتهي" };
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                active ? "bg-white/10 border-white/20 text-white" : "border-border text-gray-500 hover:text-gray-300"
              }`}>
              {labels[f]} <span className="opacity-60">({counts[f]})</span>
            </button>
          );
        })}
      </div>

      {/* نموذج الإنشاء */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <h2 className="text-white font-bold mb-4 text-sm">
            {tab === "app" ? <><EmojiIcon icon="📱" size={16}/> كود تطبيق جديد</> : <><EmojiIcon icon="💬" size={16}/> كود WhatsApp جديد</>}
          </h2>
          <div className="space-y-3">
            {/* عدد الأكواد */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">عدد الأكواد للتوليد</label>
              <div className="flex gap-1.5 flex-wrap">
                {["1","3","5","10","20"].map(n => (
                  <button key={n} onClick={() => setFCount(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                      fCount === n ? "bg-gold/15 border-gold/40 text-gold" : "border-border text-gray-400 hover:text-white"
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* الكود — يظهر فقط لو كود واحد */}
            {fCount === "1" && (
              <div className="flex gap-2">
                <input value={fCode} onChange={e => setFCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white tracking-widest font-mono text-center focus:outline-none focus:border-gold"
                  maxLength={20} placeholder="الكود" />
                <button onClick={() => setFCode(tab === "app" ? genApp() : genWa())}
                  className="px-4 py-2.5 border border-border text-gray-400 rounded-xl text-sm hover:text-white hover:border-gold/40 transition-colors">
                  <EmojiIcon icon="🎲" size={16}/>
                </button>
              </div>
            )}
            {parseInt(fCount) > 1 && (
              <p className="text-xs text-gray-500 bg-white/5 rounded-xl px-4 py-2.5">
                سيتم توليد <span className="text-gold font-bold">{fCount}</span> أكواد عشوائية تلقائياً
              </p>
            )}

            {/* اسم الصالون */}
            <input value={fNote} onChange={e => setFNote(e.target.value)}
              placeholder="اسم الصالون (ملاحظة اختيارية)"
              className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />

            <div className="grid grid-cols-2 gap-3">
              {/* الحد الأقصى للاستخدام */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  الحد الأقصى للاستخدام
                  <span className="text-gray-600 mr-1">(لكل كود)</span>
                </label>
                <input type="number" value={fMaxUses} onChange={e => setFMaxUses(e.target.value)} min="1"
                  className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
              {/* مدة الكود */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المدة من أول استخدام</label>
                <select value={fDuration} onChange={e => setFDuration(e.target.value)}
                  className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold">
                  <option value="3">3 أيام</option>
                  <option value="7">7 أيام</option>
                  <option value="14">14 يوم</option>
                  <option value="30">30 يوم</option>
                  <option value="60">60 يوم</option>
                  <option value="90">90 يوم</option>
                </select>
              </div>
            </div>

            {/* حقول WhatsApp فقط */}
            {tab === "whatsapp" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">عدد العملاء المجانيين</label>
                  <select value={fWaCred} onChange={e => setFWaCred(e.target.value)}
                    className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold">
                    {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} عميل</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">رقم الجوال (للإرسال)</label>
                  <input value={fPhone} onChange={e => setFPhone(e.target.value)}
                    placeholder="966501234567"
                    className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                </div>
              </div>
            )}

            {tab === "app" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">رقم الجوال (للإرسال)</label>
                <input value={fPhone} onChange={e => setFPhone(e.target.value)}
                  placeholder="966501234567"
                  className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-40">
              {saving
                ? "⏳ جاري الحفظ..."
                : parseInt(fCount) > 1
                  ? <><EmojiIcon icon="✅" size={16}/> إنشاء {fCount} أكواد</>
                  : <><EmojiIcon icon="✅" size={16}/> إنشاء الكود</>}
            </button>
          </div>
        </div>
      )}

      {/* القائمة */}
      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          لا توجد أكواد {filter !== "all" ? `بحالة "${filter === "unused" ? "لم تُستخدم" : filter === "used" ? "مفعّلة" : "منتهية"}"` : ""}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const st  = getStatus(c);
            const cfg = STATUS_CFG[st];
            const act = activatedAt(c);
            return (
              <div key={c.id}
                className={`bg-card border rounded-xl px-4 py-3 transition-all ${cfg.border} ${st === "expired" ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  {/* بيانات الكود */}
                  <div className="flex-1 min-w-0">
                    {/* السطر الأول: الكود + الحالة */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-base font-black tracking-widest text-white">{c.code}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        <EmojiIcon icon={cfg.dot} size={10}/> {cfg.label}
                      </span>
                    </div>

                    {/* السطر الثاني: الملاحظات */}
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      {c.note && <span className="text-xs text-gray-400"><EmojiIcon icon="📋" size={16}/> {c.note}</span>}
                      {c.wa_credits && <span className="text-xs text-green-400"><EmojiIcon icon="📲" size={16}/> {c.wa_credits} عميل WA</span>}
                      {c.recipient_phone && (
                        <span className="text-xs text-gray-500 font-mono">{c.recipient_phone}</span>
                      )}
                    </div>

                    {/* السطر الثالث: الاستخدامات + التواريخ */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* عداد الاستخدامات دائماً ظاهر */}
                      <span className={`text-xs font-bold ${c.used_count > 0 ? "text-blue-400" : "text-gray-500"}`}>
                        {c.used_count}/{c.max_uses ?? "∞"} استخدام
                      </span>
                      {/* المدة أو تاريخ الانتهاء */}
                      {c.duration_days && !c.expires_at && (
                        <span className="text-xs text-yellow-500">⏱ {c.duration_days} يوم من الاستخدام</span>
                      )}
                      {act && (
                        <span className="text-xs text-blue-300">▶ بدأ {act}</span>
                      )}
                      {c.expires_at && (
                        <span className={`text-xs ${st === "expired" ? "text-red-400" : "text-gray-500"}`}>
                          ⏳ ينتهي {fmt(c.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* أزرار */}
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => copyCode(c.code)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors">
                        {copied === c.code ? <EmojiIcon icon="✓" size={16}/> : "نسخ"}
                      </button>
                      <button onClick={() => sendWa(c)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-colors">
                        <EmojiIcon icon="📲" size={16}/>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {st === "expired" && c.duration_days && (
                        <button onClick={() => renew(c)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/20 text-blue-300 hover:bg-blue-500/10 transition-colors">
                          <EmojiIcon icon="🔄" size={16}/> تجديد
                        </button>
                      )}
                      <button onClick={() => toggle(c.id, c.active)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          c.active
                            ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                            : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }`}>
                        {c.active ? "تعطيل" : "تفعيل"}
                      </button>
                      <button onClick={() => del(c.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
                        <EmojiIcon icon="🗑" size={16}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
