import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

// الحقول التي يملك الأدمن صلاحية تعديلها عبر هذا المسار.
const ADMIN_EDITABLE_FIELDS = [
  "name", "phone", "email", "admin_notes", "loyalty_points", "loyalty_frozen", "blocked", "pin",
] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();

  const custRes = await sb.from("customers").select("*").eq("id", params.id).single();
  if (custRes.error) return NextResponse.json({ error: custRes.error.message }, { status: 500 });

  const customer = custRes.data as Record<string, unknown>;
  const phone    = (customer?.phone as string) ?? "";

  const bkRes = await sb
    .from("bookings")
    .select("id,salon_id,customer_name,customer_phone,barber_name,date,time,total,status,attendance")
    .or(`customer_id.eq.${params.id},customer_phone.eq.${phone}`)
    .order("date", { ascending: false })
    .limit(20);

  const rows = bkRes.data ?? [];
  const salonIds = Array.from(new Set(rows.map((b) => b.salon_id)));
  const { data: salonsData } = salonIds.length
    ? await sb.from("salons").select("id,name").in("id", salonIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((salonsData ?? []).map((s) => [String(s.id), s.name as string]));

  const bookings = rows.map((b) => ({
    id: b.id, salon_id: b.salon_id, salonName: nameById.get(String(b.salon_id)) ?? "",
    name: b.customer_name, phone: b.customer_phone, barber_name: b.barber_name,
    date: b.date, time: b.time, total: b.total, status: b.status, attendance: b.attendance,
  }));

  return NextResponse.json({ customer, bookings });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb      = createAdminClient();
  const rawBody = await req.json() as Record<string, unknown>;

  const body: Record<string, unknown> = {};
  for (const field of ADMIN_EDITABLE_FIELDS) {
    if (field in rawBody) body[field] = rawBody[field];
  }

  const { error } = await sb.from("customers").update(body).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("customer.update", "customer", params.id, { fields: Object.keys(body) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("customers").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("customer.delete", "customer", params.id);
  return NextResponse.json({ ok: true });
}
