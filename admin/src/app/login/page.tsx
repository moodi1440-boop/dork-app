"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pwd, setPwd] = useState("");
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
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("كلمة المرور غير صحيحة");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-gold/30 mb-4 shadow-[0_0_30px_rgba(212,160,23,0.2)]">
            <span className="text-3xl">✂</span>
          </div>
          <h1 className="text-3xl font-black gold-text tracking-widest">DORK</h1>
          <p className="text-gray-400 text-sm mt-1">لوحة الإدارة</p>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6 text-center">تسجيل الدخول</h2>

          <div className="mb-5">
            <label className="block text-sm text-gray-400 mb-2">كلمة المرور</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-navy border border-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gold transition-colors"
              required
            />
          </div>

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
