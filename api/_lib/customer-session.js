function getSecret() {
  const secret = process.env.OWNER_SESSION_SECRET;
  if (!secret) throw new Error("OWNER_SESSION_SECRET must be set");
  return secret;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// نفس أسلوب hashOwnerPin بالضبط (owner-session.js) — يربط الرمز السري برقم
// العميل حتى لا يصلح نفس الرمز لحساب غيره.
async function hashCustomerPin(pin, customerId) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pin}:${customerId}`));
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

async function signCustomerSession(customerId) {
  const id = `customer:${customerId}`;
  return `${id}.${await hmac(id)}`;
}

async function verifyCustomerSession(cookieValue) {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 0) return null;
  const id = cookieValue.slice(0, dot);
  const given = cookieValue.slice(dot + 1);
  if (!id.startsWith("customer:")) return null;
  let expected;
  try {
    expected = await hmac(id);
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? id.slice("customer:".length) : null;
}

module.exports = { hashCustomerPin, signCustomerSession, verifyCustomerSession };
