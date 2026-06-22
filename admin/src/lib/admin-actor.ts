import { cookies } from "next/headers";
import { verifyAdminUserSession, type AdminRole } from "@/lib/admin-session";

export type CurrentAdmin = { username: string; role: AdminRole };

// حامل كلمة المرور الموحّدة القديمة (dork_admin) يُعامل كـsuper_admin
// تلقائياً — هو من يملك المفتاح الأساسي للوحة بالأصل.
export async function getCurrentAdmin(): Promise<CurrentAdmin> {
  const session = await verifyAdminUserSession(cookies().get("dork_admin_session")?.value);
  if (session) return { username: session.username, role: session.role };
  return { username: "admin", role: "super_admin" };
}
