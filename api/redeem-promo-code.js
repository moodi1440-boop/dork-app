const { createAdminClient } = require("./_lib/supabase-admin");
const { checkRateLimit } = require("./_lib/rate-limit");
const { readJson } = require("./_lib/request");

// promo_codes جدول أكواد خصم عامة مشتركة (بلا عمود salon_id) — التعديل عليه
// (بدء عدّاد الصلاحية، زيادة عدد الاستخدامات) كان يصير مباشرة من المتصفح
// بمفتاح anon بلا أي تحقق بالسيرفر، يعني أي شخص يقدر يتلاعب بالعداد أو
// يستهلك الكود لأي صالون بدون ما يطبّقه فعلياً. هذا المسار ينقل التحقق
// والتعديل كامل للسيرفر (نفس نمط submit-review.js).
const SAFE_SELECT = "id,code,active,code_type,wa_credits,duration_days,expires_at,max_uses,used_count";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const allowed = await checkRateLimit(req, "redeem-promo-code", 20);
    if (!allowed) {
      res.status(429).json({ error: "طلبات كثيرة جداً، أعد المحاولة بعد دقيقة" });
      return;
    }

    const body = await readJson(req);
    const sb = createAdminClient();

    if (body.action === "check") {
      const code = String(body.code || "").trim().toUpperCase();
      const pkg = String(body.pkg || "");
      if (!code) { res.status(400).json({ error: "أدخل الكود أولاً" }); return; }

      const { data: row } = await sb.from("promo_codes").select(SAFE_SELECT).eq("code", code).eq("active", true).limit(1).maybeSingle();
      if (!row) { res.status(404).json({ error: "الكود غير صحيح أو منتهي" }); return; }
      if (row.expires_at && new Date(row.expires_at) < new Date()) { res.status(410).json({ error: "الكود منتهي الصلاحية" }); return; }
      if (row.max_uses !== null && row.used_count >= row.max_uses) { res.status(410).json({ error: "الكود استُهلك بالكامل" }); return; }
      if (row.code_type === "whatsapp" && pkg !== "gold") { res.status(400).json({ error: "هذا الكود خاص بباقة الواتساب فقط" }); return; }
      if (row.code_type === "app" && pkg === "gold") { res.status(400).json({ error: "هذا الكود لا يعمل مع باقة الواتساب" }); return; }

      // بدء عدّاد الصلاحية عند أول معاينة للكود (نفس السلوك السابق)
      let expiresAt = row.expires_at;
      if (row.duration_days && !row.expires_at) {
        expiresAt = new Date(Date.now() + row.duration_days * 86400000).toISOString();
        try { await sb.from("promo_codes").update({ expires_at: expiresAt }).eq("id", row.id); } catch { /* فشل صامت — لا يمنع عرض الكود للمستخدم */ }
      }

      res.status(200).json({ ...row, expires_at: expiresAt });
      return;
    }

    if (body.action === "redeem") {
      const id = Number(body.id);
      if (!id) { res.status(400).json({ error: "بيانات ناقصة" }); return; }

      const { data: row } = await sb.from("promo_codes").select("id,used_count").eq("id", id).maybeSingle();
      if (!row) { res.status(404).json({ error: "الكود غير موجود" }); return; }

      const { error } = await sb.from("promo_codes").update({ used_count: (row.used_count || 0) + 1 }).eq("id", id);
      if (error) { res.status(500).json({ error: error.message }); return; }

      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "action غير معروف" });
  } catch (e) {
    console.error("[redeem-promo-code] error:", e?.message ?? e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
