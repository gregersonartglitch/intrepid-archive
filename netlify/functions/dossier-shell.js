"use strict";

var fs = require("fs");
var path = require("path");
var auth = require("../lib/access-auth");
var buildMeta = require("../lib/build-meta");

var HTML_PATH = path.join(__dirname, "..", "..", "dossier", "index.html");

exports.handler = async function (event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  var session = auth.readSessionFromEvent(event);
  if (!session || !auth.tierHasReader(session.tier)) {
    return {
      statusCode: 302,
      headers: {
        Location: "/?entry=required",
        "Cache-Control": "no-store",
        "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
      },
      body: "",
    };
  }

  if (event.httpMethod === "HEAD") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Vary": "Cookie",
        "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
      },
      body: "",
    };
  }

  var html = fs.readFileSync(HTML_PATH, "utf8");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
    },
    body: html,
  };
};
