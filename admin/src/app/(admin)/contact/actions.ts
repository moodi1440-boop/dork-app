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
    // جلب كل الصفوف مرتبة تصاعدياً لاستهداف الـ id الأصغر (نفس ما يقرأه التطبيق)
    const { data: allRows } = await sb.from("app_settings").select("id").order("id", { ascending: true });
    const rows = allRows as { id: number }[] | null;
    const targetId = rows?.[0]?.id;
    const extraIds = rows?.slice(1).map((r) => r.id) ?? [];

    const patch = { social_links: JSON.stringify(social) };

    if (targetId) {
      // تحديث الصف الأول (الذي يقرأه التطبيق)
      const { error } = await sb.from("app_settings").update(patch).eq("id", targetId);
      if (error) return { success: false, error: error.message };
    } else {
      // إنشاء صف جديد إذا كان الجدول فارغاً
      const { error } = await sb.from("app_settings").insert(patch);
      if (error) return { success: false, error: error.message };
    }

    // حذف الصفوف الزائدة إن وجدت
    if (extraIds.length > 0) {
      await sb.from("app_settings").delete().in("id", extraIds);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Server Error" };
  }
}
