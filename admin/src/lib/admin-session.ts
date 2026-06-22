// جلسة موقّعة (HMAC) لحسابات admin_users — إضافية فوق آلية تسجيل
// الدخول القديمة بكلمة المرور الموحّدة (كوكي dork_admin). نفس نمط
// owner-session.ts بالتوقيع والتحقق.

export type AdminRole = "super_admin" | "editor" | "viewer";
export type AdminSessionPayload = { id: number; username: string; role: AdminRole };

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.OWNER_SESSION_SECRET ?? process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET (or ADMIN_SECRET) must be set");
  return secret;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashAdminPassword(password: string, username: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${password}:${username}:dork-admin-salt`));
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

export async function signAdminUserSession(payload: AdminSessionPayload): Promise<string> {
  const raw = `${payload.id}.${payload.username}.${payload.role}`;
  return `${raw}.${await hmac(raw)}`;
}

export async function verifyAdminUserSession(cookieValue: string | undefined | null): Promise<AdminSessionPayload | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 4) return null;
  const [id, username, role, given] = parts;
  const raw = `${id}.${username}.${role}`;
  let expected: string;
  try {
    expected = await hmac(raw);
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  if (role !== "super_admin" && role !== "editor" && role !== "viewer") return null;
  return { id: Number(id), username, role };
}
