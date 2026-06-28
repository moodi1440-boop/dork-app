"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";
import { exportPDF } from "@/lib/csv";
import { EmojiIcon } from "@/components/Icons";

type Booking = { id: string; salon_id: string; salonName: string; name: string; phone: string; barber_name: string; date: string; time: string; total: number; status: string; attendance: string | null; };

const STATUSES = [
  { value: "all",       label: "الكل",    color: "text-gray-300"   },
  { value: "pending",   label: "معلقة",   color: "text-yellow-400" },
  { value: "approved",  label: "مؤكدة",   color: "text-blue-400"   },
  { value: "rejected",  label: "مرفوضة",  color: "text-orange-400" },
  { value: "cancelled", label: "ملغاة",   color: "text-red-400"    },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30", approved: "bg-blue-400/10 text-blue-400 border-blue-400/30", rejected: "bg-orange-400/10 text-orange-400 border-orange-400/30", cancelled: "bg-red-400/10 text-red-400 border-red-400/30" };
  const labels: Record<string, string> = { pending: "معلقة", approved: "مؤكدة", rejected: "مرفوضة", cancelled: "ملغاة" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>{labels[status] ?? status}</span>;
}

export default function BookingsPage() {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [status,      setStatus]      = useState("all");
  const [search,      setSearch]      = useState("");
  const [dateFilter,  setDateFilter]  = useState(() => new Date().toISOString().split("T")[0]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (dateFilter) params.set("date", dateFilter);
    const rows = await fetch(`/api/bookings?${params.toString()}`).then((r) => r.json());
    let all: Booking[] = (Array.isArray(rows) ? rows : []).map((b: Record<string, unknown>) => ({
      id: b.id, salon_id: b.salon_id, salonName: b.salonName ?? "",
      name: b.name ?? "", phone: b.phone ?? "", barber_name: b.barber_name ?? "",
      date: b.date, time: b.time, total: b.total ?? 0, status: b.status, attendance: b.attendance ?? null,
    })) as Booking[];
    if (search) { const q = search.toLowerCase(); all = all.filter((b) => b.name?.toLowerCase().includes(q) || b.phone?.includes(q)); }
    setBookings(all);
    setLoading(false);
  }, [status, search, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (booking: Booking, newStatus: string) => {
    await sb.from("bookings").update({ status: newStatus }).eq("id", booking.id);
    load();
  };

  const deleteBooking = async (booking: Booking) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;
    await sb.from("bookings").delete().eq("id", booking.id);
    load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-white">الحجوزات</h1><p className="text-gray-400 text-sm mt-1">{bookings.length} حجز</p></div>
        <div className="flex gap-2">
          <button onClick={() => exportPDF(
            "الحجوزات",
            ["العميل", "الجوال", "الصالون", "التاريخ", "الوقت", "الإجمالي", "الحالة"],
            bookings.map((b) => [b.name, b.phone, b.salonName, b.date, b.time, b.total, b.status])
          )} className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors">
            <EmojiIcon icon="📄" size={16}/> PDF
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        {(() => {
          const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
          const parts = dateFilter ? dateFilter.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate()];
          const [cy, cm, cd] = parts;
          const daysInMonth = new Date(cy, cm, 0).getDate();
          const years = Array.from({length: 3}, (_, i) => new Date().getFullYear() - 1 + i);
          const update = (y: number, m: number, d: number) => {
            const max = new Date(y, m, 0).getDate();
            setDateFilter(`${y}-${String(m).padStart(2,"0")}-${String(Math.min(d,max)).padStart(2,"0")}`);
          };
          const selectCls = "bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold cursor-pointer";
          return (<>
            <select value={cd} onChange={(e) => update(cy, cm, Number(e.target.value))} className={selectCls}>
              {Array.from({length: daysInMonth}, (_, i) => i+1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={cm} onChange={(e) => update(cy, Number(e.target.value), cd)} className={selectCls}>
              {MONTHS.map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
            </select>
            <select value={cy} onChange={(e) => update(Number(e.target.value), cm, cd)} className={selectCls}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>);
        })()}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${status === s.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {!loading && status === "pending" && bookings.length > 1 && (
        <div className="mb-4">
          <button
            onClick={() => { if (confirm(`تأكيد جميع الحجوزات المعلقة (${bookings.length}) دفعة واحدة؟`)) bookings.forEach((b) => updateStatus(b, "approved")); }}
            className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl font-bold text-sm hover:bg-green-500/20 transition-colors">
            <EmojiIcon icon="✅" size={16}/> تأكيد الكل ({bookings.length} حجوزات)
          </button>
        </div>
      )}
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
                        {b.status === "pending"   && <button onClick={() => updateStatus(b, "approved")} className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">تأكيد</button>}
                        {(b.status === "pending" || b.status === "approved") && <button onClick={() => updateStatus(b, "cancelled")} className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">إلغاء</button>}
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
