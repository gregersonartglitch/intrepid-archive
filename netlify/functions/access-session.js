"use strict";

var auth = require("../lib/access-auth");
var buildMeta = require("../lib/build-meta");

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return auth.jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  var session = auth.readSessionFromEvent(event);
  if (!session) {
    return auth.jsonResponse(200, {
      ok: true,
      authenticated: false,
      tier: null,
      reader: false,
      cartographer: false,
    }, {
      "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
    });
  }

  return auth.jsonResponse(200, {
    ok: true,
    authenticated: true,
    tier: session.tier,
    reader: auth.tierHasReader(session.tier),
    cartographer: auth.tierHasCartographer(session.tier),
    expiresAt: session.exp,
  }, {
    "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
  });
};
