import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

type BookingEntry = Record<string, unknown>;

async function findSalonWithBooking(sb: SupabaseClient, bookingId: string) {
  const { data, error } = await sb.from("salons").select("id,bookings");
  if (error || !data) return null;
  for (const salon of data as Array<{ id: unknown; bookings: BookingEntry[] }>) {
    const bookings: BookingEntry[] = salon.bookings ?? [];
    const idx = bookings.findIndex((b) => String(b.id) === bookingId);
    if (idx !== -1) return { salonId: salon.id, bookings, idx };
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb    = createAdminClient();
  const body  = await req.json() as BookingEntry;
  const found = await findSalonWithBooking(sb, params.id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  found.bookings[found.idx] = { ...found.bookings[found.idx], ...body };
  const { error } = await sb.from("salons").update({ bookings: found.bookings }).eq("id", found.salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const sb    = createAdminClient();
  const found = await findSalonWithBooking(sb, params.id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const newBookings = found.bookings.filter((_, i) => i !== found.idx);
  const { error } = await sb.from("salons").update({ bookings: newBookings }).eq("id", found.salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
