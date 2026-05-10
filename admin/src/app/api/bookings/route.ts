import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type BookingEntry = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search")?.toLowerCase() ?? "";

  const { data, error } = await sb
    .from("salons")
    .select("id,name,bookings")
    .order("id", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allBookings: BookingEntry[] = (data ?? []).flatMap((salon: Record<string, unknown>) => {
    const salonBookings = (salon.bookings as BookingEntry[]) ?? [];
    return salonBookings.map((b) => ({
      ...b,
      salon_id: salon.id,
      salonName: salon.name,
    }));
  });

  const filtered = allBookings.filter((b) => {
    if (status && status !== "all" && b.status !== status) return false;
    if (search) {
      const name  = ((b.name  as string) ?? "").toLowerCase();
      const phone = ((b.phone as string) ?? "").toLowerCase();
      if (!name.includes(search) && !phone.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const da = String(a.date ?? "");
    const db = String(b.date ?? "");
    return db.localeCompare(da);
  });

  return NextResponse.json(filtered.slice(0, 200));
}
