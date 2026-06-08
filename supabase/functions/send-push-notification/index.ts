import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── Web Push: VAPID JWT ────────────────────────────────────────────────────────
async function buildVapidJwt(endpoint: string, publicKeyB64: string, privateKeyB64: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header  = toB64U(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = toB64U(JSON.stringify({ aud: audience, exp: now + 43200, sub: "mailto:admin@dork-app.com" }));
  const sigInput = `${header}.${payload}`;

  const privBytes = b64uDecode(privateKeyB64);
  const pubBytes  = b64uDecode(publicKeyB64);

  // Build JWK from raw bytes
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: b64uEncode(privBytes), x: b64uEncode(x), y: b64uEncode(y) },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(sigInput))
  );

  return `${sigInput}.${b64uEncode(sig)}`;
}

// ── Web Push: encrypt payload (RFC 8291 + RFC 8188) ──────────────────────────
async function encryptPayload(
  plaintext: string,
  p256dhB64: string,
  authB64:   string,
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const uaPublicKey = b64uDecode(p256dhB64); // 65-byte uncompressed UA public key
  const authSecret  = b64uDecode(authB64);   // 16-byte auth secret
  const salt        = crypto.getRandomValues(new Uint8Array(16));

  // Ephemeral application-server key pair
  const ephKP     = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", ephKP.publicKey));

  // ECDH shared secret
  const uaPubKey    = await crypto.subtle.importKey("raw", uaPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret  = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPubKey }, ephKP.privateKey, 256));

  // RFC 8291 §3.4 – IKM derivation
  // PRK_combine = HMAC-SHA-256(key=auth_secret, data=ecdh_secret)
  const hmacAuth   = await crypto.subtle.importKey("raw", authSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prkCombine = new Uint8Array(await crypto.subtle.sign("HMAC", hmacAuth, ecdhSecret));

  // auth_info = "WebPush: info\0" || ua_public || as_public
  const authInfo  = concat(new TextEncoder().encode("WebPush: info\0"), uaPublicKey, asPublicKey);
  const hmacPrk   = await crypto.subtle.importKey("raw", prkCombine, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const ikm       = new Uint8Array((await crypto.subtle.sign("HMAC", hmacPrk, concat(authInfo, new Uint8Array([0x01])))).slice(0, 32));

  // RFC 8188 §2.3 – CEK and nonce derivation
  // PRK = HMAC-SHA-256(key=salt, data=ikm)
  const hmacSalt  = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk       = new Uint8Array(await crypto.subtle.sign("HMAC", hmacSalt, ikm));
  const hmacPrkKey= await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  // CEK = HMAC-SHA-256(PRK, "Content-Encoding: aes128gcm\0" || 0x01)[0:16]
  const cekBytes  = new Uint8Array((await crypto.subtle.sign(
    "HMAC", hmacPrkKey,
    concat(new TextEncoder().encode("Content-Encoding: aes128gcm\0"), new Uint8Array([0x01]))
  )).slice(0, 16));

  // NONCE = HMAC-SHA-256(PRK, "Content-Encoding: nonce\0" || 0x01)[0:12]
  const nonceBytes= new Uint8Array((await crypto.subtle.sign(
    "HMAC", hmacPrkKey,
    concat(new TextEncoder().encode("Content-Encoding: nonce\0"), new Uint8Array([0x01]))
  )).slice(0, 12));

  // Encrypt with AES-128-GCM
  const cek    = await crypto.subtle.importKey("raw", cekBytes, "AES-GCM", false, ["encrypt"]);
  const padded = concat(new TextEncoder().encode(plaintext), new Uint8Array([0x02])); // last-record delimiter
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBytes, tagLength: 128 }, cek, padded));

  // RFC 8188: aes128gcm header – salt(16) + rs(4) + idlen(1) + keyid(65) = 86 bytes
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(asPublicKey, 21);

  return { body: concat(header, cipher), salt, serverPublicKey: asPublicKey };
}

// ── Send one push notification ─────────────────────────────────────────────────
async function sendPush(
  endpoint: string,
  p256dh:   string,
  authKey:  string,
  payload:  object,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const pubKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const prvKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  try {
    const jwt    = await buildVapidJwt(endpoint, pubKey, prvKey);
    const { body } = await encryptPayload(JSON.stringify(payload), p256dh, authKey);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type":     "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Authorization":    `vapid t=${jwt},k=${pubKey}`,
        "TTL":              "86400",
        "Urgency":          "high",
      },
      body,
    });

    if (res.ok || res.status === 201) return { ok: true };
    const errText = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: errText };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Edge Function entry point ─────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  const incomingToken = req.headers.get("x-cron-token");
  if (incomingToken !== null) {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    if (!cronSecret || incomingToken !== cronSecret) {
      return json({ success: false, error: "Forbidden" }, 403);
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload    = await req.json() as any;
    const targetType = payload?.target_type as string;
    const title      = payload?.title as string;
    const body       = payload?.body  as string;

    if (!title || !body) return json({ success: false, error: "title and body required" }, 400);

    const notifPayload = { title, body, tag: payload?.data?.type || "dork", ...payload?.data };

    if (targetType === "single") {
      const { user_id, user_type = "customer" } = payload;
      if (!user_id) return json({ success: false, error: "user_id required" }, 400);

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth_key")
        .eq("user_type", user_type)
        .eq("user_id", user_id);

      let sent = 0, failed = 0;
      const expired: string[] = [];

      for (const s of subs ?? []) {
        const r = await sendPush(s.endpoint, s.p256dh, s.auth_key, notifPayload);
        if (r.ok) { sent++; }
        else {
          failed++;
          if (r.status === 404 || r.status === 410) expired.push(s.endpoint);
          console.error(`[push:${user_type}:${user_id}] status=${r.status} ${r.error}`);
        }
      }
      if (expired.length) await supabase.from("push_subscriptions").delete().in("endpoint", expired);
      return json({ success: true, sent, failed });

    } else if (targetType === "broadcast") {
      const { salon_id } = payload;
      if (!salon_id) return json({ success: false, error: "salon_id required" }, 400);

      const { data: bookings } = await supabase
        .from("bookings").select("customer_id").eq("salon_id", String(salon_id)).not("customer_id", "is", null);

      const customerIds = [...new Set((bookings ?? []).map((b: any) => b.customer_id))];
      if (!customerIds.length) return json({ success: true, sent: 0 });

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth_key")
        .eq("user_type", "customer")
        .in("user_id", customerIds);

      let sent = 0, failed = 0;
      const expired: string[] = [];

      for (const s of subs ?? []) {
        const r = await sendPush(s.endpoint, s.p256dh, s.auth_key, notifPayload);
        if (r.ok) { sent++; }
        else {
          failed++;
          if (r.status === 404 || r.status === 410) expired.push(s.endpoint);
        }
      }
      if (expired.length) await supabase.from("push_subscriptions").delete().in("endpoint", expired);
      return json({ success: true, sent, failed, customers: customerIds.length });

    } else {
      return json({ success: false, error: `Unknown target_type: "${targetType}"` }, 400);
    }

  } catch (e: any) {
    console.error("[send-push] error:", e.message);
    return json({ success: false, error: e.message }, 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function b64uDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
function b64uEncode(b: Uint8Array): string {
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function toB64U(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}
function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
