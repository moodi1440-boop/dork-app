import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const sb    = createAdminClient();
  const start = Date.now();

  const { error } = await sb.from("salons").select("id", { count: "exact", head: true }).limit(1);
  const dbLatencyMs = Date.now() - start;

  return NextResponse.json({
    status: error ? "error" : "ok",
    dbLatencyMs,
    timestamp: new Date().toISOString(),
    ...(error ? { error: error.message } : {}),
  });
}
