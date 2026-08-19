"use strict";

var buildMeta = require("../lib/build-meta");

/** Invoked only via _redirects from migrated public asset paths. */
exports.handler = async function () {
  return {
    statusCode: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
    },
    body: "Gone",
  };
};
