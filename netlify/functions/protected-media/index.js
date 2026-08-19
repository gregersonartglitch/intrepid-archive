"use strict";

var fs = require("fs");
var path = require("path");
var auth = require("../../lib/access-auth");
var buildMeta = require("../../lib/build-meta");
var allowlist = require("../../lib/asset-allowlist.json");

var ROOT = path.join(__dirname, "..", "..", "..");

function getAssetId(event) {
  var fromQuery =
    event.queryStringParameters && event.queryStringParameters.path;
  if (fromQuery) return fromQuery.replace(/^\/+/, "");
  var p = event.path || "";
  var marker = "/protected-media/";
  var idx = p.indexOf(marker);
  if (idx !== -1) return p.slice(idx + marker.length);
  return "";
}

async function readBlob(blobKey) {
  var token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    var store = require("@netlify/blobs").getStore({
      name: "intrepid-protected",
      token: token,
    });
    var data = await store.get(blobKey, { type: "arrayBuffer" });
    if (data) return Buffer.from(data);
  }

  var localPath = path.join(ROOT, "protected-assets", blobKey);
  if (!fs.existsSync(localPath)) {
    localPath = path.join(process.cwd(), "protected-assets", blobKey);
  }
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  return null;
}

function isTextContent(contentType) {
  return (
    contentType.indexOf("javascript") !== -1 ||
    contentType.indexOf("json") !== -1
  );
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  var assetId = getAssetId(event);
  if (!assetId || !allowlist.assets[assetId]) {
    return {
      statusCode: 404,
      headers: { "Cache-Control": "no-store" },
      body: "Not found",
    };
  }

  var entry = allowlist.assets[assetId];
  var session = auth.readSessionFromEvent(event);
  if (!session || !auth.tierMeetsRequirement(session.tier, entry.requiredTier)) {
    return {
      statusCode: 401,
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
      },
      body: "Unauthorized",
    };
  }

  if (event.httpMethod === "HEAD") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": entry.contentType,
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
      },
      body: "",
    };
  }

  var bytes = await readBlob(entry.blobKey);
  if (!bytes) {
    return {
      statusCode: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: "Protected asset not migrated yet",
    };
  }

  if (isTextContent(entry.contentType)) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": entry.contentType,
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
      },
      body: bytes.toString("utf8"),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": entry.contentType,
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Intrepid-Build": String(buildMeta.INTREPID_BUILD),
    },
    body: bytes.toString("base64"),
    isBase64Encoded: true,
  };
};
