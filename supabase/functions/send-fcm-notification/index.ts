import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── Config self-validation (runs before any processing) ───────────────────────
function validateConfig(): { ok: boolean; error?: string } {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) {
    return { ok: false, error: "Missing FIREBASE_PROJECT_ID environment variable" };
  }

  const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!saJson) {
    return { ok: false, error: "Missing FIREBASE_SERVICE_ACCOUNT secret" };
  }

  let sa: any;
  try {
    sa = JSON.parse(saJson);
  } catch {
    console.error("Invalid JSON format in FIREBASE_SERVICE_ACCOUNT secret");
    return { ok: false, error: "Invalid JSON format in FIREBASE_SERVICE_ACCOUNT secret" };
  }

  for (const field of ["client_email", "private_key", "project_id"]) {
    if (!sa[field]) {
      return { ok: false, error: `FIREBASE_SERVICE_ACCOUNT missing required field: ${field}` };
    }
  }

  return { ok: true };
}

// ── Token sanity check ────────────────────────────────────────────────────────
function isValidToken(token: string): boolean {
  return typeof token === "string" && token.trim().length >= 20;
}

// ── JWT + OAuth2 via Web Crypto (no external deps) ────────────────────────────
async function getAccessToken(): Promise<string> {
  const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!saJson) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret");

  const sa  = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);

  const b64url = (obj: object): string =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header  = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  });

  const sigInput = `${header}.${payload}`;

  const pem   = (sa.private_key as string).replace(/\\n/g, "\n");
  const b64   = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
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

  const jwt = `${sigInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
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
): Promise<{ ok: boolean; token: string; error?: string }> {
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
      return { ok: false, token: deviceToken, error: err };
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
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk   = tokens.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map((t) => sendOne(accessToken, projectId, t, title, body, data)),
    );
    for (const r of results) r.ok ? sent++ : failed++;

    // Brief pause between chunks to avoid burst-rate issues
    if (i + chunkSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { sent, failed };
}

// ── Edge Function entry point ─────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // ── Config gate: fail fast on bad secrets ──────────────────────────────
    const cfg = validateConfig();
    if (!cfg.ok) {
      console.error("Config validation failed:", cfg.error);
      return json({ success: false, error: cfg.error }, 500);
    }

    const reqBody   = await req.json() as any;
    const record    = reqBody?.record;
    const eventType = (reqBody?.type ?? "new_booking") as string;

    if (!record?.salon_id) {
      return json({ success: false, error: "record.salon_id is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID")!;

    // Resolve salon name once
    const { data: salon } = await supabase
      .from("salons").select("id, name")
      .eq("id", record.salon_id).single();

    if (!salon) return json({ success: false, error: "Salon not found" }, 404);

    // ── Resolve targets: { title, body, tokens[] } ──────────────────────────
    type SendJob = { title: string; body: string; tokens: string[] };
    const jobs: SendJob[] = [];

    const fetchTokens = async (
      userType: string,
      userId?: number,
    ): Promise<string[]> => {
      const q = supabase
        .from("fcm_tokens")
        .select("device_token")
        .eq("user_type", userType)
        .eq("is_active", true);
      if (userId !== undefined) q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) { console.error("Token fetch:", error.message); return []; }
      const all    = (data ?? []).map((r: any) => r.device_token as string);
      const valid  = all.filter(isValidToken);
      const bad    = all.length - valid.length;
      if (bad > 0) console.warn(`Skipped ${bad} empty/malformed token(s) for ${userType}:${userId ?? "*"}`);
      return valid;
    };

    if (eventType === "new_booking") {
      const salonTokens = await fetchTokens("salon", record.salon_id);
      if (salonTokens.length)
        jobs.push({
          title:  `✂️ حجز جديد في ${salon.name}`,
          body:   `${record.customer_name} | ${record.time} | ${record.date}`,
          tokens: salonTokens,
        });

      if (record.customer_id) {
        const custTokens = await fetchTokens("customer", record.customer_id);
        if (custTokens.length)
          jobs.push({
            title:  "📋 تم استلام حجزك",
            body:   `في ${salon.name} | ${record.date} | ${record.time}`,
            tokens: custTokens,
          });
      }

    } else if (eventType === "booking_approved") {
      const salonTokens = await fetchTokens("salon", record.salon_id);
      if (salonTokens.length)
        jobs.push({
          title:  "✅ تم تأكيد الحجز",
          body:   `${record.customer_name} | ${record.time}`,
          tokens: salonTokens,
        });

      if (record.customer_id) {
        const custTokens = await fetchTokens("customer", record.customer_id);
        if (custTokens.length)
          jobs.push({
            title:  "✅ تم قبول حجزك!",
            body:   `${salon.name} | ${record.date} | ${record.time}`,
            tokens: custTokens,
          });
      }

    } else if (eventType === "booking_rejected") {
      if (record.customer_id) {
        const custTokens = await fetchTokens("customer", record.customer_id);
        if (custTokens.length)
          jobs.push({
            title:  "❌ تم رفض حجزك",
            body:   `${salon.name} | ${record.date}`,
            tokens: custTokens,
          });
      }

    } else if (eventType === "promo_broadcast") {
      // Collect all customer tokens in one batched query
      const customerIds: number[] = record.customer_ids ?? [];
      if (customerIds.length > 0) {
        const { data: rows, error } = await supabase
          .from("fcm_tokens")
          .select("device_token")
          .eq("user_type", "customer")
          .eq("is_active", true)
          .in("user_id", customerIds);

        if (error) console.error("Promo token fetch:", error.message);
        const allPromo   = (rows ?? []).map((r: any) => r.device_token as string);
        const tokens     = allPromo.filter(isValidToken);
        const badPromo   = allPromo.length - tokens.length;
        if (badPromo > 0) console.warn(`Promo: skipped ${badPromo} empty/malformed token(s)`);
        if (tokens.length)
          jobs.push({
            title:  `🔥 عرض خاص من ${salon.name}`,
            body:   record.promo_text ?? "",
            tokens,
          });
      }
    }

    if (jobs.length === 0) {
      return json({ success: true, message: "No tokens found for targets" });
    }

    // ── Obtain OAuth token once, then run all batches ────────────────────────
    const accessToken = await getAccessToken();
    const data: Record<string, string> = {
      type:       eventType,
      salon_id:   String(record.salon_id),
      booking_id: String(record.id ?? ""),
      timestamp:  new Date().toISOString(),
    };

    let totalSent = 0, totalFailed = 0;

    for (const job of jobs) {
      const { sent, failed } = await sendBatch(
        job.tokens, accessToken, projectId,
        job.title, job.body, data,
      );
      totalSent   += sent;
      totalFailed += failed;
    }

    return json({ success: true, event_type: eventType, sent: totalSent, failed: totalFailed });

  } catch (e: any) {
    console.error("Handler error:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────
function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
