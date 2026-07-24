// عميل Supabase ودالة الاتصال الأساسية بالـREST API — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://kowotztbxgoodvnjyxyq.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "sb_publishable_FZoSBhhAiKi8cefVUyg2eQ_GqUTlTg2";

// Supabase JS client — autoRefreshToken يُجدّد JWT تلقائياً قبل انتهائه
// إعدادات Dashboard المطلوبة: Auth → JWT expiry = 3600s، Enable reuse detection = ON
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Circuit Breaker — نقطة 25: توقف بعد 3 فشل متتاليين، انتظر 30 ثانية
const _cb = { fails: 0, openUntil: 0 };

export async function sb(table, method, body, query = "", authToken = null) {
  if (_cb.openUntil > Date.now()) {
    throw new Error("circuit_open");
  }
  if (!authToken) {
    try {
      const { data } = await supabase.auth.getSession();
      authToken = data?.session?.access_token || null;
    } catch {}
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${authToken || SUPABASE_ANON}`,
        "Content-Type": "application/json",
        "Prefer": method === "POST" ? "return=representation" : "return=minimal",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (++_cb.fails >= 3) { _cb.openUntil = Date.now() + 30_000; _cb.fails = 0; }
    throw e;
  }
  if (!res.ok) {
    const err = await res.text();
    if (++_cb.fails >= 3) { _cb.openUntil = Date.now() + 30_000; _cb.fails = 0; }
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }
  _cb.fails = 0;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export async function ownerApi(method, body) {
  const res = await fetch("/api/owner-salon", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `owner-salon ${method} failed`);
  return data;
}
