import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase";
import { hashAdminPassword, signAdminUserSession } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterSeconds } = checkRateLimit(`admin-auth:${getClientIp(req)}`);
  if (!allowed) {
    return NextResponse.json(
      { error: `محاولات كثيرة، حاول بعد ${Math.ceil(retryAfterSeconds / 60)} دقيقة` },
      { status: 429 }
    );
  }

  const { password, username } = await req.json();

  // تسجيل دخول بحساب مُسمّى (RBAC) — اختياري، فوق كلمة المرور الموحّدة
  if (username) {
    const sb = createAdminClient();
    const { data } = await sb
      .from("admin_users")
      .select("id,username,password_hash,role,is_active")
      .eq("username", String(username).trim())
      .eq("is_active", true)
      .single();
    const row = data as { id: number; username: string; password_hash: string; role: "super_admin" | "editor" | "viewer" } | null;
    if (!row || (await hashAdminPassword(String(password ?? ""), row.username)) !== row.password_hash) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("dork_admin_session", await signAdminUserSession({ id: row.id, username: row.username, role: row.role }), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  }

  const correct = await getAdminPassword();
  if (correct === null) {
    return NextResponse.json({ error: "لم يتم ضبط كلمة مرور الإدارة. اضبط متغيّر ADMIN_SECRET أولاً." }, { status: 503 });
  }
  if (password !== correct) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dork_admin", correct, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("dork_admin");
  res.cookies.delete("dork_admin_session");
  return res;
}
