const { createAdminClient } = require("./_lib/supabase-admin");
const { verifyOwnerSession } = require("./_lib/owner-session");
const { parseCookies } = require("./_lib/cookies");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function getSalonId(req) {
  const cookies = parseCookies(req);
  return verifyOwnerSession(cookies["dork_owner_session"]);
}

module.exports = async (req, res) => {
  const salonId = await getSalonId(req);
  if (!salonId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }

  const sb = createAdminClient();

  // GET: قائمة المحادثات أو رسائل محادثة محددة
  if (req.method === "GET") {
    const { customerId, bookingId, list } = req.query;

    if (list === "1") {
      // آخر رسالة لكل محادثة (customer_id + booking_id) في هذا الصالون فقط
      const { data, error } = await sb
        .from("customer_messages")
        .select("id,customer_id,booking_id,from_customer,text,created_at,read_at")
        .eq("salon_id", Number(salonId))
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) { res.status(500).json({ error: error.message }); return; }

      // نجمع آخر رسالة لكل (customer_id, booking_id)
      const seen = new Map();
      for (const msg of (data || [])) {
        const key = `${msg.customer_id}-${msg.booking_id}`;
        if (!seen.has(key)) seen.set(key, msg);
      }
      res.status(200).json([...seen.values()]);
      return;
    }

    // رسائل محادثة محددة — salon_id + customer_id + booking_id
    const cId = Number(customerId);
    const bId = Number(bookingId);
    if (!cId || !bId) {
      res.status(400).json({ error: "customerId و bookingId مطلوبان" });
      return;
    }

    const { data, error } = await sb
      .from("customer_messages")
      .select("id,salon_id,customer_id,booking_id,from_customer,text,created_at,read_at")
      .eq("salon_id", Number(salonId))
      .eq("customer_id", cId)
      .eq("booking_id", bId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) { res.status(500).json({ error: error.message }); return; }

    // تعليم رسائل العميل كمقروءة
    await sb
      .from("customer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("salon_id", Number(salonId))
      .eq("customer_id", cId)
      .eq("booking_id", bId)
      .eq("from_customer", true)
      .is("read_at", null);

    res.status(200).json(data || []);
    return;
  }

  // POST: رد المالك على عميل محدد
  if (req.method === "POST") {
    const body = await readJson(req);
    const customerId = Number(body.customerId);
    const bookingId  = Number(body.bookingId);
    const text       = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";

    if (!customerId || !bookingId || !text) {
      res.status(400).json({ error: "بيانات ناقصة" });
      return;
    }

    const { data, error } = await sb
      .from("customer_messages")
      .insert({
        salon_id:      Number(salonId),
        customer_id:   customerId,
        booking_id:    bookingId,
        from_customer: false,
        text,
      })
      .select("id,salon_id,customer_id,booking_id,from_customer,text,created_at,read_at")
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json(data);
    return;
  }

  res.status(405).json({ error: "method not allowed" });
};
