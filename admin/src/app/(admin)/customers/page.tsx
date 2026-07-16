"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase-browser";
import { exportPDFRaw } from "@/lib/pdf";
import { EmojiIcon } from "@/components/Icons";

interface Customer { id: string; name: string; phone: string; email: string; admin_notes?: string; blocked?: boolean; favs?: unknown[]; pin?: string; }
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
          <h2 className="text-white font-bold"><EmojiIcon icon="👤" size={18}/> إضافة عميل جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none"><EmojiIcon icon="✕" size={16}/></button>
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
          {err && <div className="text-red-400 text-sm"><EmojiIcon icon="❌" size={16}/> {err}</div>}
          <button onClick={submit} disabled={saving}
            className="w-full py-3 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
            {saving ? "جاري الإضافة..." : <><EmojiIcon icon="✅" size={16}/> إضافة العميل</>}
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
  const [notes,    setNotes]    = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", pin: "" });
  const [editErr,  setEditErr]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch(`/api/customers/${customerId}`).then((r) => r.json());
    const c = data.customer as Customer;
    setCustomer(c);
    setNotes(c?.admin_notes ?? "");
    setEditForm({ name: c?.name ?? "", phone: c?.phone ?? "", email: c?.email ?? "", pin: "" });
    setBookings(((data.bookings ?? []) as Booking[]).slice(0, 20));
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const saveNotes = async () => {
    setSaving(true);
    await fetch(`/api/customers/${customerId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ admin_notes: notes }) });
    setSaving(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const saveEdit = async () => {
    setEditErr("");
    const body: Record<string, unknown> = {};
    if (editForm.name.trim())  body.name  = editForm.name.trim();
    if (editForm.phone.trim()) body.phone = editForm.phone.trim();
    if (editForm.email.trim()) body.email = editForm.email.trim();
    if (editForm.pin.trim())   body.pin   = editForm.pin.trim();
    if (Object.keys(body).length === 0) { setEditErr("لم تُعدَّل أي بيانات"); return; }
    setSaving(true);
    const res = await fetch(`/api/customers/${customerId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setEditErr(d.error ?? "خطأ"); return; }
    setEditMode(false);
    await load();
  };

  const exportCustomerPDF = () => {
    if (!customer) return;
    const totalSpent = bookings.reduce((a, b) => a + (b.total || 0), 0);
    const rows: string[][] = [
      ["الاسم",          customer.name],
      ["الجوال",         customer.phone],
      ["البريد",         customer.email ?? ""],
      ["الحالة",         customer.blocked ? "محظور" : "نشط"],
      ["إجمالي الإنفاق", String(totalSpent)],
      ["عدد الحجوزات",   String(bookings.length)],
      [],
      ["التاريخ", "الوقت", "الصالون", "المبلغ", "الحالة"],
      ...bookings.map((b) => [b.date, b.time, b.salonName ?? "", String(b.total), b.status]),
    ];
    exportPDFRaw(customer.name, rows);
  };

  if (loading) return <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"><div className="text-gold animate-pulse">جاري التحميل...</div></div>;
  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-navy">
          <h2 className="text-white font-bold"><EmojiIcon icon="👤" size={18}/> {customer.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportCustomerPDF} className="px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg font-bold hover:bg-red-500/20 transition-colors">
              <EmojiIcon icon="📄" size={14}/> PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl"><EmojiIcon icon="✕" size={16}/></button>
          </div>
        </div>
        <div className="p-5 space-y-5">

          {/* معلومات + تعديل */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 font-semibold">معلومات الحساب</div>
              <div className="flex items-center gap-2">
                {customer.blocked && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30 font-bold"><EmojiIcon icon="🚫" size={14}/> محظور</span>}
                <button onClick={() => { setEditMode((v) => !v); setEditErr(""); }} className="text-xs text-gold hover:text-gold/80 transition-colors">
                  {editMode ? "إلغاء" : <><EmojiIcon icon="✏" size={14}/> تعديل</>}
                </button>
              </div>
            </div>
            {editMode ? (
              <div className="space-y-3">
                {([["الاسم", "name"], ["الجوال", "phone"], ["البريد", "email"], ["رمز PIN الجديد", "pin"]] as [string, keyof typeof editForm][]).map(([lbl, k]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-400 mb-1">{lbl}</label>
                    <input type={k === "pin" ? "password" : "text"} value={editForm[k]}
                      placeholder={k === "pin" ? "اتركه فارغاً إن لم ترد التغيير" : ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full bg-navy border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
                  </div>
                ))}
                {editErr && <div className="text-red-400 text-xs">{editErr}</div>}
                <button onClick={saveEdit} disabled={saving}
                  className="w-full py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50">
                  {saving ? "جاري الحفظ..." : <><EmojiIcon icon="💾" size={14}/> حفظ التعديلات</>}
                </button>
              </div>
            ) : (
              <>
                <div className="text-sm text-white"><EmojiIcon icon="👤" size={14}/> {customer.name}</div>
                <div className="text-sm text-white"><EmojiIcon icon="📞" size={14}/> {customer.phone}</div>
                {customer.email && <div className="text-sm text-gray-400"><EmojiIcon icon="📧" size={14}/> {customer.email}</div>}
              </>
            )}
          </div>

          {/* إحصاءات */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "حجز",    value: bookings.length,                                                       color: "text-blue-400" },
              { label: "إنفاق",  value: `${bookings.reduce((a, b) => a + (b.total || 0), 0)} ر`,               color: "text-gold"     },
              { label: "مفضلة",  value: ((customer.favs as unknown[]) ?? []).length,                           color: "text-red-400"  },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* الحجوزات */}
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

          {/* ملاحظات */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold mb-3"><EmojiIcon icon="📝" size={14}/> ملاحظات داخلية (لا يراها العميل)</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="أضف ملاحظات خاصة عن هذا العميل..."
              className="w-full bg-navy border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold resize-none mb-3" />
            <button onClick={saveNotes} disabled={saving}
              className="w-full py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50">
              {notesSaved ? <><EmojiIcon icon="✅" size={14}/> تم الحفظ</> : saving ? "جاري الحفظ..." : <><EmojiIcon icon="💾" size={14}/> حفظ الملاحظات</>}
            </button>
          </div>

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
  const [blockedOnly, setBlockedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from("customers").select("id,name,phone,email,admin_notes,blocked,favs,created_at").order("id", { ascending: false });
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data } = await q.limit(200);
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const quickPatch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  };

  const deleteCustomer = async (id: string, name: string) => {
    if (!confirm(`حذف "${name}" نهائياً؟`)) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    load();
  };

  const blockedCount = customers.filter((c) => c.blocked).length;
  const visibleCustomers = blockedOnly ? customers.filter((c) => c.blocked) : customers;

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
          <EmojiIcon icon="➕" size={16}/> إضافة عميل
        </button>
      </div>
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم العميل أو الجوال..."
          className="w-full max-w-md bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        {blockedCount > 0 && (
          <button onClick={() => setBlockedOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${blockedOnly ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-border text-gray-500 hover:border-red-500/20"}`}>
            <EmojiIcon icon="🚫" size={14}/> المحظورين ({blockedCount})
          </button>
        )}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : visibleCustomers.length === 0 ? <div className="text-center py-16 text-gray-500">{blockedOnly ? "لا يوجد عملاء محظورين" : "لا يوجد عملاء"}</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["#","الاسم","الجوال","البريد","نشط","حظر","تفاصيل","حذف"].map((h) => <th key={h} className="px-3 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-3 font-semibold text-white">{c.name}</td>
                    <td className="px-3 py-3 text-gray-300">{c.phone}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{c.email || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${!c.blocked ? "bg-green-400/10 text-green-400 border-green-400/30" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}`}>
                        {!c.blocked ? "نشط" : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => quickPatch(c.id, { blocked: !c.blocked })}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${c.blocked ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                        {c.blocked ? "رفع" : "حظر"}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setSelected(c.id)} className="px-2.5 py-1 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">تفاصيل</button>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => deleteCustomer(c.id, c.name)} className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">حذف</button>
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
