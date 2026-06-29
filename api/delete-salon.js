const { createAdminClient } = require("./_lib/supabase-admin");
const { verifyOwnerSession } = require("./_lib/owner-session");
const { serializeCookie } = require("./_lib/cookies");

const COOKIE_NAME = "dork_owner_session";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const cookie = req.cookies?.[COOKIE_NAME] || req.headers.cookie?.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))?.[1];
    const salonId = await verifyOwnerSession(cookie);
    if (!salonId) {
      res.status(401).json({ error: "غير مصرح — سجّل الدخول أولاً", code: "err_unauthorized" });
      return;
    }

    const sb = createAdminClient();

    // تحقق أن الصالون موجود
    const { data: salon, error: fetchErr } = await sb
      .from("salons")
      .select("id,name,status")
      .eq("id", salonId)
      .maybeSingle();

    if (fetchErr || !salon) {
      res.status(404).json({ error: "الصالون غير موجود" });
      return;
    }

    // تجميد الصالون وإيقاف نشاطه (soft delete)
    const { error: updateErr } = await sb
      .from("salons")
      .update({ frozen: true, owner_pin_hash: null, owner_pin_fails: 0, owner_pin_locked_until: null })
      .eq("id", salonId);

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    // إلغاء الجلسة
    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", { maxAge: 0 }));
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[delete-salon] error:", e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
