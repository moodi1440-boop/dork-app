"use client";
import { useEffect, useState, useCallback } from "react";

type AdminUser = { id: number; username: string; role: string; is_active: boolean; created_at: string };
type Me = { username: string; role: string };

const ROLES = [
  { value: "super_admin", label: "مدير كامل" },
  { value: "editor",      label: "محرر" },
  { value: "viewer",      label: "مشاهد فقط" },
];

function AddUserForm({ onAdded }: { onAdded: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr("");
    setSaving(true);
    const res = await fetch("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? "خطأ"); return; }
    setUsername(""); setPassword(""); setRole("editor");
    onAdded();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <h2 className="text-sm font-bold text-white mb-4">إضافة حساب جديد</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم"
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور (8+ أحرف)"
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="bg-navy border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold">
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={submit} disabled={saving || !username.trim() || !password.trim()}
          className="py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold/20 transition-colors disabled:opacity-50">
          {saving ? "جاري الحفظ..." : "إضافة"}
        </button>
      </div>
      {err && <div className="text-red-400 text-xs mt-2">{err}</div>}
    </div>
  );
}

export default function AdminUsersPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [meData, usersData] = await Promise.all([
      fetch("/api/me").then((r) => r.json()),
      fetch("/api/admin-users").then((r) => r.json()),
    ]);
    setMe(meData);
    setUsers(Array.isArray(usersData) ? usersData : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u: AdminUser) => {
    await fetch("/api/admin-users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, is_active: !u.is_active }) });
    load();
  };

  const changeRole = async (u: AdminUser, role: string) => {
    await fetch("/api/admin-users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, role }) });
    load();
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`حذف حساب "${u.username}"؟`)) return;
    await fetch("/api/admin-users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }) });
    load();
  };

  if (!loading && me?.role !== "super_admin") {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-gray-400">
          هذه الصفحة متاحة فقط لحساب المدير الكامل (super_admin).
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">حسابات الإدارة (RBAC)</h1>
        <p className="text-gray-400 text-sm mt-1">{users.length} حساب — بالإضافة لكلمة مرور الإدارة الموحّدة</p>
      </div>
      <AddUserForm onAdded={load} />
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
         : users.length === 0 ? <div className="text-center py-16 text-gray-500">لا توجد حسابات مُسمّاة بعد</div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 text-xs">
                  {["المستخدم", "الدور", "الحالة", "أُنشئ", "إجراءات"].map((h) => <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{u.username}</td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
                        className="bg-navy border border-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-gold">
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${u.is_active ? "bg-green-400/10 text-green-400 border-green-400/30" : "bg-gray-500/10 text-gray-400 border-gray-400/30"}`}>
                        {u.is_active ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString("ar-SA")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleActive(u)} className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
                          {u.is_active ? "تعطيل" : "تفعيل"}
                        </button>
                        <button onClick={() => remove(u)} className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">حذف</button>
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
