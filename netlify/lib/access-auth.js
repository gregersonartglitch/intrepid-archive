"use strict";

var crypto = require("crypto");

var COOKIE_NAME = "intrepid_access";
var SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

var TIER_READER = "reader";
var TIER_CARTOGRAPHER = "cartographer";

function env(name) {
  return process.env[name] || "";
}

function getSigningSecret() {
  return env("ACCESS_SIGNING_SECRET");
}

function getCookieVersion() {
  var v = env("ACCESS_COOKIE_VERSION");
  return v ? String(v) : "1";
}

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function signPayload(payloadB64) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("hex");
}

function encodeSession(session) {
  var payloadB64 = Buffer.from(JSON.stringify(session)).toString("base64url");
  return "v1." + payloadB64 + "." + signPayload(payloadB64);
}

function decodeSession(token) {
  if (!token || typeof token !== "string") return null;
  var parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  var payloadB64 = parts[1];
  var sig = parts[2];
  if (!getSigningSecret() || !timingSafeEqual(signPayload(payloadB64), sig)) {
    return null;
  }
  var session;
  try {
    session = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!session || !session.tier || !session.exp || !session.v) return null;
  if (String(session.v) !== getCookieVersion()) return null;
  if (typeof session.exp !== "number" || session.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (session.tier !== TIER_READER && session.tier !== TIER_CARTOGRAPHER) {
    return null;
  }
  return session;
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

function readSessionFromEvent(event) {
  var cookies = parseCookies(
    (event.headers && (event.headers.cookie || event.headers.Cookie)) || ""
  );
  return decodeSession(cookies[COOKIE_NAME]);
}

function tierHasReader(tier) {
  return tier === TIER_READER || tier === TIER_CARTOGRAPHER;
}

function tierHasCartographer(tier) {
  return tier === TIER_CARTOGRAPHER;
}

function tierMeetsRequirement(sessionTier, requiredTier) {
  if (requiredTier === TIER_CARTOGRAPHER) {
    return tierHasCartographer(sessionTier);
  }
  return tierHasReader(sessionTier);
}

function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function resolveTierFromCode(raw) {
  var normalized = normalizeCode(raw);
  var readerCode = normalizeCode(env("READER_ACCESS_CODE"));
  var cartoCode = normalizeCode(env("CARTOGRAPHER_ACCESS_CODE"));
  if (!normalized) return null;
  if (cartoCode && normalized === cartoCode) return TIER_CARTOGRAPHER;
  if (readerCode && normalized === readerCode) return TIER_READER;
  return null;
}

function createSession(tier) {
  var now = Math.floor(Date.now() / 1000);
  return {
    tier: tier,
    iat: now,
    exp: now + SESSION_MAX_AGE_SEC,
    v: getCookieVersion(),
  };
}

function buildSetCookieHeader(token, maxAgeSec) {
  var secure = env("NODE_ENV") !== "development";
  var parts = [
    COOKIE_NAME + "=" + encodeURIComponent(token),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + String(maxAgeSec || SESSION_MAX_AGE_SEC),
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function buildClearCookieHeader() {
  var secure = env("NODE_ENV") !== "development";
  var parts = [
    COOKIE_NAME + "=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function jsonResponse(statusCode, body, extraHeaders) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function (k) {
      headers[k] = extraHeaders[k];
    });
  }
  return {
    statusCode: statusCode,
    headers: headers,
    body: JSON.stringify(body),
  };
}

module.exports = {
  COOKIE_NAME: COOKIE_NAME,
  SESSION_MAX_AGE_SEC: SESSION_MAX_AGE_SEC,
  TIER_READER: TIER_READER,
  TIER_CARTOGRAPHER: TIER_CARTOGRAPHER,
  encodeSession: encodeSession,
  decodeSession: decodeSession,
  readSessionFromEvent: readSessionFromEvent,
  tierHasReader: tierHasReader,
  tierHasCartographer: tierHasCartographer,
  tierMeetsRequirement: tierMeetsRequirement,
  normalizeCode: normalizeCode,
  resolveTierFromCode: resolveTierFromCode,
  createSession: createSession,
  buildSetCookieHeader: buildSetCookieHeader,
  buildClearCookieHeader: buildClearCookieHeader,
  jsonResponse: jsonResponse,
};
