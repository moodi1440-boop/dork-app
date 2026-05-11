"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

interface FinanceReport {
  totalRevenue: number;
  totalPaid: number;
  totalBalance: number;
  completedBookings: number;
  averagePerBooking: number;
  topSalons: Array<{ id: number; name: string; earned: number; bookings: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; paid: number; balance: number }>;
  salonStats: Array<{
    salonId: number;
    salonName: string;
    earned: number;
    paid: number;
    balance: number;
    bookingCount: number;
  }>;
}

function StatCard({ icon, label, value, color = "gold", sub }: { icon: string; label: string; value: string | number; color?: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    gold: "bg-gold/10 border-gold/20 text-gold",
    green: "bg-green-400/10 border-green-400/20 text-green-400",
    red: "bg-red-400/10 border-red-400/20 text-red-400",
    blue: "bg-blue-400/10 border-blue-400/20 text-blue-400",
  };
  return (
    <div className={`bg-[#13131f] border rounded-2xl p-6 ${colorMap[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        <span className="text-xs font-bold opacity-70">{label}</span>
      </div>
      <div className="text-3xl font-black text-white mb-2">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}

export default function FinancePage() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "salons" | "monthly">("overview");
  const [paying, setPaying] = useState<number | null>(null);
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/finance");
      if (res.ok) {
        setReport(await res.json());
      }
    } catch (error) {
      console.error("Error loading finance:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recordPayment = async (salonId: number) => {
    const n = Number(amount);
    if (!n || !report) return;

    const { data } = await sb.from("salons").select("total_paid").eq("id", salonId).single();
    const newPaid = (Number((data as Record<string, unknown>)?.total_paid) || 0) + n;
    await sb.from("salons").update({ total_paid: newPaid }).eq("id", salonId);

    setPaying(null);
    setAmount("");
    load();
  };

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gold text-lg animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400">حدث خطأ في تحميل البيانات</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">تقرير الإيرادات والمالية</h1>
        <p className="text-gray-400 text-sm mt-2">نظرة شاملة على الإيرادات والمدفوعات والرصيد</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="💰" label="إجمالي الإيرادات" value={`${fmt(report.totalRevenue)} ر.س`} color="gold" />
        <StatCard icon="✅" label="المدفوع" value={`${fmt(report.totalPaid)} ر.س`} color="green" />
        <StatCard icon="⏳" label="المستحق" value={`${fmt(report.totalBalance)} ر.س`} color={report.totalBalance > 0 ? "red" : "green"} />
        <StatCard icon="📊" label="عدد الحجوزات" value={fmt(report.completedBookings)} color="blue" />
        <StatCard icon="📈" label="متوسط الحجز" value={`${fmt(report.averagePerBooking)} ر.س`} color="gold" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2a2a3a]">
        {["overview", "salons", "monthly"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as "overview" | "salons" | "monthly")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {t === "overview" && "نظرة عامة"}
            {t === "salons" && "الصالونات"}
            {t === "monthly" && "البيانات الشهرية"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* أفضل الصالونات */}
          <div className="bg-[#13131f] border border-[#2a2a3a] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🏆</span> أفضل الصالونات
            </h2>
            <div className="space-y-3">
              {report.topSalons.map((salon, idx) => (
                <div key={salon.id} className="flex items-center justify-between p-3 bg-[#0d0d1a] rounded-lg hover:bg-[#1a1a2e] transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{salon.name}</div>
                      <div className="text-xs text-gray-400">{fmt(salon.bookings)} حجز</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gold">{fmt(salon.earned)} ر.س</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ملخص مالي */}
          <div className="bg-[#13131f] border border-[#2a2a3a] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📋</span> ملخص المالية
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gold/5 border border-gold/20 rounded-lg">
                <span className="text-sm text-gray-300">إجمالي الإيرادات</span>
                <span className="text-lg font-black text-gold">{fmt(report.totalRevenue)} ر.س</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-400/5 border border-green-400/20 rounded-lg">
                <span className="text-sm text-gray-300">إجمالي المدفوع</span>
                <span className="text-lg font-black text-green-400">{fmt(report.totalPaid)} ر.س</span>
              </div>
              <div className={`flex items-center justify-between p-3 border rounded-lg ${
                report.totalBalance > 0
                  ? "bg-red-400/5 border-red-400/20"
                  : "bg-green-400/5 border-green-400/20"
              }`}>
                <span className="text-sm text-gray-300">الرصيد المتبقي</span>
                <span className={`text-lg font-black ${report.totalBalance > 0 ? "text-red-400" : "text-green-400"}`}>
                  {fmt(report.totalBalance)} ر.س
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-400/5 border border-blue-400/20 rounded-lg">
                <span className="text-sm text-gray-300">نسبة التحصيل</span>
                <span className="text-lg font-black text-blue-400">
                  {report.totalRevenue > 0 ? Math.round((report.totalPaid / report.totalRevenue) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salons Tab */}
      {tab === "salons" && (
        <div className="bg-[#13131f] border border-[#2a2a3a] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] bg-[#0d0d1a] text-gray-400 text-xs">
                  <th className="px-4 py-3 text-right font-semibold">الصالون</th>
                  <th className="px-4 py-3 text-right font-semibold">الحجوزات</th>
                  <th className="px-4 py-3 text-right font-semibold">الإيرادات</th>
                  <th className="px-4 py-3 text-right font-semibold">المدفوع</th>
                  <th className="px-4 py-3 text-right font-semibold">المستحق</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {report.salonStats.map((salon) => (
                  <tr key={salon.salonId} className="border-b border-[#2a2a3a] hover:bg-[#1a1a2e] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{salon.salonName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{fmt(salon.bookingCount)}</td>
                    <td className="px-4 py-3 text-gold font-bold">{fmt(salon.earned)} ر.س</td>
                    <td className="px-4 py-3 text-green-400">{fmt(salon.paid)} ر.س</td>
                    <td className={`px-4 py-3 font-bold ${salon.balance > 0 ? "text-red-400" : "text-green-400"}`}>
                      {fmt(salon.balance)} ر.س
                    </td>
                    <td className="px-4 py-3">
                      {paying === salon.salonId ? (
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="المبلغ"
                            className="w-24 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
                          />
                          <button
                            onClick={() => recordPayment(salon.salonId)}
                            className="px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                          >
                            ✓
                          </button>
                          <button onClick={() => setPaying(null)} className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPaying(salon.salonId);
                            setAmount("");
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20"
                        >
                          تسجيل دفعة
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Tab */}
      {tab === "monthly" && (
        <div className="bg-[#13131f] border border-[#2a2a3a] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">الاتجاه الشهري</h2>
          <div className="space-y-4">
            {report.monthlyTrend.map((item) => (
              <div key={item.month}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-300">{item.month}</span>
                  <span className="text-sm font-bold text-gold">{fmt(item.revenue)} ر.س</span>
                </div>
                <div className="w-full bg-[#0d0d1a] rounded-full h-6 overflow-hidden border border-[#2a2a3a] flex items-center">
                  {item.revenue > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-gold to-[#f0c040] transition-all"
                      style={{ width: `${Math.min((item.revenue / 30) * 100, 100)}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
