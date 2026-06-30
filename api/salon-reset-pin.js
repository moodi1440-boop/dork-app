const { createAdminClient } = require("./_lib/supabase-admin");
const { hashOwnerPin } = require("./_lib/owner-session");
const { checkRateLimit } = require("./_lib/rate-limit");
const { readJson } = require("./_lib/request");

module.exports = async (req, res) => {
  if (req.method === "POST") {
    // خطوة 1: التحقق من جوال + بريد → البحث عن الصالون وإرجاع تأكيد
    // خطوة 2: تحديث PIN بعد التحقق من access token
    try {
      const body = await readJson(req);
      const sb = createAdminClient();

      const rlEndpoint = body.action === "reset" ? "reset-pin-reset" : "reset-pin-verify";
      const allowed = await checkRateLimit(req, rlEndpoint, 5);
      if (!allowed) {
        res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة", code: "err_rate_limit" });
        return;
      }

      // مرحلة التحقق من البيانات (قبل OTP)
      if (body.action === "verify") {
        const { phone, email } = body;
        if (!phone || !email) {
          res.status(400).json({ error: "رقم الجوال والبريد الإلكتروني مطلوبان" });
          return;
        }
        const { data: salon, error } = await sb
          .from("salons")
          .select("id,owner_email,owner_phone,phone")
          .or(`phone.eq.${phone.trim()},owner_phone.eq.${phone.trim()}`)
          .eq("status", "approved")
          .maybeSingle();

        if (error || !salon) {
          res.status(404).json({ error: "لا يوجد صالون مفعّل بهذا الرقم" });
          return;
        }
        if (!salon.owner_email) {
          res.status(400).json({ error: "لا يوجد بريد إلكتروني مسجّل لهذا الصالون — تواصل مع الإدارة" });
          return;
        }
        if (salon.owner_email.toLowerCase() !== email.trim().toLowerCase()) {
          res.status(400).json({ error: "البريد الإلكتروني غير مطابق لبيانات الصالون" });
          return;
        }
        res.status(200).json({ ok: true, maskedEmail: email.replace(/(.{2}).+(@.+)/, "$1***$2") });
        return;
      }

      // مرحلة تحديث PIN بعد التحقق من OTP
      if (body.action === "reset") {
        const { phone, accessToken, newPin } = body;
        if (!phone || !accessToken || !newPin) {
          res.status(400).json({ error: "بيانات ناقصة" });
          return;
        }
        if (!/^\d{6}$/.test(String(newPin))) {
          res.status(400).json({ error: "الرمز السري يجب أن يكون 6 أرقام" });
          return;
        }

        // التحقق من صحة access token وجلب البريد
        const { data: { user }, error: authErr } = await sb.auth.getUser(accessToken);
        if (authErr || !user?.email) {
          res.status(401).json({ error: "رمز التحقق غير صالح أو منتهي الصلاحية" });
          return;
        }

        // البحث عن الصالون
        const { data: salon, error: salonErr } = await sb
          .from("salons")
          .select("id,owner_email")
          .or(`phone.eq.${phone.trim()},owner_phone.eq.${phone.trim()}`)
          .eq("status", "approved")
          .maybeSingle();

        if (salonErr || !salon) {
          res.status(404).json({ error: "الصالون غير موجود" });
          return;
        }
        if (!salon.owner_email || salon.owner_email.toLowerCase() !== user.email.toLowerCase()) {
          res.status(403).json({ error: "البريد الإلكتروني غير مطابق" });
          return;
        }

        const newHash = await hashOwnerPin(String(newPin), String(salon.id));
        const { error: updateErr } = await sb
          .from("salons")
          .update({ owner_pin_hash: newHash, owner_pin_fails: 0, owner_pin_locked_until: null })
          .eq("id", salon.id);

        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }

        // إلغاء جلسة Supabase Auth المؤقتة
        await sb.auth.admin.signOut(accessToken).catch(() => {});

        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: "action غير معروف" });
    } catch (e) {
      console.error("[salon-reset-pin] error:", e);
      res.status(500).json({ error: "خطأ بالسيرفر" });
    }
    return;
  }

  res.status(405).json({ error: "method not allowed" });
};
