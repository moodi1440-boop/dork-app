import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { customerId } = await req.json() as any;
    const id = Number(customerId);
    if (!id || isNaN(id)) return json({ success: false, error: "Invalid customerId" }, 400);

    const { data: customer, error: fetchErr } = await supabase
      .from("customers")
      .select("id,phone,email,blocked,auth_uid")
      .eq("id", id)
      .single();
    if (fetchErr || !customer) return json({ success: false, error: "Customer not found" }, 404);

    // إذا كان الحساب محظوراً، نسجّل الهاتف/البريد في قائمة الحظر
    // الدائمة قبل الحذف — يمنع التحايل على الحظر بإنشاء حساب جديد.
    if (customer.blocked) {
      await supabase.from("customer_blacklist").insert({
        phone: customer.phone || null,
        email: customer.email || null,
        reason: "banned_account_deleted",
      });
    }

    const { error: delErr } = await supabase.from("customers").delete().eq("id", id);
    if (delErr) {
      console.error("[delete-account] delete error:", delErr.message);
      return json({ success: false, error: delErr.message }, 500);
    }

    if (customer.auth_uid) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(customer.auth_uid);
      if (authErr) console.error("[delete-account] auth delete error:", authErr.message);
    }

    console.log(`[delete-account] OK [customer:${id}]`);
    return json({ success: true });

  } catch (e: any) {
    console.error("[delete-account] exception:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
