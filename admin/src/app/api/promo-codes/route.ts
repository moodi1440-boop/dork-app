import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

const SELECT = "id,code,active,created_at,note,max_uses,used_count,duration_days,expires_at,code_type,wa_credits,used_by_salon_id,recipient_phone";

export async function GET() {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("promo_codes")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const { error } = await sb.from("promo_codes").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("promo_code.create", "promo_codes", undefined, { count: rows.length });
  return NextResponse.json({ ok: true });
}
