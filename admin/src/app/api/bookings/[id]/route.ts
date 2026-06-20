import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb   = createAdminClient();
  const body = await req.json() as Record<string, unknown>;

  const { error } = await sb.from("bookings").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("bookings").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
