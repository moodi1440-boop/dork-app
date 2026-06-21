"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone,     setPhone]     = useState("");
  const [pin,       setPin]       = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    if (error) setError("");
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
    if (error) setError("");
  };

  const login = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitted(true);
    if (!phone.trim()) {
      setError("الرجاء إدخال رقم الجوال");
      return;
    }
    if (!pin.trim()) {
      setError("الرجاء إدخال الرقم السري");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/owner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطأ في تسجيل الدخول");
        setLoading(false);
        return;
      }
      router.push("/owner");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  const showError = submitted && error;

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-3xl mx-auto mb-4 shadow-[0_0_24px_rgba(212,160,23,0.15)]">
            💈
          </div>
          <h1 className="text-2xl font-black text-white">لوحة مالك الصالون</h1>
          <p className="text-gray-500 text-sm mt-1">سجّل دخولك لإدارة صالونك</p>
        </div>

        <form onSubmit={login} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold">رقم جوال الصالون</label>
            <input type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} placeholder="05xxxxxxxx"
              autoComplete="tel"
              className="w-full bg-navy border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold">الرقم السري (PIN)</label>
            <input type="password" inputMode="numeric" value={pin} onChange={handlePinChange} placeholder="••••"
              autoComplete="off"
              className="w-full bg-navy border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
            <p className="text-gray-600 text-xs mt-1.5">يتم ضبط الرقم السري من تطبيق الصالون &gt; إعدادات الحلاق</p>
          </div>
          {showError ? <div className="text-red-400 text-xs text-center">{error}</div> : null}
          <button type="submit" disabled={loading || !phone.trim() || !pin.trim()}
            className="w-full py-3 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
