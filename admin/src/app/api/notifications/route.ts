import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb          = createAdminClient();
  const targetType  = req.nextUrl.searchParams.get("target_type");
  const targetId    = req.nextUrl.searchParams.get("target_id");
  const unreadOnly  = req.nextUrl.searchParams.get("unread") === "1";

  let query = sb
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (targetType) query = query.eq("target_type", targetType);
  if (targetId)   query = query.eq("target_id", targetId);
  if (unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const sb   = createAdminClient();
  const body = await req.json();
  const { target_type = "all", target_id, title, body: notifBody, icon = "🔔" } = body;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data, error } = await sb
    .from("notifications")
    .insert({ target_type, target_id, title, body: notifBody, icon })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb   = createAdminClient();
  const { ids, all, target_type, target_id } = await req.json();

  if (all) {
    let query = sb.from("notifications").update({ read: true }).eq("read", false);
    if (target_type) query = query.eq("target_type", target_type);
    if (target_id)   query = query.eq("target_id", target_id);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (Array.isArray(ids) && ids.length > 0) {
    const { error } = await sb.from("notifications").update({ read: true }).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb   = createAdminClient();
  const { id, all } = await req.json();

  if (all) {
    const { error } = await sb.from("notifications").delete().gt("id", 0);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (id) {
    const { error } = await sb.from("notifications").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
