"use client";
import { useEffect, useState, useCallback } from "react";

interface SalonBalance {
  id: string; name: string; owner: string; phone: string;
  earned: number; paid: number; balance: number; bookingCount: number;
}
interface Totals { totalEarned: number; totalPaid: number; totalBalance: number; }

export default function FinancePage() {
  const [salons,  setSalons]  = useState<SalonBalance[]>([]);
  const [totals,  setTotals]  = useState<Totals | null>(null);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter, search });
    const data = await fetch(`/api/finance?${params}`).then((r) => r.json());
    setSalons(data.salons ?? []);
    setTotals(data.totals ?? null);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const registerPayment = async (s: SalonBalance) => {
    if (!confirm(`تسجيل سداد ${s.balance.toLocaleString("ar-SA")} ر.س من ${s.name}؟`)) return;
    setPaying(s.id);
    await fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, amount: s.balance }),
    });
    setPaying(null);
    load();
  };

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">الميزان المالي</h1>
        <p className="text-gray-400 text-sm mt-1">متابعة المستحقات المالية للصالونات</p>
      </div>

      {totals && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "إجمالي المستحق", value: fmt(totals.totalEarned) + " ر.س", color: "text-gold", border: "border-gold/20", bg: "bg-gold/5" },
            { label: "تم التحصيل", value: fmt(totals.totalPaid) + " ر.س", color: "text-green-400", border: "border-green-500/20", bg: "bg-green-500/5" },
            { label: "المتبقي", value: fmt(totals.totalBalance) + " ر.س", color: totals.totalBalance > 0 ? "text-red-400" : "text-green-400", border: totals.totalBalance > 0 ? "border-red-500/20" : "border-green-500/20", bg: totals.totalBalance > 0 ? "bg-red-500/5" : "bg-green-500/5" },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} border ${item.border} rounded-2xl p-5 text-center`}>
              <div className={`text-2xl font-black ${item.color} mb-1`}>{item.value}</div>
              <div className="text-gray-500 text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث باسم الصالون..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <div className="flex gap-2">
          {[["all", "الكل"], ["unpaid", "غير مسددة"], ["paid", "مسددة"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter === k ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : salons.length === 0 ? (
        <div className="text-center py-16 text-gray-500">لا توجد بيانات</div>
      ) : (
        <div className="space-y-3">
          {salons.map((s) => (
            <div key={s.id} className={`bg-card border rounded-2xl p-5 ${s.balance > 0 ? "border-red-500/20" : "border-green-500/20"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-white">✂ {s.name}</div>
                  <div className="text-sm text-gray-400">👤 {s.owner} · 📞 {s.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.bookingCount} حجز</div>
                </div>
                <span className={`text-sm font-bold ${s.balance > 0 ? "text-red-400" : "text-green-400"}`}>
                  {s.balance > 0 ? `متبقي ${fmt(s.balance)} ر.س` : "✅ مسدد"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "المستحق", value: fmt(s.earned) + " ر.س", color: "text-gold" },
                  { label: "المسدد",  value: fmt(s.paid) + " ر.س",   color: "text-green-400" },
                  { label: "الرصيد",  value: fmt(s.balance) + " ر.س", color: s.balance > 0 ? "text-red-400" : "text-green-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-[#0d0d1a] rounded-xl p-3 text-center">
                    <div className={`text-lg font-black ${item.color}`}>{item.value}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>

              {s.balance > 0 && (
                <button onClick={() => registerPayment(s)} disabled={paying === s.id}
                  className="w-full py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                  {paying === s.id ? "جاري التسجيل..." : `✅ تسجيل السداد (${fmt(s.balance)} ر.س)`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
