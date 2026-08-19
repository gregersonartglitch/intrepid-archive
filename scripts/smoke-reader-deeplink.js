#!/usr/bin/env node
/**
 * Browser smoke: reader deep-link must not bypass backer gate (incognito / blocked archive-access).
 * Usage: node scripts/smoke-reader-deeplink.js [baseUrl]
 * Default baseUrl: http://127.0.0.1:8080
 */
"use strict";

var BASE = process.argv[2] || "http://127.0.0.1:8080";
var ROOT = require("path").join(__dirname, "..");

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

function pass(msg) {
  console.log("PASS:", msg);
}

async function main() {
  var playwright;
  try {
    playwright = require("playwright");
  } catch (e) {
    try {
      playwright = require(require("path").join(
        require("os").tmpdir(),
        "node_modules/playwright"
      ));
    } catch (e2) {
      fail("playwright not installed — run: cd /tmp && npm install playwright");
    }
  }

  var chromium = playwright.chromium;
  var browser = await chromium.launch({ headless: true });
  var readerUrl = BASE.replace(/\/$/, "") + "/reader/intrepid-dusk-volume-1/";

  async function runScenario(name, setup) {
    var ctx = await browser.newContext();
    var page = await ctx.newPage();
    if (setup) await setup(page);
    await page.goto(readerUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    var state = await page.evaluate(function () {
      return {
        url: location.href,
        issue2: window.ReaderAccess ? window.ReaderAccess.isIssueUnlocked("002") : null,
        issue3: window.ReaderAccess ? window.ReaderAccess.isIssueUnlocked("003") : null,
        bookOpen:
          document.getElementById("book") &&
          document.getElementById("book").getAttribute("aria-hidden") === "false",
      };
    });
    await ctx.close();

    var stayedOnReader = state.url.indexOf("intrepid-dusk-volume-1") !== -1;
    var unlocked = state.issue2 === true || state.issue3 === true;
    if (stayedOnReader && (unlocked || state.bookOpen)) {
      fail(name + " — reader open without backer keys: " + JSON.stringify(state));
    }
    pass(name + " — blocked or redirected (" + state.url + ")");
  }

  console.log("\n# Reader deep-link smoke — " + BASE);

  await runScenario("fresh session deep link", null);
  await runScenario("blocked archive-access.js", function (page) {
    return page.route("**/archive-access.js**", function (route) {
      route.abort();
    });
  });
  await runScenario("/reader/ hub redirect", async function (page) {
    await page.goto(BASE.replace(/\/$/, "") + "/reader/", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
    var state = await page.evaluate(function () {
      return {
        url: location.href,
        issue2: window.ReaderAccess ? window.ReaderAccess.isIssueUnlocked("002") : null,
      };
    });
    if (
      state.url.indexOf("intrepid-dusk-volume-1") !== -1 &&
      state.issue2 === true
    ) {
      fail("hub path bypass: " + JSON.stringify(state));
    }
    pass("hub path — blocked or redirected (" + state.url + ")");
  });

  // scribe4 positive control — server gate uses HttpOnly cookie login
  var buildRes = await fetch(BASE.replace(/\/$/, "") + "/api/build-info").catch(function () {
    return null;
  });
  var serverGate = false;
  if (buildRes && buildRes.ok) {
    var buildJson = await buildRes.json();
    serverGate = buildJson && buildJson.build >= 230;
  }

  var ctx = await browser.newContext();
  var page = await ctx.newPage();

  if (serverGate) {
    var loginRes = await fetch(BASE.replace(/\/$/, "") + "/api/access/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.READER_ACCESS_CODE || "scribe4" }),
    });
    var setCookie = loginRes.headers.get("set-cookie") || "";
    var match = setCookie.match(/intrepid_access=([^;]+)/);
    if (!loginRes.ok || !match) {
      fail("scribe4 positive control — server login failed");
    }
    await ctx.addCookies([
      {
        name: "intrepid_access",
        value: decodeURIComponent(match[1]),
        url: BASE.replace(/\/$/, ""),
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  } else {
    await page.goto(BASE.replace(/\/$/, "") + "/");
    await page.evaluate(function () {
      window.IntrepidArchiveAccess.submitArchiveCode("scribe4");
    });
  }

  await page.goto(readerUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  var ok = await page.evaluate(function () {
    return {
      url: location.href,
      issue2: window.ReaderAccess ? window.ReaderAccess.isIssueUnlocked("002") : null,
    };
  });
  await ctx.close();
  if (ok.url.indexOf("intrepid-dusk-volume-1") === -1 || ok.issue2 !== true) {
    fail("scribe4 positive control — reader should load unlocked: " + JSON.stringify(ok));
  }
  pass("scribe4 — reader loads with Issue 2 unlocked");

  await browser.close();
  console.log("\nRESULT: PASS\n");
}

main().catch(function (err) {
  fail(err && err.message ? err.message : String(err));
});
