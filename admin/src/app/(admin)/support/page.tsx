"use client";
import { useEffect, useState, useCallback } from "react";

type Ticket = {
  id: number; created_at: string; salon_id: string; salonName: string;
  subject: string; message: string; status: string; priority: string; admin_reply: string | null;
};

const STATUSES = [
  { value: "all",         label: "الكل"        },
  { value: "open",        label: "مفتوحة"      },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "resolved",    label: "محلولة"      },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    in_progress: "bg-blue-400/10 text-blue-400 border-blue-400/30",
    resolved: "bg-green-400/10 text-green-400 border-green-400/30",
  };
  const labels: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", resolved: "محلولة" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { high: "text-red-400", normal: "text-gray-400", low: "text-gray-600" };
  const labels: Record<string, string> = { high: "عاجلة", normal: "عادية", low: "منخفضة" };
  return <span className={`text-xs font-semibold ${map[priority] ?? "text-gray-400"}`}>{labels[priority] ?? priority}</span>;
}

function TicketRow({ t, onUpdated }: { t: Ticket; onUpdated: () => void }) {
  const [reply, setReply] = useState(t.admin_reply ?? "");

  const update = async (body: Record<string, unknown>) => {
    await fetch(`/api/support-tickets/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onUpdated();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <div className="font-bold text-white">{t.subject}</div>
          <div className="text-gray-500 text-xs mt-0.5">{t.salonName || `صالون #${t.salon_id}`} · {new Date(t.created_at).toLocaleString("ar-SA")}</div>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={t.priority} />
          <StatusBadge status={t.status} />
        </div>
      </div>
      <p className="text-gray-300 text-sm mb-3 whitespace-pre-wrap">{t.message}</p>
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="رد الإدارة..." rows={2}
        className="w-full bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold mb-3" />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => update({ admin_reply: reply, status: t.status === "open" ? "in_progress" : t.status })}
          className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors">إرسال الرد</button>
        {t.status !== "resolved" && (
          <button onClick={() => update({ status: "resolved" })} className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors">إغلاق كمحلولة</button>
        )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status,  setStatus]  = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = status !== "all" ? `?status=${status}` : "";
    const rows = await fetch(`/api/support-tickets${params}`).then((r) => r.json());
    setTickets(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">تذاكر الدعم</h1>
        <p className="text-gray-400 text-sm mt-1">{tickets.length} تذكرة</p>
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setStatus(s.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${status === s.value ? "bg-gold/10 border-gold/30 text-gold" : "border-border text-gray-400 hover:border-gold/20"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
       : tickets.length === 0 ? <div className="text-center py-16 text-gray-500 bg-card border border-border rounded-2xl">لا توجد تذاكر</div>
       : (
        <div className="space-y-4">
          {tickets.map((t) => <TicketRow key={t.id} t={t} onUpdated={load} />)}
        </div>
      )}
    </div>
  );
}
