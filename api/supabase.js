import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.SUPABASE_URL  || "https://kowotztbxgoodvnjyxyq.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON || "sb_publishable_FZoSBhhAiKi8cefVUyg2eQ_GqUTlTg2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
