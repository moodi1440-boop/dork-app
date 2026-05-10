"use client";
import { useEffect, useState, useCallback } from "react";

interface Customer {
  id: string; name: string; phone: string;
  email: string; loyalty_points: number; loyalty_frozen: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search });
    const data = await fetch(`/api/customers?${params}`).then((r) => r.json());
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function toggleFreeze(c: Customer) {
    await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, loyalty_frozen: !c.loyalty_frozen }),
    });
    load();
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">العملاء</h1>
        <p className="text-gray-400 text-sm mt-1">{customers.length} عميل</p>
      </div>

      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="w-full max-w-md bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">لا يوجد عملاء</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  <th className="px-4 py-3 text-right font-semibold">#</th>
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold">الجوال</th>
                  <th className="px-4 py-3 text-right font-semibold">البريد</th>
                  <th className="px-4 py-3 text-right font-semibold">نقاط الولاء</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                    <td className="px-4 py-3 text-gray-300">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-gold font-bold">{c.loyalty_points ?? 0}</span>
                      <span className="text-gray-500 text-xs mr-1">نقطة</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.loyalty_frozen ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">محظور</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">نشط</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFreeze(c)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          c.loyalty_frozen
                            ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        }`}>
                        {c.loyalty_frozen ? "رفع الحظر" : "تجميد النقاط"}
                      </button>
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
