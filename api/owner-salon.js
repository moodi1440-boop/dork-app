const { createAdminClient } = require("./_lib/supabase-admin");
const { hashOwnerPin } = require("./_lib/owner-session");
const { readJson, getSalonId } = require("./_lib/request");

// الحقول التي يملك صاحب الصالون صلاحية تعديلها بنفسه. أي حقل آخر (status,
// banned, frozen, rating, total_paid, owner, owner_phone...) يبقى بيد الإدارة فقط.
const OWNER_EDITABLE_FIELDS = [
  "name", "phone", "address", "location_url", "welcome_msg", "closed_days",
  "slot_min", "cancellation_window", "services", "prices", "barbers",
  "shift_enabled", "work_start", "work_end", "shift1_start", "shift1_end",
  "shift2_start", "shift2_end", "tone", "social",
];

module.exports = async (req, res) => {
  const salonId = await getSalonId(req);
  if (!salonId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const sb = createAdminClient();

  if (req.method === "GET") {
    const { data, error } = await sb.from("salons").select("id,name,owner,owner_phone,owner_email,region,gov,center,village,phone,address,location_url,services,prices,shift_enabled,shift1_start,shift1_end,shift2_start,shift2_end,work_start,work_end,barbers,tone,rating,status,paused,frozen,banned,welcome_msg,closed_days,slot_min,cancellation_window,total_paid,social,created_at").eq("id", salonId).single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    delete data.owner_pin_hash;
    res.status(200).json(data);
    return;
  }

  if (req.method === "PATCH") {
    try {
      const rawBody = await readJson(req);
      const body = {};
      for (const field of OWNER_EDITABLE_FIELDS) {
        if (field in rawBody) body[field] = rawBody[field];
      }
      if (typeof rawBody.new_pin === "string") {
        const pin = rawBody.new_pin.trim();
        if (!/^\d{6}$/.test(pin)) {
          res.status(400).json({ error: "الرقم السري يجب أن يكون 6 أرقام" });
          return;
        }
        body.owner_pin_hash = await hashOwnerPin(pin, salonId);
      }

      const { error } = await sb.from("salons").update(body).eq("id", salonId);
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[owner-salon] error:", e);
      res.status(500).json({ error: "خطأ بالسيرفر" });
    }
    return;
  }

  res.status(405).json({ error: "method not allowed" });
};
