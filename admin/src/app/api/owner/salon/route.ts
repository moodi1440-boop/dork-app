import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyOwnerSession } from "@/lib/owner-session";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyOwnerSession(cookieStore.get("dork_owner_session")?.value);
}

// الحقول التي يملك الحلاك صلاحية تعديلها بنفسه. أي حقل آخر (status, banned,
// frozen, rating, total_paid, owner, phone...) يبقى بيد الإدارة فقط.
const OWNER_EDITABLE_FIELDS = [
  "name", "address", "welcome_msg", "closed_days", "slot_min", "cancellation_window",
  "services", "prices", "barbers", "shift_enabled", "work_start", "work_end",
  "shift1_start", "shift1_end", "shift2_start", "shift2_end", "tone", "social",
  "location_url", "owner_pin_hash",
] as const;

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { data, error } = await sb.from("salons").select("*").eq("id", salonId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb      = createAdminClient();
  const rawBody = await req.json() as Record<string, unknown>;
  const body: Record<string, unknown> = {};
  for (const field of OWNER_EDITABLE_FIELDS) {
    if (field in rawBody) body[field] = rawBody[field];
  }

  const { error } = await sb.from("salons").update(body).eq("id", salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
