"use server";
import { createAdminClient } from "@/lib/supabase";

export async function loadAppearanceAction() {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("admin_config").select("value").eq("key", "ui_settings").maybeSingle();
    return { success: true, value: data?.value ?? null };
  } catch {
    return { success: false, value: null };
  }
}

export async function saveAppearanceAction(appearance: { theme: string; fontSize: string; bg: string }) {
  try {
    const sb = createAdminClient();
    const { error } = await sb.from("admin_config")
      .upsert({ key: "ui_settings", value: appearance }, { onConflict: "key" });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Server Error" };
  }
}
