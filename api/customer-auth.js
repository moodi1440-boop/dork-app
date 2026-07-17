const { createAdminClient, createAnonClient } = require("./_lib/supabase-admin");
const { hashCustomerPin } = require("./_lib/customer-session");
const { checkRateLimit } = require("./_lib/rate-limit");
const { readJson } = require("./_lib/request");

const MAX_FAILS = 5;
const LOCK_MINUTES = 10;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);

    // تحديد الرمز السري (أول مرة أو تغييره) — العميل أصلاً بجلسة محلية موثوقة
    // بنفس مستوى الثقة الحالي بباقي عمليات التطبيق (id يُمرَّر من الواجهة)
    if (body.action === "set_pin") {
      const allowed = await checkRateLimit(req, "customer-auth-set", 10);
      if (!allowed) {
        res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة", code: "err_rate_limit" });
        return;
      }
      const { customerId, pin } = body;
      if (!customerId || !pin) {
        res.status(400).json({ error: "بيانات ناقصة" });
        return;
      }
      const sbSet = createAdminClient();
      const { data: existing } = await sbSet
        .from("customers")
        .select("pin_hash")
        .eq("id", customerId)
        .maybeSingle();
      const newHash = await hashCustomerPin(String(pin), String(customerId));
      if (existing?.pin_hash && newHash === existing.pin_hash) {
        res.status(400).json({ error: "الرمز السري الجديد يجب أن يختلف عن الرمز السابق", code: "err_same_pin" });
        return;
      }
      const { error: setErr } = await sbSet
        .from("customers")
        .update({ pin_hash: newHash, pin_fails: 0, pin_locked_until: null })
        .eq("id", customerId);
      if (setErr) {
        res.status(500).json({ error: setErr.message });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    const allowed = await checkRateLimit(req, "customer-auth", 10);
    if (!allowed) {
      res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة", code: "err_rate_limit" });
      return;
    }

    const { phone, pin } = body;
    if (!phone || !pin) {
      res.status(400).json({ error: "رقم الجوال والرمز السري مطلوبان" });
      return;
    }

    const sb = createAdminClient();
    const { data: customer, error } = await sb
      .from("customers")
      .select("id,name,phone,email,blocked,pin_hash,pin_fails,pin_locked_until")
      .eq("phone", phone)
      .maybeSingle();

    if (error || !customer) {
      res.status(401).json({ error: "لا يوجد حساب بهذا الرقم", code: "err_not_found" });
      return;
    }
    if (customer.blocked) {
      res.status(401).json({ error: "هذا الحساب محظور", code: "err_banned" });
      return;
    }
    if (!customer.pin_hash) {
      // العميل لسا ما فعّل التحقق الجديد بالسيرفر (حساب قديم قبل هذا التحديث)
      res.status(401).json({ error: "يلزم إعادة ضبط الرمز السري", code: "err_no_pin" });
      return;
    }

    const lockedUntil = customer.pin_locked_until ? new Date(customer.pin_locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      const remainingMs = lockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      res.status(429).json({ error: "تم قفل الدخول مؤقتًا", code: "err_locked", remainingMinutes });
      return;
    }

    const givenHash = await hashCustomerPin(String(pin), String(customer.id));
    if (givenHash !== customer.pin_hash) {
      const fails = (customer.pin_fails || 0) + 1;
      const update = { pin_fails: fails };
      if (fails >= MAX_FAILS) {
        update.pin_fails = 0;
        update.pin_locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      }
      await sb.from("customers").update(update).eq("id", customer.id);
      res.status(401).json({ error: "رمز سري غير صحيح", code: "err_pin_wrong" });
      return;
    }

    await sb.from("customers").update({ pin_fails: 0, pin_locked_until: null }).eq("id", customer.id);

    // إصدار جلسة Supabase حقيقية — نفس حيلة owner-auth.js، لكن ببريد اصطناعي
    // ثابت لكل عميل إن لم يكن عنده بريد حقيقي (تجنّباً لتكلفة SMS OTP حالياً)
    const authEmail = customer.email && customer.email.includes("@")
      ? customer.email
      : `customer-${customer.id}@dork.internal`;

    let sessionTokens = null;
    try {
      // نوع "recovery" مقصود وليس "magiclink" — يستخدم خانة توكن منفصلة بالكامل
      // بقاعدة GoTrue، لأن "magiclink" هي نفس الخانة التي يستخدمها signInWithOtp()
      // بشاشات "نسيت الرمز السري" (تسجيل/استرجاع)، وأي توليد صامت هنا كان يُبطل
      // صمتاً كود OTP الذي ينتظره المستخدم بصندوق بريده لنفس البريد (راجع تقرير-أمان-RLS.md)
      const { data: linkData } = await sb.auth.admin.generateLink({
        type: "recovery",
        email: authEmail,
      });
      const otp = linkData?.properties?.email_otp;
      if (otp) {
        const { data: sessionData } = await createAnonClient().auth.verifyOtp({
          email: authEmail,
          token: otp,
          type: "recovery",
        });
        if (sessionData?.session) {
          sessionTokens = {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          };
          if (!customer.auth_uid && sessionData.user?.id) {
            await sb.from("customers").update({ auth_uid: sessionData.user.id }).eq("id", customer.id);
          }
        }
      }
    } catch { /* فشل صامت — نفس منطق owner-auth.js، الكوكي/الجلسة المحلية تكفي */ }

    Promise.resolve(sb.from("admin_audit_log").insert({
      actor: `customer:${customer.id}`,
      action: "customer.login",
      target_type: "customer",
      target_id: String(customer.id),
      details: { ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null },
    })).catch(() => {});

    res.status(200).json({
      id: customer.id, name: customer.name, phone: customer.phone, email: customer.email,
      ...sessionTokens,
    });
  } catch (e) {
    console.error("[customer-auth] error:", e?.message ?? e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
