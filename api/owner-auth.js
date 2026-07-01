const { createAdminClient, createAnonClient } = require("./_lib/supabase-admin");
const { hashOwnerPin, signOwnerSession } = require("./_lib/owner-session");
const { serializeCookie } = require("./_lib/cookies");
const { checkRateLimit } = require("./_lib/rate-limit");
const { readJson } = require("./_lib/request");

const MAX_FAILS = 5;
const LOCK_MINUTES = 10;
const COOKIE_NAME = "dork_owner_session";

module.exports = async (req, res) => {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", { maxAge: 0 }));
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const allowed = await checkRateLimit(req, "owner-auth", 10);
    if (!allowed) {
      res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة", code: "err_rate_limit" });
      return;
    }

    const { phone, pin } = await readJson(req);
    if (!phone || !pin) {
      res.status(400).json({ error: "رقم الهاتف والرقم السري مطلوبان" });
      return;
    }

    const sb = createAdminClient();
    const { data: salon, error } = await sb
      .from("salons")
      .select("id,name,owner,phone,owner_phone,owner_email,status,banned,frozen,owner_pin_hash,owner_pin_fails,owner_pin_locked_until")
      .or(`phone.eq.${phone},owner_phone.eq.${phone}`)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (error || !salon) {
      res.status(401).json({ error: "صالون غير موجود أو غير مفعّل", code: "err_not_found" });
      return;
    }
    if (salon.banned) {
      res.status(401).json({ error: "هذا الصالون محظور", code: "err_banned" });
      return;
    }
    if (salon.frozen) {
      res.status(401).json({ error: "هذا الصالون مجمّد مؤقتًا", code: "err_frozen" });
      return;
    }
    if (!salon.owner_pin_hash) {
      res.status(401).json({ error: "لا يوجد رقم سري مضبوط لهذا الصالون، تواصل مع الإدارة", code: "err_no_pin" });
      return;
    }

    const lockedUntil = salon.owner_pin_locked_until ? new Date(salon.owner_pin_locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      const remainingMs = lockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      res.status(429).json({ error: "تم قفل الدخول مؤقتًا", code: "err_locked", remainingMinutes });
      return;
    }

    const givenHash = await hashOwnerPin(String(pin), String(salon.id));
    if (givenHash !== salon.owner_pin_hash) {
      const fails = (salon.owner_pin_fails || 0) + 1;
      const update = { owner_pin_fails: fails };
      if (fails >= MAX_FAILS) {
        update.owner_pin_fails = 0;
        update.owner_pin_locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      }
      await sb.from("salons").update(update).eq("id", salon.id);
      res.status(401).json({ error: "رقم سري غير صحيح", code: "err_pin_wrong" });
      return;
    }

    await sb.from("salons").update({ owner_pin_fails: 0, owner_pin_locked_until: null }).eq("id", salon.id);

    // إصدار Supabase Session للصالونات التي عندها owner_email (فشل صامت — الكوكي يكفي)
    let sessionTokens = null;
    if (salon.owner_email) {
      try {
        const { data: linkData } = await sb.auth.admin.generateLink({
          type: "magiclink",
          email: salon.owner_email,
        });
        const otp = linkData?.properties?.email_otp;
        if (otp) {
          const { data: sessionData } = await createAnonClient().auth.verifyOtp({
            email: salon.owner_email,
            token: otp,
            type: "email",
          });
          if (sessionData?.session) {
            sessionTokens = {
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
            };
          }
        }
      } catch { /* فشل صامت */ }
    }

    const cookie = serializeCookie(COOKIE_NAME, await signOwnerSession(salon.id), {
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.VERCEL_ENV !== "development",
    });
    res.setHeader("Set-Cookie", cookie);

    // تسجيل حدث الدخول في audit_log — نقطة 59
    sb.from("admin_audit_log").insert({
      actor: `salon:${salon.id}`,
      action: "salon.login",
      target_type: "salon",
      target_id: String(salon.id),
      details: { ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null },
    }).catch(() => {});

    res.status(200).json({ id: salon.id, name: salon.name, owner: salon.owner, ...sessionTokens });
  } catch (e) {
    console.error("[owner-auth] error:", e?.message ?? e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
