import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const filter = req.nextUrl.searchParams.get("filter") ?? "all";

  try {
    let query = sb
      .from("salons")
      .select("id,name,owner,phone,total_paid,status,bookings(id,status,total)")
      .eq("status", "approved")
      .order("id", { ascending: false });

    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query.limit(200);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("No data returned");

    const RATE_PER_BOOKING = 1; // 1 ريال لكل حجز مكتمل
    const salons = (data ?? []).map((s: Record<string, unknown>) => {
      const bookings = (s.bookings as Array<{ status: string; total?: number }>) ?? [];
      const completedCount = bookings.filter((b) => b.status === "approved" || b.status === "completed").length;
      const earned   = completedCount * RATE_PER_BOOKING;
      const paid     = Number(s.total_paid) || 0;
      const balance  = earned - paid;
      return { id: s.id, name: s.name, owner: s.owner, phone: s.phone, earned, paid, balance, bookingCount: completedCount };
    });

    const filtered = salons.filter((s) => {
      if (filter === "paid")   return s.balance <= 0;
      if (filter === "unpaid") return s.balance > 0;
      return true;
    });

    const totals = {
      totalEarned:  salons.reduce((a, s) => a + s.earned, 0),
      totalPaid:    salons.reduce((a, s) => a + s.paid, 0),
      totalBalance: salons.reduce((a, s) => a + s.balance, 0),
    };

    return NextResponse.json({ salons: filtered, totals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, salons: [], totals: { totalEarned: 0, totalPaid: 0, totalBalance: 0 } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const sb = createAdminClient();
  const { id, amount } = await req.json();
  if (!id || typeof amount !== "number") return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data, error: fetchErr } = await sb.from("salons").select("total_paid").eq("id", id).single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const newPaid = (Number((data as Record<string, unknown>)?.total_paid) || 0) + amount;
  const { error } = await sb.from("salons").update({ total_paid: newPaid }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, newPaid });
}
