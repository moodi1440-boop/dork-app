"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone,   setPhone]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!phone) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/owner/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "خطأ في تسجيل الدخول");
      setLoading(false);
      return;
    }
    router.push("/owner/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-3xl mx-auto mb-4 shadow-[0_0_24px_rgba(212,160,23,0.15)]">
            💈
          </div>
          <h1 className="text-2xl font-black text-white">لوحة مالك الصالون</h1>
          <p className="text-gray-500 text-sm mt-1">سجّل دخولك لإدارة صالونك</p>
        </div>

        <div className="bg-[#13131f] border border-[#2a2a3a] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold">رقم جوال الصالون</label>
            <input type="tel" value={phone} onChange={(e) => {
              setPhone(e.target.value);
              // مسح الخطأ عند البدء بالكتابة
              if (error) setError("");
            }} placeholder="05xxxxxxxx"
              onKeyDown={(e) => e.key === "Enter" && phone && login()}
              className={`w-full bg-[#0d0d1a] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                error ? "border-red-500/50 focus:border-red-400" : "border-[#2a2a3a] focus:border-gold"
              }`} />
          </div>
          {error && error.trim() && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center rounded-lg p-3">
              {error}
            </div>
          )}
          <button onClick={login} disabled={loading || !phone}
            className="w-full py-3 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </div>
      </div>
    </div>
  );
}
