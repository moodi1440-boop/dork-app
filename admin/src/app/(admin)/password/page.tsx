"use client";
import { useState } from "react";
import { EmojiIcon, IconEye, IconEyeOff } from "@/components/Icons";

export default function PasswordPage() {
  const [pwForm, setPwForm] = useState({ old: "", n1: "", n2: "", err: "" });
  const [pwSaved, setPwSaved] = useState(false);
  const [showPw, setShowPw] = useState({ old: false, n1: false, n2: false });

  const inpCls = "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">كلمة المرور</h1>
        <p className="text-gray-400 text-sm mt-1">تغيير كلمة مرور لوحة الإدارة</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-5"><EmojiIcon icon="🔑" size={18}/> تغيير كلمة المرور</h2>
        <div className="space-y-4">
          {([
            ["كلمة المرور الحالية", "old"],
            ["كلمة المرور الجديدة", "n1"],
            ["تأكيد كلمة المرور",  "n2"],
          ] as [string, "old" | "n1" | "n2"][]).map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{label}</label>
              <div className="relative">
                <input type={showPw[key] ? "text" : "password"} value={pwForm[key]}
                  onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value, err: "" }))}
                  className={`${inpCls} pl-10`} />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gold transition-colors">
                  {showPw[key] ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
          ))}
          {pwForm.err && <div className="text-red-400 text-sm font-semibold"><EmojiIcon icon="❌" size={16}/> {pwForm.err}</div>}
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
            {pwSaved ? <><EmojiIcon icon="✅" size={16}/> تم تغيير كلمة المرور</> : <><EmojiIcon icon="💾" size={16}/> حفظ كلمة المرور الجديدة</>}
          </button>
          <p className="text-xs text-gray-600"><EmojiIcon icon="⚠" size={16}/> يتطلب تسجيل الدخول من جديد بعد التغيير</p>
        </div>
      </div>
    </div>
  );
}
