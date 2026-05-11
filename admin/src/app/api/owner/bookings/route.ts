import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("dork_owner_session")?.value ?? null;
}

type Booking = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");

  const { data, error } = await sb.from("salons").select("bookings").eq("id", salonId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let bookings: Booking[] = (data?.bookings as Booking[]) ?? [];
  if (status && status !== "all") bookings = bookings.filter((b) => b.status === status);

  bookings.sort((a, b) => {
    const dd = String(b.date ?? "").localeCompare(String(a.date ?? ""));
    if (dd !== 0) return dd;
    return String(b.time ?? "").localeCompare(String(a.time ?? ""));
  });

  return NextResponse.json(bookings.slice(0, 200));
}

export async function PATCH(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { id, ...body } = await req.json() as { id: string } & Booking;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error: fetchErr } = await sb.from("salons").select("bookings").eq("id", salonId).single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const bookings: Booking[] = (data?.bookings as Booking[]) ?? [];
  const idx = bookings.findIndex((b) => String(b.id) === String(id));
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  bookings[idx] = { ...bookings[idx], ...body };
  const { error } = await sb.from("salons").update({ bookings }).eq("id", salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.status) {
    const labels: Record<string, string> = {
      confirmed: "تم تأكيد حجزك ✅",
      cancelled:  "تم إلغاء حجزك ❌",
      completed:  "اكتمل حجزك 🎉",
    };
    const title = labels[body.status as string];
    if (title) {
      await sb.from("notifications").insert({
        target_type: "booking", target_id: id, title,
        icon: body.status === "confirmed" ? "✅" : body.status === "cancelled" ? "❌" : "🎉",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
