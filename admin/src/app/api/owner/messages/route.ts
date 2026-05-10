import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("dork_owner_session")?.value ?? null;
}

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("messages")
    .select("*")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // وضع علامة مقروء على رسائل الإدارة
  await sb.from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("salon_id", salonId)
    .eq("from_admin", true)
    .is("read_at", null);

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb   = createAdminClient();
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const { data, error } = await sb
    .from("messages")
    .insert({ salon_id: salonId, text, from_admin: false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // إشعار للإدارة
  await sb.from("notifications").insert({
    target_type: "admin",
    title:       "رسالة جديدة من صالون",
    body:        text.slice(0, 100),
    icon:        "💬",
  });

  return NextResponse.json(data);
}
