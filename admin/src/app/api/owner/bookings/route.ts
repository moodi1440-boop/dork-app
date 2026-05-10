import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getSalonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("dork_owner_session")?.value ?? null;
}

export async function GET(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb     = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");

  let query = sb
    .from("bookings")
    .select("*")
    .eq("salon_id", salonId)
    .order("date", { ascending: false })
    .order("time", { ascending: false })
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
  const { id, ...body } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await sb
    .from("bookings")
    .update(body)
    .eq("id", id)
    .eq("salon_id", salonId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // إشعار للعميل عند تغيير حالة الحجز
  if (body.status) {
    const labels: Record<string, string> = {
      confirmed: "تم تأكيد حجزك ✅",
      cancelled: "تم إلغاء حجزك ❌",
      completed: "اكتمل حجزك 🎉",
    };
    const title = labels[body.status];
    if (title) {
      await sb.from("notifications").insert({
        target_type: "booking",
        target_id:   id,
        title,
        icon:        body.status === "confirmed" ? "✅" : body.status === "cancelled" ? "❌" : "🎉",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
