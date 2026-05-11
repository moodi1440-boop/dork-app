import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

interface Salon {
  id: number;
  name: string;
  bookings: Array<{ status: string; total?: number; date?: string }>;
  total_paid: number;
  status: string;
}

interface FinanceReport {
  totalRevenue: number;
  totalPaid: number;
  totalBalance: number;
  completedBookings: number;
  averagePerBooking: number;
  topSalons: Array<{ id: number; name: string; earned: number; bookings: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; paid: number; balance: number }>;
  salonStats: Array<{
    salonId: number;
    salonName: string;
    earned: number;
    paid: number;
    balance: number;
    bookingCount: number;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const sb = createAdminClient();
    const { data: salons, error } = await sb.from("salons").select("*");

    if (error || !salons) {
      return NextResponse.json({ error: "Failed to fetch salons" }, { status: 500 });
    }

    const typedSalons = salons as Salon[];

    // حساب الإحصائيات الشاملة
    let totalRevenue = 0;
    let totalPaid = 0;
    let completedBookings = 0;

    const salonStats = typedSalons.map((salon) => {
      const bookings = (salon.bookings || []) as Array<{ status: string; total?: number; date?: string }>;
      const completedBks = bookings.filter((b) => b.status === "approved" || b.status === "completed");
      const earned = completedBks.length; // 1 ريال لكل حجز
      const paid = Number(salon.total_paid) || 0;
      const balance = earned - paid;

      totalRevenue += earned;
      totalPaid += paid;
      completedBookings += completedBks.length;

      return {
        salonId: salon.id,
        salonName: salon.name,
        earned,
        paid,
        balance,
        bookingCount: bookings.length,
      };
    });

    // أفضل الصالونات
    const topSalons = salonStats
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 5)
      .map((s) => ({
        id: s.salonId,
        name: s.salonName,
        earned: s.earned,
        bookings: s.bookingCount,
      }));

    // الاتجاه الشهري (آخر 6 أشهر)
    const now = new Date();
    const monthlyTrend: Array<{ month: string; revenue: number; paid: number; balance: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      let monthRevenue = 0;
      let monthPaid = 0;

      typedSalons.forEach((salon) => {
        const bookings = (salon.bookings || []) as Array<{ status: string; date?: string }>;
        const monthBookings = bookings.filter(
          (b) => (b.date || "").startsWith(monthStr) && (b.status === "approved" || b.status === "completed")
        ).length;
        monthRevenue += monthBookings;
      });

      monthlyTrend.push({
        month: monthStr,
        revenue: monthRevenue,
        paid: monthPaid,
        balance: monthRevenue - monthPaid,
      });
    }

    const totalBalance = totalRevenue - totalPaid;
    const averagePerBooking = completedBookings > 0 ? Math.round((totalRevenue / completedBookings) * 100) / 100 : 0;

    const report: FinanceReport = {
      totalRevenue,
      totalPaid,
      totalBalance,
      completedBookings,
      averagePerBooking,
      topSalons,
      monthlyTrend,
      salonStats: salonStats.sort((a, b) => b.earned - a.earned),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("Finance Report Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
