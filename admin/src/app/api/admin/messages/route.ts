import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const salonId = req.nextUrl.searchParams.get("salon_id");
    if (!salonId) {
      return NextResponse.json({ error: "salon_id required" }, { status: 400 });
    }

    const sb = createAdminClient();
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { salon_id, text, from_admin } = await req.json();

    if (!salon_id || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sb = createAdminClient();
    const { data, error } = await sb.from("messages").insert({
      salon_id,
      text,
      from_admin: from_admin ?? true,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
