"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FinancialBalance } from "@/components/FinancialBalance";

interface Salon {
  id: number;
  name: string;
  owner: string;
  phone: string;
  status: string;
  frozen: boolean;
  banned: boolean;
  services: string[];
  prices: Record<string, number>;
  barbers: Array<{ name: string }>;
  bookings: Array<{ status: string; total?: number; date?: string }>;
  owner_phone: string;
  rating: number;
}

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: "overview", label: "نظرة عامة", icon: "📊" },
  { id: "bookings", label: "الحجوزات", icon: "📅" },
  { id: "waiting", label: "الانتظار", icon: "⏳" },
  { id: "messages", label: "الرسائل", icon: "💬" },
  { id: "settings", label: "الإعدادات", icon: "⚙" },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);

  // تحميل بيانات الصالون
  const loadSalon = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/salon");
      if (!res.ok) {
        router.push("/owner-login");
        return;
      }
      const data = await res.json();
      setSalon(data as Salon);
    } catch (error) {
      console.error("Failed to load salon:", error);
      router.push("/owner-login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSalon();
  }, [loadSalon]);

  const logout = async () => {
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-gold text-lg animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-red-400">حدث خطأ - الرجاء العودة والمحاولة مجدداً</div>
      </div>
    );
  }

  const statusColor =
    salon.status === "approved"
      ? "bg-green-400/10 text-green-400 border-green-400/30"
      : "bg-yellow-400/10 text-yellow-400 border-yellow-400/30";

  const pendingBookings = salon.bookings.filter((b) => b.status === "pending").length;
  const confirmedBookings = salon.bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-[#0d0d1a]" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#13131f] border-b border-[#2a2a3a] backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="text-2xl">💈</span>
                {salon.name}
              </h1>
              <p className="text-gray-400 text-xs mt-1 flex gap-3">
                <span>صاحب الصالون: {salon.owner}</span>
                <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${statusColor}`}>
                  {salon.status === "approved" ? "✅ مفعّل" : "⏳ انتظار موافقة"}
                </span>
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors"
            >
              تسجيل خروج
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[72px] z-30 bg-[#0d0d1a]/95 backdrop-blur border-b border-[#2a2a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-gold text-gold"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* نقطة تحذير إذا كان الصالون معلقاً */}
            {salon.status !== "approved" && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 flex gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="text-yellow-400 font-bold text-sm">صالونك قيد المراجعة</div>
                  <div className="text-yellow-300/70 text-xs mt-1">
                    سيتم عرض صالونك للعملاء بعد موافقة الإدارة
                  </div>
                </div>
              </div>
            )}

            {/* بطاقات الإحصائيات السريعة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-6 hover:border-gold/20 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-lg">
                    📅
                  </div>
                  <div className="text-xs font-bold text-gray-500">إجمالي</div>
                </div>
                <div className="text-3xl font-black text-white mb-2">{salon.bookings.length}</div>
                <div className="text-xs text-gray-400">إجمالي الحجوزات</div>
              </div>

              <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-6 hover:border-yellow-400/20 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center text-lg">
                    ⏳
                  </div>
                  <div className="text-xs font-bold text-yellow-400">معلقة</div>
                </div>
                <div className="text-3xl font-black text-white mb-2">{pendingBookings}</div>
                <div className="text-xs text-gray-400">تنتظر التأكيد</div>
              </div>

              <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-6 hover:border-green-400/20 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center text-lg">
                    ✅
                  </div>
                  <div className="text-xs font-bold text-green-400">مؤكدة</div>
                </div>
                <div className="text-3xl font-black text-white mb-2">{confirmedBookings}</div>
                <div className="text-xs text-gray-400">حجوزات مؤكدة</div>
              </div>
            </div>

            {/* الميزان المالي */}
            <div className="mt-8">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">💰</span>
                الميزان المالي
              </h2>
              <FinancialBalance />
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <button
            onClick={() => router.push("/owner/bookings")}
            className="w-full py-12 bg-[#13131f] border border-dashed border-gold/30 rounded-xl hover:border-gold/50 transition-colors text-gold font-bold"
          >
            اذهب إلى إدارة الحجوزات →
          </button>
        )}

        {activeTab === "waiting" && (
          <button
            onClick={() => router.push("/owner/waiting-list")}
            className="w-full py-12 bg-[#13131f] border border-dashed border-gold/30 rounded-xl hover:border-gold/50 transition-colors text-gold font-bold"
          >
            اذهب إلى قائمة الانتظار →
          </button>
        )}

        {activeTab === "messages" && (
          <div className="text-center py-12 text-gray-400">
            جاري العمل على نظام الرسائل...
          </div>
        )}

        {activeTab === "settings" && (
          <div className="text-center py-12 text-gray-400">
            جاري العمل على إعدادات الصالون...
          </div>
        )}
      </div>
    </div>
  );
}
