import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { hashAdminPassword } from "@/lib/admin-session";
import { getCurrentAdmin } from "@/lib/admin-actor";
import { logAdminAction } from "@/lib/audit-log";

async function requireSuperAdmin() {
  const { role } = await getCurrentAdmin();
  return role === "super_admin";
}

export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const sb = createAdminClient();
  const { data, error } = await sb.from("admin_users").select("id,username,role,is_active,created_at").order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { username, password, role } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });

  const sb = createAdminClient();
  const password_hash = await hashAdminPassword(String(password), String(username).trim());
  const { data, error } = await sb
    .from("admin_users")
    .insert({ username: String(username).trim(), password_hash, role: role ?? "editor" })
    .select("id,username,role,is_active,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("admin_user.create", "admin_user", data.id, { username: data.username, role: data.role });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, role, is_active, password } = await req.json();
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const sb = createAdminClient();
  const body: Record<string, unknown> = {};
  if (role !== undefined) body.role = role;
  if (is_active !== undefined) body.is_active = is_active;
  if (password) {
    const { data: existing } = await sb.from("admin_users").select("username").eq("id", id).single();
    const username = (existing as { username: string } | null)?.username;
    if (!username) return NextResponse.json({ error: "not found" }, { status: 404 });
    body.password_hash = await hashAdminPassword(String(password), username);
  }

  const { error } = await sb.from("admin_users").update(body).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("admin_user.update", "admin_user", id, { fields: Object.keys(body) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb.from("admin_users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction("admin_user.delete", "admin_user", id);
  return NextResponse.json({ ok: true });
}
