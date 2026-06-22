"use client";
import { useEffect, useState, useCallback } from "react";

type LogEntry = {
  id: number; created_at: string; actor: string; action: string;
  target_type: string | null; target_id: string | null; details: Record<string, unknown> | null;
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const rows = await fetch(`/api/audit-log?${params.toString()}`).then((r) => r.json());
    setLogs(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">سجل تتبّع الإجراءات</h1>
        <p className="text-gray-400 text-sm mt-1">{logs.length} إجراء</p>
      </div>
      <div className="mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث بالمستخدم أو الإجراء أو رقم الهدف..."
          className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : logs.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد إجراءات مسجّلة</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["الوقت", "المستخدم", "الإجراء", "الهدف", "تفاصيل"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString("ar-SA")}</td>
                    <td className="px-4 py-3 font-semibold text-white">{log.actor}</td>
                    <td className="px-4 py-3 text-gold">{log.action}</td>
                    <td className="px-4 py-3 text-gray-300">{log.target_type ? `${log.target_type} #${log.target_id}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.details ? JSON.stringify(log.details) : "—"}</td>
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
