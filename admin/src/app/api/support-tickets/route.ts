import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");

  let query = sb.from("support_tickets").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query.limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const salonIds = Array.from(new Set(rows.map((r) => r.salon_id)));
  const { data: salonsData } = salonIds.length
    ? await sb.from("salons").select("id,name").in("id", salonIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((salonsData ?? []).map((s) => [String(s.id), s.name as string]));

  const result = rows.map((r) => ({ ...r, salonName: nameById.get(String(r.salon_id)) ?? "" }));
  return NextResponse.json(result);
}
