import { createClient } from "@supabase/supabase-js";

export const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kowotztbxgoodvnjyxyq.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_FZoSBhhAiKi8cefVUyg2eQ_GqUTlTg2"
);
