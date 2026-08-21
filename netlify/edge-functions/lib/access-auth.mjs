/** Edge-compatible session cookie verification (Web Crypto). */

var COOKIE_NAME = "intrepid_access";

function env(name) {
  if (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get) {
    return Netlify.env.get(name) || "";
  }
  return "";
}

function parseCookies(header) {
  var out = {};
  if (!header) return out;
  header.split(";").forEach(function (part) {
    var idx = part.indexOf("=");
    if (idx === -1) return;
    var key = part.slice(0, idx).trim();
    var val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

function hexFromBuffer(buf) {
  return Array.from(new Uint8Array(buf))
    .map(function (b) {
      return b.toString(16).padStart(2, "0");
    })
    .join("");
}

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signPayload(payloadB64, secret) {
  var key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  var sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  return hexFromBuffer(sig);
}

function base64UrlDecode(str) {
  var s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function decodeSession(token) {
  if (!token || typeof token !== "string") return null;
  var parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  var payloadB64 = parts[1];
  var sig = parts[2];
  var secret = env("ACCESS_SIGNING_SECRET");
  if (!secret) return null;
  var expected = await signPayload(payloadB64, secret);
  if (!timingSafeEqual(expected, sig)) return null;
  var session;
  try {
    session = JSON.parse(base64UrlDecode(payloadB64));
  } catch (e) {
    return null;
  }
  if (!session || !session.tier || !session.exp || !session.v) return null;
  var cookieVersion = env("ACCESS_COOKIE_VERSION") || "1";
  if (String(session.v) !== String(cookieVersion)) return null;
  if (typeof session.exp !== "number" || session.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (session.tier !== "reader" && session.tier !== "cartographer") return null;
  return session;
}

async function readSessionFromRequest(request) {
  var cookies = parseCookies(request.headers.get("cookie") || "");
  return decodeSession(cookies[COOKIE_NAME]);
}

function tierMeetsRequirement(sessionTier, requiredTier) {
  if (requiredTier === "cartographer") return sessionTier === "cartographer";
  return sessionTier === "reader" || sessionTier === "cartographer";
}

export {
  COOKIE_NAME,
  readSessionFromRequest,
  tierMeetsRequirement,
  decodeSession,
};
