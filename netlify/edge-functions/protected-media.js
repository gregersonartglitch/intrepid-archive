/**
 * Edge streaming delivery for gated assets (WebPs, PDFs, map data).
 * Avoids the 6MB Netlify Function response cap for large PDFs.
 */
import { getStore } from "@netlify/blobs";
import allowlist from "../lib/asset-allowlist.json" assert { type: "json" };
import {
  readSessionFromRequest,
  tierMeetsRequirement,
} from "./lib/access-auth.mjs";

var INTREPID_BUILD = 231;
var STORE_NAME = "intrepid-protected";

function getAssetId(url) {
  var prefix = "/api/protected-media/";
  var path = url.pathname;
  if (path.indexOf(prefix) !== 0) return "";
  return path.slice(prefix.length).replace(/^\/+/, "");
}

function deny(status, body) {
  return new Response(body, {
    status: status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Intrepid-Build": String(INTREPID_BUILD),
    },
  });
}

async function readLocalBytes(blobKey) {
  try {
    var path = "protected-assets/" + blobKey;
    return await Deno.readFile(path);
  } catch (e) {
    return null;
  }
}

async function openBlobStream(blobKey) {
  var store = getStore(STORE_NAME);
  var blob = await store.get(blobKey, { type: "blob" });
  if (blob && typeof blob.stream === "function") {
    return { stream: blob.stream(), size: blob.size || null };
  }

  var bytes = await readLocalBytes(blobKey);
  if (bytes) {
    return { stream: new ReadableStream({
      start: function (controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }), size: bytes.byteLength };
  }

  return null;
}

export default async function handler(request, context) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return deny(405, "Method Not Allowed");
  }

  var url = new URL(request.url);
  var assetId = getAssetId(url);
  var entry = allowlist.assets[assetId];
  if (!entry) {
    return deny(404, "Not found");
  }

  var session = await readSessionFromRequest(request);
  if (!session || !tierMeetsRequirement(session.tier, entry.requiredTier)) {
    return deny(401, "Unauthorized");
  }

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": entry.contentType,
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Intrepid-Build": String(INTREPID_BUILD),
      },
    });
  }

  var opened = await openBlobStream(entry.blobKey);
  if (!opened) {
    return new Response("Protected asset not migrated yet", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Intrepid-Build": String(INTREPID_BUILD),
      },
    });
  }

  var isText =
    entry.contentType.indexOf("javascript") !== -1 ||
    entry.contentType.indexOf("json") !== -1;

  if (isText) {
    var store = getStore(STORE_NAME);
    var text = await store.get(entry.blobKey, { type: "text" });
    if (!text) {
      var bytes = await readLocalBytes(entry.blobKey);
      text = bytes ? new TextDecoder().decode(bytes) : null;
    }
    if (!text) {
      return new Response("Protected asset not migrated yet", { status: 503 });
    }
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": entry.contentType,
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Intrepid-Build": String(INTREPID_BUILD),
      },
    });
  }

  var headers = {
    "Content-Type": entry.contentType,
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
    "X-Intrepid-Build": String(INTREPID_BUILD),
  };
  if (opened.size) {
    headers["Content-Length"] = String(opened.size);
  }

  return new Response(opened.stream, { status: 200, headers: headers });
}

export const config = {
  path: "/api/protected-media/*",
};
