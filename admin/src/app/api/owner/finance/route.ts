import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("dork_owner_session")?.value ?? null;
}

interface Booking {
  id: string;
  status: string;
  total?: number;
  date?: string;
}

interface FinanceData {
  totalEarned: number;
  totalPaid: number;
  balance: number;
  completedBookings: number;
  pendingBookings: number;
  estimatedThisMonth: number;
  monthlyHistory: Array<{ month: string; earned: number; paid: number }>;
}

export async function GET(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const sb = createAdminClient();

    // جلب بيانات الصالون (الحجوزات والمدفوعات)
    const { data: salon, error: salonError } = await sb
      .from("salons")
      .select("bookings,total_paid")
      .eq("id", salonId)
      .single();

    if (salonError || !salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const bookings: Booking[] = (salon.bookings as Booking[]) || [];
    const totalPaid = Number(salon.total_paid) || 0;

    // حساب الإحصائيات - أي حجز ليس "pending" و ليس "cancelled" يُعتبر مكتمل (1 ريال)
    // تشمل: completed, approved, confirmed, وأي status آخر ليس معلقة أو ملغاة
    const completedBookings = bookings.filter(
      (b) => b.status && !["pending", "cancelled"].includes(b.status.toLowerCase())
    ).length;
    const totalEarned = completedBookings; // 1 ريال لكل حجز مكتمل
    const balance = totalEarned - totalPaid;

    // الحجوزات المعلقة/المؤكدة الشهر الجاري
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const pendingThisMonth = bookings.filter(
      (b) => ["confirmed", "pending"].includes(b.status?.toLowerCase() || "") && (b.date || "").startsWith(thisMonth)
    ).length;
    const estimatedThisMonth = pendingThisMonth; // التقدير بناءً على الحجوزات المؤكدة/المعلقة

    // سجل شهري (آخر 6 أشهر)
    const monthlyHistory: Array<{ month: string; earned: number; paid: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthBookings = bookings.filter(
        (b) => (b.date || "").startsWith(monthStr) && (b.status === "approved" || b.status === "completed")
      ).length;
      monthlyHistory.push({ month: monthStr, earned: monthBookings, paid: 0 });
    }

    const finance: FinanceData = {
      totalEarned,
      totalPaid,
      balance,
      completedBookings,
      pendingBookings: bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length,
      estimatedThisMonth,
      monthlyHistory,
    };

    return NextResponse.json(finance);
  } catch (error) {
    console.error("Finance API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// تحديث المدفوعات (من قبل الإدارة فقط - لاحقاً)
export async function PATCH(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { totalPaid } = await req.json();
    if (typeof totalPaid !== "number") {
      return NextResponse.json({ error: "Invalid total_paid value" }, { status: 400 });
    }

    const sb = createAdminClient();
    const { error } = await sb.from("salons").update({ total_paid: totalPaid }).eq("id", salonId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance Update Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
