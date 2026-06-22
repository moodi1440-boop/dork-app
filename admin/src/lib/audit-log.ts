import { createAdminClient } from "@/lib/supabase";
import { getCurrentAdmin } from "@/lib/admin-actor";

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string | number,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { username } = await getCurrentAdmin();
    const sb = createAdminClient();
    await sb.from("admin_audit_log").insert({
      actor: username,
      action,
      target_type: targetType ?? null,
      target_id: targetId !== undefined ? String(targetId) : null,
      details: details ?? null,
    });
  } catch {
    // التسجيل لا يجب أن يفشل الإجراء الأصلي أبداً
  }
}
