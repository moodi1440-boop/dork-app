function getSecret(): string {
  const secret = process.env.OWNER_SESSION_SECRET ?? process.env.ADMIN_SECRET;
  if (!secret) throw new Error("OWNER_SESSION_SECRET (or ADMIN_SECRET) must be set");
  return secret;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// نفس بنية التجزئة المستخدمة بـApp.jsx (hashOwnerPin) عند ضبط الحلاك لرقمه السري.
export async function hashOwnerPin(pin: string, salonId: string | number): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pin}:${salonId}`));
  return toHex(buf);
}

async function hmac(value: string): Promise<string> {
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

export async function signOwnerSession(salonId: string | number): Promise<string> {
  const id = String(salonId);
  return `${id}.${await hmac(id)}`;
}

export async function verifyOwnerSession(cookieValue: string | undefined | null): Promise<string | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 0) return null;
  const id = cookieValue.slice(0, dot);
  const given = cookieValue.slice(dot + 1);
  let expected: string;
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
