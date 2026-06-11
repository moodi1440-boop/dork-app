"use server";
import { createAdminClient } from "@/lib/supabase";

interface SocialLinks {
  email: string; twitter: string; whatsapp: string; telegram: string;
  telegramUser: string; enabled: boolean;
  customFields: Array<{ label: string; value: string }>;
}

export async function loadSocialAction() {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("app_settings").select("social_links").order("id", { ascending: true }).limit(1);
    const raw = (data as Record<string, string>[] | null)?.[0]?.social_links;
    if (raw) return { success: true, social: JSON.parse(raw) as SocialLinks };
    return { success: true, social: null };
  } catch {
    return { success: false, social: null };
  }
}

export async function saveSocialAction(social: SocialLinks) {
  try {
    const sb = createAdminClient();
    const { data: rows } = await sb.from("app_settings").select("id").order("id", { ascending: true }).limit(1);
    const existingId = (rows as { id: number }[] | null)?.[0]?.id;
    const patch = { social_links: JSON.stringify(social) };
    const { error } = existingId
      ? await sb.from("app_settings").update(patch).eq("id", existingId)
      : await sb.from("app_settings").insert(patch);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Server Error" };
  }
}
