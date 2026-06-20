"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";

interface Customer { id: string; name: string; phone: string; email: string; loyalty_points: number; loyalty_frozen: boolean; admin_notes?: string; blocked?: boolean; favs?: unknown[]; }
type Booking = { id: string; date: string; time: string; services: string[]; total: number; status: string; salonName?: string; };

function AddCustomerModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.name || !form.phone) { setErr("الاسم والجوال مطلوبان"); return; }
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone, password: form.password || "1234" }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "خطأ في الإضافة"); return; }
    onAdded();
    onClose();
  };

  const inpCls = "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-border rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-white font-bold">👤 إضافة عميل جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {[["الاسم *", "name"], ["الجوال *", "phone"], ["كلمة المرور (اختياري)", "password"]].map(([lbl, k]) => (
            <div key={k}>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{lbl}</label>
              <input type={k === "password" ? "password" : "text"}
                value={(form as Record<string, string>)[k]}
                onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                placeholder={k === "password" ? "الافتراضي: 1234" : ""}
                className={inpCls} />
            </div>
          ))}
          {err && <div className="text-red-400 text-sm">❌ {err}</div>}
          <button onClick={submit} disabled={saving}
            className="w-full py-3 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
            {saving ? "جاري الإضافة..." : "✅ إضافة العميل"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:   ["معلقة",  "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"],
    confirmed: ["مؤكدة",  "bg-blue-400/10 text-blue-400 border-blue-400/30"],
    completed: ["مكتملة", "bg-green-400/10 text-green-400 border-green-400/30"],
    cancelled: ["ملغاة",  "bg-red-400/10 text-red-400 border-red-400/30"],
  };
  const [label, cls] = map[status] ?? [status, "bg-gray-500/10 text-gray-400 border-gray-400/30"];
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function CustomerPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [points,   setPoints]   = useState(0);
  const [notes,    setNotes]    = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [custRes, salonsRes] = await Promise.all([
      sb.from("customers").select("*").eq("id", customerId).single(),
      sb.from("salons").select("id,name,bookings"),
    ]);
    const c = custRes.data as Customer;
    setCustomer(c);
    setPoints(c?.loyalty_points ?? 0);
    setNotes(c?.admin_notes ?? "");

    type B = Record<string, unknown>;
    const phone = c?.phone ?? "";
    const bks: Booking[] = (salonsRes.data ?? []).flatMap((s: Record<string, unknown>) =>
      ((s.bookings as B[]) ?? [])
        .filter((b) => b.phone === phone || String(b.customer_id) === customerId)
        .map((b) => ({ ...(b as object), salonName: s.name as string } as Booking))
    );
    bks.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
    setBookings(bks.slice(0, 10));
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    await sb.from("customers").update(body).eq("id", customerId);
    await load();
    setSaving(false);
  };

  const saveNotes = async () => {
    setSaving(true);
    await sb.from("customers").update({ admin_notes: notes }).eq("id", customerId);
    setSaving(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  if (loading) return <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"><div className="text-gold animate-pulse">جاري التحميل...</div></div>;
  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-navy">
          <h2 className="text-white font-bold">👤 {customer.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-5">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 font-semibold">معلومات الحساب</div>
              {customer.blocked && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30 font-bold">🚫 محظور</span>}
            </div>
            <div className="text-sm text-white">📞 {customer.phone}</div>
            {customer.email && <div className="text-sm text-gray-400">📧 {customer.email}</div>}
          </div>

          {/* إحصاءات العميل */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "حجز", value: bookings.length,                                                          color: "text-blue-400"   },
              { label: "إنفاق", value: `${bookings.reduce((a, b) => a + (b.total || 0), 0)} ر`,                color: "text-gold"       },
              { label: "مفضلة", value: ((customer.favs as unknown[]) ?? []).length,                            color: "text-red-400"    },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold mb-3">آخر الحجوزات ({bookings.length})</div>
            {bookings.length === 0 ? <div className="text-center text-gray-600 text-sm py-4">لا توجد حجوزات</div> : (
              <div className="space-y-2">
                {bookings.map((b, i) => (
                  <div key={i} className="flex items-center justify-between bg-navy rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs text-white">{b.date} - {b.time}</div>
                      <div className="text-xs text-gray-500">{b.salonName}</div>
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
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold mb-3">📝 ملاحظات داخلية (لا يراها العميل)</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="أضف ملاحظات خاصة عن هذا العميل..."
              className="w-full bg-navy border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold resize-none mb-3" />
            <button onClick={saveNotes} disabled={saving}
              className="w-full py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50">
              {notesSaved ? "✅ تم الحفظ" : saving ? "جاري الحفظ..." : "💾 حفظ الملاحظات"}
            </button>
          </div>
          <button onClick={() => patch({ blocked: !customer.blocked })} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors ${customer.blocked ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-red-900/20 text-red-400 border-red-800/30 hover:bg-red-900/30"}`}>
            {customer.blocked ? "✅ رفع الحظر عن العميل" : "🚫 حظر العميل"}
          </button>
          <button onClick={async () => { if (!confirm("حذف العميل نهائياً؟")) return; await sb.from("customers").delete().eq("id", customerId); onClose(); }}
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
  const [showAdd,   setShowAdd]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from("customers").select("*").order("id", { ascending: false });
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data } = await q.limit(200);
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {selected && <CustomerPanel customerId={selected} onClose={() => { setSelected(null); load(); }} />}
      {showAdd   && <AddCustomerModal onClose={() => setShowAdd(false)} onAdded={load} />}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">العملاء</h1>
          <p className="text-gray-400 text-sm mt-1">{customers.length} عميل</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">
          ➕ إضافة عميل
        </button>
      </div>
      <div className="mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="w-full max-w-md bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : customers.length === 0 ? <div className="text-center py-16 text-gray-500">لا يوجد عملاء</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["#","الاسم","الجوال","البريد","الحالة","إجراءات"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(c.id)} className="font-semibold text-white hover:text-gold transition-colors">{c.name}</button>
                        {c.blocked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30 font-bold">محظور</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email || "—"}</td>
                    <td className="px-4 py-3">
                      {c.blocked
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-800/30">محظور</span>
                        : c.loyalty_frozen
                          ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/30">مجمّد</span>
                          : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">نشط</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelected(c.id)} className="px-2.5 py-1 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">تفاصيل</button>
                        <button onClick={async () => { await sb.from("customers").update({ loyalty_frozen: !c.loyalty_frozen }).eq("id", c.id); load(); }}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${c.loyalty_frozen ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
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
