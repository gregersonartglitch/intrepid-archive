#!/usr/bin/env node
"use strict";

/**
 * Upload protected assets to Netlify Blobs (Production / preview deploy).
 * Requires BLOB_READ_WRITE_TOKEN (Netlify UI or `netlify env:import`).
 *
 * Usage:
 *   node scripts/generate-protected-asset-manifest.js
 *   node scripts/prepare-protected-assets-local.js   # optional local mirror
 *   BLOB_READ_WRITE_TOKEN=... node scripts/upload-protected-assets-to-blobs.js
 */
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var migrationPath = path.join(ROOT, "docs/WAVE1-PROTECTED-ASSET-MIGRATION.json");
var STORE_NAME = "intrepid-protected";

async function main() {
  var token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("Set BLOB_READ_WRITE_TOKEN (Netlify → Site → Blobs → access token)");
    process.exit(1);
  }

  if (!fs.existsSync(migrationPath)) {
    console.error("Missing migration manifest — run: node scripts/generate-protected-asset-manifest.js");
    process.exit(1);
  }

  var migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
  var store = require("@netlify/blobs").getStore({ name: STORE_NAME, token: token });
  var uploaded = 0;
  var failed = [];

  for (var i = 0; i < migration.files.length; i++) {
    var row = migration.files[i];
    var localPath = path.join(ROOT, "protected-assets", row.blobKey);
    var legacyPath = path.join(ROOT, row.removeFromPublicDeploy.replace(/^\//, ""));

    var src = fs.existsSync(localPath) ? localPath : legacyPath;
    if (!fs.existsSync(src)) {
      failed.push(row.blobKey + " (file missing)");
      continue;
    }

    var bytes = fs.readFileSync(src);
    await store.set(row.blobKey, bytes);
    uploaded++;
    if (uploaded % 10 === 0) {
      console.log("  uploaded " + uploaded + "/" + migration.files.length + "...");
    }
  }

  console.log("Uploaded " + uploaded + " blobs to store '" + STORE_NAME + "'");
  if (failed.length) {
    console.warn("Failed " + failed.length + ":");
    failed.forEach(function (msg) {
      console.warn("  " + msg);
    });
    process.exit(1);
  }
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
