// Dork App - Supabase API Configuration

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const SUPABASE_ANON = "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

// Supabase JS client for Realtime subscriptions
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Generic Supabase REST API function
async function sb(table, method, body, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export {
  supabase,
  sb,
  SUPABASE_URL,
  SUPABASE_ANON
};
