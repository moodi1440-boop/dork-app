import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { device_token, user_type, user_id } = await req.json() as any;

    if (typeof device_token !== "string" || device_token.trim().length < 20) {
      return json({ success: false, error: "Invalid device_token" }, 400);
    }
    if (!["salon", "customer"].includes(user_type)) {
      return json({ success: false, error: "Invalid user_type" }, 400);
    }
    const uid = Number(user_id);
    if (!uid || isNaN(uid)) {
      return json({ success: false, error: "Invalid user_id" }, 400);
    }

    // Verify user exists — prevents fake user_id injection
    const table = user_type === "salon" ? "owners" : "customers";
    const { data: userRow, error: userErr } = await supabase
      .from(table)
      .select("id")
      .eq("id", uid)
      .single();

    if (userErr || !userRow) {
      console.warn(`[register-fcm-token] user not found [${user_type}:${uid}]`);
      return json({ success: false, error: "User not found" }, 404);
    }

    // Replace: delete all old tokens for this user, insert fresh one
    await supabase.from("fcm_tokens").delete()
      .eq("user_type", user_type)
      .eq("user_id", uid);

    const { error: insertErr } = await supabase.from("fcm_tokens").insert({
      user_type,
      user_id: uid,
      device_token: device_token.trim(),
      is_active: true,
    });

    if (insertErr) {
      console.error(`[register-fcm-token] insert error:`, insertErr.message);
      return json({ success: false, error: insertErr.message }, 500);
    }

    console.log(`[register-fcm-token] OK [${user_type}:${uid}]`);
    return json({ success: true });

  } catch (e: any) {
    console.error("[register-fcm-token] exception:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
