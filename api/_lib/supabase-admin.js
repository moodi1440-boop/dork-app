const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const SUPABASE_ANON = "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

module.exports = { createAdminClient, createAnonClient };
