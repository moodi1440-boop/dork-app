"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

type Booking = { id: string; salon_id: string; salonName: string; name: string; phone: string; services: string[]; barber_name: string; date: string; time: string; total: number; status: string; };

const STATUSES = [
  { value: "all",       label: "الكل",   color: "text-gray-300"   },
  { value: "pending",   label: "معلقة",  color: "text-yellow-400" },
  { value: "confirmed", label: "مؤكدة",  color: "text-blue-400"   },
  { value: "completed", label: "مكتملة", color: "text-green-400"  },
  { value: "cancelled", label: "ملغاة",  color: "text-red-400"    },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30", confirmed: "bg-blue-400/10 text-blue-400 border-blue-400/30", completed: "bg-green-400/10 text-green-400 border-green-400/30", cancelled: "bg-red-400/10 text-red-400 border-red-400/30" };
  const labels: Record<string, string> = { pending: "معلقة", confirmed: "مؤكدة", completed: "مكتملة", cancelled: "ملغاة" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>{labels[status] ?? status}</span>;
}

export default function BookingsPage() {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [status,      setStatus]      = useState("all");
  const [search,      setSearch]      = useState("");
  const [dateFilter,  setDateFilter]  = useState("");
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("salons").select("id,name,bookings");
    type B = Record<string, unknown>;
    let all: Booking[] = (data ?? []).flatMap((s: Record<string, unknown>) =>
      ((s.bookings as B[]) ?? []).map((b) => ({ ...b, salon_id: s.id, salonName: s.name } as Booking))
    );
    if (status !== "all") all = all.filter((b) => b.status === status);
    if (dateFilter) all = all.filter((b) => b.date === dateFilter);
    if (search) { const q = search.toLowerCase(); all = all.filter((b) => b.name?.toLowerCase().includes(q) || b.phone?.includes(q)); }
    all.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
    setBookings(all.slice(0, 200));
    setLoading(false);
  }, [status, search, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (booking: Booking, newStatus: string) => {
    const { data: s } = await sb.from("salons").select("bookings").eq("id", booking.salon_id).single();
    type B = Record<string, unknown>;
    const bks: B[] = (s?.bookings as B[]) ?? [];
    const idx = bks.findIndex((b) => String(b.id) === String(booking.id));
    if (idx !== -1) { bks[idx] = { ...bks[idx], status: newStatus }; await sb.from("salons").update({ bookings: bks }).eq("id", booking.salon_id); }
    load();
  };

  const deleteBooking = async (booking: Booking) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;
    const { data: s } = await sb.from("salons").select("bookings").eq("id", booking.salon_id).single();
    type B = Record<string, unknown>;
    const bks: B[] = ((s?.bookings as B[]) ?? []).filter((b) => String(b.id) !== String(booking.id));
    await sb.from("salons").update({ bookings: bks }).eq("id", booking.salon_id);
    load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-black text-white">الحجوزات</h1><p className="text-gray-400 text-sm mt-1">{bookings.length} حجز</p></div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold [color-scheme:dark]" />
        {dateFilter && (
          <button onClick={() => setDateFilter("")} className="px-3 py-2 rounded-xl text-xs border border-border text-gray-400 hover:text-white hover:border-gold/20 transition-all">
            ✕ إلغاء الفلتر
          </button>
        )}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${status === s.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : bookings.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد حجوزات</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["#","العميل","الصالون","التاريخ","الوقت","الإجمالي","الحالة","إجراءات"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3"><div className="font-semibold text-white">{b.name}</div><div className="text-gray-400 text-xs">{b.phone}</div></td>
                    <td className="px-4 py-3 text-gray-300">{b.salonName}</td>
                    <td className="px-4 py-3 text-gray-300">{b.date}</td>
                    <td className="px-4 py-3 text-gray-300">{b.time}</td>
                    <td className="px-4 py-3 text-gold font-bold">{b.total} ر.س</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {b.status === "pending"    && <button onClick={() => updateStatus(b, "confirmed")} className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">تأكيد</button>}
                        {(b.status === "pending" || b.status === "confirmed") && <button onClick={() => updateStatus(b, "cancelled")} className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">إلغاء</button>}
                        <button onClick={() => deleteBooking(b)} className="px-2.5 py-1 rounded-lg text-xs bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20">حذف</button>
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
