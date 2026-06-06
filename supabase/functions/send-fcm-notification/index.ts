import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── Config self-validation ────────────────────────────────────────────────────
function validateConfig(): { ok: boolean; error?: string } {
  if (!Deno.env.get("FIREBASE_PROJECT_ID")) {
    return { ok: false, error: "Missing FIREBASE_PROJECT_ID environment variable" };
  }
  if (!Deno.env.get("FIREBASE_CLIENT_EMAIL")) {
    return { ok: false, error: "Missing FIREBASE_CLIENT_EMAIL secret" };
  }
  if (!Deno.env.get("FIREBASE_PRIVATE_KEY")) {
    return { ok: false, error: "Missing FIREBASE_PRIVATE_KEY secret" };
  }
  return { ok: true };
}

// ── Token sanity check ────────────────────────────────────────────────────────
function isValidToken(token: string): boolean {
  return typeof token === "string" && token.trim().length >= 20;
}

function cleanTokens(raw: string[], label: string): string[] {
  const valid = raw.filter(isValidToken);
  const skipped = raw.length - valid.length;
  if (skipped > 0) console.warn(`[${label}] skipped ${skipped} empty/malformed token(s)`);
  return valid;
}

// ── JWT + OAuth2 via Web Crypto (no external deps) ────────────────────────────
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
  const privateKey  = Deno.env.get("FIREBASE_PRIVATE_KEY")!;
  const now = Math.floor(Date.now() / 1000);

  const b64url = (obj: object): string =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header  = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss:   clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  });

  const sigInput = `${header}.${payload}`;

  const pem    = privateKey.replace(/\\n/g, "\n");
  const b64    = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const keyBuf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );

  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(sigInput),
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${sigInput}.${sig}`,
  });

  if (!res.ok) throw new Error(`OAuth2 failed: ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token as string;
}

// ── Send a single FCM v1 message ─────────────────────────────────────────────
async function sendOne(
  accessToken: string,
  projectId:   string,
  deviceToken: string,
  title:       string,
  body:        string,
  data:        Record<string, string>,
): Promise<{ ok: boolean; token: string; error?: string; statusCode?: number }> {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title, body },
            data,
            webpush: {
              headers: { Urgency: "high" },
              notification: {
                title, body,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                requireInteraction: true,
                vibrate: [200, 100, 200],
                tag: data.type ?? "dork-notification",
              },
              fcmOptions: { link: "/" },
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`FCM failed [${deviceToken.slice(-8)}]:`, err);
      return { ok: false, token: deviceToken, error: err, statusCode: res.status };
    }

    return { ok: true, token: deviceToken };
  } catch (e: any) {
    console.error(`FCM exception [${deviceToken.slice(-8)}]:`, e.message);
    return { ok: false, token: deviceToken, error: e.message };
  }
}

// ── Batch helper: process array in chunks ─────────────────────────────────────
async function sendBatch(
  tokens:      string[],
  accessToken: string,
  projectId:   string,
  title:       string,
  body:        string,
  data:        Record<string, string>,
  chunkSize = 50,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  let sent = 0, failed = 0;
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk   = tokens.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map((t) => sendOne(accessToken, projectId, t, title, body, data)),
    );
    for (const r of results) {
      if (r.ok) {
        sent++;
      } else {
        failed++;
        // 403 = wrong project / permission denied, 404 = token unregistered
        if (r.statusCode === 403 || r.statusCode === 404) {
          invalidTokens.push(r.token);
        }
      }
    }

    if (i + chunkSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { sent, failed, invalidTokens };
}

// ── Edge Function entry point ─────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  // ── Auth gate ─────────────────────────────────────────────────────────────
  // Two caller types:
  //   pg_cron   → sends  x-cron-token: <CRON_SECRET>
  //   frontend  → sends  Authorization: Bearer <user-jwt>  (no x-cron-token)
  //
  // Rule: if x-cron-token is present it MUST match CRON_SECRET → else 403.
  //       if x-cron-token is absent  the request is a frontend call → pass through.
  const incomingToken = req.headers.get("x-cron-token");
  if (incomingToken !== null) {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    if (!cronSecret || incomingToken !== cronSecret) {
      console.warn("Auth: invalid x-cron-token rejected");
      return json({ success: false, error: "Forbidden" }, 403);
    }
  }

  // ── Config gate ───────────────────────────────────────────────────────────
  const cfg = validateConfig();
  if (!cfg.ok) {
    console.error("Config validation failed:", cfg.error);
    return json({ success: false, error: cfg.error }, 500);
  }

  try {
    const payload    = await req.json() as any;
    const targetType = payload?.target_type as string;
    const title      = payload?.title as string;
    const body       = payload?.body  as string;

    if (!title || !body) {
      return json({ success: false, error: "title and body are required" }, 400);
    }

    const notifData: Record<string, string> = {
      timestamp: new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(payload?.data ?? {}).map(([k, v]) => [k, String(v)]),
      ),
    };

    const supabase  = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID")!;

    // ── Route: single vs broadcast ────────────────────────────────────────
    if (targetType === "single") {
      // ── Single user (booking accepted / rejected) ─────────────────────
      const { user_id, user_type = "customer" } = payload;

      if (!user_id) {
        return json({ success: false, error: "user_id is required for target_type=single" }, 400);
      }

      const { data: rows, error } = await supabase
        .from("fcm_tokens")
        .select("device_token")
        .eq("user_type", user_type)
        .eq("user_id",   user_id)
        .eq("is_active", true);

      if (error) {
        console.error("Token fetch error:", error.message);
        return json({ success: false, error: error.message }, 500);
      }

      console.log(`[single:${user_type}:${user_id}] found ${rows?.length ?? 0} token row(s)`);

      const tokens = cleanTokens(
        (rows ?? []).map((r: any) => r.device_token as string),
        `single:${user_type}:${user_id}`,
      );

      if (tokens.length === 0) {
        console.log(`[single:${user_type}:${user_id}] no active token — skipping`);
        return json({ success: true, target_type: "single", sent: 0, message: "No active token for user" });
      }

      const accessToken = await getAccessToken();
      const { sent, failed, invalidTokens } = await sendBatch(tokens, accessToken, projectId, title, body, notifData);
      console.log(`[single:${user_type}:${user_id}] sent=${sent} failed=${failed}`);
      if (invalidTokens.length > 0) {
        await supabase.from("fcm_tokens").update({ is_active: false }).in("device_token", invalidTokens);
        console.log(`[single] deactivated ${invalidTokens.length} invalid token(s)`);
      }
      return json({ success: true, target_type: "single", sent, failed });

    } else if (targetType === "broadcast") {
      // ── Broadcast to all customers of a salon ─────────────────────────
      const { salon_id } = payload;

      if (!salon_id) {
        return json({ success: false, error: "salon_id is required for target_type=broadcast" }, 400);
      }

      // bookings.salon_id is stored as text; cast to string to avoid type mismatch
      const salonIdStr = String(salon_id);

      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("customer_id")
        .eq("salon_id", salonIdStr)
        .not("customer_id", "is", null);

      if (bErr) {
        console.error("Bookings fetch error:", bErr.message);
        return json({ success: false, error: bErr.message }, 500);
      }

      const customerIds = [
        ...new Set((bookings ?? []).map((b: any) => b.customer_id)),
      ];

      console.log(`[broadcast:salon:${salonIdStr}] ${customerIds.length} distinct customer(s) found`);

      if (customerIds.length === 0) {
        return json({ success: true, target_type: "broadcast", sent: 0, customers_found: 0, message: "No customers found for salon" });
      }

      const { data: tokenRows, error: tErr } = await supabase
        .from("fcm_tokens")
        .select("device_token")
        .eq("user_type", "customer")
        .eq("is_active", true)
        .in("user_id", customerIds);

      if (tErr) {
        console.error("Token fetch error:", tErr.message);
        return json({ success: false, error: tErr.message }, 500);
      }

      console.log(`[broadcast:salon:${salonIdStr}] ${tokenRows?.length ?? 0} token row(s) found`);

      const tokens = cleanTokens(
        (tokenRows ?? []).map((r: any) => r.device_token as string),
        `broadcast:salon:${salonIdStr}`,
      );

      if (tokens.length === 0) {
        return json({ success: true, target_type: "broadcast", sent: 0, customers_found: customerIds.length, message: "No active tokens for salon customers" });
      }

      const accessToken = await getAccessToken();
      const { sent, failed, invalidTokens } = await sendBatch(tokens, accessToken, projectId, title, body, notifData);
      if (invalidTokens.length > 0) {
        await supabase.from("fcm_tokens").update({ is_active: false }).in("device_token", invalidTokens);
        console.log(`[broadcast:salon:${salonIdStr}] deactivated ${invalidTokens.length} invalid token(s)`);
      }
      return json({ success: true, target_type: "broadcast", sent, failed, customers_found: customerIds.length });

    } else {
      return json({
        success: false,
        error: `Unknown target_type: "${targetType}". Expected "single" or "broadcast"`,
      }, 400);
    }

  } catch (e: any) {
    console.error("Handler error:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────
function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
