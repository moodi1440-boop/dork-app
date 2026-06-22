"use client";
import { useEffect, useState, useCallback } from "react";

type Dispute = {
  id: number; created_at: string; booking_id: string | null; salon_id: string | null;
  customer_name: string | null; customer_phone: string | null; reason: string;
  status: string; refund_amount: number | null; admin_note: string | null; resolved_at: string | null;
};

const STATUSES = [
  { value: "all",       label: "الكل",     color: "text-gray-300"   },
  { value: "open",      label: "مفتوحة",   color: "text-yellow-400" },
  { value: "in_review", label: "قيد المراجعة", color: "text-blue-400" },
  { value: "resolved",  label: "محلولة",   color: "text-green-400"  },
  { value: "rejected",  label: "مرفوضة",   color: "text-red-400"    },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    in_review: "bg-blue-400/10 text-blue-400 border-blue-400/30",
    resolved: "bg-green-400/10 text-green-400 border-green-400/30",
    rejected: "bg-red-400/10 text-red-400 border-red-400/30",
  };
  const labels: Record<string, string> = { open: "مفتوحة", in_review: "قيد المراجعة", resolved: "محلولة", rejected: "مرفوضة" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
}

function NewDisputeForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", salon_id: "", booking_id: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const upd = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.reason.trim()) return;
    setSaving(true);
    await fetch("/api/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setForm({ customer_name: "", customer_phone: "", salon_id: "", booking_id: "", reason: "" });
    setOpen(false);
    onAdded();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mb-6 px-4 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">
        + تسجيل نزاع جديد
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <h2 className="text-sm font-bold text-white mb-4">تسجيل نزاع جديد</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input value={form.customer_name} onChange={(e) => upd("customer_name", e.target.value)} placeholder="اسم العميل"
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <input value={form.customer_phone} onChange={(e) => upd("customer_phone", e.target.value)} placeholder="جوال العميل"
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <input value={form.salon_id} onChange={(e) => upd("salon_id", e.target.value)} placeholder="رقم الصالون (اختياري)"
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <input value={form.booking_id} onChange={(e) => upd("booking_id", e.target.value)} placeholder="رقم الحجز (اختياري)"
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
      </div>
      <textarea value={form.reason} onChange={(e) => upd("reason", e.target.value)} placeholder="سبب النزاع / تفاصيل البلاغ" rows={3}
        className="w-full bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold mb-3" />
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving || !form.reason.trim()} className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 disabled:opacity-50">
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 border border-border text-gray-400 rounded-xl text-sm hover:text-white">إلغاء</button>
      </div>
    </div>
  );
}

function DisputeRow({ d, onUpdated }: { d: Dispute; onUpdated: () => void }) {
  const [note, setNote] = useState(d.admin_note ?? "");
  const [refund, setRefund] = useState(d.refund_amount?.toString() ?? "");

  const update = async (body: Record<string, unknown>) => {
    await fetch(`/api/disputes/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onUpdated();
  };

  return (
    <tr className="border-b border-border/50 hover:bg-white/[0.02] transition-colors align-top">
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleDateString("ar-SA")}</td>
      <td className="px-4 py-3"><div className="font-semibold text-white">{d.customer_name ?? "—"}</div><div className="text-gray-400 text-xs">{d.customer_phone ?? "—"}</div></td>
      <td className="px-4 py-3 text-gray-300 text-xs">{d.salon_id ? `صالون #${d.salon_id}` : "—"}{d.booking_id ? ` / حجز #${d.booking_id}` : ""}</td>
      <td className="px-4 py-3 text-gray-300 text-xs max-w-xs">{d.reason}</td>
      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5 min-w-44">
          <select value={d.status} onChange={(e) => update({ status: e.target.value })}
            className="bg-navy border border-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-gold">
            {STATUSES.filter((s) => s.value !== "all").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input value={refund} onChange={(e) => setRefund(e.target.value)} onBlur={() => update({ refund_amount: refund ? Number(refund) : null })}
            placeholder="مبلغ الاسترجاع" className="bg-navy border border-border rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => update({ admin_note: note })}
            placeholder="ملاحظة الإدارة" rows={2} className="bg-navy border border-border rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        </div>
      </td>
    </tr>
  );
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search) params.set("search", search);
    const rows = await fetch(`/api/disputes?${params.toString()}`).then((r) => r.json());
    setDisputes(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">النزاعات والاسترجاع</h1>
        <p className="text-gray-400 text-sm mt-1">{disputes.length} نزاع</p>
      </div>
      <NewDisputeForm onAdded={load} />
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم العميل أو الجوال أو السبب..."
          className="flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
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
         : disputes.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد نزاعات</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["التاريخ", "العميل", "المرجع", "السبب", "الحالة", "إجراءات"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => <DisputeRow key={d.id} d={d} onUpdated={load} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
