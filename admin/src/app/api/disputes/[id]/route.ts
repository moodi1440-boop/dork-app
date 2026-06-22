import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

const EDITABLE_FIELDS = ["status", "admin_note", "refund_amount"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb      = createAdminClient();
  const rawBody = await req.json() as Record<string, unknown>;

  const body: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in rawBody) body[field] = rawBody[field];
  }
  if (body.status === "resolved" || body.status === "rejected") {
    body.resolved_at = new Date().toISOString();
  }

  const { error } = await sb.from("disputes").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("dispute.update", "dispute", params.id, { fields: Object.keys(body) });
  return NextResponse.json({ ok: true });
}
