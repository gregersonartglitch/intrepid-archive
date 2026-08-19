#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var manifestPath = path.join(
  ROOT,
  "reader/intrepid-dusk-volume-1/assets/manifest.json"
);
var outPath = path.join(ROOT, "netlify/lib/asset-allowlist.json");

function issueFromPageId(id) {
  if (id === "cover-hardcover") return "public";
  if (id === "back-cover-hardcover" || id === "chapter-3-spacer") return "003";
  var m = /^page-(\d+)$/.exec(id);
  if (!m) return "public";
  var num = parseInt(m[1], 10);
  if (num <= 21) return "001";
  if (num <= 42) return "002";
  return "003";
}

function tierForIssue(issue) {
  if (issue === "001" || issue === "public") return null;
  return "reader";
}

function main() {
  var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  var assets = {};

  manifest.pages.forEach(function (page) {
    var issue = issueFromPageId(page.id);
    var requiredTier = tierForIssue(issue);
    if (!requiredTier) return;
    var fileName = path.basename(page.webp);
    var assetId = "reader-page/" + fileName.replace(/\.webp$/i, "");
    assets[assetId] = {
      blobKey: "reader/pages/" + fileName,
      requiredTier: requiredTier,
      contentType: "image/webp",
      legacyPublicPath:
        "/reader/intrepid-dusk-volume-1/assets/pages/" + fileName,
    };
  });

  var pdfs = [
    {
      id: "reader-pdf/intrepid-dusk-volume-1",
      file: "intrepid-dusk-volume-1.pdf",
      legacy: "/reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-volume-1.pdf",
    },
    {
      id: "reader-pdf/intrepid-dusk-chapter-2",
      file: "intrepid-dusk-chapter-2.pdf",
      legacy: "/reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-chapter-2.pdf",
    },
    {
      id: "reader-pdf/intrepid-dusk-chapter-3",
      file: "intrepid-dusk-chapter-3.pdf",
      legacy: "/reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-chapter-3.pdf",
    },
  ];

  pdfs.forEach(function (pdf) {
    assets[pdf.id] = {
      blobKey: "reader/downloads/" + pdf.file,
      requiredTier: "reader",
      contentType: "application/pdf",
      legacyPublicPath: pdf.legacy,
    };
  });

  var mapAssets = [
    { id: "map/data.js", file: "data.js", type: "application/javascript" },
    { id: "map/map5.jpg", file: "map5.jpg", type: "image/jpeg" },
    { id: "map/regions.json", file: "regions.json", type: "application/json" },
    { id: "map/reveals.json", file: "reveals.json", type: "application/json" },
  ];

  mapAssets.forEach(function (item) {
    assets[item.id] = {
      blobKey: "map/" + item.file,
      requiredTier: "cartographer",
      contentType: item.type,
      legacyPublicPath: "/" + item.file,
    };
  });

  var dossierDir = path.join(ROOT, "dossier");
  ["thumbs", "portraits"].forEach(function (folder) {
    var dir = path.join(dossierDir, folder);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(function (name) {
      if (!/\.webp$/i.test(name)) return;
      var assetId = "dossier-" + folder + "/" + name.replace(/\.webp$/i, "");
      assets[assetId] = {
        blobKey: "dossier/" + folder + "/" + name,
        requiredTier: "reader",
        contentType: "image/webp",
        legacyPublicPath: "/dossier/" + folder + "/" + name,
      };
    });
  });

  var output = {
    generatedAt: new Date().toISOString(),
    assets: assets,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

  var migration = [];
  Object.keys(assets).forEach(function (id) {
    var entry = assets[id];
    if (entry.legacyPublicPath) {
      migration.push({
        removeFromPublicDeploy: entry.legacyPublicPath,
        blobKey: entry.blobKey,
        assetId: id,
      });
    }
  });

  fs.writeFileSync(
    path.join(ROOT, "docs/WAVE1-PROTECTED-ASSET-MIGRATION.json"),
    JSON.stringify({ generatedAt: output.generatedAt, files: migration }, null, 2) +
      "\n"
  );

  var redirectLines = [
    "# AUTO-GENERATED legacy protected asset 404s — do not edit by hand",
  ];
  migration.forEach(function (row) {
    redirectLines.push(
      row.removeFromPublicDeploy +
        " /.netlify/functions/legacy-asset-gone 404!"
    );
  });
  fs.writeFileSync(
    path.join(ROOT, "_redirects-protected.generated"),
    redirectLines.join("\n") + "\n"
  );

  console.log(
    "Wrote " +
      Object.keys(assets).length +
      " allowlisted assets -> netlify/lib/asset-allowlist.json"
  );
}

main();
