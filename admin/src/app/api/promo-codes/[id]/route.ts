import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const body = await req.json();
  const { error } = await sb.from("promo_codes").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("promo_code.update", "promo_codes", params.id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("promo_codes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("promo_code.delete", "promo_codes", params.id);
  return NextResponse.json({ ok: true });
}
