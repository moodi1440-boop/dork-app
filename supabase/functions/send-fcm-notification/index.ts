import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── OAuth2 access token via service account JWT ──────────────────────────────
async function getAccessToken(): Promise<string> {
  const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!saJson) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret");
  const sa = JSON.parse(saJson);

  const now = Math.floor(Date.now() / 1000);

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const header  = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  });

  const signingInput = `${header}.${payload}`;

  // Import RSA-SHA256 private key
  const pem = sa.private_key.replace(/\\n/g, "\n");
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const keyBuf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;

  // Exchange JWT → access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`OAuth2 token exchange failed: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token as string;
}

// ── Send one FCM v1 message ───────────────────────────────────────────────────
async function sendFCM(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<boolean> {
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
              title,
              body,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              requireInteraction: true,
              vibrate: [200, 100, 200],
              tag: data.type ?? "notification",
            },
            fcmOptions: { link: "/" },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    console.error("FCM v1 error:", await res.text());
    return false;
  }
  return true;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const reqBody   = await req.json() as any;
    const record    = reqBody?.record;
    const eventType = reqBody?.type ?? "new_booking";

    if (!record) {
      return new Response(
        JSON.stringify({ success: false, error: "No record provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve salon name
    const { data: salon } = await supabase
      .from("salons")
      .select("id, name")
      .eq("id", record.salon_id)
      .single();

    if (!salon) {
      return new Response(
        JSON.stringify({ success: false, error: `Salon ${record.salon_id} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── Build notification targets ──────────────────────────────────────────
    type Target = {
      userType: "salon" | "customer" | "admin";
      userId:   number;
      title:    string;
      body:     string;
    };

    const targets: Target[] = [];

    if (eventType === "new_booking") {
      targets.push({
        userType: "salon",
        userId:   record.salon_id,
        title:    `✂️ حجز جديد في ${salon.name}`,
        body:     `${record.customer_name} | ${record.time} | ${record.date}`,
      });
      if (record.customer_id) {
        targets.push({
          userType: "customer",
          userId:   record.customer_id,
          title:    "📋 تم استلام حجزك",
          body:     `في ${salon.name} | ${record.date} | ${record.time}`,
        });
      }
    } else if (eventType === "booking_approved") {
      if (record.customer_id) {
        targets.push({
          userType: "customer",
          userId:   record.customer_id,
          title:    "✅ تم قبول حجزك!",
          body:     `${salon.name} | ${record.date} | ${record.time}`,
        });
      }
      targets.push({
        userType: "salon",
        userId:   record.salon_id,
        title:    "✅ تم تأكيد الحجز",
        body:     `${record.customer_name} | ${record.time}`,
      });
    } else if (eventType === "booking_rejected") {
      if (record.customer_id) {
        targets.push({
          userType: "customer",
          userId:   record.customer_id,
          title:    "❌ تم رفض حجزك",
          body:     `${salon.name} | ${record.date}`,
        });
      }
    } else if (eventType === "promo_broadcast") {
      for (const cid of (record.customer_ids as number[] ?? [])) {
        targets.push({
          userType: "customer",
          userId:   cid,
          title:    `🔥 عرض خاص من ${salon.name}`,
          body:     record.promo_text ?? "",
        });
      }
    }

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No targets for this event" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Obtain OAuth token once for all messages
    const projectId   = Deno.env.get("FIREBASE_PROJECT_ID") ?? "dork-app";
    const accessToken = await getAccessToken();

    let sent = 0, failed = 0;

    for (const target of targets) {
      // Fetch device tokens for this target
      const q = supabase
        .from("fcm_tokens")
        .select("device_token")
        .eq("is_active", true)
        .eq("user_type", target.userType);

      if (target.userType !== "admin") {
        q.eq("user_id", target.userId);
      }

      const { data: tokenRows, error: tokenErr } = await q;
      if (tokenErr) {
        console.error("Token fetch error:", tokenErr.message);
        continue;
      }

      for (const { device_token } of (tokenRows ?? [])) {
        const ok = await sendFCM(
          accessToken,
          projectId,
          device_token,
          target.title,
          target.body,
          {
            type:      eventType,
            salon_id:  String(record.salon_id),
            booking_id: String(record.id ?? ""),
            timestamp: new Date().toISOString(),
          },
        );
        ok ? sent++ : failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, event_type: eventType, sent, failed }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Handler error:", e.message);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
