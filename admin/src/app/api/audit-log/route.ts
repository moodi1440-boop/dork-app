import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const search = req.nextUrl.searchParams.get("search");

  let query = sb.from("admin_audit_log").select("*").order("created_at", { ascending: false });
  if (search) query = query.or(`actor.ilike.%${search}%,action.ilike.%${search}%,target_id.ilike.%${search}%`);

  const { data, error } = await query.limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = data ?? [];

  const salonIds   = Array.from(new Set(logs.filter((l) => l.target_type === "salon").map((l) => l.target_id).filter(Boolean)));
  const custIds    = Array.from(new Set(logs.filter((l) => l.target_type === "customer").map((l) => l.target_id).filter(Boolean)));
  const adminIds   = Array.from(new Set(logs.filter((l) => l.target_type === "admin_user").map((l) => l.target_id).filter(Boolean)));

  const salonMap: Map<string, { name: string; phone: string }> = new Map();
  const custMap:  Map<string, { name: string; phone: string }> = new Map();
  const adminMap: Map<string, { name: string }>               = new Map();

  if (salonIds.length) {
    const { data: salons } = await sb.from("salons").select("id,name,phone").in("id", salonIds);
    (salons ?? []).forEach((s) => salonMap.set(String(s.id), { name: s.name ?? "", phone: s.phone ?? "" }));
  }
  if (custIds.length) {
    const { data: custs } = await sb.from("customers").select("id,name,phone").in("id", custIds);
    (custs ?? []).forEach((c) => custMap.set(String(c.id), { name: c.name ?? "", phone: c.phone ?? "" }));
  }
  if (adminIds.length) {
    const { data: admins } = await sb.from("admin_users").select("id,username").in("id", adminIds);
    (admins ?? []).forEach((a) => adminMap.set(String(a.id), { name: a.username ?? "" }));
  }

  const enriched = logs.map((l) => {
    let target_name: string | null  = null;
    let target_phone: string | null = null;
    const tid = String(l.target_id ?? "");
    if (l.target_type === "salon")      { const s = salonMap.get(tid); target_name = s?.name ?? null; target_phone = s?.phone ?? null; }
    else if (l.target_type === "customer") { const c = custMap.get(tid);  target_name = c?.name ?? null; target_phone = c?.phone ?? null; }
    else if (l.target_type === "admin_user") { const a = adminMap.get(tid); target_name = a?.name ?? null; }
    return { ...l, target_name, target_phone };
  });

  return NextResponse.json(enriched);
}
