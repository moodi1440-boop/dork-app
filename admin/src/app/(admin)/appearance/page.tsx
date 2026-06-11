"use client";
import { useEffect, useState } from "react";
import { useAdminTheme, type AdminTheme } from "@/components/ThemeProvider";

const ADMIN_MODES: { id: AdminTheme; label: string; bg: string }[] = [
  { id: "dark",  label: "🌙 داكن",        bg: "#0d0d1a" },
  { id: "dim",   label: "⬛ رمادي داكن",  bg: "#1e1e24" },
  { id: "light", label: "☀️ فاتح",         bg: "#f0f0f0" },
  { id: "lgray", label: "🔘 رمادي فاتح",  bg: "#9e9b98" },
];

const ACCENT_THEMES = [
  { id: "gold",      label: "ذهبي",       color: "#d4a017" },
  { id: "emerald",   label: "زمردي",      color: "#10b981" },
  { id: "sapphire",  label: "ياقوتي",     color: "#3b82f6" },
  { id: "royalBlue", label: "أزرق ملكي",  color: "#4169e1" },
  { id: "bronze",    label: "برونزي",     color: "#cd7f32" },
  { id: "rose",      label: "وردي",       color: "#e91e8c" },
  { id: "violet",    label: "بنفسجي",     color: "#8b5cf6" },
  { id: "crimson",   label: "قرمزي",      color: "#dc2626" },
  { id: "teal",      label: "فيروزي",     color: "#14b8a6" },
  { id: "coral",     label: "مرجاني",     color: "#f97316" },
  { id: "fuchsia",   label: "فوشيا",      color: "#d946ef" },
  { id: "wine",      label: "عنابي",      color: "#9f1239" },
  { id: "forest",    label: "غابي",       color: "#228b22" },
  { id: "lime",      label: "ليموني",     color: "#65a30d" },
  { id: "sky",       label: "سماوي",      color: "#0284c7" },
];

const FONT_SIZES = [
  { id: "sm", label: "صغير", size: 13 },
  { id: "md", label: "متوسط", size: 15 },
  { id: "lg", label: "كبير",  size: 17 },
];

export default function AppearancePage() {
  const { theme: adminTheme, setTheme: setAdminTheme, accent: ctxAccent, fontSize: ctxFontSize, saveAppearance } = useAdminTheme();

  const [accent,   setAccent]   = useState(ctxAccent);
  const [fontSize, setFontSize] = useState(ctxFontSize);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    setAccent(ctxAccent);
    setFontSize(ctxFontSize);
  }, [ctxAccent, ctxFontSize]);

  const save = () => {
    saveAppearance(accent, fontSize);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">المظهر</h1>
        <p className="text-gray-400 text-sm mt-1">إعدادات مظهر لوحة الإدارة — تُطبّق عليها فقط</p>
      </div>

      {/* الوضع — يُطبّق فوراً */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="text-base font-bold text-white mb-1">🖥️ وضع العرض</h2>
        <p className="text-xs text-gray-500 mb-4">يُطبّق فوراً على لوحة التحكم</p>
        <div className="grid grid-cols-2 gap-3">
          {ADMIN_MODES.map((m) => (
            <button key={m.id} onClick={() => setAdminTheme(m.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${adminTheme === m.id ? "border-gold/50 bg-gold/10 text-white" : "border-border text-gray-400 hover:border-gold/20"}`}>
              <span className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ background: m.bg, boxShadow: adminTheme === m.id ? "0 0 0 2px rgb(var(--adm-accent))" : "0 0 0 1px #333" }} />
              <span className="text-sm font-semibold">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* لون الثيم */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="text-base font-bold text-white mb-1">🎨 لون الثيم</h2>
        <p className="text-xs text-gray-500 mb-4">يُطبّق على أزرار وعناصر لوحة التحكم</p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_THEMES.map((t) => (
            <button key={t.id} onClick={() => setAccent(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${accent === t.id ? "text-white" : "border-border text-gray-500 hover:border-gray-500"}`}
              style={accent === t.id ? { background: t.color + "22", borderColor: t.color + "88" } : {}}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* حجم الخط */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="text-base font-bold text-white mb-1">🔤 حجم الخط</h2>
        <p className="text-xs text-gray-500 mb-4">حجم النص في لوحة التحكم</p>
        <div className="flex gap-3">
          {FONT_SIZES.map((f) => (
            <button key={f.id} onClick={() => setFontSize(f.id)}
              className={`flex-1 py-2 rounded-lg border transition-all font-bold ${fontSize === f.id ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-500"}`}
              style={{ fontSize: f.size }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save}
        className={`w-full py-3 rounded-xl font-bold text-sm border transition-all ${saved ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"}`}>
        {saved ? "✅ تم الحفظ" : "💾 حفظ إعدادات الإدارة"}
      </button>
    </div>
  );
}
