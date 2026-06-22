import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit-log";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("salon_documents")
    .select("*")
    .eq("salon_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { doc_type, doc_url } = await req.json();
  if (!doc_type || !doc_url) return NextResponse.json({ error: "doc_type and doc_url required" }, { status: 400 });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("salon_documents")
    .insert({ salon_id: params.id, doc_type, doc_url })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("salon_document.add", "salon", params.id, { doc_type });
  return NextResponse.json(data);
}
