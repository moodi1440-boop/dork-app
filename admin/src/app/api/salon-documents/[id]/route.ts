import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { status, admin_note } = await req.json();
  if (status !== "verified" && status !== "rejected" && status !== "pending") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("salon_documents")
    .update({ status, admin_note: admin_note ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("salon_document.review", "salon_document", params.id, { status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("salon_documents").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
