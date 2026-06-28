"use client";
import { useCallback, useEffect, useState } from "react";
import { exportCSV, exportPDF } from "@/lib/csv";
import { EmojiIcon } from "@/components/Icons";

interface SalonFinance {
  id: number; name: string; owner: string; phone: string;
  earned: number; paid: number; balance: number; bookingCount: number;
}

interface Totals { totalEarned: number; totalPaid: number; totalBalance: number; }

const FILTERS = [
  { value: "all",    label: "الكل"            },
  { value: "unpaid", label: "عليها مستحقات" },
  { value: "paid",   label: "مسوّاة"           },
];

export default function FinancePage() {
  const [salons,  setSalons]  = useState<SalonFinance[]>([]);
  const [totals,  setTotals]  = useState<Totals>({ totalEarned: 0, totalPaid: 0, totalBalance: 0 });
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter });
    if (search) params.set("search", search);
    const data = await fetch(`/api/finance?${params.toString()}`).then((r) => r.json());
    setSalons(Array.isArray(data.salons) ? data.salons : []);
    setTotals(data.totals ?? { totalEarned: 0, totalPaid: 0, totalBalance: 0 });
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const recordPayment = async (id: number) => {
    const amount = Number(payAmount[id]);
    if (!amount || amount <= 0) return;
    await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, amount }) });
    setPayAmount((prev) => ({ ...prev, [id]: "" }));
    load();
  };

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">العمولات</h1>
          <p className="text-gray-400 text-sm mt-1">المستحقات والمدفوعات لكل صالون</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(
            "العمولات.csv",
            ["الصالون", "المالك", "الجوال", "عدد الحجوزات", "المستحق", "المدفوع", "الرصيد"],
            salons.map((s) => [s.name, s.owner, s.phone, s.bookingCount, s.earned, s.paid, s.balance])
          )} className="px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors">
            <EmojiIcon icon="📊" size={16}/> CSV
          </button>
          <button onClick={() => exportPDF(
            "العمولات",
            ["الصالون", "المالك", "الجوال", "عدد الحجوزات", "المستحق", "المدفوع", "الرصيد"],
            salons.map((s) => [s.name, s.owner, s.phone, s.bookingCount, s.earned, s.paid, s.balance])
          )} className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors">
            <EmojiIcon icon="📄" size={16}/> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-2xl font-black text-gold">{fmt(totals.totalEarned)} ر.س</div>
          <div className="text-gray-400 text-xs mt-1">إجمالي المستحق</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-2xl font-black text-green-400">{fmt(totals.totalPaid)} ر.س</div>
          <div className="text-gray-400 text-xs mt-1">إجمالي المدفوع</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-2xl font-black text-red-400">{fmt(totals.totalBalance)} ر.س</div>
          <div className="text-gray-400 text-xs mt-1">إجمالي الرصيد المتبقي</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم الصالون..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter === f.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : salons.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد نتائج</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["الصالون","الحجوزات","المستحق","المدفوع","الرصيد","تسجيل دفعة"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {salons.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{s.name}</div><div className="text-gray-400 text-xs">{s.owner} · {s.phone}</div></td>
                    <td className="px-4 py-3 text-gray-300">{s.bookingCount}</td>
                    <td className="px-4 py-3 text-gold font-bold">{fmt(s.earned)} ر.س</td>
                    <td className="px-4 py-3 text-green-400">{fmt(s.paid)} ر.س</td>
                    <td className={`px-4 py-3 font-bold ${s.balance > 0 ? "text-red-400" : "text-gray-400"}`}>{fmt(s.balance)} ر.س</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <input type="number" min="0" value={payAmount[s.id] ?? ""} onChange={(e) => setPayAmount((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          placeholder="المبلغ" className="w-24 bg-navy border border-border rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
                        <button onClick={() => recordPayment(s.id)} className="px-2.5 py-1 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">تسجيل</button>
                      </div>
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
