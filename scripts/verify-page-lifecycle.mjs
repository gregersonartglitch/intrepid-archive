/**
 * Browser-ish verification for page lifecycle wiring + interim kill-switch.
 *
 * Usage (http-server on 8080):
 *   node scripts/verify-page-lifecycle.mjs
 */
const BASE = (process.env.AUDIT_BASE || "http://localhost:8080").replace(/\/$/, "");

async function get(path) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url);
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, url };
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function main() {
  const checks = [];

  const loader = await get("/reader/plugins/page-lifecycle/page-loader.js?v=175");
  assert(loader.ok, `page-loader.js HTTP ${loader.status}`);
  assert(
    loader.text.includes("LegendistPageLifecycle"),
    "loader missing export",
  );
  checks.push("page-loader.js served");

  const css = await get("/reader/plugins/page-lifecycle/page-lifecycle.css?v=175");
  assert(css.ok, `page-lifecycle.css HTTP ${css.status}`);
  assert(css.text.includes("reader-page-placeholder"), "css missing placeholder");
  checks.push("page-lifecycle.css served");

  const spike = await get("/reader/intrepid-dusk-volume-1/spike.js?v=175");
  assert(spike.ok, `spike.js HTTP ${spike.status}`);
  assert(/ENABLE_PAGE_LIFECYCLE\s*=\s*false/.test(spike.text), "flag not OFF (interim kill)");
  assert(
    spike.text.includes("PAGE_LIFECYCLE_DISABLE_KEY"),
    "kill switch key missing",
  );
  assert(
    spike.text.includes("intrepid_reader_page_lifecycle_enabled"),
    "opt-in key missing",
  );
  assert(!/const probe = new Image\(\)/.test(spike.text), "orphan Image probe still present");
  assert(/PAGE_ASSET_VERSION\s*=\s*175/.test(spike.text), "PAGE_ASSET_VERSION not 175");
  checks.push("spike.js lifecycle kill-switch default OFF");

  const index = await get("/reader/intrepid-dusk-volume-1/");
  assert(index.ok, `reader index HTTP ${index.status}`);
  assert(index.text.includes("spike.js?v=175"), "index cache bust not 175");
  checks.push("reader index cache bust");

  const webp = await get("/reader/intrepid-dusk-volume-1/assets/pages/page-009.webp?v=175");
  assert(webp.ok, `page-009.webp HTTP ${webp.status}`);
  checks.push("page-009.webp 200");

  const root = await get("/");
  assert(root.ok, "root not reachable");
  assert(/INTREPID_BUILD\s*=\s*175/.test(root.text), "INTREPID_BUILD not 175");
  assert(/fog\.js\?v=175/.test(root.text), "fog cache bust not 175");
  checks.push("INTREPID_BUILD 175");

  console.log("verify-page-lifecycle: PASS");
  checks.forEach((c) => console.log("  ✓", c));
}

main().catch((err) => {
  console.error("verify-page-lifecycle: FAIL", err.message || err);
  process.exitCode = 1;
});
