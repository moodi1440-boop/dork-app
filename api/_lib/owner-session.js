function getSecret() {
  const secret = process.env.OWNER_SESSION_SECRET;
  if (!secret) throw new Error("OWNER_SESSION_SECRET must be set");
  return secret;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// نفس بنية التجزئة المستخدمة بلوحة الأدمن (owner-session.ts) حتى يبقى الرقم
// السري قابلاً للتحقق من أي من الواجهتين.
async function hashOwnerPin(pin, salonId) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pin}:${salonId}`));
  return toHex(buf);
}

async function hmac(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(sig);
}

async function signOwnerSession(salonId) {
  const id = String(salonId);
  return `${id}.${await hmac(id)}`;
}

async function verifyOwnerSession(cookieValue) {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 0) return null;
  const id = cookieValue.slice(0, dot);
  const given = cookieValue.slice(dot + 1);
  let expected;
  try {
    expected = await hmac(id);
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? id : null;
}

module.exports = { hashOwnerPin, signOwnerSession, verifyOwnerSession };
