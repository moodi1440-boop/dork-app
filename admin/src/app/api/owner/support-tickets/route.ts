import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyOwnerSession } from "@/lib/owner-session";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyOwnerSession(cookieStore.get("dork_owner_session")?.value);
}

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("support_tickets")
    .select("*")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subject, message, priority } = await req.json();
  if (!subject || !message) return NextResponse.json({ error: "subject and message required" }, { status: 400 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("support_tickets")
    .insert({ salon_id: salonId, subject, message, priority: priority ?? "normal" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
