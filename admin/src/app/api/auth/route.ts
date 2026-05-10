import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

async function getAdminPassword(): Promise<string> {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("admin_config").select("value").eq("key", "admin_password").single();
    const v = (data as Record<string, unknown> | null)?.value;
    if (v && typeof v === "string") return v;
  } catch {}
  return process.env.ADMIN_SECRET ?? "admin";
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = await getAdminPassword();
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
