const { createAdminClient } = require("./_lib/supabase-admin");

module.exports = async (req, res) => {
  const salonId    = Number(req.query.salonId);
  const customerId = Number(req.query.customerId);
  const bookingId  = Number(req.query.bookingId) || null;

  // عدد الرسائل غير المقروءة من الصالون لكل booking (للعميل)
  if (req.method === "GET" && req.query.unreadByBooking === "1") {
    if (!customerId) { res.status(400).json({ error: "customerId مطلوب" }); return; }
    const sb = createAdminClient();
    const { data } = await sb
      .from("customer_messages")
      .select("booking_id")
      .eq("customer_id", customerId)
      .eq("from_customer", false)
      .is("read_at", null)
      .limit(200);
    const counts = {};
    for (const m of (data || [])) {
      if (m.booking_id) counts[m.booking_id] = (counts[m.booking_id] || 0) + 1;
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
    if (bookingId) q = q.eq("booking_id", bookingId);
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
    .limit(50);

  if (bookingId) query = query.eq("booking_id", bookingId);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.status(200).json(data || []);
};
