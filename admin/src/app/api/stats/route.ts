import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const sb = createAdminClient();

  const [salonsRes, customersRes, bookingsRes] = await Promise.all([
    sb.from("salons").select("id,status"),
    sb.from("customers").select("id", { count: "exact", head: true }),
    sb.from("bookings").select("status,total,date").limit(5000),
  ]);

  const allSalons      = salonsRes.data ?? [];
  const approvedSalons  = allSalons.filter((s: Record<string, unknown>) => s.status === "approved").length;
  const pendingSalons   = allSalons.filter((s: Record<string, unknown>) => s.status === "pending").length;
  const suspendedSalons = allSalons.filter((s: Record<string, unknown>) => s.status === "suspended").length;
  const rejectedSalons  = allSalons.filter((s: Record<string, unknown>) => s.status === "rejected").length;

  type Booking = { status: string; total?: number; date?: string };
  const allBookings: Booking[] = bookingsRes.data ?? [];

  const now   = new Date();
  const today = now.toISOString().split("T")[0];
  const todayBks = allBookings.filter((b) => b.date === today);

  const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: ARABIC_MONTHS[d.getMonth()], count: allBookings.filter((b) => b.date?.startsWith(key)).length };
  });

  const pending   = allBookings.filter((b) => b.status === "pending").length;
  const confirmed = allBookings.filter((b) => b.status === "confirmed").length;
  const completed = allBookings.filter((b) => b.status === "completed" || b.status === "approved").length;
  const cancelled = allBookings.filter((b) => b.status === "cancelled" || b.status === "canceled").length;
  const revenue   = allBookings.filter((b) => b.status === "approved" || b.status === "completed").reduce((s, b) => s + (Number(b.total) || 0), 0);
  const todayRevenue = todayBks.filter((b) => b.status === "approved" || b.status === "completed").reduce((s, b) => s + (Number(b.total) || 0), 0);

  return NextResponse.json({
    totalBookings:    allBookings.length,
    pendingBookings:  pending,
    confirmedBookings: confirmed,
    completedBookings: completed,
    cancelledBookings: cancelled,
    totalCustomers:   customersRes.count ?? 0,
    totalSalons:      allSalons.length,
    approvedSalons,
    pendingSalons,
    suspendedSalons,
    rejectedSalons,
    revenue,
    todayBookings: todayBks.length,
    todayRevenue,
    monthlyData,
  });
}
