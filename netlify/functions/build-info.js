"use strict";

var buildMeta = require("../lib/build-meta");

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
    },
    body: JSON.stringify({
      ok: true,
      build: buildMeta.INTREPID_BUILD,
      commit: buildMeta.COMMIT_SHA,
    }),
  };
};
