import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL  = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const FALLBACK_KEY  = "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? FALLBACK_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? FALLBACK_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}
