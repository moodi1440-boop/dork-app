const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL  = process.env.SUPABASE_URL  || "https://kowotztbxgoodvnjyxyq.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON || "sb_publishable_FZoSBhhAiKi8cefVUyg2eQ_GqUTlTg2";

function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

module.exports = { createAdminClient, createAnonClient };
