import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb       = createAdminClient();
  const salonId  = req.nextUrl.searchParams.get("salon_id");

  if (salonId) {
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // رسائل غير مقروءة لكل صالون (للقائمة الجانبية)
  const { data: salons, error: sErr } = await sb
    .from("salons")
    .select("id,name,status")
    .eq("status", "approved")
    .order("id", { ascending: false });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { data: msgs, error: mErr } = await sb
    .from("messages")
    .select("salon_id,text,from_admin,created_at,read_at")
    .order("created_at", { ascending: false });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const result = (salons ?? []).map((s: Record<string, unknown>) => {
    const salonMsgs = (msgs ?? []).filter((m: Record<string, unknown>) => String(m.salon_id) === String(s.id));
    const unread    = salonMsgs.filter((m: Record<string, unknown>) => !m.from_admin && !m.read_at).length;
    const lastMsg   = salonMsgs[0] ?? null;
    return { id: s.id, name: s.name, unread, lastMsg, totalMsgs: salonMsgs.length };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const sb   = createAdminClient();
  const body = await req.json();
  const { salon_id, text, from_admin = true } = body;
  if (!salon_id || !text) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const { data, error } = await sb
    .from("messages")
    .insert({ salon_id, text, from_admin })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // إشعار للصالون عند إرسال رسالة من الإدارة
  if (from_admin) {
    await sb.from("notifications").insert({
      target_type: "salon",
      target_id:   salon_id,
      title:       "رسالة من الإدارة",
      body:        text.slice(0, 100),
      icon:        "💬",
    });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb   = createAdminClient();
  const { salon_id } = await req.json();
  if (!salon_id) return NextResponse.json({ error: "missing salon_id" }, { status: 400 });

  const { error } = await sb
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("salon_id", salon_id)
    .eq("from_admin", false)
    .is("read_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
