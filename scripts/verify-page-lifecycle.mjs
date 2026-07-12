/**
 * Browser-ish verification for page lifecycle P0 via fetch + optional CDP-less checks.
 * Full DOM flip needs a real browser; this validates the contract wiring is live.
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

  const loader = await get("/reader/plugins/page-lifecycle/page-loader.js?v=173");
  assert(loader.ok, `page-loader.js HTTP ${loader.status}`);
  assert(
    loader.text.includes("LegendistPageLifecycle"),
    "loader missing export",
  );
  assert(loader.text.includes("PRIORITY_VISIBLE"), "loader missing priorities");
  checks.push("page-loader.js served");

  const css = await get("/reader/plugins/page-lifecycle/page-lifecycle.css?v=173");
  assert(css.ok, `page-lifecycle.css HTTP ${css.status}`);
  assert(css.text.includes("reader-page-placeholder"), "css missing placeholder");
  checks.push("page-lifecycle.css served");

  const spike = await get("/reader/intrepid-dusk-volume-1/spike.js?v=173");
  assert(spike.ok, `spike.js HTTP ${spike.status}`);
  assert(/ENABLE_PAGE_LIFECYCLE\s*=\s*true/.test(spike.text), "flag not ON");
  assert(
    spike.text.includes("PAGE_LIFECYCLE_DISABLE_KEY"),
    "kill switch key missing",
  );
  assert(
    spike.text.includes("VEIL_OPENING_DEADLINE_MS"),
    "opening hard deadline missing",
  );
  assert(
    spike.text.includes("Page couldn't load — Retry."),
    "hard-fail copy missing",
  );
  assert(!/const probe = new Image\(\)/.test(spike.text), "orphan Image probe still present");
  assert(/PAGE_ASSET_VERSION\s*=\s*173/.test(spike.text), "PAGE_ASSET_VERSION not 173");
  checks.push("spike.js lifecycle wiring");

  const index = await get("/reader/intrepid-dusk-volume-1/");
  assert(index.ok, `reader index HTTP ${index.status}`);
  assert(index.text.includes("spike.js?v=173"), "index cache bust not 173");
  checks.push("reader index cache bust");

  const manifest = await get("/reader/intrepid-dusk-volume-1/assets/manifest.json");
  assert(manifest.ok, `manifest HTTP ${manifest.status}`);
  const json = JSON.parse(manifest.text);
  assert(Array.isArray(json.pages) && json.pages.length > 0, "manifest pages empty");
  const page9 = json.pages.find((p) => p.id === "page-009");
  assert(page9 && page9.webp && page9.fallback, "page-009 missing webp/fallback");
  checks.push("manifest page-009 fallback fields");

  const webp = await get("/reader/intrepid-dusk-volume-1/assets/pages/page-009.webp?v=173");
  assert(webp.ok, `page-009.webp HTTP ${webp.status}`);
  checks.push("page-009.webp 200");

  const root = await get("/");
  assert(root.ok, "root not reachable");
  assert(/INTREPID_BUILD\s*=\s*173/.test(root.text), "INTREPID_BUILD not 173");
  assert(/fog\.js\?v=173/.test(root.text), "fog cache bust not 173");
  checks.push("INTREPID_BUILD 173");

  console.log("verify-page-lifecycle: PASS");
  checks.forEach((c) => console.log("  ✓", c));
}

main().catch((err) => {
  console.error("verify-page-lifecycle: FAIL", err.message || err);
  process.exitCode = 1;
});
