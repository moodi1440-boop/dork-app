"use client";
import { useEffect, useState } from "react";

interface SalonStat {
  id: number; name: string; owner: string; phone: string;
  earned: number; paid: number; balance: number; bookingCount: number;
}

export default function ComparePage() {
  const [salons,  setSalons]  = useState<SalonStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance").then((r) => r.json()).then((d) => {
      setSalons(Array.isArray(d.salons) ? d.salons : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sorted = [...salons].sort((a, b) => b.bookingCount - a.bookingCount);
  const maxBk  = sorted[0]?.bookingCount || 1;

  const exportCSV = () => {
    const rows = [
      ["الترتيب", "الصالون", "إجمالي الحجوزات", "الإيرادات (ر.س)", "المدفوع (ر.س)", "الرصيد (ر.س)"],
      ...sorted.map((s, i) => [i + 1, s.name, s.bookingCount, s.earned, s.paid, s.balance]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,﻿" + encodeURIComponent(csv);
    a.download = "تقرير_دورك.csv";
    a.click();
  };

  const exportTXT = () => {
    const lines = [
      "📊 تقرير دورك - " + new Date().toLocaleDateString("ar-SA"),
      "=".repeat(40),
      "",
      ...sorted.map((s, i) =>
        `${i + 1}. ${s.name}\n   📅 ${s.bookingCount} حجز | 💰 ${s.earned} ريال | رصيد: ${s.balance} ر`
      ),
      "",
      "=".repeat(40),
      `إجمالي الصالونات: ${salons.length}`,
      `إجمالي الحجوزات: ${salons.reduce((a, s) => a + s.bookingCount, 0)}`,
      `إجمالي الإيرادات: ${salons.reduce((a, s) => a + s.earned, 0)} ريال`,
    ];
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(lines.join("\n"));
    a.download = "تقرير_دورك.txt";
    a.click();
  };

  if (loading) return <div className="p-8 text-center text-gold animate-pulse">جاري التحميل...</div>;

  const medals: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
  const borderColors: Record<number, string> = {
    0: "border-yellow-400", 1: "border-gray-400", 2: "border-amber-600",
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">مقارنة الصالونات</h1>
        <p className="text-gray-400 text-sm mt-1">ترتيب الصالونات حسب الأداء</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={exportCSV}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold border bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors">
          📊 تصدير CSV
        </button>
        <button onClick={exportTXT}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold border bg-gold/10 border-gold/30 text-gold hover:bg-gold/20 transition-colors">
          📄 تقرير نصي
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">لا توجد صالونات مفعّلة</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s, i) => {
            const pct = Math.round((s.bookingCount / maxBk) * 100);
            return (
              <div key={s.id}
                className={`bg-card border border-border rounded-2xl p-5 border-r-4 ${borderColors[i] ?? "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medals[i] ?? `#${i + 1}`}</span>
                    <span className="font-bold text-white text-sm">{s.name}</span>
                  </div>
                  <span className="text-gold font-black text-sm">{s.earned.toLocaleString()} ر.س</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs text-gray-400">
                  <span>📅 {s.bookingCount} حجز</span>
                  <span>💰 مدفوع: {s.paid.toLocaleString()} ر.س</span>
                  <span className={s.balance > 0 ? "text-red-400" : "text-green-400"}>
                    رصيد: {s.balance.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="h-2 bg-[#0d0d1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-gold to-yellow-300 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1 text-left">{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      {salons.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-5 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-white">{salons.length}</div>
            <div className="text-xs text-gray-400 mt-1">صالون مفعّل</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {salons.reduce((a, s) => a + s.bookingCount, 0)}
            </div>
            <div className="text-xs text-gray-400 mt-1">إجمالي الحجوزات</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gold">
              {salons.reduce((a, s) => a + s.earned, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">إجمالي الإيرادات</div>
          </div>
        </div>
      )}
    </div>
  );
}
