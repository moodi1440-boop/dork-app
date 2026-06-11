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
    // جلب كل الصفوف مرتبة تصاعدياً لاستهداف الـ id الأصغر (نفس ما يقرأه التطبيق)
    const { data: allRows } = await sb.from("app_settings").select("id").order("id", { ascending: true });
    const rows = allRows as { id: number }[] | null;
    const targetId = rows?.[0]?.id;
    const extraIds = rows?.slice(1).map((r) => r.id) ?? [];

    const patch = { ui_settings: JSON.stringify(appearance) };

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
