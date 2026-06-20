import { createAdminClient } from "@/lib/supabase";

export async function getAdminPassword(): Promise<string> {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("admin_config").select("value").eq("key", "admin_password").single();
    const v = (data as Record<string, unknown> | null)?.value;
    if (v && typeof v === "string") return v;
  } catch {}
  return process.env.ADMIN_SECRET ?? "admin";
}
