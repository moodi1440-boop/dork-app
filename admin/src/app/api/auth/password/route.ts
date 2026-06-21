import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase";
import { getAdminPassword } from "@/lib/admin-password";

export async function PATCH(req: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get("dork_admin")?.value;
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { oldPassword, newPassword, confirmPassword } = await req.json() as Record<string, string>;

  const current = await getAdminPassword();
  if (current === null) {
    return NextResponse.json({ error: "لم يتم ضبط كلمة مرور الإدارة. اضبط متغيّر ADMIN_SECRET أولاً." }, { status: 503 });
  }
  if (oldPassword !== current) return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
  if (!newPassword || newPassword.length < 4) return NextResponse.json({ error: "كلمة المرور قصيرة جداً (4 أحرف على الأقل)" }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "كلمتا المرور غير متطابقتين" }, { status: 400 });

  const sb = createAdminClient();
  await sb.from("admin_config").upsert({ key: "admin_password", value: newPassword }, { onConflict: "key" });

  return NextResponse.json({ ok: true });
}
