#!/usr/bin/env node
"use strict";

/**
 * Copy gated assets into protected-assets/ for local Netlify Dev + edge fallback.
 * Usage: node scripts/prepare-protected-assets-local.js
 */
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var migrationPath = path.join(ROOT, "docs/WAVE1-PROTECTED-ASSET-MIGRATION.json");

function resolveSource(row) {
  var legacy = row.removeFromPublicDeploy.replace(/^\//, "");
  return path.join(ROOT, legacy);
}

function main() {
  if (!fs.existsSync(migrationPath)) {
    console.error("Missing migration manifest — run: node scripts/generate-protected-asset-manifest.js");
    process.exit(1);
  }

  var migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
  var copied = 0;
  var missing = [];

  migration.files.forEach(function (row) {
    var src = resolveSource(row);
    var dest = path.join(ROOT, "protected-assets", row.blobKey);
    if (!fs.existsSync(src)) {
      missing.push(row.removeFromPublicDeploy);
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  });

  console.log("Copied " + copied + " files into protected-assets/");
  if (missing.length) {
    console.warn("Missing " + missing.length + " source files (skipped):");
    missing.slice(0, 8).forEach(function (p) {
      console.warn("  " + p);
    });
    if (missing.length > 8) console.warn("  ... and " + (missing.length - 8) + " more");
  }
}

main();
