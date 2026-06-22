const { createAdminClient } = require("./_lib/supabase-admin");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const salonId = Number(body.salonId);
    if (!salonId || isNaN(salonId)) {
      res.status(400).json({ error: "Invalid salonId" });
      return;
    }

    const sb = createAdminClient();
    const { error } = await sb
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("salon_id", salonId)
      .eq("from_admin", true)
      .is("read_at", null);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[mark-messages-read] error:", e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
