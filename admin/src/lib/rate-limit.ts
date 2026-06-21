// Rate limiting بالذاكرة (in-memory) لمسارات تسجيل الدخول الحساسة.
// محدودية معروفة: العدّاد لكل instance من السيرفر، لا يُشارك عبر instances
// متعددة بالبيئات serverless — لكنه أفضل من صفر حماية، وبدون أي تبعية خارجية.

const WINDOW_MS     = 10 * 60_000; // 10 دقائق
const MAX_ATTEMPTS  = 10;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now   = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
