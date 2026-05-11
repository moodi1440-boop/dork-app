"use client";
import { useEffect, useState } from "react";

interface FinanceData {
  totalEarned: number;
  totalPaid: number;
  balance: number;
  completedBookings: number;
  pendingBookings: number;
  estimatedThisMonth: number;
  monthlyHistory: Array<{ month: string; earned: number; paid: number }>;
}

export function FinancialBalance() {
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/owner/finance");
        if (res.ok) {
          setFinance(await res.json());
        }
      } catch (error) {
        console.error("Error loading finance:", error);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gold animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (!finance) {
    return (
      <div className="text-gray-400 text-center py-8">
        لم نتمكن من تحميل البيانات المالية
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("ar-SA");
  const balanceColor = finance.balance > 0 ? "text-green-400" : finance.balance < 0 ? "text-red-400" : "text-yellow-400";
  const balanceBg = finance.balance > 0 ? "bg-green-400/10 border-green-400/30" : finance.balance < 0 ? "bg-red-400/10 border-red-400/30" : "bg-yellow-400/10 border-yellow-400/30";

  return (
    <div className="space-y-6">
      {/* بطاقة الرصيد الرئيسية */}
      <div className={`bg-gradient-to-br from-[#1a1a2e] to-[#13131f] border rounded-2xl p-8 ${balanceBg}`}>
        <div className="text-center">
          <div className="text-gray-400 text-sm mb-2">الرصيد الحالي</div>
          <div className={`text-5xl font-black mb-4 ${balanceColor}`}>{fmt(finance.balance)} ر.س</div>
          <div className="flex gap-4 justify-center text-xs">
            <div className="text-gray-400">
              إجمالي الأرباح: <span className="text-gold font-bold">{fmt(finance.totalEarned)} ر.س</span>
            </div>
            <div className="text-gray-400">
              المدفوع: <span className="text-blue-400 font-bold">{fmt(finance.totalPaid)} ر.س</span>
            </div>
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* الحجوزات المكتملة */}
        <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-5 hover:border-green-400/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center text-lg">✅</div>
            <span className="text-green-400 text-xs font-bold">مكتملة</span>
          </div>
          <div className="text-2xl font-black text-white mb-1">{fmt(finance.completedBookings)}</div>
          <div className="text-xs text-gray-500">حجوزات مكتملة</div>
        </div>

        {/* الحجوزات المعلقة */}
        <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-5 hover:border-yellow-400/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center text-lg">⏳</div>
            <span className="text-yellow-400 text-xs font-bold">معلقة</span>
          </div>
          <div className="text-2xl font-black text-white mb-1">{fmt(finance.pendingBookings)}</div>
          <div className="text-xs text-gray-500">حجوزات معلقة/مؤكدة</div>
        </div>

        {/* التقدير الشهري */}
        <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-5 hover:border-blue-400/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center text-lg">📈</div>
            <span className="text-blue-400 text-xs font-bold">الشهر الحالي</span>
          </div>
          <div className="text-2xl font-black text-white mb-1">{fmt(finance.estimatedThisMonth)}</div>
          <div className="text-xs text-gray-500">حجوزات متوقعة</div>
        </div>
      </div>

      {/* الرسم البياني الشهري (بسيط) */}
      <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span className="text-lg">📊</span>
          آخر 6 أشهر
        </h3>
        <div className="space-y-3">
          {finance.monthlyHistory.map((item) => (
            <div key={item.month} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-400">{item.month}</div>
              <div className="flex-1 bg-[#0d0d1a] rounded-full h-6 overflow-hidden border border-[#2a2a3a] flex items-center">
                {item.earned > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-gold to-[#f0c040] transition-all"
                    style={{ width: `${Math.min((item.earned / 30) * 100, 100)}%` }}
                  />
                )}
              </div>
              <div className="w-12 text-right text-xs font-bold text-gold">{fmt(item.earned)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
