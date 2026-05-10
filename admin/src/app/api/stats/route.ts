import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const sb = createAdminClient();

  const [bookings, customers, salons] = await Promise.all([
    sb.from("bookings").select("id,status,total"),
    sb.from("customers").select("id", { count: "exact", head: true }),
    sb.from("salons").select("id,status"),
  ]);

  const allBookings  = bookings.data ?? [];
  const pending      = allBookings.filter((b) => b.status === "pending").length;
  const confirmed    = allBookings.filter((b) => b.status === "confirmed").length;
  const completed    = allBookings.filter((b) => b.status === "completed").length;
  const revenue      = allBookings.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const allSalons    = salons.data ?? [];
  const approvedSalons = allSalons.filter((s) => s.status === "approved").length;
  const pendingSalons  = allSalons.filter((s) => s.status === "pending").length;

  return NextResponse.json({
    totalBookings:   allBookings.length,
    pendingBookings: pending,
    confirmedBookings: confirmed,
    completedBookings: completed,
    totalCustomers:  customers.count ?? 0,
    totalSalons:     allSalons.length,
    approvedSalons,
    pendingSalons,
    revenue,
  });
}
