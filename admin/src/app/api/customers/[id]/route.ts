import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();

  const [custRes, bookRes] = await Promise.all([
    sb.from("customers").select("*").eq("id", params.id).single(),
    sb.from("bookings")
      .select("id,salon_id,date,time,services,total,status,created_at")
      .eq("customer_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (custRes.error) return NextResponse.json({ error: custRes.error.message }, { status: 500 });

  return NextResponse.json({
    customer: custRes.data,
    bookings: bookRes.data ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb   = createAdminClient();
  const body = await req.json();
  const { error } = await sb.from("customers").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("customers").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
