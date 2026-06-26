"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmojiIcon, IconEye, IconEyeOff } from "@/components/Icons";

export default function LoginPage() {
  const [useAccount, setUseAccount] = useState(false);
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useAccount ? { username, password: pwd } : { password: pwd }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(useAccount ? "بيانات الدخول غير صحيحة" : "كلمة المرور غير صحيحة");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-gold/30 mb-4 shadow-[0_0_30px_rgba(212,160,23,0.2)]">
            <EmojiIcon icon="✂" size={32}/>
          </div>
          <h1 className="text-3xl font-black gold-text tracking-widest">DORK</h1>
          <p className="text-gray-400 text-sm mt-1">لوحة الإدارة</p>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6 text-center">تسجيل الدخول</h2>

          {useAccount && (
            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-2">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم"
                className="w-full bg-navy border border-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gold transition-colors"
                required
              />
            </div>
          )}

          <div className="mb-3">
            <label className="block text-sm text-gray-400 mb-2">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-navy border border-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gold transition-colors pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gold transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <button type="button" onClick={() => setUseAccount((v) => !v)} className="text-xs text-gray-500 hover:text-gold mb-5 block">
            {useAccount ? "استخدام كلمة مرور الإدارة الموحّدة" : "تسجيل دخول بحساب مُسمّى؟"}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-navy bg-gold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">DORK Salon Booking — Admin Panel</p>
      </div>
    </div>
  );
}
