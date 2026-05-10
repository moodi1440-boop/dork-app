"use client";
import { useEffect, useState, useCallback } from "react";

interface Booking {
  id: string; salon_id: string; salonName: string;
  name: string; phone: string; services: string[];
  barber_name: string; date: string; time: string;
  total: number; status: string;
}

const STATUSES = [
  { value: "all",       label: "الكل",      color: "text-gray-300" },
  { value: "pending",   label: "معلقة",     color: "text-yellow-400" },
  { value: "confirmed", label: "مؤكدة",     color: "text-blue-400" },
  { value: "completed", label: "مكتملة",    color: "text-green-400" },
  { value: "cancelled", label: "ملغاة",     color: "text-red-400" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    confirmed: "bg-blue-400/10 text-blue-400 border-blue-400/30",
    completed: "bg-green-400/10 text-green-400 border-green-400/30",
    cancelled: "bg-red-400/10 text-red-400 border-red-400/30",
  };
  const labels: Record<string, string> = {
    pending: "معلقة", confirmed: "مؤكدة", completed: "مكتملة", cancelled: "ملغاة",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status,   setStatus]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status, search });
    const data = await fetch(`/api/bookings?${params}`).then((r) => r.json());
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function deleteBooking(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">الحجوزات</h1>
        <p className="text-gray-400 text-sm mt-1">{bookings.length} حجز</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                status === s.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">لا توجد حجوزات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  <th className="px-4 py-3 text-right font-semibold">#</th>
                  <th className="px-4 py-3 text-right font-semibold">العميل</th>
                  <th className="px-4 py-3 text-right font-semibold">الصالون</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold">الوقت</th>
                  <th className="px-4 py-3 text-right font-semibold">الإجمالي</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{b.name}</div>
                      <div className="text-gray-400 text-xs">{b.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{b.salonName}</td>
                    <td className="px-4 py-3 text-gray-300">{b.date}</td>
                    <td className="px-4 py-3 text-gray-300">{b.time}</td>
                    <td className="px-4 py-3 text-gold font-bold">{b.total} ر.س</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {b.status === "pending" && (
                          <button onClick={() => updateStatus(b.id, "confirmed")}
                            className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                            تأكيد
                          </button>
                        )}
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <button onClick={() => updateStatus(b.id, "cancelled")}
                            className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                            إلغاء
                          </button>
                        )}
                        <button onClick={() => deleteBooking(b.id)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors">
                          حذف
                        </button>
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
