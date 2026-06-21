const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://ywrlhvzfefvyogfxfdhl.supabase.co";

function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

module.exports = { createAdminClient };
