import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterSeconds } = checkRateLimit(`admin-auth:${getClientIp(req)}`);
  if (!allowed) {
    return NextResponse.json(
      { error: `محاولات كثيرة، حاول بعد ${Math.ceil(retryAfterSeconds / 60)} دقيقة` },
      { status: 429 }
    );
  }

  const { password } = await req.json();
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
  return res;
}
