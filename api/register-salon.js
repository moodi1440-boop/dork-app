const { createAdminClient } = require("./_lib/supabase-admin");
const { hashOwnerPin } = require("./_lib/owner-session");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function toDbSalon(s) {
  return {
    name: s.name, owner: s.owner, owner_phone: s.ownerPhone,
    region: s.region, gov: s.gov, center: s.center, village: s.village,
    phone: s.phone, address: s.address, location_url: s.locationUrl,
    services: s.services, prices: s.prices,
    shift_enabled: s.shiftEnabled,
    shift1_start: s.shift1Start, shift1_end: s.shift1End,
    shift2_start: s.shift2Start, shift2_end: s.shift2End,
    work_start: s.workStart, work_end: s.workEnd,
    barbers: s.barbers, tone: s.tone,
    status: "pending",
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const pin = String(body.pin || "").trim();

    if (!body.name?.trim() || !body.owner?.trim() || !body.ownerPhone?.trim() ||
        !body.phone?.trim() || !body.address?.trim() || !body.region || !body.gov ||
        !Array.isArray(body.services) || !body.services.length) {
      res.status(400).json({ error: "بيانات التسجيل غير مكتملة" });
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({ error: "الرقم السري يجب أن يكون 6 أرقام" });
      return;
    }

    const sb = createAdminClient();
    const { data, error } = await sb.from("salons").insert(toDbSalon(body)).select("id").single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const owner_pin_hash = await hashOwnerPin(pin, data.id);
    await sb.from("salons").update({ owner_pin_hash }).eq("id", data.id);

    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    console.error("[register-salon] error:", e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
