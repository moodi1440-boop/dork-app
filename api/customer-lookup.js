const { createAdminClient, createAnonClient } = require("./_lib/supabase-admin");
const { checkRateLimit } = require("./_lib/rate-limit");
const { readJson } = require("./_lib/request");

// نفس الأعمدة الآمنة المستخدمة تاريخياً بكل استعلامات العميل من App.jsx
const SAFE_SELECT = "id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at,blocked";

// يستخدَم لثلاث حالات ما زال العميل فيها بلا جلسة موثوقة مطابقة (auth_uid) بعد:
// نسيت الرمز السري (بحث بالبريد)، تسجيل حساب جديد (فحص تكرار الجوال)،
// والدخول عبر Google (بحث بـgoogle_uid) — كلها تحتاج service_role لتتجاوز
// RLS بأمان (Tier 2)، بدل الاعتماد على مفتاح anon المكشوف بالكود المنشور.
async function selfHealAuthUid(sb, customerId, accessToken) {
  if (!accessToken) return;
  try {
    const { data } = await createAnonClient().auth.getUser(accessToken);
    const uid = data?.user?.id;
    if (uid) await sb.from("customers").update({ auth_uid: uid }).eq("id", customerId).is("auth_uid", null);
  } catch { /* فشل صامت — لا يمنع تسجيل الدخول */ }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const allowed = await checkRateLimit(req, "customer-lookup", 20);
    if (!allowed) {
      res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة" });
      return;
    }

    const body = await readJson(req);
    const sb = createAdminClient();

    if (body.action === "by_email") {
      const email = String(body.email || "").trim();
      if (!email) { res.status(400).json({ error: "بيانات ناقصة" }); return; }
      const { data } = await sb.from("customers").select(SAFE_SELECT).ilike("email", email).limit(1).maybeSingle();
      if (data) await selfHealAuthUid(sb, data.id, body.accessToken);
      res.status(200).json({ customer: data || null });
      return;
    }

    if (body.action === "phone_exists") {
      const phone = String(body.phone || "").trim();
      if (!phone) { res.status(400).json({ error: "بيانات ناقصة" }); return; }
      const { data } = await sb.from("customers").select("id").eq("phone", phone).limit(1).maybeSingle();
      res.status(200).json({ exists: !!data });
      return;
    }

    if (body.action === "google_login") {
      // تسجيل الدخول عبر Google يمر بـ Firebase Auth (هوية منفصلة تماماً عن
      // Supabase Auth) — يعني ما فيه auth.uid() حقيقي متاح إطلاقاً من طرف
      // العميل بهذا المسار. نبحث/ننشئ صف العميل هنا، ثم نصدر جلسة Supabase
      // حقيقية بنفس بريد Google (نفس حيلة customer-auth.js) عشان auth_uid
      // ينضبط صح من أول تسجيل دخول، لا يفضل anon للأبد.
      const googleUid = String(body.googleUid || "").trim();
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      if (!googleUid) { res.status(400).json({ error: "بيانات ناقصة" }); return; }

      let { data: customer } = await sb.from("customers").select(SAFE_SELECT).eq("google_uid", googleUid).limit(1).maybeSingle();

      if (!customer) {
        let isBlacklisted = false;
        try {
          const { data: bl } = await sb.rpc("is_blacklisted", { p_phone: "", p_email: email });
          isBlacklisted = bl || false;
        } catch { /* فشل صامت — لا يمنع التسجيل عند خطأ تقني بالفحص نفسه */ }
        if (isBlacklisted) { res.status(403).json({ error: "لا يمكن إنشاء حساب بهذه البيانات", code: "err_blacklisted" }); return; }

        const { data: newRow, error: insErr } = await sb.from("customers")
          .insert({ name, phone: "", email, google_uid: googleUid, history: [], favs: [] })
          .select(SAFE_SELECT).single();
        if (insErr) { res.status(500).json({ error: insErr.message }); return; }
        customer = newRow;
      }

      if (customer.blocked) { res.status(401).json({ error: "هذا الحساب محظور", code: "err_banned" }); return; }

      let sessionTokens = null;
      const authEmail = email && email.includes("@") ? email : `customer-${customer.id}@dork.internal`;
      try {
        const { data: linkData } = await sb.auth.admin.generateLink({ type: "recovery", email: authEmail });
        const otp = linkData?.properties?.email_otp;
        if (otp) {
          const { data: sessionData } = await createAnonClient().auth.verifyOtp({ email: authEmail, token: otp, type: "recovery" });
          if (sessionData?.session) {
            sessionTokens = { access_token: sessionData.session.access_token, refresh_token: sessionData.session.refresh_token };
            if (!customer.auth_uid && sessionData.user?.id) {
              await sb.from("customers").update({ auth_uid: sessionData.user.id }).eq("id", customer.id);
            }
          }
        }
      } catch { /* فشل صامت — الجلسة المحلية تكفي لتسجيل الدخول حتى بدون توكن */ }

      res.status(200).json({ customer, ...sessionTokens });
      return;
    }

    res.status(400).json({ error: "action غير معروف" });
  } catch (e) {
    console.error("[customer-lookup] error:", e?.message ?? e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
