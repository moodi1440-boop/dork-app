const { createAdminClient } = require("./supabase-admin");

function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return fwd ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress || "unknown");
}

// max = أقصى عدد طلبات مسموح بها في الدقيقة لكل IP
// يُعيد true إذا كان الطلب مسموحاً، false إذا تجاوز الحد
async function checkRateLimit(req, endpoint, max = 10) {
  const ip = getIp(req);
  const windowTs = Math.floor(Date.now() / 60_000);

  try {
    const sb = createAdminClient();
    const { data: count } = await sb.rpc("rl_increment", {
      p_ip: ip,
      p_endpoint: endpoint,
      p_window_ts: windowTs,
    });
    return count <= max;
  } catch {
    return true; // fail open — لا نحجب المستخدمين عند خطأ تقني
  }
}

module.exports = { checkRateLimit };
