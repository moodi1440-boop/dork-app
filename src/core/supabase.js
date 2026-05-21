import { createClient } from "@supabase/supabase-js";

// ==============================================
//  SUPABASE CONFIGURATION
// ==============================================

export const SUPABASE_URL = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
export const SUPABASE_ANON = "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

// Supabase JS client for Realtime subscriptions
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ==============================================
//  LOW-LEVEL DATA OPERATIONS (Internal use only)
// ==============================================

export async function sb(table, method, body, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=representation",
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
