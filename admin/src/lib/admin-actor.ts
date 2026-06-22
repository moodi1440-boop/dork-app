import { cookies } from "next/headers";
import { verifyAdminUserSession, type AdminRole } from "@/lib/admin-session";

export type CurrentAdmin = { id: number | null; username: string; role: AdminRole };

// حامل كلمة المرور الموحّدة القديمة (dork_admin) يُعامل كـsuper_admin
// تلقائياً — هو من يملك المفتاح الأساسي للوحة بالأصل. لا id رقمي حقيقي
// له (لا يوجد صف admin_users)، فيرجع null بدل رقم وهمي ثابت.
export async function getCurrentAdmin(): Promise<CurrentAdmin> {
  const session = await verifyAdminUserSession(cookies().get("dork_admin_session")?.value);
  if (session) return { id: session.id, username: session.username, role: session.role };
  return { id: null, username: "admin", role: "super_admin" };
}
