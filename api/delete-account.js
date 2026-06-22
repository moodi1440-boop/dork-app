const { createAdminClient } = require("./_lib/supabase-admin");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const id = Number(body.customerId);
    if (!id || isNaN(id)) {
      res.status(400).json({ error: "Invalid customerId" });
      return;
    }

    const sb = createAdminClient();
    const { data: customer, error: fetchErr } = await sb
      .from("customers")
      .select("id,phone,email,blocked,auth_uid")
      .eq("id", id)
      .single();
    if (fetchErr || !customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    // إذا كان الحساب محظوراً، نسجّل الهاتف/البريد في قائمة الحظر
    // الدائمة قبل الحذف — يمنع التحايل على الحظر بإنشاء حساب جديد.
    if (customer.blocked) {
      await sb.from("customer_blacklist").insert({
        phone: customer.phone || null,
        email: customer.email || null,
        reason: "banned_account_deleted",
      });
    }

    const { error: delErr } = await sb.from("customers").delete().eq("id", id);
    if (delErr) {
      res.status(500).json({ error: delErr.message });
      return;
    }

    if (customer.auth_uid) {
      const { error: authErr } = await sb.auth.admin.deleteUser(customer.auth_uid);
      if (authErr) console.error("[delete-account] auth delete error:", authErr.message);
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[delete-account] error:", e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
