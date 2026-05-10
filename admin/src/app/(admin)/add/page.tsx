"use client";
import { useState } from "react";

type Mode = "salon" | "customer";

const inpCls = "w-full bg-[#0d0d1a] border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold";

export default function AddPage() {
  const [mode, setMode] = useState<Mode>("salon");

  const [salon, setSalon] = useState({
    name: "", owner: "", phone: "", ownerPhone: "",
    region: "", gov: "", address: "",
  });
  const [customer, setCustomer] = useState({ name: "", phone: "", password: "" });

  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null);

  const toast = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const addSalon = async () => {
    if (!salon.name || !salon.phone) { toast("الاسم والجوال مطلوبان", false); return; }
    setSaving(true);
    const res = await fetch("/api/salons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(salon),
    });
    setSaving(false);
    if (res.ok) {
      toast("✅ تم إضافة الصالون وتفعيله");
      setSalon({ name: "", owner: "", phone: "", ownerPhone: "", region: "", gov: "", address: "" });
    } else {
      const d = await res.json();
      toast("❌ " + (d.error ?? "خطأ"), false);
    }
  };

  const addCustomer = async () => {
    if (!customer.name || !customer.phone) { toast("الاسم والجوال مطلوبان", false); return; }
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...customer, password: customer.password || "1234" }),
    });
    setSaving(false);
    if (res.ok) {
      toast("✅ تم إضافة العميل");
      setCustomer({ name: "", phone: "", password: "" });
    } else {
      const d = await res.json();
      toast("❌ " + (d.error ?? "خطأ"), false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">إضافة</h1>
        <p className="text-gray-400 text-sm mt-1">إضافة صالون أو عميل جديد</p>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold border ${msg.ok ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {([["salon", "✂ إضافة صالون"], ["customer", "👤 إضافة عميل"]] as [Mode, string][]).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${mode === m ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "salon" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">✂ إضافة صالون جديد</h2>
          {([
            ["اسم الصالون *", "name"],
            ["اسم المالك",    "owner"],
            ["جوال الصالون *","phone"],
            ["جوال المالك",   "ownerPhone"],
            ["المنطقة",       "region"],
            ["المحافظة",      "gov"],
            ["العنوان",       "address"],
          ] as [string, keyof typeof salon][]).map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{label}</label>
              <input value={salon[key]} onChange={(e) => setSalon((p) => ({ ...p, [key]: e.target.value }))}
                className={inpCls} />
            </div>
          ))}
          <button onClick={addSalon} disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50">
            {saving ? "جاري الإضافة..." : "✅ إضافة وتفعيل الصالون"}
          </button>
        </div>
      )}

      {mode === "customer" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">👤 إضافة عميل جديد</h2>
          {([
            ["الاسم *",       "name",     "text"],
            ["رقم الجوال *",  "phone",    "text"],
            ["كلمة المرور",   "password", "password"],
          ] as [string, keyof typeof customer, string][]).map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{label}</label>
              <input type={type} value={customer[key]} onChange={(e) => setCustomer((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={key === "password" ? "افتراضي: 1234" : ""}
                className={inpCls} />
            </div>
          ))}
          <button onClick={addCustomer} disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50">
            {saving ? "جاري الإضافة..." : "✅ إضافة العميل"}
          </button>
        </div>
      )}
    </div>
  );
}
