"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

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
function genRandom(len = 7) {
  let r = "";
  for (let i = 0; i < len; i++) r += CHARS[Math.floor(Math.random() * CHARS.length)];
  return r;
}
const genApp = () => `APP-${genRandom()}`;
const genWa  = () => `WA-${genRandom()}`;

function getStatus(c: PromoCode): "pending" | "unused" | "used" | "expired" {
  const now = new Date();
  if (!c.active || (!!c.expires_at && new Date(c.expires_at) < now) || (c.max_uses !== null && c.used_count >= c.max_uses)) return "expired";
  if (c.used_count > 0) return "used";
  return "unused";
}

const STATUS_CFG = {
  pending: { dot: "🟡", label: "لم يبدأ بعد", cls: "bg-yellow-500/10 text-yellow-400", border: "border-yellow-500/20" },
  unused:  { dot: "⚫", label: "لم يُستخدم",  cls: "bg-gray-700/30 text-gray-400",     border: "border-gray-700/40"  },
  used:    { dot: "🟢", label: "مفعّل",        cls: "bg-green-500/10 text-green-400",   border: "border-green-500/20" },
  expired: { dot: "🔴", label: "منتهي",        cls: "bg-red-500/10 text-red-400",       border: "border-red-500/20"   },
};

function buildWaMsg(c: PromoCode) {
  const credits  = c.wa_credits ? `\n📲 ${c.wa_credits} رسالة WhatsApp مجانية` : "";
  const duration = c.duration_days ? `\n⏱ صالح ${c.duration_days} يوم من أول استخدام` : "";
  const type     = c.code_type === "app" ? "كود تطبيق دورك المجاني" : "كود WhatsApp في تطبيق دورك";
  return `مرحباً 👋\nهذا ${type}:\n\n🎟 ${c.code}${credits}${duration}\n\nاستخدمه في تطبيق دورك عند إرسال عرضك ✅`;
}

function fmt(d: string) { return new Date(d).toLocaleDateString("ar-SA"); }

export default function PromoCodesPage() {
  const [codes, setCodes]         = useState<PromoCode[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"app" | "whatsapp">("app");
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState<string | null>(null);

  // حقول النموذج
  const [fCode,     setFCode]     = useState("");
  const [fNote,     setFNote]     = useState("");
  const [fMaxUses,  setFMaxUses]  = useState("1");
  const [fDuration, setFDuration] = useState("30");
  const [fWaCred,   setFWaCred]   = useState("20");
  const [fPhone,    setFPhone]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("promo_codes")
      .select("id,code,active,created_at,note,max_uses,used_count,duration_days,expires_at,code_type,wa_credits,used_by_salon_id,recipient_phone")
      .order("created_at", { ascending: false })
      .limit(200);
    setCodes((data ?? []) as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFCode(tab === "app" ? genApp() : genWa());
    setFNote(""); setFMaxUses("1"); setFDuration("30");
    setFWaCred("20"); setFPhone(""); setError("");
  };

  useEffect(() => { if (showForm) resetForm(); }, [showForm, tab]);

  const save = async () => {
    if (!fCode.trim()) { setError("الكود مطلوب"); return; }
    setSaving(true); setError("");
    const payload: Record<string, unknown> = {
      code: fCode.trim().toUpperCase(),
      active: true,
      code_type: tab,
      note: fNote.trim() || null,
      max_uses: parseInt(fMaxUses) || 1,
      duration_days: parseInt(fDuration) || 30,
      expires_at: null,
      recipient_phone: fPhone.trim() || null,
      wa_credits: tab === "whatsapp" ? (parseInt(fWaCred) || 20) : null,
    };
    const { error: err } = await sb.from("promo_codes").insert(payload);
    if (err) { setError(err.message); }
    else { setShowForm(false); load(); }
    setSaving(false);
  };

  const toggle = async (id: string, active: boolean) => {
    await sb.from("promo_codes").update({ active: !active }).eq("id", id);
    setCodes(p => p.map(x => x.id === id ? { ...x, active: !active } : x));
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذا الكود نهائياً؟")) return;
    await sb.from("promo_codes").delete().eq("id", id);
    setCodes(p => p.filter(x => x.id !== id));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendWa = (c: PromoCode) => {
    const phone = c.recipient_phone?.replace(/\D/g, "") || "";
    const msg   = encodeURIComponent(buildWaMsg(c));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const filtered = codes.filter(c => c.code_type === tab);
  const appCount = codes.filter(c => c.code_type === "app" && getStatus(c) === "unused").length;
  const waCount  = codes.filter(c => c.code_type === "whatsapp" && getStatus(c) === "unused").length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">🎟 أكواد الخصم</h1>
        <p className="text-gray-400 text-sm mt-1">
          {appCount} كود تطبيق متاح · {waCount} كود واتساب متاح
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(["app", "whatsapp"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all border ${
              tab === t
                ? t === "app"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                  : "bg-green-500/15 border-green-500/40 text-green-400"
                : "bg-transparent border-border text-gray-500 hover:text-white"
            }`}>
            {t === "app" ? "📱 أكواد التطبيق" : "💬 أكواد WhatsApp"}
          </button>
        ))}
        <button onClick={() => setShowForm(v => !v)}
          className="mr-auto px-4 py-2 rounded-xl text-sm font-bold bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors">
          {showForm ? "✕ إغلاق" : `+ إنشاء كود ${tab === "app" ? "تطبيق" : "واتساب"}`}
        </button>
      </div>

      {/* نموذج الإنشاء */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <h2 className="text-white font-bold mb-4 text-sm">
            {tab === "app" ? "📱 كود تطبيق جديد" : "💬 كود WhatsApp جديد"}
          </h2>
          <div className="space-y-3">
            {/* الكود */}
            <div className="flex gap-2">
              <input value={fCode} onChange={e => setFCode(e.target.value.toUpperCase())}
                className="flex-1 bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white tracking-widest font-mono text-center focus:outline-none focus:border-gold"
                maxLength={20} placeholder="الكود" />
              <button onClick={() => setFCode(tab === "app" ? genApp() : genWa())}
                className="px-4 py-2.5 border border-border text-gray-400 rounded-xl text-sm hover:text-white hover:border-gold/40 transition-colors">
                🎲
              </button>
            </div>

            {/* اسم الصالون */}
            <input value={fNote} onChange={e => setFNote(e.target.value)}
              placeholder="اسم الصالون (ملاحظة)"
              className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />

            <div className="grid grid-cols-2 gap-3">
              {/* عدد الاستخدامات */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">عدد الاستخدامات</label>
                <input type="number" value={fMaxUses} onChange={e => setFMaxUses(e.target.value)} min="1"
                  className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
              {/* مدة الكود */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المدة من أول استخدام</label>
                <select value={fDuration} onChange={e => setFDuration(e.target.value)}
                  className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold">
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
                    className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold">
                    {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} عميل</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">رقم الجوال (للإرسال)</label>
                  <input value={fPhone} onChange={e => setFPhone(e.target.value)}
                    placeholder="966501234567"
                    className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
                </div>
              </div>
            )}

            {tab === "app" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">رقم الجوال (للإرسال)</label>
                <input value={fPhone} onChange={e => setFPhone(e.target.value)}
                  placeholder="966501234567"
                  className="w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold" />
              </div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-40">
              {saving ? "⏳ جاري الحفظ..." : "✅ إنشاء الكود"}
            </button>
          </div>
        </div>
      )}

      {/* القائمة */}
      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          لا توجد أكواد {tab === "app" ? "تطبيق" : "واتساب"} بعد
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const st = getStatus(c);
            const cfg = STATUS_CFG[st];
            return (
              <div key={c.id}
                className={`bg-card border rounded-xl px-4 py-3 transition-all ${cfg.border} ${st === "expired" ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3">
                  {/* الكود */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-base font-black tracking-widest text-white">{c.code}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        {cfg.dot} {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {c.note && <span className="text-xs text-gray-400">📋 {c.note}</span>}
                      {c.wa_credits && <span className="text-xs text-green-400">📲 {c.wa_credits} عميل</span>}
                      {c.duration_days && !c.expires_at && (
                        <span className="text-xs text-yellow-500">⏱ {c.duration_days} يوم من الاستخدام</span>
                      )}
                      {c.expires_at && <span className="text-xs text-gray-500">⏳ ينتهي {fmt(c.expires_at)}</span>}
                      {c.used_count > 0 && (
                        <span className="text-xs text-blue-400">
                          ✓ {c.used_count}/{c.max_uses ?? "∞"} استخدام
                        </span>
                      )}
                    </div>
                  </div>

                  {/* أزرار */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => copyCode(c.code)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors">
                      {copied === c.code ? "✓" : "نسخ"}
                    </button>
                    {c.recipient_phone && (
                      <button onClick={() => sendWa(c)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-colors">
                        📲
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
                      🗑
                    </button>
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
