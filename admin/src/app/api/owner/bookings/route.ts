import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyOwnerSession } from "@/lib/owner-session";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyOwnerSession(cookieStore.get("dork_owner_session")?.value);
}

export async function GET(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");

  let query = sb
    .from("bookings")
    .select("id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,slot_duration_minutes,created_at")
    .eq("salon_id", salonId)
    .order("date", { ascending: false }).order("time", { ascending: false })
    .limit(200);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createAdminClient();
  const { id, ...body } = await req.json() as { id: string } & Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await sb.from("bookings").update(body).eq("id", id).eq("salon_id", salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.status) {
    const labels: Record<string, string> = {
      approved:  "تم تأكيد حجزك ✅",
      rejected:  "تم رفض حجزك ❌",
      cancelled: "تم إلغاء حجزك ❌",
    };
    const title = labels[body.status as string];
    if (title) {
      await sb.from("notifications").insert({
        target_type: "booking", target_id: id, title,
        icon: body.status === "approved" ? "✅" : "❌",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
