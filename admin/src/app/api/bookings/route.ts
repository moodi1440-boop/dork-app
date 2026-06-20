import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search")?.toLowerCase() ?? "";

  let query = sb
    .from("bookings")
    .select("id,salon_id,customer_name,customer_phone,barber_name,date,time,total,status,attendance")
    .order("date", { ascending: false }).order("time", { ascending: false })
    .limit(200);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const salonIds = Array.from(new Set(rows.map((b) => b.salon_id)));
  const { data: salonsData } = salonIds.length
    ? await sb.from("salons").select("id,name").in("id", salonIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((salonsData ?? []).map((s) => [String(s.id), s.name as string]));

  let result = rows.map((b) => ({
    id: b.id, salon_id: b.salon_id, salonName: nameById.get(String(b.salon_id)) ?? "",
    name: b.customer_name, phone: b.customer_phone, barber_name: b.barber_name,
    date: b.date, time: b.time, total: b.total, status: b.status, attendance: b.attendance,
  }));

  if (search) {
    result = result.filter((b) =>
      (b.name ?? "").toLowerCase().includes(search) || (b.phone ?? "").toLowerCase().includes(search)
    );
  }

  return NextResponse.json(result);
}
