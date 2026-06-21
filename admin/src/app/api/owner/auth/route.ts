import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { hashOwnerPin, signOwnerSession } from "@/lib/owner-session";

const MAX_FAILS     = 5;
const LOCK_MINUTES   = 15;

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const { phone, pin } = await req.json();
  if (!phone || !pin) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const { data, error } = await sb
    .from("salons")
    .select("id,name,owner,phone,status,owner_pin_hash,owner_pin_fails,owner_pin_locked_until")
    .eq("phone", phone)
    .eq("status", "approved")
    .single();

  if (error || !data) return NextResponse.json({ error: "صالون غير موجود أو غير مفعّل" }, { status: 401 });

  const salon = data as Record<string, unknown>;

  if (!salon.owner_pin_hash) {
    return NextResponse.json(
      { error: "يجب تعيين رقم سري (PIN) من تطبيق الصالون أولاً قبل تسجيل الدخول هنا" },
      { status: 401 }
    );
  }

  const lockedUntil = salon.owner_pin_locked_until ? new Date(salon.owner_pin_locked_until as string) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    return NextResponse.json({ error: "تم قفل الدخول مؤقتًا بسبب محاولات خاطئة متكررة، حاول لاحقًا" }, { status: 429 });
  }

  const givenHash = await hashOwnerPin(String(pin), String(salon.id));
  if (givenHash !== salon.owner_pin_hash) {
    const fails = ((salon.owner_pin_fails as number) ?? 0) + 1;
    const update: Record<string, unknown> = { owner_pin_fails: fails };
    if (fails >= MAX_FAILS) {
      update.owner_pin_fails = 0;
      update.owner_pin_locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
    }
    await sb.from("salons").update(update).eq("id", salon.id as string);
    return NextResponse.json({ error: "رقم سري غير صحيح" }, { status: 401 });
  }

  await sb.from("salons").update({ owner_pin_fails: 0, owner_pin_locked_until: null }).eq("id", salon.id as string);

  const cookieStore = await cookies();
  cookieStore.set("dork_owner_session", await signOwnerSession(salon.id as string | number), {
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
