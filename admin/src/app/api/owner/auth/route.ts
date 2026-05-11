import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  // البحث مثل الموبايل: owner_phone OR phone (بدون تقييد الحالة الأولى)
  const { data, error } = await sb
    .from("salons")
    .select("id,name,owner,owner_phone,phone,status,frozen,banned")
    .or(`owner_phone.eq.${phone},phone.eq.${phone}`);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "صالون غير موجود" }, { status: 401 });
  }

  const salon = data[0] as Record<string, unknown>;

  // فحوصات مماثلة للموبايل
  if (salon.banned) {
    return NextResponse.json({ error: "🚫 تم حظر هذا الصالون من قبل الإدارة — تواصل مع الدعم" }, { status: 403 });
  }
  if (salon.frozen) {
    return NextResponse.json({ error: "🔒 الصالون مجمّد مؤقتاً — تواصل مع الإدارة" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set("dork_owner_session", String(salon.id), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30, // 30 days
    path:     "/",
  });

  return NextResponse.json({
    id: salon.id,
    name: salon.name,
    owner: salon.owner,
    status: salon.status,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("dork_owner_session");
  return NextResponse.json({ ok: true });
}
