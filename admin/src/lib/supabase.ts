import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL  = "https://kowotztbxgoodvnjyxyq.supabase.co";
const FALLBACK_KEY  = "sb_publishable_FZoSBhhAiKi8cefVUyg2eQ_GqUTlTg2";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? FALLBACK_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? FALLBACK_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}
