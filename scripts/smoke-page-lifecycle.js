/**
 * Smoke checks for P0 page-lifecycle loader (node, no browser).
 * Run: node scripts/smoke-page-lifecycle.js
 */
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var vm = require("vm");

var root = path.join(__dirname, "..");
var loaderSrc = fs.readFileSync(
  path.join(root, "reader/plugins/page-lifecycle/page-loader.js"),
  "utf8",
);

var sandbox = { window: {}, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout };
vm.runInNewContext(loaderSrc, sandbox);
var LC = sandbox.window.LegendistPageLifecycle;
assert.ok(LC, "LegendistPageLifecycle exported");

var pageEntries = [
  { blank: true, label: "blank" },
  { cover: true, src: "./assets/pages/cover-hardcover.webp" },
  { contentNumber: 1, src: "./assets/pages/page-001.webp" },
];

var imgs = pageEntries.map(function (entry, i) {
  if (entry.blank) return null;
  var el = {
    complete: false,
    naturalWidth: 0,
    loading: "lazy",
    parentElement: {
      classList: { toggle: function () {} },
      setAttribute: function () {},
      querySelector: function () { return null; },
      appendChild: function () {},
    },
    getAttribute: function (name) {
      return name === "src" ? el._src || null : null;
    },
    removeAttribute: function (name) {
      if (name === "src") el._src = null;
    },
    addEventListener: function (type, fn) {
      el._listeners = el._listeners || {};
      el._listeners[type] = el._listeners[type] || [];
      el._listeners[type].push(fn);
    },
    removeEventListener: function (type, fn) {
      if (!el._listeners || !el._listeners[type]) return;
      el._listeners[type] = el._listeners[type].filter(function (f) {
        return f !== fn;
      });
    },
    decode: function () {
      return Promise.resolve();
    },
  };
  Object.defineProperty(el, "src", {
    get: function () {
      return el._src;
    },
    set: function (v) {
      el._src = v;
      // Simulate successful webp load unless forced fail URL.
      setTimeout(function () {
        if (String(v).indexOf("FORCE_FAIL") >= 0) {
          el.complete = true;
          el.naturalWidth = 0;
          (el._listeners.error || []).forEach(function (fn) {
            fn();
          });
          return;
        }
        el.complete = true;
        el.naturalWidth = 1100;
        (el._listeners.load || []).forEach(function (fn) {
          fn();
        });
      }, 5);
    },
  });
  return el;
});

var loader = LC.create({
  maxInFlight: 2,
  timeoutMs: 500,
  assetVersion: 173,
  pageImages: imgs,
  pageEntries: pageEntries,
  getPrimaryUrl: function (i) {
    return pageEntries[i].src;
  },
  getFallbackUrl: function (i) {
    return pageEntries[i].src.replace(".webp", ".jpg");
  },
});

assert.strictEqual(loader.getState(0), "painted", "blank is painted");

loader
  .prime([1, 2])
  .then(function (ok) {
    assert.ok(ok, "prime opening ok");
    assert.strictEqual(loader.getState(1), "painted");
    assert.strictEqual(loader.getState(2), "painted");
    assert.ok(imgs[1].loading === "eager", "eager before/with src");
    console.log("smoke-page-lifecycle: PASS");
  })
  .catch(function (err) {
    console.error("smoke-page-lifecycle: FAIL", err);
    process.exitCode = 1;
  });
