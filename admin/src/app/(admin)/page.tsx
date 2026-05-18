"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase-browser";

interface Stats {
  totalBookings: number; pendingBookings: number;
  confirmedBookings: number; completedBookings: number; cancelledBookings: number;
  totalCustomers: number; totalSalons: number;
  approvedSalons: number; pendingSalons: number;
  suspendedSalons: number; rejectedSalons: number;
  revenue: number;
  monthlyData: { month: string; count: number }[];
}

function StatCard({ icon, label, value, sub, color = "gold", alert = false }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string; alert?: boolean;
}) {
  const styles: Record<string, { border: string; iconBg: string; val: string }> = {
    gold:   { border: "border-gold/20",     iconBg: "bg-gold/10",     val: "text-gold"       },
    green:  { border: "border-green-500/20", iconBg: "bg-green-500/10", val: "text-green-400" },
    blue:   { border: "border-blue-500/20",  iconBg: "bg-blue-500/10",  val: "text-blue-400"  },
    purple: { border: "border-purple-500/20",iconBg: "bg-purple-500/10",val: "text-purple-400"},
    red:    { border: "border-red-500/20",   iconBg: "bg-red-500/10",   val: "text-red-400"   },
    yellow: { border: "border-yellow-500/20",iconBg: "bg-yellow-500/10",val: "text-yellow-400"},
    orange: { border: "border-orange-500/20",iconBg: "bg-orange-500/10",val: "text-orange-400"},
  };
  const s = styles[color] ?? styles.gold;
  return (
    <div className={`bg-card border ${s.border} rounded-2xl p-5 hover:bg-card-hover transition-colors`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center text-xl`}>{icon}</div>
        {alert && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">تحتاج تدخل</span>}
      </div>
      <div className={`text-3xl font-black ${s.val} mb-1`}>{value}</div>
      <div className="text-white font-semibold text-sm">{label}</div>
      {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function MonthlyChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d) => {
        const barH = Math.max((d.count / max) * 112, d.count > 0 ? 6 : 0);
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            {d.count > 0 && <span className="text-[10px] text-gold font-bold">{d.count}</span>}
            <div className="w-full flex flex-col justify-end" style={{ height: "112px" }}>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-gold/40 to-gold/20 border border-gold/30 transition-all"
                style={{ height: `${barH}px` }}
              />
            </div>
            <span className="text-[9px] text-gray-500 truncate w-full text-center">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      type Booking = { status: string; total?: number; date?: string };
      const [salonsRes, custRes] = await Promise.all([
        sb.from("salons").select("id,status,bookings"),
        sb.from("customers").select("id", { count: "exact", head: true }),
      ]);
      const allSalons   = (salonsRes.data ?? []) as Record<string, unknown>[];
      const allBookings = allSalons.flatMap((s) => (s.bookings as Booking[]) ?? []);

      const now = new Date();
      const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { month: ARABIC_MONTHS[d.getMonth()], count: allBookings.filter((b) => b.date?.startsWith(key)).length };
      });

      setStats({
        totalBookings:     allBookings.length,
        pendingBookings:   allBookings.filter((b) => b.status === "pending").length,
        confirmedBookings: allBookings.filter((b) => b.status === "confirmed").length,
        completedBookings: allBookings.filter((b) => b.status === "completed" || b.status === "approved").length,
        cancelledBookings: allBookings.filter((b) => b.status === "cancelled" || b.status === "canceled").length,
        totalCustomers:    custRes.count ?? 0,
        totalSalons:       allSalons.length,
        approvedSalons:    allSalons.filter((s) => s.status === "approved").length,
        pendingSalons:     allSalons.filter((s) => s.status === "pending").length,
        suspendedSalons:   allSalons.filter((s) => s.status === "suspended").length,
        rejectedSalons:    allSalons.filter((s) => s.status === "rejected").length,
        revenue:           allBookings.filter((b) => b.status === "approved" || b.status === "completed").reduce((a, b) => a + (Number(b.total) || 0), 0),
        monthlyData,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-gold text-lg animate-pulse">جاري التحميل...</div>
    </div>
  );
  if (!stats) return null;

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">لوحة التحكم</h1>
        <p className="text-gray-400 text-sm mt-1">نظرة عامة على أداء المنصة</p>
      </div>

      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard icon="📅" label="إجمالي الحجوزات"  value={fmt(stats.totalBookings)}      sub={`${stats.pendingBookings} في الانتظار`} color="gold"  />
        <StatCard icon="👥" label="إجمالي العملاء"    value={fmt(stats.totalCustomers)}                                                  color="blue"  />
        <StatCard icon="💰" label="إجمالي الإيرادات"  value={`${fmt(stats.revenue)} ر.س`}                                               color="green" />
      </div>

      {/* Row 2: Salon status KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="✅" label="صالونات نشطة"    value={stats.approvedSalons}  color="green"  />
        <StatCard icon="⏳" label="تنتظر الموافقة"  value={stats.pendingSalons}   color="yellow" alert={stats.pendingSalons > 0} />
        <StatCard icon="⏸" label="موقوفة"           value={stats.suspendedSalons} color="orange" />
        <StatCard icon="❌" label="مرفوضة"           value={stats.rejectedSalons}  color="red"    />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly bar chart */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-0.5">📈 الحجوزات الشهرية</h2>
          <p className="text-gray-500 text-xs mb-5">آخر 6 أشهر</p>
          <MonthlyChart data={stats.monthlyData} />
        </div>

        {/* Booking distribution progress bars */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-0.5">📊 توزيع الحجوزات</h2>
          <p className="text-gray-500 text-xs mb-5">حسب الحالة</p>
          <div className="space-y-4">
            {[
              { label: "في الانتظار", value: stats.pendingBookings,   barColor: "bg-yellow-400" },
              { label: "مؤكدة",       value: stats.confirmedBookings, barColor: "bg-blue-400"   },
              { label: "مكتملة",      value: stats.completedBookings, barColor: "bg-green-400"  },
              { label: "ملغاة",       value: stats.cancelledBookings, barColor: "bg-red-400"    },
            ].map((item) => {
              const pct = stats.totalBookings ? (item.value / stats.totalBookings) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-semibold">{fmt(item.value)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${item.barColor} rounded-full`} style={{ width: `${pct.toFixed(1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Salon status summary grid */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-5">ملخص الصالونات</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "موافق عليها",   value: stats.approvedSalons,  color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20"  },
            { label: "تنتظر مراجعة", value: stats.pendingSalons,   color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
            { label: "موقوفة",        value: stats.suspendedSalons, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
            { label: "مرفوضة",        value: stats.rejectedSalons,  color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/20"    },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} border ${item.border} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-black ${item.color}`}>{fmt(item.value)}</div>
              <div className="text-gray-400 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
