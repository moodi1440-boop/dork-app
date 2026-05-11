"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase-browser";

interface Stats {
  totalBookings: number; pendingBookings: number;
  confirmedBookings: number; completedBookings: number;
  totalCustomers: number; totalSalons: number;
  approvedSalons: number; pendingSalons: number; revenue: number;
}

function StatCard({ icon, label, value, sub, color = "gold" }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string;
}) {
  const borderColor = color === "gold" ? "border-gold/20" : color === "green" ? "border-green-500/20" : color === "blue" ? "border-blue-500/20" : "border-purple-500/20";
  const iconBg      = color === "gold" ? "bg-gold/10" : color === "green" ? "bg-green-500/10" : color === "blue" ? "bg-blue-500/10" : "bg-purple-500/10";
  const valColor    = color === "gold" ? "text-gold" : color === "green" ? "text-green-400" : color === "blue" ? "text-blue-400" : "text-purple-400";
  return (
    <div className={`bg-card border ${borderColor} rounded-2xl p-5 hover:bg-card-hover transition-colors`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center text-xl`}>{icon}</div>
      </div>
      <div className={`text-3xl font-black ${valColor} mb-1`}>{value}</div>
      <div className="text-white font-semibold text-sm">{label}</div>
      {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      type Booking = { status: string; total?: number };
      const [salonsRes, custRes] = await Promise.all([
        sb.from("salons").select("id,status,bookings"),
        sb.from("customers").select("id", { count: "exact", head: true }),
      ]);
      const allSalons   = salonsRes.data ?? [];
      const allBookings = allSalons.flatMap((s: Record<string, unknown>) => (s.bookings as Booking[]) ?? []);
      setStats({
        totalBookings:    allBookings.length,
        pendingBookings:  allBookings.filter((b) => b.status === "pending").length,
        confirmedBookings: allBookings.filter((b) => b.status === "confirmed").length,
        completedBookings: allBookings.filter((b) => b.status === "completed" || b.status === "approved").length,
        totalCustomers:   custRes.count ?? 0,
        totalSalons:      allSalons.length,
        approvedSalons:   allSalons.filter((s: Record<string, unknown>) => s.status === "approved").length,
        pendingSalons:    allSalons.filter((s: Record<string, unknown>) => s.status === "pending").length,
        revenue:          allBookings.reduce((a, b) => a + (Number(b.total) || 0), 0),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-gold text-lg animate-pulse">جاري التحميل...</div></div>;
  if (!stats) return null;
  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">لوحة التحكم</h1>
        <p className="text-gray-400 text-sm mt-1">نظرة عامة على أداء المنصة</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📅" label="إجمالي الحجوزات"  value={fmt(stats.totalBookings)}   sub={`${stats.pendingBookings} معلقة`}       color="gold"  />
        <StatCard icon="👥" label="إجمالي العملاء"    value={fmt(stats.totalCustomers)}                                                color="blue"  />
        <StatCard icon="✂"  label="الصالونات"         value={fmt(stats.totalSalons)}     sub={`${stats.pendingSalons} تنتظر الموافقة`} color="green" />
        <StatCard icon="💰" label="إجمالي الإيرادات"  value={`${fmt(stats.revenue)} ر.س`}                                             color="gold"  />
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-base font-bold text-white mb-5">توزيع الحجوزات</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "معلقة",  value: stats.pendingBookings,   color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
            { label: "مؤكدة",  value: stats.confirmedBookings, color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20"   },
            { label: "مكتملة", value: stats.completedBookings, color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20"  },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} border ${item.border} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-black ${item.color}`}>{fmt(item.value)}</div>
              <div className="text-gray-400 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-5">حالة الصالونات</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "موافق عليها",   value: stats.approvedSalons, color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20"  },
            { label: "تنتظر مراجعة", value: stats.pendingSalons,  color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
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
