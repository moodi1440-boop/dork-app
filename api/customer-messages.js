const { createAdminClient } = require("./_lib/supabase-admin");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const salonId    = Number(req.query.salonId);
  const customerId = Number(req.query.customerId);
  const bookingId  = Number(req.query.bookingId) || null;

  if (!salonId || !customerId) {
    res.status(400).json({ error: "salonId و customerId مطلوبان" });
    return;
  }

  const sb = createAdminClient();

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
