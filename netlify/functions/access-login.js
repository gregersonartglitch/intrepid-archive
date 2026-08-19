"use strict";

var auth = require("../lib/access-auth");
var rateLimit = require("../lib/rate-limit");
var buildMeta = require("../lib/build-meta");

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (e) {
    return null;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return auth.jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  if (!process.env.ACCESS_SIGNING_SECRET) {
    return auth.jsonResponse(503, { ok: false, error: "service_unconfigured" });
  }

  if (rateLimit.isRateLimited(event, "access-login")) {
    return auth.jsonResponse(429, { ok: false, error: "rate_limited" });
  }

  var body = parseBody(event);
  if (body === null) {
    return auth.jsonResponse(400, { ok: false, error: "invalid_json" });
  }

  var normalized = auth.normalizeCode(body.password || body.code || "");
  var tier = auth.resolveTierFromCode(normalized);
  if (!tier) {
    return auth.jsonResponse(401, { ok: false, error: "invalid_credentials" });
  }

  var session = auth.createSession(tier);
  var token = auth.encodeSession(session);

  return auth.jsonResponse(200, {
    ok: true,
    tier: tier,
    reader: auth.tierHasReader(tier),
    cartographer: auth.tierHasCartographer(tier),
    expiresAt: session.exp,
  }, {
    "Set-Cookie": auth.buildSetCookieHeader(token, auth.SESSION_MAX_AGE_SEC),
    "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
  });
};
