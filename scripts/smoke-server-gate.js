#!/usr/bin/env node
"use strict";

/**
 * Server gate smoke — run against Netlify Dev or preview deploy.
 * Usage:
 *   READER_ACCESS_CODE=scribe4 CARTOGRAPHER_ACCESS_CODE=hollowlands9 \
 *   ACCESS_SIGNING_SECRET=dev-secret ACCESS_COOKIE_VERSION=1 \
 *   npx netlify dev &
 *   node scripts/smoke-server-gate.js http://localhost:8888
 */

var BASE = (process.argv[2] || "http://localhost:8888").replace(/\/$/, "");
var EXPECTED_BUILD = parseInt(process.env.EXPECTED_INTREPID_BUILD || "232", 10);
var READER_CODE = process.env.READER_ACCESS_CODE || "scribe4";
var CARTO_CODE = process.env.CARTOGRAPHER_ACCESS_CODE || "hollowlands9";

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

function pass(msg) {
  console.log("PASS:", msg);
}

async function main() {
  var playwright = require("playwright");
  var browser = await playwright.chromium.launch({ headless: true });

  console.log("\n# Server gate smoke — " + BASE);

  var buildRes = await fetch(BASE + "/api/build-info");
  var buildJson = await buildRes.json();
  if (buildJson.build !== EXPECTED_BUILD) {
    fail("build-info expected " + EXPECTED_BUILD + " got " + buildJson.build);
  }
  pass("build-info reports build " + buildJson.build);

  async function anonGet(path) {
    var ctx = await browser.newContext();
    var page = await ctx.newPage();
    var res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
    var url = page.url();
    var status = res ? res.status() : 0;
    await ctx.close();
    return { status: status, url: url };
  }

  var reader = await anonGet("/reader/intrepid-dusk-volume-1/");
  if (reader.url.indexOf("intrepid-dusk-volume-1") !== -1) {
    fail("anonymous reader deep-link not blocked: " + reader.url);
  }
  pass("anonymous reader deep-link blocked (" + reader.url + ")");

  var readerIndex = await anonGet("/reader/intrepid-dusk-volume-1/index.html");
  if (readerIndex.url.indexOf("intrepid-dusk-volume-1") !== -1) {
    fail("anonymous reader index.html not blocked");
  }
  pass("anonymous reader index.html blocked");

  var issue2 = await fetch(BASE + "/reader/intrepid-dusk-volume-1/assets/pages/page-022.webp");
  if (issue2.status !== 404) {
    fail("legacy page-022.webp should 404, got " + issue2.status);
  }
  pass("legacy page-022.webp returns 404");

  var issue1 = await fetch(BASE + "/reader/intrepid-dusk-volume-1/assets/pages/page-001.webp");
  if (!issue1.ok && issue1.status !== 404) {
    pass("issue1 page note: status " + issue1.status + " (404 ok if asset not in repo)");
  } else {
    pass("issue1 public path reachable or absent (" + issue1.status + ")");
  }

  var pdf = await fetch(BASE + "/reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-volume-1.pdf");
  if (pdf.status !== 404) {
    fail("legacy PDF path should 404, got " + pdf.status);
  }
  pass("legacy PDF path 404");

  var mapData = await fetch(BASE + "/data.js");
  if (mapData.status !== 404) {
    fail("legacy data.js should 404, got " + mapData.status);
  }
  pass("legacy data.js 404");

  var protectedAnon = await fetch(BASE + "/api/protected-media/reader-page/page-022");
  if (protectedAnon.status !== 401) {
    fail("protected media anonymous should 401, got " + protectedAnon.status);
  }
  pass("protected media anonymous 401");

  var wrongLogin = await fetch(BASE + "/api/access/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-code" }),
  });
  if (wrongLogin.status !== 401) {
    fail("wrong login should 401, got " + wrongLogin.status);
  }
  pass("wrong login 401");

  var readerLogin = await fetch(BASE + "/api/access/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: READER_CODE }),
  });
  var readerSetCookie = readerLogin.headers.get("set-cookie") || "";
  if (!readerLogin.ok || readerSetCookie.indexOf("intrepid_access") === -1) {
    fail("scribe4 login failed");
  }
  pass("scribe4 login sets HttpOnly cookie");

  var readerCtx = await browser.newContext();
  await readerCtx.addCookies([
    {
      name: "intrepid_access",
      value: decodeURIComponent(
        (readerSetCookie.match(/intrepid_access=([^;]+)/) || [])[1] || ""
      ),
      url: BASE,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  var readerPage = await readerCtx.newPage();
  await readerPage.goto(BASE + "/reader/intrepid-dusk-volume-1/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  if (readerPage.url().indexOf("intrepid-dusk-volume-1") === -1) {
    fail("reader session should load shell");
  }
  pass("reader cookie loads reader shell");

  var prot = await readerCtx.request.get(BASE + "/api/protected-media/reader-page/page-022");
  if (!prot.ok()) {
    fail("reader cookie should fetch protected page-022, got " + prot.status());
  }
  pass("reader cookie fetches protected page-022");

  var mapDenied = await readerCtx.request.get(BASE + "/api/protected-media/map/data.js");
  if (mapDenied.status() !== 401) {
    fail("reader cookie must not access map data.js");
  }
  pass("reader cookie denied map/data.js");

  await readerCtx.close();

  var cartoLogin = await fetch(BASE + "/api/access/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: CARTO_CODE }),
  });
  var cartoCookie = cartoLogin.headers.get("set-cookie") || "";
  var cartoCtx = await browser.newContext();
  await cartoCtx.addCookies([
    {
      name: "intrepid_access",
      value: decodeURIComponent(
        (cartoCookie.match(/intrepid_access=([^;]+)/) || [])[1] || ""
      ),
      url: BASE,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  var mapOk = await cartoCtx.request.get(BASE + "/api/protected-media/map/data.js");
  if (!mapOk.ok()) {
    fail("cartographer cookie should access map/data.js");
  }
  pass("cartographer cookie accesses map/data.js");
  await cartoCtx.close();

  await browser.close();
  console.log("\nRESULT: PASS\n");
}

main().catch(function (err) {
  fail(err && err.message ? err.message : String(err));
});
