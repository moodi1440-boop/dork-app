import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { subscription, user_type, user_id } = await req.json() as any;

    if (!subscription?.endpoint) return json({ success: false, error: "Invalid subscription" }, 400);
    if (!["salon", "customer"].includes(user_type)) return json({ success: false, error: "Invalid user_type" }, 400);
    const uid = Number(user_id);
    if (!uid || isNaN(uid)) return json({ success: false, error: "Invalid user_id" }, 400);

    const table = user_type === "salon" ? "salons" : "customers";
    const { data: userRow } = await supabase.from(table).select("id").eq("id", uid).single();
    if (!userRow) return json({ success: false, error: "User not found" }, 404);

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_type,
      user_id: uid,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? "",
      auth_key: subscription.keys?.auth ?? "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    if (error) {
      console.error("[register-push-sub] upsert error:", error.message);
      return json({ success: false, error: error.message }, 500);
    }

    console.log(`[register-push-sub] OK [${user_type}:${uid}]`);
    return json({ success: true });

  } catch (e: any) {
    console.error("[register-push-sub] exception:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
