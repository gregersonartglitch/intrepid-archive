#!/usr/bin/env node
/**
 * Browser smoke: Sabella's Hut must enter chime search (not instantDiscover).
 * Reproduces the tutorialStep∈{0,1,2} + golden-glow race fixed in build 233.
 *
 * Usage: node scripts/smoke-chime-hut-search.js [baseUrl]
 * Default: http://127.0.0.1:8888
 */
"use strict";

var BASE = (process.argv[2] || "http://127.0.0.1:8888").replace(/\/$/, "");
var CODE = process.env.CARTOGRAPHER_ACCESS_CODE || "hollowlands9";

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
  var ctx = await browser.newContext();
  var page = await ctx.newPage();
  var fogLogs = [];

  page.on("console", function (msg) {
    var t = msg.text();
    if (t.indexOf("[FOG]") === 0 || t.indexOf("[TUTORIAL]") === 0) fogLogs.push(t);
  });

  console.log("\n# Chime hut search smoke — " + BASE);

  var buildRes = await fetch(BASE + "/api/build-info").catch(function () {
    return null;
  });
  if (buildRes && buildRes.ok) {
    var loginRes = await fetch(BASE + "/api/access/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: CODE }),
    });
    var setCookie = loginRes.headers.get("set-cookie") || "";
    var match = setCookie.match(/intrepid_access=([^;]+)/);
    if (!loginRes.ok || !match) fail("cartographer login failed");
    await ctx.addCookies([
      {
        name: "intrepid_access",
        value: decodeURIComponent(match[1]),
        url: BASE,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    pass("server cartographer session");
  }

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(function () {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("intrepid_") === 0) localStorage.removeItem(k);
      });
      sessionStorage.clear();
    } catch (e) {}
  });
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);

  // Cookie session may skip entry → hub. Otherwise submit entry form.
  var onHub = await page.evaluate(function () {
    var home = document.getElementById("archive-home");
    return !!(home && home.style.display !== "none" && !home.classList.contains("hidden"));
  });
  if (!onHub) {
    await page.locator("#entry-access-pw").waitFor({ state: "visible", timeout: 15000 });
    await page.fill("#entry-access-pw", CODE);
    await page.click("#entry-access-btn");
    await page.waitForTimeout(2000);
    pass("entry code submitted");
  } else {
    pass("hub already open via session cookie");
  }

  await page.click("#landing-map");
  await page.waitForTimeout(5000);

  await page.waitForFunction(
    function () {
      return !!(
        window.FogSystem &&
        typeof window.FogSystem.discover === "function" &&
        window.LOCATIONS &&
        window.LOCATIONS.length > 10
      );
    },
    { timeout: 60000 }
  );
  pass("map + FogSystem ready");

  fogLogs = [];
  // Seed Crossing + Dawn complete, leave tutorial mid-flow (step ~2) so hut is next.
  // This is the golden-glow race: tutorialStep still in old instant list when hut is clicked.
  await page.evaluate(function () {
    var key = "intrepid_atlas_discovered";
    var state = {
      "crossing-pool": { at: Date.now(), phase: "complete" },
      "dawn-spear": { at: Date.now(), phase: "complete" },
    };
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(key + "_v", "20");
  });
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500);

  // Re-open map if hub shows again
  var needMap = await page.evaluate(function () {
    return !(window.LOCATIONS && window.LOCATIONS.length > 10 && window.FogSystem);
  });
  if (needMap) {
    var hub = await page.$("#landing-map");
    if (hub) {
      await hub.click();
      await page.waitForTimeout(5000);
    }
  }

  await page.waitForFunction(
    function () {
      return !!(
        window.FogSystem &&
        typeof window.FogSystem.discover === "function" &&
        window.LOCATIONS &&
        window.LOCATIONS.length > 10
      );
    },
    { timeout: 60000 }
  );

  fogLogs = [];
  var result = await page.evaluate(function () {
    var hut = (window.LOCATIONS || []).find(function (l) {
      return l.id === "sabellas-hut";
    });
    window.FogSystem.discover(hut);
    var disc = {};
    try {
      disc = JSON.parse(localStorage.getItem("intrepid_atlas_discovered") || "{}");
    } catch (e) {}
    return {
      hut: disc["sabellas-hut"] || null,
      dawn: disc["dawn-spear"] || null,
    };
  });

  await page.waitForTimeout(400);

  var searchLog = fogLogs.some(function (l) {
    return l.indexOf("Search mode") !== -1;
  });

  if (!result.dawn || result.dawn.phase !== "complete") {
    fail("dawn-spear should be complete before hut: " + JSON.stringify(result));
  }
  pass("dawn-spear complete (instant tutorial stop)");

  if (!result.hut) fail("sabellas-hut missing from discovered: " + JSON.stringify(result));
  if (result.hut.phase === "complete" && !searchLog) {
    fail(
      "hut instant-completed without search (tutorial race): " +
        JSON.stringify({ result: result, fogLogs: fogLogs.slice(-10) })
    );
  }
  if (result.hut.phase !== "searching" && result.hut.phase !== "complete") {
    fail("unexpected hut phase: " + JSON.stringify(result));
  }
  if (result.hut.phase === "searching" || searchLog) {
    pass("hut entered chime search (phase=" + result.hut.phase + ", searchLog=" + searchLog + ")");
  } else {
    fail("hut did not enter search: " + JSON.stringify({ result: result, fogLogs: fogLogs.slice(-10) }));
  }

  await browser.close();
  console.log("\nRESULT: PASS\n");
}

main().catch(function (err) {
  fail(err && err.message ? err.message : String(err));
});
