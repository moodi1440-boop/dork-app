"use client";
import { useEffect, useState } from "react";
import { exportPDF } from "@/lib/csv";
import { EmojiIcon } from "@/components/Icons";

interface SalonRow {
  id: number; name: string; owner: string; phone: string;
  rating: number; status: string; total_paid: number;
}

export default function ComparePage() {
  const [salons,  setSalons]  = useState<SalonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/salons?status=all")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSalons(list.map((s: Record<string, unknown>) => ({
          id:        Number(s.id),
          name:      String(s.name ?? ""),
          owner:     String(s.owner ?? ""),
          phone:     String(s.phone ?? ""),
          rating:    Number(s.rating ?? 0),
          status:    String(s.status ?? ""),
          total_paid: Number(s.total_paid ?? 0),
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...salons].sort((a, b) => b.rating - a.rating);
  const maxRating = 5;

  if (loading) return <div className="p-8 text-center text-gold animate-pulse">جاري التحميل...</div>;

  const medals: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
  const borderColors: Record<number, string> = {
    0: "border-yellow-400", 1: "border-gray-400", 2: "border-amber-600",
  };
  const statusLabel: Record<string, { icon: string; text: string }> = {
    approved: { icon: "✅", text: "نشط" }, pending: { icon: "⏳", text: "قيد المراجعة" },
    frozen: { icon: "🔒", text: "مجمّد" }, banned: { icon: "🚫", text: "محظور" },
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">مقارنة الصالونات</h1>
        <p className="text-gray-400 text-sm mt-1">ترتيب الصالونات حسب التقييم</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => exportPDF(
          "مقارنة الصالونات",
          ["الترتيب", "الصالون", "المالك", "الهاتف", "التقييم", "الحالة"],
          sorted.map((s, i) => [i + 1, s.name, s.owner, s.phone, s.rating, s.status])
        )} className="flex-1 py-2.5 rounded-xl text-sm font-bold border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors">
          <EmojiIcon icon="📄" size={16}/> PDF
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">لا توجد صالونات</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s, i) => {
            const pct = Math.round((s.rating / maxRating) * 100);
            return (
              <div key={s.id}
                className={`bg-card border border-border rounded-2xl p-5 border-r-4 ${borderColors[i] ?? "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medals[i] ? <EmojiIcon icon={medals[i]} size={16}/> : `#${i + 1}`}</span>
                    <span className="font-bold text-white text-sm">{s.name}</span>
                  </div>
                  <span className="text-gold font-black text-sm"><EmojiIcon icon="⭐" size={16}/> {s.rating.toFixed(1)}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs text-gray-400">
                  <span><EmojiIcon icon="👤" size={16}/> {s.owner}</span>
                  <span><EmojiIcon icon="📞" size={16}/> {s.phone}</span>
                  <span>{statusLabel[s.status] ? <><EmojiIcon icon={statusLabel[s.status].icon} size={14}/> {statusLabel[s.status].text}</> : s.status}</span>
                </div>
                <div className="h-2 bg-navy rounded-full overflow-hidden">
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
            <div className="text-xs text-gray-400 mt-1">إجمالي الصالونات</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {salons.filter(s => s.status === "approved").length}
            </div>
            <div className="text-xs text-gray-400 mt-1">صالون نشط</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gold">
              {salons.length > 0 ? (salons.reduce((a, s) => a + s.rating, 0) / salons.length).toFixed(1) : "0"}
            </div>
            <div className="text-xs text-gray-400 mt-1">متوسط التقييم</div>
          </div>
        </div>
      )}
    </div>
  );
}
