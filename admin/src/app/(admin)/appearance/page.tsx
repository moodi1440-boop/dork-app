"use client";
import { useEffect, useState } from "react";
import { useAdminTheme, type AdminTheme } from "@/components/ThemeProvider";
import { sb } from "@/lib/supabase-browser";

interface AppearanceSettings { theme: string; fontSize: string; bg: string; }

const DEFAULT_APPEARANCE: AppearanceSettings = { theme: "gold", fontSize: "md", bg: "none" };

const ADMIN_THEMES: { id: AdminTheme; label: string; bg: string }[] = [
  { id: "dark",  label: "🌙 داكن",       bg: "#0d0d1a" },
  { id: "dim",   label: "⬛ رمادي داكن", bg: "#1e1e24" },
  { id: "light", label: "☀️ فاتح",        bg: "#f0f0f0" },
  { id: "lgray", label: "🔘 رمادي فاتح", bg: "#9e9b98" },
];

const APP_THEMES = [
  { id: "gold",      label: "ذهبي",      color: "#d4af37" }, { id: "emerald",   label: "زمردي",     color: "#2ecc71" },
  { id: "sapphire",  label: "ياقوتي",    color: "#3498db" }, { id: "royalBlue", label: "أزرق ملكي", color: "#4169e1" },
  { id: "bronze",    label: "برونزي",    color: "#cd7f32" }, { id: "rose",      label: "وردي",      color: "#e91e8c" },
  { id: "violet",    label: "بنفسجي",    color: "#8e44ad" }, { id: "crimson",   label: "قرمزي",     color: "#dc143c" },
  { id: "teal",      label: "فيروزي",    color: "#1abc9c" }, { id: "coral",     label: "مرجاني",    color: "#ff6b6b" },
  { id: "fuchsia",   label: "فوشيا",     color: "#ff00ff" }, { id: "wine",      label: "عنابي",     color: "#722f37" },
  { id: "forest",    label: "غابي",      color: "#228b22" }, { id: "lime",      label: "ليموني",    color: "#32cd32" },
  { id: "sky",       label: "سماوي",     color: "#87ceeb" },
];

const BACKGROUNDS = [
  { id: "none",       label: "⬛ بلا" },    { id: "stars",     label: "⭐ نجوم" },
  { id: "grid",       label: "⊞ شبكة" },   { id: "waves",     label: "〜 أمواج" },
  { id: "marble",     label: "🪨 رخام" },   { id: "circuit",   label: "⚡ دوائر" },
  { id: "royal",      label: "👑 ملكي" },   { id: "tech",      label: "🤖 تقني" },
  { id: "goldMarble", label: "✨ رخام ذهبي" },
];

const FONT_SIZES = [{ id: "sm", label: "صغير" }, { id: "md", label: "متوسط" }, { id: "lg", label: "كبير" }];

export default function AppearancePage() {
  const { theme: adminTheme, setTheme: setAdminTheme } = useAdminTheme();
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    sb.from("admin_config").select("value").eq("key", "ui_settings").maybeSingle()
      .then(({ data }) => {
        if (data?.value && typeof data.value === "object")
          setAppearance({ ...DEFAULT_APPEARANCE, ...(data.value as AppearanceSettings) });
        setLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      }, (_err) => { setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true); setSaveError("");
    try {
      const { error } = await sb.from("admin_config")
        .upsert({ key: "ui_settings", value: appearance }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gold animate-pulse">جاري التحميل...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">المظهر</h1>
        <p className="text-gray-400 text-sm mt-1">إعدادات مظهر لوحة الإدارة والتطبيق</p>
      </div>

      {/* مظهر لوحة الإدارة */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="text-base font-bold text-white mb-1">🖥️ مظهر لوحة الإدارة</h2>
        <p className="text-xs text-gray-500 mb-4">يُطبّق فوراً على لوحة التحكم</p>
        <div className="grid grid-cols-2 gap-3">
          {ADMIN_THEMES.map((t) => (
            <button key={t.id} onClick={() => setAdminTheme(t.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${adminTheme === t.id ? "border-gold/50 bg-gold/10 text-white" : "border-border text-gray-400 hover:border-gold/20"}`}>
              <span className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ background: t.bg, boxShadow: adminTheme === t.id ? "0 0 0 2px #d4a017" : "0 0 0 1px #333" }} />
              <span className="text-sm font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* الثيم الافتراضي للتطبيق */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <h2 className="text-base font-bold text-white mb-1">🎨 الثيم الافتراضي للتطبيق</h2>
        <p className="text-xs text-gray-500 mb-5">يُطبّق على المستخدمين الجدد كإعداد افتراضي</p>

        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-3 font-semibold">🎨 لون الثيم</label>
          <div className="flex flex-wrap gap-2">
            {APP_THEMES.map((t) => (
              <button key={t.id} onClick={() => setAppearance((p) => ({ ...p, theme: t.id }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${appearance.theme === t.id ? "border-white/40 text-white" : "border-border text-gray-500 hover:border-gray-500"}`}
                style={appearance.theme === t.id ? { background: t.color + "22", borderColor: t.color + "88" } : {}}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-3 font-semibold">🔤 حجم الخط الافتراضي</label>
          <div className="flex gap-3">
            {FONT_SIZES.map((f) => (
              <button key={f.id} onClick={() => setAppearance((p) => ({ ...p, fontSize: f.id }))}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${appearance.fontSize === f.id ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-500"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-3 font-semibold">🖼️ خلفية التطبيق</label>
          <div className="flex flex-wrap gap-2">
            {BACKGROUNDS.map((b) => (
              <button key={b.id} onClick={() => setAppearance((p) => ({ ...p, bg: b.id }))}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${appearance.bg === b.id ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-500 hover:border-gray-500"}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {saveError && <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">❌ {saveError}</div>}
      <button onClick={save} disabled={saving}
        className={`w-full py-3 rounded-xl font-bold text-sm border transition-all ${saved ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"} disabled:opacity-50`}>
        {saving ? "جاري الحفظ..." : saved ? "✅ تم الحفظ" : "💾 حفظ الإعدادات"}
      </button>
    </div>
  );
}
