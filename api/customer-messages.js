const { createAdminClient } = require("./_lib/supabase-admin");
const { readJson } = require("./_lib/request");

module.exports = async (req, res) => {
  // تعليم رسائل الإدارة (جدول messages، منفصل عن customer_messages) كمقروءة —
  // مدمَج هنا لتقليل عدد ملفات api/ (حد Vercel Hobby: 12 دالة سيرفرلس كحد أقصى)
  if (req.method === "POST" && req.query.markAdminRead === "1") {
    try {
      const body = await readJson(req);
      const adminSalonId = Number(body.salonId);
      if (!adminSalonId || isNaN(adminSalonId)) {
        res.status(400).json({ error: "Invalid salonId" });
        return;
      }
      const sb = createAdminClient();
      const { error } = await sb
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("salon_id", adminSalonId)
        .eq("from_admin", true)
        .is("read_at", null);
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[customer-messages:markAdminRead] error:", e);
      res.status(500).json({ error: "خطأ بالسيرفر" });
    }
    return;
  }

  const salonId    = Number(req.query.salonId);
  const customerId = Number(req.query.customerId);
  const bookingId  = Number(req.query.bookingId) || null;

  // عدد الرسائل غير المقروءة من الصالون لكل booking (للعميل)
  if (req.method === "GET" && req.query.unreadByBooking === "1") {
    if (!customerId) { res.status(400).json({ error: "customerId مطلوب" }); return; }
    const sb = createAdminClient();
    const { data } = await sb
      .from("customer_messages")
      .select("salon_id")
      .eq("customer_id", customerId)
      .eq("from_customer", false)
      .is("read_at", null)
      .limit(200);
    const counts = {};
    for (const m of (data || [])) {
      if (m.salon_id) counts[m.salon_id] = (counts[m.salon_id] || 0) + 1;
    }
    res.status(200).json(counts);
    return;
  }

  if (!salonId || !customerId) {
    res.status(400).json({ error: "salonId و customerId مطلوبان" });
    return;
  }

  const sb = createAdminClient();

  // PATCH: العميل يفتح الدردشة → تعليم رسائل الصالون كمقروءة
  if (req.method === "PATCH") {
    let q = sb
      .from("customer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("salon_id", salonId)
      .eq("customer_id", customerId)
      .eq("from_customer", false)
      .is("read_at", null);
    // لا نفلتر بـ booking_id — نعلّم كل رسائل الصالون لهذا العميل كمقروءة
    await q;
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  let query = sb
    .from("customer_messages")
    .select("id,from_customer,text,created_at,read_at")
    .eq("salon_id", salonId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true })
    .limit(200);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.status(200).json(data || []);
};
