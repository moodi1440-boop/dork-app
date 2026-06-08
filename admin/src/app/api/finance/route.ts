import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const filter = req.nextUrl.searchParams.get("filter") ?? "all";

  try {
    let salonQuery = sb
      .from("salons")
      .select("id,name,owner,phone,total_paid,status")
      .neq("status", "banned")
      .order("id", { ascending: false });

    if (search) salonQuery = salonQuery.ilike("name", `%${search}%`);

    const { data: salonsData, error: salonError } = await salonQuery.limit(200);
    if (salonError) throw new Error(salonError.message);

    const { data: bookingsData, error: bookingsError } = await sb
      .from("bookings")
      .select("salon_id,total,status")
      .eq("status", "approved")
      .limit(5000);
    if (bookingsError) throw new Error(bookingsError.message);

    const byId: Record<number, { count: number }> = {};
    for (const b of bookingsData ?? []) {
      const sid = b.salon_id as number;
      if (!byId[sid]) byId[sid] = { count: 0 };
      byId[sid].count++;
    }

    const RATE = 1;
    const salons = (salonsData ?? []).map((s: Record<string, unknown>) => {
      const bk      = byId[s.id as number] ?? { count: 0 };
      const earned  = bk.count * RATE;
      const paid    = Number(s.total_paid) || 0;
      const balance = earned - paid;
      return { id: s.id, name: s.name, owner: s.owner, phone: s.phone, earned, paid, balance, bookingCount: bk.count };
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
