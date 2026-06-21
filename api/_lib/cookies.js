function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function serializeCookie(name, value, opts = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) str += `; Max-Age=${opts.maxAge}`;
  str += `; Path=${opts.path || "/"}`;
  if (opts.httpOnly !== false) str += "; HttpOnly";
  str += `; SameSite=${opts.sameSite || "Lax"}`;
  if (opts.secure !== false) str += "; Secure";
  return str;
}

module.exports = { parseCookies, serializeCookie };
