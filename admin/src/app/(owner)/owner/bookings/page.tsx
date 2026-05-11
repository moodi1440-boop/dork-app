"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Booking {
  id: string;
  name: string;
  phone: string;
  services: string[];
  barber_name: string;
  date: string;
  time: string;
  total: number;
  status: string;
}

const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "معلقة" },
  { value: "confirmed", label: "مؤكدة" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["⏳ معلقة", "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"],
    confirmed: ["✅ مؤكدة", "bg-green-400/10 text-green-400 border-green-400/30"],
    completed: ["🎉 مكتملة", "bg-blue-400/10 text-blue-400 border-blue-400/30"],
    cancelled: ["❌ ملغاة", "bg-red-400/10 text-red-400 border-red-400/30"],
  };
  const [label, cls] = map[status] ?? [status, "bg-gray-500/10 text-gray-400 border-gray-400/30"];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

export default function OwnerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(`/api/owner/bookings?status=all`);
      if (!res.ok) {
        router.push("/owner-login");
        return;
      }
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Filter bookings
  useEffect(() => {
    let filtered = bookings;

    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(q) || b.phone.includes(q));
    }

    // Sort by date/time descending
    filtered.sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (b.time || "").localeCompare(a.time || "");
    });

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, search]);

  const updateBookingStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/owner/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
        );
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gold animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <span className="text-2xl">📅</span>
          إدارة الحجوزات
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {fmt(bookings.length)} حجز إجمالي • {fmt(filteredBookings.length)} نتيجة
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو رقم الجوال..."
          className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
        />
        <div className="flex gap-2 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                statusFilter === s.value
                  ? "bg-gold/10 border-gold/30 text-gold"
                  : "border-[#2a2a3a] text-gray-400 hover:border-gold/20"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-2">📭</div>
          لا توجد حجوزات
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-4 hover:border-gold/20 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{booking.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{booking.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    📅 {booking.date} • ⏰ {booking.time}
                  </div>
                  {booking.barber_name && (
                    <div className="text-xs text-gold mt-1">✂ {booking.barber_name}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-1">
                    {booking.services.map((svc, idx) => (
                      <span
                        key={idx}
                        className="bg-[#0d0d1a] border border-[#2a2a3a] rounded px-2 py-0.5"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-black text-gold">{fmt(booking.total)} ر.س</div>
                    <StatusBadge status={booking.status} />
                  </div>

                  {editingId === booking.id ? (
                    <div className="flex gap-1.5">
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value)}
                        className="bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
                      >
                        <option value="pending">معلقة</option>
                        <option value="confirmed">مؤكدة</option>
                        <option value="completed">مكتملة</option>
                        <option value="cancelled">ملغاة</option>
                      </select>
                      <button
                        onClick={() => updateBookingStatus(booking.id, editingStatus)}
                        className="px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(booking.id);
                        setEditingStatus(booking.status);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 whitespace-nowrap"
                    >
                      تحرير
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
