import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const { phone, password } = await req.json();
  if (!phone || !password) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const { data, error } = await sb
    .from("salons")
    .select("id,name,owner,phone,status,password")
    .eq("phone", phone)
    .eq("status", "approved")
    .single();

  if (error || !data) return NextResponse.json({ error: "صالون غير موجود أو غير مفعّل" }, { status: 401 });

  const salon = data as Record<string, unknown>;
  if (salon.password !== password) return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });

  const cookieStore = await cookies();
  cookieStore.set("dork_owner_session", String(salon.id), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30, // 30 days
    path:     "/",
  });

  return NextResponse.json({ id: salon.id, name: salon.name, owner: salon.owner });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("dork_owner_session");
  return NextResponse.json({ ok: true });
}
