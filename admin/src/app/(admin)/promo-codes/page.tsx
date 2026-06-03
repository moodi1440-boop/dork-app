"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
}

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genRandom(len = 8) {
  let r = "";
  for (let i = 0; i < len; i++) r += CHARS[Math.floor(Math.random() * CHARS.length)];
  return r;
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("promo_codes")
      .select("id,code,active,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setCodes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCode = async () => {
    const c = newCode.trim().toUpperCase();
    if (!c) { setError("أدخل الكود أولاً"); return; }
    setSaving(true);
    setError("");
    const { error: err } = await sb.from("promo_codes").insert({ code: c, active: true });
    if (err) { setError(err.message); }
    else { setNewCode(""); load(); }
    setSaving(false);
  };

  const toggle = async (id: string, active: boolean) => {
    await sb.from("promo_codes").update({ active: !active }).eq("id", id);
    setCodes((p) => p.map((x) => (x.id === id ? { ...x, active: !active } : x)));
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذا الكود؟")) return;
    await sb.from("promo_codes").delete().eq("id", id);
    setCodes((p) => p.filter((x) => x.id !== id));
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("ar-SA");
  const active = codes.filter((c) => c.active).length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">🎟 أكواد الخصم</h1>
        <p className="text-gray-400 text-sm mt-1">
          {active} كود نشط من أصل {codes.length}
        </p>
      </div>

      {/* إضافة كود */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="text-white font-bold mb-4 text-sm">➕ إضافة كود جديد</h2>
        <div className="flex gap-3 mb-3">
          <input
            value={newCode}
            onChange={(e) => { setNewCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addCode()}
            placeholder="اكتب الكود أو اضغط عشوائي"
            maxLength={20}
            className="flex-1 bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white tracking-widest text-center font-mono focus:outline-none focus:border-gold"
          />
          <button
            onClick={() => setNewCode(genRandom())}
            className="px-4 py-2.5 border border-border text-gray-400 rounded-xl text-sm hover:text-white hover:border-gold/40 transition-colors"
          >
            🎲 عشوائي
          </button>
          <button
            onClick={addCode}
            disabled={saving || !newCode.trim()}
            className="px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-40"
          >
            {saving ? "..." : "إضافة"}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* قائمة الأكواد */}
      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">لا توجد أكواد بعد</div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className={`bg-card border rounded-xl px-5 py-3.5 flex items-center gap-4 transition-all ${
                c.active ? "border-green-500/20" : "border-border opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-mono text-lg font-black tracking-widest ${c.active ? "text-green-400" : "text-gray-500"}`}>
                  {c.code}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">{fmt(c.created_at)}</div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.active ? "bg-green-500/10 text-green-400" : "bg-gray-700/30 text-gray-500"}`}>
                {c.active ? "نشط" : "معطّل"}
              </span>
              <button
                onClick={() => toggle(c.id, c.active)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  c.active
                    ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                }`}
              >
                {c.active ? "تعطيل" : "تفعيل"}
              </button>
              <button
                onClick={() => del(c.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
