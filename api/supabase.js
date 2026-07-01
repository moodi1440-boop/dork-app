import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.SUPABASE_URL  || "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON || "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
