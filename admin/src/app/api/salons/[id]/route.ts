import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { hashOwnerPin } from "@/lib/owner-session";

// الحقول التي يملك الأدمن صلاحية تعديلها عبر هذا المسار. total_paid يُحدَّث
// فقط عبر /api/finance، وحقول PIN تُحدَّث عبر new_pin أدناه — لا تُضاف هنا.
const ADMIN_EDITABLE_FIELDS = [
  "name", "owner", "owner_phone", "phone", "region", "gov", "address", "rating",
  "welcome_msg", "closed_days", "slot_min", "cancellation_window", "services",
  "prices", "barbers", "shift_enabled", "work_start", "work_end",
  "shift1_start", "shift1_end", "shift2_start", "shift2_end", "tone", "social",
  "status", "frozen", "banned",
] as const;

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
  const sb      = createAdminClient();
  const rawBody = await req.json() as Record<string, unknown> & { new_pin?: string };

  const body: Record<string, unknown> = {};
  for (const field of ADMIN_EDITABLE_FIELDS) {
    if (field in rawBody) body[field] = rawBody[field];
  }

  if (rawBody.new_pin !== undefined) {
    const pin = String(rawBody.new_pin || "").trim();
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "الرقم السري يجب أن يكون 6 أرقام" }, { status: 400 });
    }
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
