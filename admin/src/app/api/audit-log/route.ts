import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb     = createAdminClient();
  const search = req.nextUrl.searchParams.get("search");

  let query = sb.from("admin_audit_log").select("*").order("created_at", { ascending: false });
  if (search) query = query.or(`actor.ilike.%${search}%,action.ilike.%${search}%,target_id.ilike.%${search}%`);

  const { data, error } = await query.limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
