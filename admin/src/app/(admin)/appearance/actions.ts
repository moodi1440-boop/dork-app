"use server";
import { createAdminClient } from "@/lib/supabase";

export async function loadAppearanceAction() {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("app_settings").select("ui_settings").order("id", { ascending: true }).limit(1);
    const raw = (data as Record<string, string>[] | null)?.[0]?.ui_settings;
    if (raw) return { success: true, value: JSON.parse(raw) };
    return { success: true, value: null };
  } catch {
    return { success: false, value: null };
  }
}

export async function saveAppearanceAction(appearance: { theme: string; fontSize: string; bg: string }) {
  try {
    const sb = createAdminClient();
    const { data: rows } = await sb.from("app_settings").select("id").order("id", { ascending: true }).limit(1);
    const existingId = (rows as { id: number }[] | null)?.[0]?.id;
    const patch = { ui_settings: JSON.stringify(appearance) };
    const { error } = existingId
      ? await sb.from("app_settings").update(patch).eq("id", existingId)
      : await sb.from("app_settings").insert(patch);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Server Error" };
  }
}
