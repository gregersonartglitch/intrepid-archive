/**
 * Adversarial Issue 1→2→3 boundary stress test (legacy path, lifecycle OFF).
 *
 * Asserts visible StPageFlip pages have naturalWidth > 0 and are not stuck
 * in a void/failed state after rapid flips across issue boundaries.
 *
 * Usage:
 *   node scripts/stress-reader-issue-boundaries.mjs [url]
 * Default url: http://127.0.0.1:8080/reader/intrepid-dusk-volume-1/
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function resolvePuppeteer() {
  const candidates = [
    path.join(root, ".tmp/node_modules/puppeteer-core"),
    path.join(root, "node_modules/puppeteer-core"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return require(c);
  }
  throw new Error("puppeteer-core not found under .tmp/ or root node_modules");
}

const puppeteer = resolvePuppeteer();
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browserPath = fs.existsSync(CHROME) ? CHROME : EDGE;

const url =
  process.argv[2] || "http://127.0.0.1:8080/reader/intrepid-dusk-volume-1/";
const outDir = path.join(root, ".tmp/issue-boundary-stress");
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Content page N → approximate target label substring. */
const BOUNDARIES = [
  { name: "issue1-mid", targetContent: 9, maxClicks: 12 },
  { name: "issue1-to-2", targetContent: 22, maxClicks: 20 },
  { name: "issue2-mid", targetContent: 30, maxClicks: 14 },
  { name: "issue2-to-3", targetContent: 43, maxClicks: 20 },
  { name: "issue3-mid", targetContent: 55, maxClicks: 18 },
];

async function snap(page, tag) {
  return page.evaluate((tagName) => {
    const label = document.querySelector("[data-page]")?.textContent || "";
    const visible = Array.from(
      document.querySelectorAll(
        ".stf__item.--left, .stf__item.--right, .stf__item.--simple",
      ),
    )
      .map((el) => {
        const img = el.querySelector("img");
        if (!img) {
          return {
            pageNumber: el.getAttribute("data-page-number"),
            blank: el.classList.contains("reader-page--blank"),
            isLoading: el.classList.contains("is-loading"),
            isFailed: el.classList.contains("is-failed"),
            ok: el.classList.contains("reader-page--blank"),
          };
        }
        const cs = getComputedStyle(img);
        const nw = img.naturalWidth;
        const opacity = Number(cs.opacity);
        const isLoading = el.classList.contains("is-loading");
        const isFailed = el.classList.contains("is-failed");
        const hasSrc = !!img.getAttribute("src");
        const ok =
          nw > 0 &&
          opacity > 0.2 &&
          !isFailed &&
          hasSrc &&
          // Loading overlay is OK only briefly; bitmap must already exist.
          (nw > 0);
        return {
          pageNumber: el.getAttribute("data-page-number"),
          src: (img.getAttribute("src") || "").replace(/.*\//, ""),
          nw,
          complete: img.complete,
          opacity: cs.opacity,
          loading: img.loading,
          isLoading,
          isFailed,
          hasSrc,
          ok,
        };
      })
      .filter((v, i, arr) => {
        // Dedupe by pageNumber
        return arr.findIndex((x) => x.pageNumber === v.pageNumber) === i;
      });

    const contentImgs = visible.filter((v) => v.src && !v.blank);
    const failures = contentImgs.filter((v) => !v.ok);

    return {
      tag: tagName,
      label,
      hasLifecycle: !!document
        .querySelector(".reader")
        ?.classList.contains("has-page-lifecycle"),
      assetVersion: (
        document.querySelector('script[src*="spike.js"]')?.src || ""
      ).match(/v=(\d+)/)?.[1],
      preparing: !!document
        .querySelector(".reader")
        ?.classList.contains("is-preparing"),
      gateVisible: !document.querySelector(".reader-backer-gate")?.hidden,
      loadingCount: document.querySelectorAll(".reader-page.is-loading").length,
      failedCount: document.querySelectorAll(".reader-page.is-failed").length,
      withSrc: Array.from(document.querySelectorAll("#book img")).filter((i) =>
        i.getAttribute("src"),
      ).length,
      visible,
      contentImgs,
      failures,
      pass: failures.length === 0 && contentImgs.length > 0,
    };
  }, tag);
}

async function waitReady(page) {
  for (let i = 0; i < 50; i++) {
    const ready = await page.evaluate(() => {
      const root = document.querySelector(".reader");
      const cover = Array.from(document.querySelectorAll("img")).find((img) =>
        (img.alt || "").toLowerCase().includes("cover"),
      );
      return (
        !!root &&
        !root.classList.contains("is-preparing") &&
        cover &&
        cover.naturalWidth > 0
      );
    });
    if (ready) return true;
    await sleep(200);
  }
  return false;
}

async function speedFlipTo(page, targetContent, maxClicks) {
  return page.evaluate(
    async ({ targetContent: target, maxClicks: max }) => {
      const sleepInner = (ms) => new Promise((r) => setTimeout(r, ms));
      const nextBtn = document.querySelector('[data-action="next"]');
      const clicks = [];
      for (let i = 0; i < max; i++) {
        const before = document.querySelector("[data-page]")?.textContent || "";
        const mBefore = before.match(/(\d+)\s*\//);
        if (mBefore && Number(mBefore[1]) >= target) {
          break;
        }
        if (nextBtn) nextBtn.click();
        await sleepInner(70);
        const after = document.querySelector("[data-page]")?.textContent || "";
        clicks.push({ i, before, after });
        const m = after.match(/(\d+)\s*\//);
        if (m && Number(m[1]) >= target) break;
      }
      await sleepInner(500);
      return clicks;
    },
    { targetContent, maxClicks },
  );
}

async function settleVisible(page, tag, attempts = 8) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    last = await snap(page, `${tag}-t${i}`);
    if (last.pass) return last;
    await sleep(400);
  }
  return last;
}

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.removeItem("intrepid_reader_page_lifecycle_enabled");
    localStorage.removeItem("intrepid_reader_page_lifecycle_disabled");
    localStorage.setItem("intrepid_reader_backer", "granted");
    localStorage.setItem("intrepid_reader_issue_002", "granted");
    localStorage.setItem("intrepid_reader_issue_003", "granted");
    sessionStorage.setItem("intrepid_archive_entered", "1");
  } catch (e) {}
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
const booted = await waitReady(page);
const report = {
  url,
  browserPath,
  booted,
  steps: [],
  boundaries: [],
};

if (!booted) {
  report.bootSnap = await snap(page, "boot-failed");
  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.error(JSON.stringify({ ok: false, reason: "boot-failed", report }, null, 2));
  await browser.close();
  process.exit(2);
}

report.steps.push(await snap(page, "after-boot"));

let allPass = true;
for (const boundary of BOUNDARIES) {
  const clicks = await speedFlipTo(
    page,
    boundary.targetContent,
    boundary.maxClicks,
  );
  const immediate = await snap(page, `${boundary.name}-immediate`);
  const settled = await settleVisible(page, boundary.name, 10);
  await page.screenshot({
    path: path.join(outDir, `${boundary.name}.png`),
    fullPage: false,
  });
  const entry = {
    name: boundary.name,
    targetContent: boundary.targetContent,
    clicks: clicks.length,
    lastClick: clicks[clicks.length - 1] || null,
    immediate,
    settled,
    pass: !!(settled && settled.pass && !settled.hasLifecycle && !settled.gateVisible),
  };
  report.boundaries.push(entry);
  if (!entry.pass) allPass = false;
}

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

const summary = {
  ok: allPass,
  url,
  assetVersion: report.steps[0]?.assetVersion,
  hasLifecycle: report.steps[0]?.hasLifecycle,
  boundaries: report.boundaries.map((b) => ({
    name: b.name,
    pass: b.pass,
    label: b.settled?.label,
    failures: b.settled?.failures,
    failedCount: b.settled?.failedCount,
    loadingCount: b.settled?.loadingCount,
  })),
  outDir,
};

console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(allPass ? 0 : 3);
