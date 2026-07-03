const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL  = process.env.SUPABASE_URL  || "https://kowotztbxgoodvnjyxyq.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd290enRieGdvb2R2bmp5eHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDM1MzAsImV4cCI6MjA5ODQxOTUzMH0.Dr8uaT9cDVrTcCGGJyRBJZEEwTpFs5V3NlS6aI6GXeY";

function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

module.exports = { createAdminClient, createAnonClient };
