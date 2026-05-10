"use client";
import { useEffect, useState, useCallback } from "react";

interface Salon {
  id: string; name: string; owner: string; owner_phone: string;
  region: string; gov: string; phone: string; rating: number; status: string;
}

const STATUSES = [
  { value: "all",       label: "الكل" },
  { value: "pending",   label: "تنتظر مراجعة" },
  { value: "approved",  label: "موافق عليها" },
  { value: "suspended", label: "موقوفة" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    approved:  "bg-green-400/10 text-green-400 border-green-400/30",
    suspended: "bg-red-400/10 text-red-400 border-red-400/30",
  };
  const labels: Record<string, string> = { pending: "تنتظر", approved: "موافق", suspended: "موقوف" };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function SalonsPage() {
  const [salons,  setSalons]  = useState<Salon[]>([]);
  const [status,  setStatus]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status, search });
    const data = await fetch(`/api/salons?${params}`).then((r) => r.json());
    setSalons(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/salons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">الصالونات</h1>
        <p className="text-gray-400 text-sm mt-1">{salons.length} صالون</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث باسم الصالون أو المالك..."
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
        ) : salons.length === 0 ? (
          <div className="text-center py-16 text-gray-500">لا توجد صالونات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  <th className="px-4 py-3 text-right font-semibold">#</th>
                  <th className="px-4 py-3 text-right font-semibold">الصالون</th>
                  <th className="px-4 py-3 text-right font-semibold">المالك</th>
                  <th className="px-4 py-3 text-right font-semibold">المنطقة</th>
                  <th className="px-4 py-3 text-right font-semibold">التقييم</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {salons.map((s, i) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-gray-400 text-xs">{s.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-300">{s.owner}</div>
                      <div className="text-gray-500 text-xs">{s.owner_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{[s.region, s.gov].filter(Boolean).join(" - ") || "—"}</td>
                    <td className="px-4 py-3">
                      {s.rating ? (
                        <span className="text-gold font-bold">★ {s.rating}</span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {s.status !== "approved" && (
                          <button onClick={() => updateStatus(s.id, "approved")}
                            className="px-2.5 py-1 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                            موافقة
                          </button>
                        )}
                        {s.status !== "suspended" && (
                          <button onClick={() => updateStatus(s.id, "suspended")}
                            className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                            تعليق
                          </button>
                        )}
                        {s.status === "suspended" && (
                          <button onClick={() => updateStatus(s.id, "pending")}
                            className="px-2.5 py-1 rounded-lg text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
                            إعادة مراجعة
                          </button>
                        )}
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
