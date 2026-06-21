import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { hashOwnerPin } from "@/lib/owner-session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("salons")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb   = createAdminClient();
  const body = await req.json() as Record<string, unknown> & { new_pin?: string };

  if (body.new_pin !== undefined) {
    const pin = String(body.new_pin || "").trim();
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "الرقم السري يجب أن يكون 6 أرقام" }, { status: 400 });
    }
    delete body.new_pin;
    body.owner_pin_hash = await hashOwnerPin(pin, params.id);
    body.owner_pin_fails = 0;
    body.owner_pin_locked_until = null;
  }

  const { error } = await sb.from("salons").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("salons").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
