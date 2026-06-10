import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const sb   = createAdminClient();
  const body = await req.json() as Record<string, unknown>;
  const data = {
    bookings: [], services: [], barbers: [], prices: {}, rating: 5,
    workStart: "09:00", workEnd: "23:00", status: "approved",
    ...body,
  };
  const { data: row, error } = await sb.from("salons").insert(data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(row);
}

const FULL_SELECT   = "id,name,owner,owner_phone,region,gov,phone,rating,status,frozen,banned,total_paid,address,welcome_msg,closed_days,slot_min,services,prices,barbers,shift_enabled,work_start,work_end,shift1_start,shift1_end,shift2_start,shift2_end,tone,social,location_url,paused,created_at";
const SAFE_SELECT   = "id,name,owner,owner_phone,region,gov,phone,rating,status,frozen,banned,address,welcome_msg,closed_days,slot_min,services,prices,barbers,shift_enabled,work_start,work_end,shift1_start,shift1_end,shift2_start,shift2_end,tone";

export async function GET(req: NextRequest) {
  try {
    const sb     = createAdminClient();
    const status = req.nextUrl.searchParams.get("status");
    const search = req.nextUrl.searchParams.get("search");

    const buildQuery = (select: string) => {
      let q = sb.from("salons").select(select).order("id", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      if (search) q = q.or(`name.ilike.%${search}%,owner.ilike.%${search}%`);
      return q;
    };

    let { data, error } = await buildQuery(FULL_SELECT).limit(200);
    if (error) {
      console.warn("[API /salons] Full select failed, retrying safe select:", error.message);
      ({ data, error } = await buildQuery(SAFE_SELECT).limit(200));
    }
    if (error) {
      console.error("[API /salons] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((s: Record<string, unknown>) => ({ ...s, bookings: [] }));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /salons] Exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
