const { createAdminClient } = require("./_lib/supabase-admin");
const { hashOwnerPin } = require("./_lib/owner-session");
const { checkRateLimit } = require("./_lib/rate-limit");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function toDbSalon(s, status) {
  return {
    name: s.name, owner: s.owner, owner_phone: s.ownerPhone,
    owner_email: s.ownerEmail || null,
    region: s.region, gov: s.gov, center: s.center, village: s.village,
    phone: s.phone, address: s.address, location_url: s.locationUrl,
    services: s.services, prices: s.prices,
    shift_enabled: s.shiftEnabled,
    shift1_start: s.shift1Start, shift1_end: s.shift1End,
    shift2_start: s.shift2Start, shift2_end: s.shift2End,
    work_start: s.workStart, work_end: s.workEnd,
    barbers: s.barbers, tone: s.tone,
    status,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const allowed = await checkRateLimit(req, "register-salon", 3);
    if (!allowed) {
      res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة", code: "err_rate_limit" });
      return;
    }

    const body = await readJson(req);
    const pin = String(body.pin || "").trim();

    if (!body.name?.trim() || !body.owner?.trim() || !body.ownerPhone?.trim() ||
        !body.phone?.trim() || !body.address?.trim() || !body.region || !body.gov ||
        !Array.isArray(body.services) || !body.services.length) {
      res.status(400).json({ error: "بيانات التسجيل غير مكتملة" });
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({ error: "الرقم السري يجب أن يكون 6 أرقام" });
      return;
    }

    const sb = createAdminClient();
    const { data: configRow } = await sb.from("admin_config").select("value").eq("key", "auto_approve_salons").single();
    const status = configRow?.value === true ? "approved" : "pending";
    const { data, error } = await sb.from("salons").insert(toDbSalon(body, status)).select("id").single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const owner_pin_hash = await hashOwnerPin(pin, data.id);
    await sb.from("salons").update({ owner_pin_hash }).eq("id", data.id);

    // ربط الصالون الجديد بـ Supabase Auth (إذا عنده owner_email)
    if (body.ownerEmail) {
      try {
        const { data: authUser } = await sb.auth.admin.createUser({
          email: body.ownerEmail,
          email_confirm: true,
        });
        if (authUser?.user?.id) {
          await sb.from("salons").update({ auth_uid: authUser.user.id }).eq("id", data.id);
        }
      } catch { /* فشل صامت — التسجيل يكتمل بدون auth_uid */ }
    }

    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    console.error("[register-salon] error:", e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
