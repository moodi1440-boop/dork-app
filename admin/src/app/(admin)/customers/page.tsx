"use client";
import { useEffect, useState, useCallback } from "react";

interface Customer {
  id: string; name: string; phone: string; email: string;
  loyalty_points: number; loyalty_frozen: boolean;
  history?: unknown[]; favs?: unknown[];
}
interface Booking {
  id: string; date: string; time: string; services: string[]; total: number; status: string;
}
interface CustomerDetail { customer: Customer; bookings: Booking[]; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:   ["معلقة",   "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"],
    confirmed: ["مؤكدة",   "bg-blue-400/10 text-blue-400 border-blue-400/30"],
    completed: ["مكتملة",  "bg-green-400/10 text-green-400 border-green-400/30"],
    cancelled: ["ملغاة",   "bg-red-400/10 text-red-400 border-red-400/30"],
  };
  const [label, cls] = map[status] ?? [status, "bg-gray-500/10 text-gray-400 border-gray-400/30"];
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function CustomerPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [detail, setDetail]   = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [points,  setPoints]  = useState(0);
  const [note,    setNote]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch(`/api/customers/${customerId}`).then((r) => r.json());
    setDetail(data);
    setPoints(data.customer?.loyalty_points ?? 0);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
    setSaving(false);
  };

  const del = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع.")) return;
    await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    onClose();
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="text-gold animate-pulse">جاري التحميل...</div>
    </div>
  );

  const c = detail?.customer;
  if (!c) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1117] border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-[#0f1117]">
          <h2 className="text-white font-bold">👤 {c.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* معلومات أساسية */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="text-xs text-gray-400 font-semibold mb-2">معلومات الحساب</div>
            <div className="text-sm text-white">📞 {c.phone}</div>
            {c.email && <div className="text-sm text-gray-400">📧 {c.email}</div>}
          </div>

          {/* النقاط */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold mb-3">نقاط الولاء</div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-gold">{c.loyalty_points}</span>
              <span className="text-gray-500 text-sm">نقطة</span>
              {c.loyalty_frozen && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">مجمّدة</span>}
            </div>
            <div className="flex gap-2 mb-3">
              <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))}
                className="flex-1 bg-[#0d0d1a] border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
              <button onClick={() => patch({ loyalty_points: points })} disabled={saving}
                className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50">
                حفظ
              </button>
            </div>
            <button onClick={() => patch({ loyalty_frozen: !c.loyalty_frozen })} disabled={saving}
              className={`w-full py-2 rounded-lg text-sm font-semibold border transition-colors ${c.loyalty_frozen ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>
              {c.loyalty_frozen ? "🔓 رفع تجميد النقاط" : "🔒 تجميد النقاط"}
            </button>
          </div>

          {/* ملاحظات */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold mb-3">ملاحظات داخلية</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="أضف ملاحظة عن هذا العميل..."
              className="w-full bg-[#0d0d1a] border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold resize-none h-24" />
          </div>

          {/* سجل الحجوزات */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold mb-3">آخر الحجوزات ({detail?.bookings?.length ?? 0})</div>
            {(detail?.bookings ?? []).length === 0 ? (
              <div className="text-center text-gray-600 text-sm py-4">لا توجد حجوزات</div>
            ) : (
              <div className="space-y-2">
                {(detail?.bookings ?? []).slice(0, 10).map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-[#0d0d1a] rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs text-white">{b.date} - {b.time}</div>
                      <div className="text-xs text-gray-500">{(b.services ?? []).join("، ")}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-gold font-bold">{b.total} ر.س</div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* حذف العميل */}
          <button onClick={del}
            className="w-full py-2.5 bg-red-900/20 border border-red-800/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-900/30 transition-colors">
            🗑 حذف العميل نهائياً
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search });
    const data = await fetch(`/api/customers?${params}`).then((r) => r.json());
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggleFreeze = async (c: Customer) => {
    await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, loyalty_frozen: !c.loyalty_frozen }),
    });
    load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {selected && <CustomerPanel customerId={selected} onClose={() => { setSelected(null); load(); }} />}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">العملاء</h1>
        <p className="text-gray-400 text-sm mt-1">{customers.length} عميل</p>
      </div>

      <div className="mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="w-full max-w-md bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
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
                  <th className="px-4 py-3 text-right font-semibold">النقاط</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(c.id)} className="font-semibold text-white hover:text-gold transition-colors text-right">
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-gold font-bold">{c.loyalty_points ?? 0}</span>
                      <span className="text-gray-500 text-xs mr-1">نقطة</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.loyalty_frozen ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">مجمّد</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">نشط</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelected(c.id)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
                          تفاصيل
                        </button>
                        <button onClick={() => toggleFreeze(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${c.loyalty_frozen ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>
                          {c.loyalty_frozen ? "رفع التجميد" : "تجميد"}
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
