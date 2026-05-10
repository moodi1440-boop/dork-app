import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb       = createAdminClient();
  const salonId  = req.nextUrl.searchParams.get("salon_id");
  if (!salonId) return NextResponse.json({ error: "salon_id required" }, { status: 400 });

  const { data, error } = await sb
    .from("waiting_list")
    .select("*")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const { salon_id, name, phone } = await req.json();
  if (!salon_id || !name) return NextResponse.json({ error: "salon_id and name required" }, { status: 400 });

  const { data, error } = await sb
    .from("waiting_list")
    .insert({ salon_id, name, phone })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = createAdminClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await sb.from("waiting_list").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
