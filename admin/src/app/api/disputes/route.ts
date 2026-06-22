import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search");

  let query = sb.from("disputes").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,reason.ilike.%${search}%`);

  const { data, error } = await query.limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const sb   = createAdminClient();
  const body = await req.json() as Record<string, unknown>;
  if (!body.reason) return NextResponse.json({ error: "سبب النزاع مطلوب" }, { status: 400 });

  const { data, error } = await sb.from("disputes").insert({
    booking_id: body.booking_id ?? null,
    salon_id: body.salon_id ?? null,
    customer_name: body.customer_name ?? null,
    customer_phone: body.customer_phone ?? null,
    reason: body.reason,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("dispute.create", "dispute", data.id);
  return NextResponse.json(data);
}
