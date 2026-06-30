const { createAdminClient } = require("./supabase-admin");

// تسجيل أخطاء API في admin_audit_log — نقطة 53
async function logApiError(endpoint, error, req) {
  try {
    const sb = createAdminClient();
    await sb.from("admin_audit_log").insert({
      actor: "system",
      action: "api.error",
      target_type: "api",
      target_id: endpoint,
      details: {
        message: error?.message || String(error),
        ip: req?.headers?.["x-forwarded-for"] || null,
        method: req?.method || null,
      },
    });
  } catch { /* فشل صامت — لا نكسر الرد بسبب logging */ }
}

module.exports = { logApiError };
