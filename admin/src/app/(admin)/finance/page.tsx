"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

interface SalonStat { id: number; name: string; owner: string; phone: string; earned: number; paid: number; balance: number; bookingCount: number; }

export default function FinancePage() {
  const [salons,  setSalons]  = useState<SalonStat[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [totals,  setTotals]  = useState({ totalEarned: 0, totalPaid: 0, totalBalance: 0 });
  const [paying,  setPaying]  = useState<number | null>(null);
  const [amount,  setAmount]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = sb.from("salons").select("id,name,owner,phone,total_paid,status,bookings(id,status,total)").eq("status", "approved");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q.limit(200);
      if (error) throw new Error(error.message);

      type B = { status: string; total?: number };
      const RATE_PER_BOOKING = 1; // 1 ريال لكل حجز مكتمل
      const list: SalonStat[] = (data ?? []).map((s: Record<string, unknown>) => {
        const bks    = (s.bookings as B[]) ?? [];
        const completedCount = bks.filter((b) => b.status === "approved" || b.status === "completed").length;
        const earned = completedCount * RATE_PER_BOOKING;
        const paid   = Number(s.total_paid) || 0;
        return { id: Number(s.id), name: String(s.name), owner: String(s.owner ?? ""), phone: String(s.phone ?? ""), earned, paid, balance: earned - paid, bookingCount: completedCount };
      });
      setSalons(list.filter((s) => filter === "paid" ? s.balance <= 0 : filter === "unpaid" ? s.balance > 0 : true));
      setTotals({ totalEarned: list.reduce((a, s) => a + s.earned, 0), totalPaid: list.reduce((a, s) => a + s.paid, 0), totalBalance: list.reduce((a, s) => a + s.balance, 0) });
    } catch (e) {
      console.error("Error loading finance data:", e);
      setSalons([]);
      setTotals({ totalEarned: 0, totalPaid: 0, totalBalance: 0 });
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const recordPayment = async (id: number) => {
    const n = Number(amount);
    if (!n) return;
    try {
      const { data, error: fetchErr } = await sb.from("salons").select("total_paid").eq("id", id).single();
      if (fetchErr) throw new Error(fetchErr.message);
      const newPaid = (Number((data as Record<string, unknown>)?.total_paid) || 0) + n;
      const { error: updateErr } = await sb.from("salons").update({ total_paid: newPaid }).eq("id", id);
      if (updateErr) throw new Error(updateErr.message);
      setPaying(null); setAmount(""); load();
    } catch (e) {
      alert("خطأ: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-black text-white">الميزان المالي</h1><p className="text-gray-400 text-sm mt-1">متابعة الإيرادات والمدفوعات</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[{ label: "إجمالي الإيرادات", value: totals.totalEarned, color: "text-gold" }, { label: "إجمالي المدفوع", value: totals.totalPaid, color: "text-green-400" }, { label: "إجمالي المستحق", value: totals.totalBalance, color: "text-red-400" }].map((t) => (
          <div key={t.label} className="bg-card border border-border rounded-2xl p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
            <div className="text-gray-400 text-xs mb-2 leading-tight">{t.label}</div>
            <div className={`text-xl sm:text-2xl font-black ${t.color} leading-tight break-words`}>{fmt(t.value)} <span className="text-sm">ر.س</span></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        {[["all","الكل"],["unpaid","غير محصّل"],["paid","محصّل"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter === v ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400"}`}>{l}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : salons.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد بيانات</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-gray-400 text-xs">{["الصالون","الحجوزات","الإيرادات","المدفوع","المستحق","إجراء"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {salons.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{s.name}</div><div className="text-gray-400 text-xs">{s.phone}</div></td>
                    <td className="px-4 py-3 text-gray-300">{s.bookingCount}</td>
                    <td className="px-4 py-3 text-gold font-bold">{fmt(s.earned)} ر.س</td>
                    <td className="px-4 py-3 text-green-400">{fmt(s.paid)} ر.س</td>
                    <td className={`px-4 py-3 font-bold ${s.balance > 0 ? "text-red-400" : "text-green-400"}`}>{fmt(s.balance)} ر.س</td>
                    <td className="px-4 py-3">
                      {paying === s.id ? (
                        <div className="flex gap-1.5 items-center">
                          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ"
                            className="w-24 bg-[#0d0d1a] border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-gold" />
                          <button onClick={() => recordPayment(s.id)} className="px-2.5 py-1.5 rounded-lg text-xs bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30 transition-colors font-bold">✓</button>
                          <button onClick={() => setPaying(null)} className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setPaying(s.id); setAmount(""); }} className="px-3 py-1.5 rounded-lg text-xs bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 transition-colors font-bold whitespace-nowrap">تحصيل دفعة</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
