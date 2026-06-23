"use client";
import { useEffect, useState } from "react";
import { loadSocialAction, saveSocialAction } from "./actions";
import { EmojiIcon } from "@/components/Icons";

interface SocialLinks {
  [key: string]: unknown;
  email: string; twitter: string; whatsapp: string; telegram: string;
  telegramUser: string; enabled: boolean;
  customFields: Array<{ label: string; value: string }>;
}

const DEFAULT_SOCIAL: SocialLinks = {
  email: "", twitter: "", whatsapp: "", telegram: "", telegramUser: "", enabled: false, customFields: [],
};

export default function ContactPage() {
  const [social,    setSocial]    = useState<SocialLinks>(DEFAULT_SOCIAL);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newField,  setNewField]  = useState({ label: "", value: "" });

  useEffect(() => {
    loadSocialAction().then(({ social }) => {
      if (social) setSocial({ ...DEFAULT_SOCIAL, ...social });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaveError("");
    try {
      const result = await saveSocialAction(social);
      if (!result.success) throw new Error(result.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gold animate-pulse">جاري التحميل...</div>;

  const inpCls = "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">التواصل</h1>
        <p className="text-gray-400 text-sm mt-1">روابط التواصل الاجتماعي للمنصة</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <label className="flex items-center justify-between cursor-pointer mb-5">
          <div>
            <div className="text-sm text-white font-semibold">إظهار روابط التواصل</div>
            <div className="text-xs text-gray-500">تظهر في الشاشة الرئيسية للتطبيق</div>
          </div>
          <div onClick={() => setSocial((p) => ({ ...p, enabled: !p.enabled }))}
            className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${social.enabled ? "bg-gold" : "bg-gray-700"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${social.enabled ? "right-1" : "left-1"}`} />
          </div>
        </label>

        <div className="space-y-4">
          {[
            { key: "email",        icon: "📧", label: "البريد الإلكتروني", placeholder: "contact@example.com" },
            { key: "twitter",      icon: "🐦", label: "تويتر / X",         placeholder: "@username" },
            { key: "whatsapp",     icon: "💬", label: "واتساب",             placeholder: "966501234567" },
            { key: "telegram",     icon: "📱", label: "تيليجرام (رابط)",    placeholder: "https://t.me/channel" },
            { key: "telegramUser", icon: "📱", label: "تيليجرام (يوزر)",    placeholder: "@username" },
          ].map(({ key, icon, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold"><EmojiIcon icon={icon} size={14}/> {label}</label>
              <input value={(social as Record<string, unknown>)[key] as string ?? ""}
                onChange={(e) => setSocial((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder} className={inpCls} />
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-xs text-gray-400 font-semibold mb-3">حقول مخصصة</div>
          <div className="space-y-2 mb-3">
            {social.customFields.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input value={f.label}
                  onChange={(e) => { const nf = [...social.customFields]; nf[i] = { ...nf[i], label: e.target.value }; setSocial((p) => ({ ...p, customFields: nf })); }}
                  placeholder="الاسم"
                  className="flex-1 bg-navy border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
                <input value={f.value}
                  onChange={(e) => { const nf = [...social.customFields]; nf[i] = { ...nf[i], value: e.target.value }; setSocial((p) => ({ ...p, customFields: nf })); }}
                  placeholder="الرابط أو القيمة"
                  className="flex-1 bg-navy border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
                <button onClick={() => setSocial((p) => ({ ...p, customFields: p.customFields.filter((_, j) => j !== i) }))}
                  className="text-red-400 hover:text-red-300 text-sm font-bold px-2"><EmojiIcon icon="✕" size={16}/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newField.label} onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))} placeholder="الاسم"
              className="flex-1 bg-navy border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
            <input value={newField.value} onChange={(e) => setNewField((p) => ({ ...p, value: e.target.value }))} placeholder="القيمة"
              className="flex-1 bg-navy border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
            <button
              onClick={() => { if (newField.label) { setSocial((p) => ({ ...p, customFields: [...p.customFields, newField] })); setNewField({ label: "", value: "" }); }}}
              className="px-3 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-xs font-bold hover:bg-gold/20 transition-colors">➕</button>
          </div>
        </div>
      </div>

      {saveError && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"><EmojiIcon icon="❌" size={16}/> {saveError}</div>}
      <div className="mt-4">
        <button onClick={save} disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-sm border transition-all ${saved ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"} disabled:opacity-50`}>
          {saving ? "جاري الحفظ..." : saved ? <><EmojiIcon icon="✅" size={16}/> تم الحفظ</> : <><EmojiIcon icon="💾" size={16}/> حفظ</>}
        </button>
      </div>
    </div>
  );
}
