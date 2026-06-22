import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const LOYALTY_DEFAULTS    = { enabled: false, hidden: false, pointsPerBooking: 10, minRedeemPoints: 50, redeemValue: 5 };
const SOCIAL_DEFAULTS     = { email: "", twitter: "", whatsapp: "", telegram: "", telegramUser: "", enabled: false, customFields: [] };
const APPEARANCE_DEFAULTS = { theme: "gold", themeMode: "dark", fontSize: "md", bg: "none" };

export async function GET() {
  const sb = createAdminClient();

  // قراءة إعدادات التطبيق من جدول app_settings الموجود
  const { data: appRows } = await sb.from("app_settings").select("loyalty_settings,social_links,ui_settings").order("id", { ascending: true }).limit(1);
  const appRow = appRows?.[0] as Record<string, string> | undefined;

  let loyalty    = { ...LOYALTY_DEFAULTS };
  let social     = { ...SOCIAL_DEFAULTS };
  let appearance = { ...APPEARANCE_DEFAULTS };
  if (appRow?.loyalty_settings) {
    try { loyalty = { ...loyalty, ...JSON.parse(appRow.loyalty_settings) }; } catch {}
  }
  if (appRow?.social_links) {
    try { social = { ...social, ...JSON.parse(appRow.social_links) }; } catch {}
  }
  if (appRow?.ui_settings) {
    try { appearance = { ...appearance, ...JSON.parse(appRow.ui_settings) }; } catch {}
  }

  // قراءة إعدادات الإدارة من admin_config (pinned, week_salon, auto_approve_salons)
  const { data: configRows } = await sb.from("admin_config").select("key,value");
  const pinned    = configRows?.find((r: Record<string, unknown>) => r.key === "pinned")?.value ?? [];
  const week_salon = configRows?.find((r: Record<string, unknown>) => r.key === "week_salon")?.value ?? null;
  const auto_approve_salons = configRows?.find((r: Record<string, unknown>) => r.key === "auto_approve_salons")?.value ?? false;

  return NextResponse.json({ loyalty, social, appearance, pinned, week_salon, auto_approve_salons });
}

export async function PATCH(req: NextRequest) {
  const sb   = createAdminClient();
  const body = await req.json() as Record<string, unknown>;

  // تحديث loyalty و social في جدول app_settings الموجود
  if ("loyalty" in body || "social" in body || "appearance" in body) {
    const { data: existingRows } = await sb.from("app_settings").select("id").order("id", { ascending: true }).limit(1);
    const existingId = (existingRows?.[0] as Record<string, unknown>)?.id;
    const patch: Record<string, string> = {};
    if ("loyalty"    in body) patch.loyalty_settings = JSON.stringify(body.loyalty);
    if ("social"     in body) patch.social_links      = JSON.stringify(body.social);
    if ("appearance" in body) patch.ui_settings        = JSON.stringify(body.appearance);

    if (existingId) {
      const { error } = await sb.from("app_settings").update(patch).eq("id", existingId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await sb.from("app_settings").insert(patch);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // تحديث pinned و week_salon و auto_approve_salons في admin_config
  for (const key of ["pinned", "week_salon", "auto_approve_salons"] as const) {
    if (key in body) {
      const { error } = await sb.from("admin_config").upsert({ key, value: body[key] }, { onConflict: "key" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
