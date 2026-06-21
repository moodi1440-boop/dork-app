import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// الحقول التي يملك الأدمن صلاحية تعديلها عبر هذا المسار.
const ADMIN_EDITABLE_FIELDS = [
  "name", "phone", "email", "admin_notes", "loyalty_points", "loyalty_frozen", "blocked",
] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();

  const [custRes, salonsRes] = await Promise.all([
    sb.from("customers").select("*").eq("id", params.id).single(),
    sb.from("salons").select("id,name,bookings"),
  ]);

  if (custRes.error) return NextResponse.json({ error: custRes.error.message }, { status: 500 });

  const customer = custRes.data as Record<string, unknown>;
  const phone    = (customer?.phone as string) ?? "";

  type Booking = Record<string, unknown>;
  const bookings: Booking[] = (salonsRes.data ?? []).flatMap((salon: Record<string, unknown>) =>
    ((salon.bookings as Booking[]) ?? [])
      .filter((b) => b.phone === phone || String(b.customer_id) === params.id)
      .map((b) => ({ ...b, salon_id: salon.id, salonName: salon.name }))
  );

  bookings.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));

  return NextResponse.json({ customer, bookings: bookings.slice(0, 20) });
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
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { error } = await sb.from("customers").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
