import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get("dork_admin")?.value;
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { oldPassword, newPassword, confirmPassword } = await req.json() as Record<string, string>;

  const sb = createAdminClient();
  const { data: row } = await sb.from("admin_config").select("value").eq("key", "admin_password").single();
  const stored = (row as Record<string, unknown> | null)?.value as string | null;
  const current = stored ?? process.env.ADMIN_SECRET ?? "admin";

  if (oldPassword !== current) return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
  if (!newPassword || newPassword.length < 4) return NextResponse.json({ error: "كلمة المرور قصيرة جداً (4 أحرف على الأقل)" }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "كلمتا المرور غير متطابقتين" }, { status: 400 });

  await sb.from("admin_config").upsert({ key: "admin_password", value: newPassword }, { onConflict: "key" });

  return NextResponse.json({ ok: true });
}
