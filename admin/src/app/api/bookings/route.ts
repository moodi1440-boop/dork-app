import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search");

  let query = sb.from("bookings").select("*").order("date", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const salons = await sb.from("salons").select("id,name");
  const salonMap = Object.fromEntries((salons.data ?? []).map((s) => [s.id, s.name]));
  const enriched = (data ?? []).map((b) => ({ ...b, salonName: salonMap[b.salon_id] ?? "—" }));

  return NextResponse.json(enriched);
}
