const { parseCookies } = require("./cookies");
const { verifyOwnerSession } = require("./owner-session");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function getSalonId(req) {
  const cookies = parseCookies(req);
  return verifyOwnerSession(cookies["dork_owner_session"]);
}

module.exports = { readJson, getSalonId };
