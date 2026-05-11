import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const sb = createAdminClient();

  const [salonsRes, customersRes] = await Promise.all([
    sb.from("salons").select("id,status,bookings"),
    sb.from("customers").select("id", { count: "exact", head: true }),
  ]);

  const allSalons      = salonsRes.data ?? [];
  const approvedSalons = allSalons.filter((s: Record<string, unknown>) => s.status === "approved").length;
  const pendingSalons  = allSalons.filter((s: Record<string, unknown>) => s.status === "pending").length;

  type Booking = { status: string; total?: number };
  const allBookings = allSalons.flatMap(
    (s: Record<string, unknown>) => (s.bookings as Booking[]) ?? []
  );

  const pending   = allBookings.filter((b) => b.status === "pending").length;
  const confirmed = allBookings.filter((b) => b.status === "confirmed").length;
  const completed = allBookings.filter((b) => b.status === "completed" || b.status === "approved").length;
  const revenue   = allBookings.filter((b) => b.status === "approved" || b.status === "completed").reduce((s, b) => s + (Number(b.total) || 0), 0);

  return NextResponse.json({
    totalBookings:    allBookings.length,
    pendingBookings:  pending,
    confirmedBookings: confirmed,
    completedBookings: completed,
    totalCustomers:   customersRes.count ?? 0,
    totalSalons:      allSalons.length,
    approvedSalons,
    pendingSalons,
    revenue,
  });
}
