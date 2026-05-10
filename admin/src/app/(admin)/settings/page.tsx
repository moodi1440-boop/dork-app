"use client";
import { useEffect, useState } from "react";

interface LoyaltySettings {
  enabled: boolean; hidden: boolean; pointsPerBooking: number;
  minRedeemPoints: number; redeemValue: number;
}
interface SocialLinks {
  [key: string]: unknown;
  email: string; twitter: string; whatsapp: string; telegram: string;
  telegramUser: string; enabled: boolean;
  customFields: Array<{ label: string; value: string }>;
}

const DEFAULT_LOYALTY: LoyaltySettings = {
  enabled: false, hidden: false, pointsPerBooking: 10, minRedeemPoints: 50, redeemValue: 5,
};
const DEFAULT_SOCIAL: SocialLinks = {
  email: "", twitter: "", whatsapp: "", telegram: "", telegramUser: "", enabled: false, customFields: [],
};

export default function SettingsPage() {
  const [tab,     setTab]     = useState("loyalty");
  const [loyalty, setLoyalty] = useState<LoyaltySettings>(DEFAULT_LOYALTY);
  const [social,  setSocial]  = useState<SocialLinks>(DEFAULT_SOCIAL);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [newField, setNewField] = useState({ label: "", value: "" });
  const [pwForm,  setPwForm]  = useState({ old: "", n1: "", n2: "", err: "" });
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      if (s.loyalty) setLoyalty({ ...DEFAULT_LOYALTY, ...s.loyalty });
      if (s.social)  setSocial({ ...DEFAULT_SOCIAL, ...s.social });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loyalty, social }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="p-8 text-center text-gold animate-pulse">جاري التحميل...</div>;

  const inpCls = "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold";
  const numInp = "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold text-center";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">الإعدادات</h1>
        <p className="text-gray-400 text-sm mt-1">إعدادات المنصة العامة</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ id: "loyalty", label: "🎁 نقاط الولاء" }, { id: "social", label: "📱 التواصل الاجتماعي" }, { id: "password", label: "🔑 كلمة المرور" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab === t.id ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "loyalty" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5">إعدادات نقاط الولاء</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm text-white font-semibold">تفعيل نظام النقاط</div>
                  <div className="text-xs text-gray-500">يتيح للعملاء جمع نقاط مقابل كل حجز</div>
                </div>
                <div onClick={() => setLoyalty((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${loyalty.enabled ? "bg-gold" : "bg-gray-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${loyalty.enabled ? "right-1" : "left-1"}`} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm text-white font-semibold">إخفاء النقاط عن العملاء</div>
                  <div className="text-xs text-gray-500">تعمل في الخلفية دون إظهارها</div>
                </div>
                <div onClick={() => setLoyalty((p) => ({ ...p, hidden: !p.hidden }))}
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${loyalty.hidden ? "bg-gold" : "bg-gray-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${loyalty.hidden ? "right-1" : "left-1"}`} />
                </div>
              </label>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">نقاط لكل حجز</label>
                <input type="number" min="1" value={loyalty.pointsPerBooking} onChange={(e) => setLoyalty((p) => ({ ...p, pointsPerBooking: Number(e.target.value) }))} className={numInp} />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">الحد الأدنى للاسترداد (نقطة)</label>
                <input type="number" min="1" value={loyalty.minRedeemPoints} onChange={(e) => setLoyalty((p) => ({ ...p, minRedeemPoints: Number(e.target.value) }))} className={numInp} />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">قيمة كل نقطة (ر.س)</label>
                <input type="number" min="0.1" step="0.1" value={loyalty.redeemValue} onChange={(e) => setLoyalty((p) => ({ ...p, redeemValue: Number(e.target.value) }))} className={numInp} />
              </div>

              <div className="bg-[#0d0d1a] border border-border rounded-xl p-4 text-xs text-gray-400">
                <div className="font-semibold text-gray-300 mb-2">ملخص الإعدادات:</div>
                <div>• كل حجز = {loyalty.pointsPerBooking} نقطة</div>
                <div>• يمكن الاسترداد بعد جمع {loyalty.minRedeemPoints} نقطة</div>
                <div>• قيمة {loyalty.minRedeemPoints} نقطة = {(loyalty.minRedeemPoints * loyalty.redeemValue).toFixed(1)} ر.س</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "social" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5">روابط التواصل الاجتماعي</h2>

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
                { key: "email",       label: "📧 البريد الإلكتروني", placeholder: "contact@example.com" },
                { key: "twitter",     label: "🐦 تويتر / X",         placeholder: "@username" },
                { key: "whatsapp",    label: "💬 واتساب",             placeholder: "966501234567" },
                { key: "telegram",    label: "📱 تيليجرام (رابط)",    placeholder: "https://t.me/channel" },
                { key: "telegramUser",label: "📱 تيليجرام (يوزر)",    placeholder: "@username" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{label}</label>
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
                    <input value={f.label} onChange={(e) => { const nf = [...social.customFields]; nf[i] = { ...nf[i], label: e.target.value }; setSocial((p) => ({ ...p, customFields: nf })); }}
                      placeholder="الاسم" className="flex-1 bg-[#0d0d1a] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
                    <input value={f.value} onChange={(e) => { const nf = [...social.customFields]; nf[i] = { ...nf[i], value: e.target.value }; setSocial((p) => ({ ...p, customFields: nf })); }}
                      placeholder="الرابط أو القيمة" className="flex-1 bg-[#0d0d1a] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
                    <button onClick={() => setSocial((p) => ({ ...p, customFields: p.customFields.filter((_, j) => j !== i) }))}
                      className="text-red-400 hover:text-red-300 text-sm font-bold px-2">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newField.label} onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))} placeholder="الاسم"
                  className="flex-1 bg-[#0d0d1a] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
                <input value={newField.value} onChange={(e) => setNewField((p) => ({ ...p, value: e.target.value }))} placeholder="القيمة"
                  className="flex-1 bg-[#0d0d1a] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold" />
                <button onClick={() => { if (newField.label) { setSocial((p) => ({ ...p, customFields: [...p.customFields, newField] })); setNewField({ label: "", value: "" }); }}}
                  className="px-3 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-xs font-bold hover:bg-gold/20 transition-colors">➕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "password" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5">🔑 تغيير كلمة مرور الإدارة</h2>
            <div className="space-y-4">
              {([
                ["كلمة المرور الحالية", "old"],
                ["كلمة المرور الجديدة", "n1"],
                ["تأكيد كلمة المرور",  "n2"],
              ] as [string, "old" | "n1" | "n2"][]).map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{label}</label>
                  <input type="password" value={pwForm[key]}
                    onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value, err: "" }))}
                    className={inpCls} />
                </div>
              ))}
              {pwForm.err && (
                <div className="text-red-400 text-sm font-semibold">❌ {pwForm.err}</div>
              )}
              <button
                onClick={async () => {
                  const res = await fetch("/api/auth/password", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldPassword: pwForm.old, newPassword: pwForm.n1, confirmPassword: pwForm.n2 }),
                  });
                  const d = await res.json();
                  if (!res.ok) { setPwForm((p) => ({ ...p, err: d.error ?? "خطأ" })); return; }
                  setPwSaved(true);
                  setPwForm({ old: "", n1: "", n2: "", err: "" });
                  setTimeout(() => setPwSaved(false), 3000);
                }}
                className={`w-full py-3 rounded-xl font-bold text-sm border transition-all ${pwSaved ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"}`}>
                {pwSaved ? "✅ تم تغيير كلمة المرور" : "💾 حفظ كلمة المرور الجديدة"}
              </button>
              <p className="text-xs text-gray-600">⚠ يتطلب تسجيل الدخول من جديد بعد التغيير</p>
            </div>
          </div>
        </div>
      )}

      {tab !== "password" && (
        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={saving}
            className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${saved ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"} disabled:opacity-50`}>
            {saving ? "جاري الحفظ..." : saved ? "✅ تم الحفظ" : "💾 حفظ الإعدادات"}
          </button>
        </div>
      )}
    </div>
  );
}
