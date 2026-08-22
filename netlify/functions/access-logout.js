"use strict";

var auth = require("../lib/access-auth");
var buildMeta = require("../lib/build-meta");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return auth.jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  return auth.jsonResponse(200, { ok: true }, {
    "Set-Cookie": auth.buildClearCookieHeader(),
    "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
  });
};
