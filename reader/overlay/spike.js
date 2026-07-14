const ENABLE_READER_MAGNIFY = true;
const READER_MAGNIFY_DISABLE_KEY = "intrepid_reader_magnify_disabled";
const READER_MAGNIFY_ENABLED_KEY = "intrepid_reader_magnify_enabled";
const READER_HELP_TIP_SEEN_KEY = "intrepid_reader_help_tip_seen_v1";

// P0 page readiness contract — strangler under reader/plugins/page-lifecycle/
// Kill switch: localStorage intrepid_reader_page_lifecycle_disabled = "1"
// Build 175: default OFF — restore pre-173 readable book after Loading-stuck regression.
// Opt-in: set localStorage intrepid_reader_page_lifecycle_enabled = "1" (and do not set disabled).
const ENABLE_PAGE_LIFECYCLE = false;
const PAGE_LIFECYCLE_DISABLE_KEY = "intrepid_reader_page_lifecycle_disabled";
const PAGE_LIFECYCLE_MANIFEST_URL = "./assets/manifest.json";
const PAGE_LIFECYCLE_MAX_IN_FLIGHT = 4;
const PAGE_LIFECYCLE_TIMEOUT_MS = 8000;
// Opening hard-fail deadline (must exceed per-image timeout; never soft-open empty book).
const VEIL_OPENING_DEADLINE_MS = 16000;

const issuePageCounts = [
  { issue: "001", pages: 21 },
  { issue: "002", pages: 21 },
  { issue: "003", pages: 26 },
];

const NATIVE_PAGE_WIDTH = 1100;
const NATIVE_PAGE_HEIGHT = 1674;
const PAGE_ASPECT = NATIVE_PAGE_WIDTH / NATIVE_PAGE_HEIGHT;

const contentPages = issuePageCounts.flatMap(({ issue, pages: pageCount }) =>
  Array.from(
    { length: pageCount },
    (_, index) => {
      const contentNumber =
        issuePageCounts
          .filter((entry) => entry.issue < issue)
          .reduce((total, entry) => total + entry.pages, 0) +
        index +
        1;

      return {
        contentNumber,
        src: `./assets/pages/page-${String(contentNumber).padStart(3, "0")}.webp`,
      };
    },
  ),
);

const coverSpread = [
  { blank: true, label: "Inside back cover" },
  {
    cover: true,
    src: "./assets/pages/cover-hardcover.webp",
  },
];

const pageEntries = [
  ...coverSpread,
  ...contentPages.flatMap((page) => {
    if (page.contentNumber === 43) {
      return [{ blank: true, label: "Chapter 3 spacer" }, page];
    }

    return [page];
  }),
];

// Issue 1 = cover spread (2) + 21 pages → indices 0–22
const ISSUE_001_LAST_INDEX = 22;
const ISSUE_002_START = 23;
const ISSUE_003_START = 45;
const PRELOAD_BACK = 3;
const PRELOAD_AHEAD = 5;
const LINK_PRELOAD_AHEAD = 3;
// Cover spread (0–1) + first 2–3 content spreads (2–7). Prefer these before
// reveal. Keep well below full-book so ~70 concurrent WebPs cannot starve the pool.
const OPENING_READY_LAST_INDEX = 7;
// First visible art must be paint-ready before unveil (index 0 is blank tip-in).
const OPENING_CRITICAL_LAST_INDEX = 1;
const NEIGHBORHOOD_RADIUS = 2;
const WARM_QUEUE_BATCH = 2;
const WARM_QUEUE_GAP_MS = 120;
const IMAGE_LOAD_MAX_ATTEMPTS = 2;
const IMAGE_LOAD_TIMEOUT_MS = 4000;
// Build 180: legacy no longer soft-opens empty/white. Deadline hard-fails like
// lifecycle unless the critical opening spread is already paint-ready.
const PAGE_ASSET_VERSION = 180;
const SOFT_TOAST_MS = 4200;
// Legacy path only: cap concurrent src assigns so Issue 2–3 background warm
// cannot starve the spread the reader is looking at (build 178 nail).
const LEGACY_MAX_IN_FLIGHT = 4;
const LEGACY_NEIGHBOR_BURST = 2; // neighbors may briefly exceed MAX by this
const LEGACY_PRIORITY_VISIBLE = 0;
const LEGACY_PRIORITY_NEIGHBOR = 1;
const LEGACY_PRIORITY_BACKGROUND = 2;
const VISIBLE_WATCHDOG_MS = 5000;
// Guarded decode race for visible/near-visible — never block Loading forever
// (build 173 decode-hang). Timeout falls back to complete+naturalWidth.
const LEGACY_DECODE_TIMEOUT_MS = 1200;
const pageImages = new Array(pageEntries.length);
const warmedPages = new Set();
// Legacy path: "load OK" set. Lifecycle path uses loader painted/decoded states instead.
const decodedPages = new Set();
const prefetchImages = {};
const linkPreloads = {};
let lastPageIndex = 0;
let readerReady = false;
let backgroundWarmTimer = null;
// Non-cancelling range list: Issue 1 → 2 → 3 chain without aborting prior work.
let backgroundWarmRanges = [];
let legacyInFlight = 0;
const legacyInFlightPages = new Set();
let visibleWatchdogTimer = null;
let pageLifecycle = null;
let pageManifestById = {};
let openingPrimeIndices = [];
let lifecycleBootPageElements = null;

const elements = {
  book: document.querySelector("#book"),
  page: document.querySelector("[data-page]"),
  controls: document.querySelector(".controls"),
  stage: document.querySelector(".reader-stage"),
  readerRoot: document.querySelector(".reader"),
  loadVeil: document.querySelector("[data-reader-load-veil]"),
  loadProgress: document.querySelector("[data-reader-load-progress]"),
  helpTip: document.querySelector("[data-reader-help-tip]"),
  helpTipMagnify: document.querySelector("[data-reader-help-magnify]"),
  helpOpen: document.querySelector('[data-action="help-open"]'),
  helpDismiss: document.querySelector('[data-action="help-dismiss"]'),
};
let hasReaderMagnifyPlugin = false;
let bootOpened = false;
let veilDeadlineId = null;

function isReaderMagnifyRuntimeAllowed() {
  if (!ENABLE_READER_MAGNIFY) {
    return false;
  }
  try {
    return localStorage.getItem(READER_MAGNIFY_DISABLE_KEY) !== "1";
  } catch (err) {
    return true;
  }
}

function isPageLifecycleEnabled() {
  try {
    if (localStorage.getItem(PAGE_LIFECYCLE_DISABLE_KEY) === "1") {
      return false;
    }
    // Default OFF (ENABLE_PAGE_LIFECYCLE false). Explicit opt-in for continued R&D.
    if (localStorage.getItem("intrepid_reader_page_lifecycle_enabled") === "1") {
      return true;
    }
  } catch (err) {
    /* ignore */
  }
  return !!ENABLE_PAGE_LIFECYCLE;
}

function loadPageLifecyclePlugin(callback) {
  if (!isPageLifecycleEnabled()) {
    if (typeof callback === "function") {
      callback(false);
    }
    return;
  }

  if (window.LegendistPageLifecycle) {
    if (elements.readerRoot) {
      elements.readerRoot.classList.add("has-page-lifecycle");
    }
    if (typeof callback === "function") {
      callback(true);
    }
    return;
  }

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "../plugins/page-lifecycle/page-lifecycle.css?v=175";
  document.head.appendChild(css);

  var script = document.createElement("script");
  script.src = "../plugins/page-lifecycle/page-loader.js?v=175";
  script.onload = function () {
    if (elements.readerRoot) {
      elements.readerRoot.classList.add("has-page-lifecycle");
    }
    if (typeof callback === "function") {
      callback(!!window.LegendistPageLifecycle);
    }
  };
  script.onerror = function () {
    if (typeof callback === "function") {
      callback(false);
    }
  };
  document.head.appendChild(script);
}

function manifestAssetIdForEntry(entry) {
  if (!entry || entry.blank) {
    return null;
  }
  if (entry.cover) {
    return "cover-hardcover";
  }
  if (entry.contentNumber) {
    return "page-" + String(entry.contentNumber).padStart(3, "0");
  }
  return null;
}

function lifecyclePrimaryUrl(pageIndex) {
  var entry = pageEntries[pageIndex];
  if (!entry || entry.blank) {
    return "";
  }
  var id = manifestAssetIdForEntry(entry);
  var asset = id && pageManifestById[id];
  if (asset && window.LegendistPageLifecycle) {
    return window.LegendistPageLifecycle.assetUrlFromManifest(
      asset,
      "webp",
      "./assets/",
    );
  }
  return entry.src || "";
}

function lifecycleFallbackUrl(pageIndex) {
  var entry = pageEntries[pageIndex];
  if (!entry || entry.blank) {
    return "";
  }
  // Only cover-hardcover.jpg ships today. Manifest lists .jpg for every page, but
  // those 404 — a transient WebP error then became a hard fail. Cover keeps JPG.
  if (!entry.cover) {
    return "";
  }
  var id = manifestAssetIdForEntry(entry);
  var asset = id && pageManifestById[id];
  if (asset && window.LegendistPageLifecycle) {
    return window.LegendistPageLifecycle.assetUrlFromManifest(
      asset,
      "fallback",
      "./assets/",
    );
  }
  if (entry.src && entry.src.indexOf(".webp") >= 0) {
    return entry.src.replace(/\.webp(\?.*)?$/, ".jpg$1");
  }
  return "";
}

function updatePagePlaceholder(pageIndex, state) {
  var image = pageImages[pageIndex];
  if (!image || !image.parentElement) {
    return;
  }
  var page = image.parentElement;
  var ph = page.querySelector("[data-page-placeholder]");

  if (state === "painted" || state === "decoded") {
    if (ph && ph.parentNode) {
      ph.parentNode.removeChild(ph);
    }
    return;
  }

  if (state !== "loading" && state !== "failed") {
    return;
  }

  if (!ph) {
    ph = document.createElement("div");
    ph.className = "reader-page-placeholder";
    ph.setAttribute("data-page-placeholder", "");
    page.appendChild(ph);
  }

  if (state === "loading") {
    ph.innerHTML =
      '<p class="reader-page-placeholder__msg">Loading page&hellip;</p>';
    return;
  }

  ph.innerHTML =
    '<p class="reader-page-placeholder__msg">Page couldn&rsquo;t load</p>' +
    '<button type="button" class="reader-page-placeholder__retry" data-page-retry>Retry</button>';
  var btn = ph.querySelector("[data-page-retry]");
  if (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (pageLifecycle) {
        pageLifecycle.retry(pageIndex);
      } else {
        retryLegacyPageImage(pageIndex);
      }
    });
  }
}

function retryLegacyPageImage(pageIndex) {
  var image = pageImages[pageIndex];
  var entry = pageEntries[pageIndex];
  if (!image || !entry || entry.blank) {
    return;
  }
  warmedPages.delete(pageIndex);
  decodedPages.delete(pageIndex);
  if (image.parentElement) {
    image.parentElement.classList.remove("is-failed");
  }
  setPageImageLoading(pageIndex, true);
  updatePagePlaceholder(pageIndex, "loading");
  image.loading = "eager";
  if ("fetchPriority" in image) {
    image.fetchPriority = "high";
  }
  image.src = pageAssetUrl(entry, 1);
  beginLegacyPageLoad(pageIndex, LEGACY_PRIORITY_VISIBLE);
}

function createLifecycleLoader() {
  if (!window.LegendistPageLifecycle) {
    return null;
  }
  return window.LegendistPageLifecycle.create({
    maxInFlight: PAGE_LIFECYCLE_MAX_IN_FLIGHT,
    timeoutMs: PAGE_LIFECYCLE_TIMEOUT_MS,
    assetVersion: PAGE_ASSET_VERSION,
    pageImages: pageImages,
    pageEntries: pageEntries,
    canAccess: canAccessPageIndex,
    getPrimaryUrl: lifecyclePrimaryUrl,
    getFallbackUrl: lifecycleFallbackUrl,
    onPlaceholder: updatePagePlaceholder,
  });
}

function loadReaderMagnifyPlugin(callback) {
  if (!isReaderMagnifyRuntimeAllowed()) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "../plugins/magnify/magnify-plugin.css?v=9";
  document.head.appendChild(css);

  var script = document.createElement("script");
  script.src = "../plugins/magnify/magnify-plugin.js?v=9";
  script.onload = function () {
    hasReaderMagnifyPlugin = !!window.IntrepidReaderMagnify;
    if (typeof callback === "function") {
      callback();
    }
  };
  script.onerror = function () {
    hasReaderMagnifyPlugin = false;
    if (typeof callback === "function") {
      callback();
    }
  };
  document.head.appendChild(script);
}

function initReaderMagnify() {
  if (!window.IntrepidReaderMagnify || !elements.readerRoot) {
    return;
  }
  hasReaderMagnifyPlugin = true;

  window.IntrepidReaderMagnify.mount({
    root: elements.readerRoot,
    enabled: true,
    getCurrentPageImage: function () {
      return getReaderReferencePageImage();
    },
    getPageImageAtPoint: function (clientX, clientY) {
      return resolvePageImageAtPoint(clientX, clientY);
    },
    getVisibleSpreadImages: function () {
      return getVisibleSpreadImages();
    },
    onDismissInTurnZone: function (clientX, clientY) {
      if (
        !window.IntrepidReaderMagnify ||
        typeof window.IntrepidReaderMagnify.getPageZone !== "function"
      ) {
        return;
      }
      var zone = window.IntrepidReaderMagnify.getPageZone(clientX, clientY);
      if (zone !== "left" && zone !== "right") {
        return;
      }
      triggerPageFlipAudio();
      if (zone === "right") {
        if (!pageFlip || !readerReady) {
          return;
        }
        if (!requestPageTurn(lastPageIndex + 1)) {
          return;
        }
        warmFlipTargetsFromDirection(true);
        pageFlip.flipNext("bottom");
        return;
      }
      if (!pageFlip || !readerReady) {
        return;
      }
      warmFlipTargetsFromDirection(false);
      pageFlip.flipPrev("bottom");
    },
  });
}

function canUseStorage() {
  try {
    return typeof localStorage !== "undefined";
  } catch (err) {
    return false;
  }
}

function hasSeenReaderHelpTip() {
  if (!canUseStorage()) {
    return false;
  }
  return localStorage.getItem(READER_HELP_TIP_SEEN_KEY) === "1";
}

function markReaderHelpTipSeen() {
  if (!canUseStorage()) {
    return;
  }
  localStorage.setItem(READER_HELP_TIP_SEEN_KEY, "1");
}

function isMagnifyTipAvailable() {
  return isReaderMagnifyRuntimeAllowed() && hasReaderMagnifyPlugin;
}

function updateReaderHelpTipCopy() {
  if (!elements.helpTipMagnify) {
    return;
  }
  if (isMagnifyTipAvailable()) {
    elements.helpTipMagnify.textContent =
      " Magnify is available via the Lens control (or M key).";
    return;
  }
  elements.helpTipMagnify.textContent =
    " Magnify is unavailable on this device or build.";
}

function hideReaderHelpTip() {
  if (!elements.helpTip) {
    return;
  }
  elements.helpTip.hidden = true;
}

function showReaderHelpTip(options) {
  if (!elements.helpTip) {
    return;
  }
  updateReaderHelpTipCopy();
  elements.helpTip.hidden = false;
  if (options && options.markSeen) {
    markReaderHelpTipSeen();
  }
}

function initReaderHelpTip() {
  updateReaderHelpTipCopy();
  if (!hasSeenReaderHelpTip()) {
    showReaderHelpTip({ markSeen: true });
  } else {
    hideReaderHelpTip();
  }
  if (elements.helpDismiss) {
    elements.helpDismiss.addEventListener("click", function () {
      hideReaderHelpTip();
      markReaderHelpTipSeen();
    });
  }
  if (elements.helpOpen) {
    elements.helpOpen.addEventListener("click", function () {
      showReaderHelpTip({ markSeen: true });
    });
  }
}

function getStagePadding() {
  const style = getComputedStyle(elements.stage);
  return {
    x: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
    y: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
  };
}

function fitBookToStage() {
  const padding = getStagePadding();
  const availW = Math.max(0, elements.stage.clientWidth - padding.x);
  const availH = Math.max(0, elements.stage.clientHeight - padding.y);

  let pageW = Math.min(availW, availH * PAGE_ASPECT);
  let pageH = pageW / PAGE_ASPECT;

  let spreadPageW = Math.min(availW / 2, availH * PAGE_ASPECT);
  let spreadPageH = spreadPageW / PAGE_ASPECT;

  const preferSpread = availW >= pageW * 1.55;
  if (preferSpread) {
    pageW = spreadPageW;
    pageH = spreadPageH;
  }

  pageW = Math.max(1, Math.floor(pageW));
  pageH = Math.max(1, Math.floor(pageH));

  const boxW = preferSpread ? pageW * 2 : pageW;
  const boxH = pageH;

  elements.book.style.width = `${boxW}px`;
  elements.book.style.height = `${boxH}px`;

  return { pageW, pageH, boxW, boxH };
}

function setPageLabel(pageIndex) {
  const currentPage = pageEntries[pageIndex];
  const nextPage = pageEntries[pageIndex + 1];
  if (currentPage?.cover || nextPage?.cover) {
    elements.page.textContent = "Cover";
    return;
  }
  const contentNumber = currentPage?.contentNumber || nextPage?.contentNumber || contentPages.length;
  elements.page.textContent = `${contentNumber} / ${contentPages.length}`;
}

function triggerPageFlipAudio() {
  if (window.ReaderAudio) {
    window.ReaderAudio.unlock();
    window.ReaderAudio.onPageFlip();
  }
}

function pageAssetUrl(entry, attempt) {
  if (!entry || !entry.src) {
    return "";
  }
  var query = "v=" + PAGE_ASSET_VERSION;
  if (attempt > 0) {
    query += "&r=" + attempt + "&t=" + Date.now();
  }
  return entry.src + (entry.src.indexOf("?") >= 0 ? "&" : "?") + query;
}

function decodePageImage(pageIndex) {
  if (pageLifecycle) {
    return pageLifecycle.request(
      pageIndex,
      pageLifecycle.PRIORITY_NEIGHBOR,
    );
  }
  return ensurePageImageReady(pageIndex, { soft: true });
}

function ensurePageImageReady(pageIndex, options) {
  if (pageLifecycle) {
    var priority =
      options && options.visible
        ? pageLifecycle.PRIORITY_VISIBLE
        : pageLifecycle.PRIORITY_NEIGHBOR;
    pageLifecycle.enqueue(pageIndex, priority);
    return pageLifecycle.whenSettled(pageIndex);
  }

  var soft = !!(options && options.soft);
  var visible = !!(options && options.visible);
  return new Promise(function (resolve) {
    if (pageIndex < 0 || pageIndex >= pageEntries.length) {
      resolve(false);
      return;
    }

    var entry = pageEntries[pageIndex];
    if (!entry || entry.blank) {
      resolve(true);
      return;
    }

    if (decodedPages.has(pageIndex)) {
      resolve(true);
      return;
    }

    var image = pageImages[pageIndex];
    if (!image) {
      resolve(false);
      return;
    }

    // Opening / visible waits must show paper Loading — never a bare white sheet
    // while bytes are still in flight (build 180).
    if (!decodedPages.has(pageIndex) && !(image.complete && image.naturalWidth > 0)) {
      setPageImageLoading(pageIndex, true);
      updatePagePlaceholder(pageIndex, "loading");
    }

    var attempt = 0;
    var settled = false;
    var timeoutId = null;
    var progressiveId = null;

    function settle(ok) {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (progressiveId != null) {
        clearInterval(progressiveId);
        progressiveId = null;
      }
      releaseLegacyInFlight(pageIndex);
      resolve(ok);
    }

    function markReady() {
      decodedPages.add(pageIndex);
      warmedPages.add(pageIndex);
      setPageImageLoading(pageIndex, false);
      if (image.parentElement) {
        image.parentElement.classList.remove("is-failed");
      }
      updatePagePlaceholder(pageIndex, "painted");
      settle(true);
    }

    function markFailed() {
      setPageImageLoading(pageIndex, false);
      if (image.parentElement) {
        image.parentElement.classList.add("is-failed");
      }
      updatePagePlaceholder(pageIndex, "failed");
      settle(false);
    }

    function isLoaded() {
      // Honest paint gate: naturalWidth alone can appear before decode finishes
      // (StPageFlip may sample a half-white incomplete bitmap). Require complete.
      return !!(image.complete && image.naturalWidth > 0);
    }

    function isBrokenComplete() {
      return !!(image.complete && image.naturalWidth === 0 && image.getAttribute("src"));
    }

    function revealIfPaintReady() {
      // Never clear Loading / declare painted on mere naturalWidth > 0.
      if (isLoaded()) {
        setPageImageLoading(pageIndex, false);
        updatePagePlaceholder(pageIndex, "painted");
      }
    }

    function afterLoaded() {
      if (!isLoaded()) {
        return;
      }
      var nearVisible = isNearVisiblePage(pageIndex) || visible;
      // Far background: mark ready on complete+width; decode is fire-and-forget.
      if (!nearVisible || typeof image.decode !== "function") {
        markReady();
        if (typeof image.decode === "function") {
          try {
            var bgDecode = image.decode();
            if (bgDecode && typeof bgDecode.catch === "function") {
              bgDecode.catch(function () {});
            }
          } catch (errBg) {
            /* ignore */
          }
        }
        return;
      }
      // Visible/near-visible: brief decode race. Hang must NOT leave infinite
      // Loading (173 regression) — timeout falls back to complete+naturalWidth.
      var decodeSettled = false;
      function finishPaint() {
        if (decodeSettled) {
          return;
        }
        decodeSettled = true;
        if (isLoaded()) {
          markReady();
        }
        // If bitmap somehow vanished, leave Loading; outer timeout / watchdog fails.
      }
      var decodeTimer = setTimeout(finishPaint, LEGACY_DECODE_TIMEOUT_MS);
      try {
        var decoded = image.decode();
        if (decoded && typeof decoded.then === "function") {
          decoded
            .then(function () {
              clearTimeout(decodeTimer);
              finishPaint();
            })
            .catch(function () {
              clearTimeout(decodeTimer);
              finishPaint();
            });
        } else {
          clearTimeout(decodeTimer);
          markReady();
        }
      } catch (errDecode) {
        clearTimeout(decodeTimer);
        markReady();
      }
    }

    function bindAttempt() {
      if (isLoaded()) {
        afterLoaded();
        return;
      }

      function onLoad() {
        cleanup();
        afterLoaded();
      }

      function onError() {
        cleanup();
        retryOrFail();
      }

      function cleanup() {
        image.removeEventListener("load", onLoad);
        image.removeEventListener("error", onError);
      }

      function retryOrFail() {
        attempt += 1;
        if (attempt >= IMAGE_LOAD_MAX_ATTEMPTS) {
          markFailed();
          return;
        }
        image.src = pageAssetUrl(entry, attempt);
        bindAttempt();
      }

      if (isBrokenComplete()) {
        retryOrFail();
        return;
      }

      image.addEventListener("load", onLoad);
      image.addEventListener("error", onError);

      if (!image.getAttribute("src")) {
        image.src = pageAssetUrl(entry, attempt);
      }
      revealIfPaintReady();
    }

    progressiveId = setInterval(revealIfPaintReady, 200);

    timeoutId = setTimeout(function () {
      if (isLoaded()) {
        afterLoaded();
        return;
      }
      // Near-visible pages never soft-abandon into a silent blank — retry then fail.
      var nearVisible = isNearVisiblePage(pageIndex) || visible;
      if (nearVisible && attempt + 1 < IMAGE_LOAD_MAX_ATTEMPTS) {
        attempt += 1;
        image.src = pageAssetUrl(entry, attempt);
        bindAttempt();
        timeoutId = setTimeout(function () {
          if (isLoaded()) {
            afterLoaded();
          } else {
            markFailed();
          }
        }, IMAGE_LOAD_TIMEOUT_MS);
        return;
      }
      // Do NOT settle(true) on naturalWidth-without-complete (half-white risk).
      if (isLoaded()) {
        afterLoaded();
        return;
      }
      if (nearVisible) {
        markFailed();
        return;
      }
      // Far background: free the slot but KEEP is-loading; late load still paints.
      settle(false);
    }, soft && !visible ? Math.min(2500, IMAGE_LOAD_TIMEOUT_MS) : IMAGE_LOAD_TIMEOUT_MS);

    bindAttempt();
  });
}

function isNearVisiblePage(pageIndex) {
  return Math.abs(pageIndex - lastPageIndex) <= NEIGHBORHOOD_RADIUS;
}

function releaseLegacyInFlight(pageIndex) {
  if (legacyInFlightPages.has(pageIndex)) {
    legacyInFlightPages.delete(pageIndex);
    legacyInFlight = Math.max(0, legacyInFlight - 1);
  }
  scheduleBackgroundWarmTick();
}

function claimLegacyInFlight(pageIndex) {
  if (legacyInFlightPages.has(pageIndex)) {
    return true;
  }
  legacyInFlightPages.add(pageIndex);
  legacyInFlight += 1;
  return true;
}

function neighborhoodNeedsBandwidth() {
  for (var offset = -NEIGHBORHOOD_RADIUS; offset <= NEIGHBORHOOD_RADIUS; offset += 1) {
    var idx = lastPageIndex + offset;
    if (idx < 0 || idx >= pageEntries.length) {
      continue;
    }
    var entry = pageEntries[idx];
    if (!entry || entry.blank) {
      continue;
    }
    if (!canAccessPageIndex(idx)) {
      continue;
    }
    if (!pageImageIsPaintReady(idx) && !pageImageHasBitmap(idx)) {
      return true;
    }
  }
  return false;
}

function pageImageHasBitmap(pageIndex) {
  var image = pageImages[pageIndex];
  // Same contract as paint-ready: complete + dimensions. naturalWidth alone
  // is not enough (incremental decode / StPageFlip half-white sample).
  return !!(image && image.complete && image.naturalWidth > 0);
}

function beginLegacyPageLoad(pageIndex, priority) {
  var image = pageImages[pageIndex];
  if (!image) {
    return;
  }
  claimLegacyInFlight(pageIndex);
  image.loading = "eager";
  if ("fetchPriority" in image) {
    image.fetchPriority =
      priority <= LEGACY_PRIORITY_NEIGHBOR ? "high" : "low";
  }
  assignPageImageSrc(pageIndex, 0);
  if (!pageImageHasBitmap(pageIndex)) {
    setPageImageLoading(pageIndex, true);
    updatePagePlaceholder(pageIndex, "loading");
  }
  ensurePageImageReady(pageIndex, {
    soft: priority > LEGACY_PRIORITY_NEIGHBOR,
    visible: priority <= LEGACY_PRIORITY_VISIBLE || isNearVisiblePage(pageIndex),
  }).then(function (ok) {
    if (ok || pageImageHasBitmap(pageIndex) || pageImageIsPaintReady(pageIndex)) {
      setPageImageLoading(pageIndex, false);
      if (image.parentElement) {
        image.parentElement.classList.remove("is-failed");
      }
      updatePagePlaceholder(pageIndex, "painted");
      return;
    }
    // !ok: markFailed already set failed+Retry when attempts exhausted.
    // Soft background settle(false) keeps is-loading so we never flash a void.
  });
}

function injectLinkPreload(pageIndex) {
  // Lifecycle path owns every image request — skip orphan link preloads.
  if (pageLifecycle || isPageLifecycleEnabled()) {
    return;
  }
  if (pageIndex < 0 || pageIndex >= pageEntries.length) {
    return;
  }
  if (!canAccessPageIndex(pageIndex)) {
    return;
  }

  const entry = pageEntries[pageIndex];
  if (!entry || entry.blank) {
    return;
  }

  var href = pageAssetUrl(entry, 0);
  if (linkPreloads[href]) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = href;
  document.head.appendChild(link);
  linkPreloads[href] = link;
}

function syncLinkPreloads(centerIndex) {
  // Legacy nail (build 178): link preloads re-starve the host pool under Firefox
  // and do not guarantee DOM paint. Neighborhood warm owns readiness instead.
  if (pageLifecycle || isPageLifecycleEnabled()) {
    return;
  }
  void centerIndex;
}

function assignPageImageSrc(pageIndex, attempt) {
  if (pageLifecycle) {
    pageLifecycle.enqueue(pageIndex, pageLifecycle.PRIORITY_NEIGHBOR);
    return lifecyclePrimaryUrl(pageIndex);
  }
  var entry = pageEntries[pageIndex];
  var image = pageImages[pageIndex];
  if (!entry || entry.blank || !image) {
    return "";
  }
  // Eager before src on all assign paths.
  image.loading = "eager";
  var href = pageAssetUrl(entry, attempt || 0);
  if (image.getAttribute("src") !== href) {
    image.src = href;
  }
  return href;
}

function setPageImageLoading(pageIndex, isLoading) {
  var image = pageImages[pageIndex];
  if (!image || !image.parentElement) {
    return;
  }
  image.parentElement.classList.toggle("is-loading", !!isLoading);
  if (!isLoading) {
    image.parentElement.classList.remove("is-failed");
  }
}

function pageImageIsPaintReady(pageIndex) {
  var entry = pageEntries[pageIndex];
  if (!entry || entry.blank) {
    return true;
  }
  if (pageLifecycle) {
    return pageLifecycle.isPaintReady(pageIndex);
  }
  if (decodedPages.has(pageIndex)) {
    return true;
  }
  var image = pageImages[pageIndex];
  return !!(image && image.complete && image.naturalWidth > 0);
}

function warmPageImage(pageIndex, priority) {
  if (pageIndex < 0 || pageIndex >= pageEntries.length) {
    return;
  }

  if (!canAccessPageIndex(pageIndex)) {
    return;
  }

  const entry = pageEntries[pageIndex];
  if (entry.blank) {
    return;
  }

  const image = pageImages[pageIndex];
  if (!image) {
    return;
  }

  var pri =
    typeof priority === "number" ? priority : LEGACY_PRIORITY_NEIGHBOR;

  if (pageLifecycle) {
    var lifePri =
      pri <= LEGACY_PRIORITY_VISIBLE
        ? pageLifecycle.PRIORITY_VISIBLE
        : pri <= LEGACY_PRIORITY_NEIGHBOR
          ? pageLifecycle.PRIORITY_NEIGHBOR
          : pageLifecycle.PRIORITY_BACKGROUND;
    pageLifecycle.enqueue(pageIndex, lifePri);
    warmedPages.add(pageIndex);
    return;
  }

  if (pageImageIsPaintReady(pageIndex) || pageImageHasBitmap(pageIndex)) {
    setPageImageLoading(pageIndex, false);
    warmedPages.add(pageIndex);
    return;
  }

  // Already fetching this DOM img — don't stack duplicate load watchers.
  if (legacyInFlightPages.has(pageIndex) && image.getAttribute("src")) {
    warmedPages.add(pageIndex);
    return;
  }

  // Visible always assigns immediately. Neighbors may briefly exceed MAX by
  // LEGACY_NEIGHBOR_BURST; beyond that they queue so speed-flips cannot reopen
  // the uncapped flood that starved Issue 2.
  if (pri <= LEGACY_PRIORITY_VISIBLE) {
    beginLegacyPageLoad(pageIndex, pri);
    warmedPages.add(pageIndex);
    return;
  }
  if (pri <= LEGACY_PRIORITY_NEIGHBOR) {
    if (legacyInFlight < LEGACY_MAX_IN_FLIGHT + LEGACY_NEIGHBOR_BURST) {
      beginLegacyPageLoad(pageIndex, pri);
      warmedPages.add(pageIndex);
    } else {
      enqueueBackgroundPage(pageIndex);
    }
    return;
  }

  // Background: only assign src when under the concurrency cap so Issue 3
  // trickle cannot starve Issue 2 destination pages during a fast flip.
  if (legacyInFlight >= LEGACY_MAX_IN_FLIGHT || neighborhoodNeedsBandwidth()) {
    enqueueBackgroundPage(pageIndex);
    return;
  }

  beginLegacyPageLoad(pageIndex, pri);
  warmedPages.add(pageIndex);
}

function enqueueBackgroundPage(pageIndex) {
  backgroundWarmRanges.unshift({
    next: pageIndex,
    end: pageIndex + 1,
  });
  scheduleBackgroundWarmTick();
}

// Assign src + warm decode for current page ± NEIGHBORHOOD_RADIUS before/during flip.
function ensureNeighborhoodPages(centerIndex) {
  var center =
    typeof centerIndex === "number" && !isNaN(centerIndex)
      ? centerIndex
      : lastPageIndex;
  if (pageLifecycle) {
    pageLifecycle.setCenter(center, NEIGHBORHOOD_RADIUS, PRELOAD_AHEAD);
    return;
  }
  for (var offset = -NEIGHBORHOOD_RADIUS; offset <= NEIGHBORHOOD_RADIUS; offset += 1) {
    var pri =
      Math.abs(offset) <= 1 ? LEGACY_PRIORITY_VISIBLE : LEGACY_PRIORITY_NEIGHBOR;
    warmPageImage(center + offset, pri);
  }
}

function armVisibleWatchdog(centerIndex) {
  if (pageLifecycle) {
    return;
  }
  var center =
    typeof centerIndex === "number" && !isNaN(centerIndex)
      ? centerIndex
      : lastPageIndex;
  if (visibleWatchdogTimer != null) {
    clearTimeout(visibleWatchdogTimer);
    visibleWatchdogTimer = null;
  }
  visibleWatchdogTimer = setTimeout(function () {
    visibleWatchdogTimer = null;
    for (var offset = -1; offset <= 1; offset += 1) {
      var idx = center + offset;
      if (idx < 0 || idx >= pageEntries.length) {
        continue;
      }
      var entry = pageEntries[idx];
      if (!entry || entry.blank || !canAccessPageIndex(idx)) {
        continue;
      }
      if (pageImageIsPaintReady(idx) || pageImageHasBitmap(idx)) {
        setPageImageLoading(idx, false);
        updatePagePlaceholder(idx, "painted");
        continue;
      }
      // Still blank after watchdog — force cache-busted retry → fail+Retry UI.
      retryLegacyPageImage(idx);
    }
  }, VISIBLE_WATCHDOG_MS);
}

function scheduleBackgroundWarmTick() {
  if (backgroundWarmTimer != null) {
    return;
  }
  if (!backgroundWarmRanges.length) {
    return;
  }
  backgroundWarmTimer = setTimeout(tickBackgroundWarm, WARM_QUEUE_GAP_MS);
}

// After unveil: trickle-warm upcoming pages so flips stay full without
// re-starving the pool the way bootstrapIssueOne used to.
// CRITICAL: ranges APPEND — never cancel an in-flight Issue 1/2 warm when
// Issue 2/3 unlock scheduling fires (that left Issue 2 cold for backers).
function queueBackgroundWarm(startIndex, endIndexExclusive) {
  var next = Math.max(0, startIndex | 0);
  var end = Math.min(
    pageEntries.length,
    typeof endIndexExclusive === "number" ? endIndexExclusive : pageEntries.length,
  );
  if (next >= end) {
    return;
  }
  backgroundWarmRanges.push({ next: next, end: end });
  if (backgroundWarmTimer == null) {
    backgroundWarmTimer = setTimeout(tickBackgroundWarm, 0);
  }
}

function tickBackgroundWarm() {
  backgroundWarmTimer = null;

  if (neighborhoodNeedsBandwidth() || legacyInFlight >= LEGACY_MAX_IN_FLIGHT) {
    scheduleBackgroundWarmTick();
    return;
  }

  var batch = 0;
  while (batch < WARM_QUEUE_BATCH && backgroundWarmRanges.length) {
    if (legacyInFlight >= LEGACY_MAX_IN_FLIGHT || neighborhoodNeedsBandwidth()) {
      break;
    }
    var range = backgroundWarmRanges[0];
    while (range.next < range.end && !canAccessPageIndex(range.next)) {
      range.next += 1;
    }
    if (range.next >= range.end) {
      backgroundWarmRanges.shift();
      continue;
    }
    var pageIndex = range.next;
    range.next += 1;
    if (range.next >= range.end) {
      backgroundWarmRanges.shift();
    }
    if (pageImageIsPaintReady(pageIndex) || pageImageHasBitmap(pageIndex)) {
      continue;
    }
    if (legacyInFlightPages.has(pageIndex)) {
      continue;
    }
    warmPageImage(pageIndex, LEGACY_PRIORITY_BACKGROUND);
    // No orphan <link rel=preload> — doubles pool demand without guaranteeing
    // the StPageFlip DOM img paints (see docs/READER-BLANK-NAIL.md).
    batch += 1;
  }

  if (backgroundWarmRanges.length) {
    scheduleBackgroundWarmTick();
  }
}

function startPostUnveilWarmQueue() {
  // Opening window already eager; continue Issue 1 → unlocked 2 → unlocked 3
  // as one non-cancelling chain (append-only ranges).
  queueBackgroundWarm(OPENING_READY_LAST_INDEX + 1, ISSUE_001_LAST_INDEX + 1);
  if (window.ReaderAccess) {
    if (window.ReaderAccess.isIssueUnlocked("002")) {
      queueBackgroundWarm(ISSUE_002_START, ISSUE_003_START);
    }
    if (window.ReaderAccess.isIssueUnlocked("003")) {
      queueBackgroundWarm(ISSUE_003_START, pageEntries.length);
    }
  }
}

function setReaderPreparing(isPreparing) {
  if (elements.readerRoot) {
    elements.readerRoot.classList.toggle("is-preparing", isPreparing);
  }
  if (elements.loadVeil) {
    elements.loadVeil.setAttribute("aria-busy", isPreparing ? "true" : "false");
    if (!isPreparing) {
      elements.loadVeil.setAttribute("aria-hidden", "true");
    } else {
      elements.loadVeil.removeAttribute("aria-hidden");
    }
  }
  if (elements.book) {
    elements.book.setAttribute("aria-hidden", isPreparing ? "true" : "false");
  }
}

function updateLoadProgress(done, total) {
  if (!elements.loadProgress) {
    return;
  }
  var safeTotal = Math.max(1, total);
  var pct = Math.round((done / safeTotal) * 100);
  elements.loadProgress.textContent = pct + "%";
}

function collectOpeningImageIndices() {
  var indices = [];
  var last = Math.min(OPENING_READY_LAST_INDEX, pageEntries.length - 1);
  for (var index = 0; index <= last; index += 1) {
    var entry = pageEntries[index];
    if (entry && !entry.blank) {
      indices.push(index);
    }
  }
  return indices;
}

function collectOpeningCriticalIndices() {
  var indices = [];
  var last = Math.min(OPENING_CRITICAL_LAST_INDEX, pageEntries.length - 1);
  for (var index = 0; index <= last; index += 1) {
    var entry = pageEntries[index];
    if (entry && !entry.blank) {
      indices.push(index);
    }
  }
  return indices;
}

// Cover (and any other first-spread art) must be complete+painted before unveil.
function openingCriticalPaintReady() {
  var indices = collectOpeningCriticalIndices();
  if (!indices.length) {
    return true;
  }
  for (var i = 0; i < indices.length; i += 1) {
    if (!pageImageIsPaintReady(indices[i]) && !pageImageHasBitmap(indices[i])) {
      return false;
    }
  }
  return true;
}

function prepareOpeningPages(pageElements) {
  var indices = collectOpeningImageIndices();
  openingPrimeIndices = indices.slice();
  var done = 0;
  updateLoadProgress(0, indices.length || 1);

  if (!indices.length) {
    return Promise.resolve(true);
  }

  if (pageLifecycle) {
    var progressTimer = setInterval(function () {
      var ready = 0;
      for (var i = 0; i < indices.length; i += 1) {
        if (pageLifecycle.isPaintReady(indices[i])) {
          ready += 1;
        }
      }
      updateLoadProgress(ready, indices.length);
    }, 200);

    return pageLifecycle.prime(indices).then(function (ok) {
      clearInterval(progressTimer);
      updateLoadProgress(ok ? indices.length : done, indices.length);
      return ok;
    });
  }

  // Opening imgs already have eager src from buildPageElements — no link preload.

  return Promise.all(
    indices.map(function (pageIndex) {
      claimLegacyInFlight(pageIndex);
      return ensurePageImageReady(pageIndex, { visible: true, soft: false }).then(function (ok) {
        done += 1;
        updateLoadProgress(done, indices.length);
        return ok;
      });
    }),
  ).then(function (results) {
    var failed = results.filter(function (ok) {
      return !ok;
    }).length;
    if (failed && elements.loadVeil && elements.loadProgress) {
      elements.loadVeil.classList.add("is-failed");
      elements.loadProgress.textContent =
        failed === results.length
          ? "Opening with pages still loading…"
          : "Almost ready…";
    }
    // Legacy: never block the book on preload — report readiness only.
    return failed === 0;
  });
}

function preloadAround(centerIndex) {
  for (let offset = -PRELOAD_BACK; offset <= PRELOAD_AHEAD; offset += 1) {
    var abs = Math.abs(offset);
    var pri =
      abs === 0
        ? LEGACY_PRIORITY_VISIBLE
        : abs <= NEIGHBORHOOD_RADIUS
          ? LEGACY_PRIORITY_NEIGHBOR
          : LEGACY_PRIORITY_BACKGROUND;
    warmPageImage(centerIndex + offset, pri);
  }
  syncLinkPreloads(centerIndex);
}

function bootstrapIssueOne() {
  // Prefer trickle warm after unveil — see startPostUnveilWarmQueue.
  queueBackgroundWarm(0, ISSUE_001_LAST_INDEX + 1);
}

function bootstrapUnlockedIssues() {
  // Append-only — safe to call both; does not cancel Issue 2 for Issue 3.
  if (!window.ReaderAccess) {
    return;
  }
  if (window.ReaderAccess.isIssueUnlocked("002")) {
    queueBackgroundWarm(ISSUE_002_START, ISSUE_003_START);
  }
  if (window.ReaderAccess.isIssueUnlocked("003")) {
    queueBackgroundWarm(ISSUE_003_START, pageEntries.length);
  }
}

function canAccessPageIndex(pageIndex) {
  if (!window.ReaderAccess) return true;
  var issue = window.ReaderAccess.getIssueForPageIndex(pageIndex);
  return window.ReaderAccess.isIssueUnlocked(issue);
}

function handlePageTurn(pageIndex) {
  if (!canAccessPageIndex(pageIndex)) {
    var blockedIssue = window.ReaderAccess.getIssueForPageIndex(pageIndex);
    if (window.ReaderGate) window.ReaderGate.show(blockedIssue);
    return false;
  }
  if (window.IntrepidReaderMagnify) {
    window.IntrepidReaderMagnify.unmount();
  }
  lastPageIndex = pageIndex;
  setPageLabel(pageIndex);
  ensureNeighborhoodPages(pageIndex);
  preloadAround(pageIndex);
  armVisibleWatchdog(pageIndex);
  return true;
}

function requestPageTurn(targetIndex) {
  if (!canAccessPageIndex(targetIndex)) {
    if (window.ReaderGate) {
      window.ReaderGate.show(window.ReaderAccess.getIssueForPageIndex(targetIndex));
    }
    return false;
  }
  return true;
}

function warmFlipTargetsFromDirection(forward) {
  const step = forward ? 1 : -1;
  ensureNeighborhoodPages(lastPageIndex + step);
  if (pageLifecycle) {
    pageLifecycle.enqueue(
      lastPageIndex + step,
      pageLifecycle.PRIORITY_VISIBLE,
    );
    pageLifecycle.enqueue(
      lastPageIndex + step * 2,
      pageLifecycle.PRIORITY_NEIGHBOR,
    );
    pageLifecycle.enqueue(
      lastPageIndex + step * 3,
      pageLifecycle.PRIORITY_BACKGROUND,
    );
    return;
  }
  warmPageImage(lastPageIndex + step, LEGACY_PRIORITY_VISIBLE);
  warmPageImage(lastPageIndex + step * 2, LEGACY_PRIORITY_NEIGHBOR);
  warmPageImage(lastPageIndex + step * 3, LEGACY_PRIORITY_BACKGROUND);
  preloadAround(lastPageIndex + step);
}

function warmBothFlipDirections() {
  warmFlipTargetsFromDirection(true);
  warmFlipTargetsFromDirection(false);
}

function warmFlipTargetFromPointer(event) {
  const rect = elements.book.getBoundingClientRect();
  if (!rect.width) {
    return;
  }

  const clickOnRight = event.clientX - rect.left > rect.width / 2;
  warmFlipTargetsFromDirection(clickOnRight);
}

function buildPageElements() {
  elements.book.innerHTML = "";
  var useLifecycle = isPageLifecycleEnabled();
  return pageEntries.map((entry, index) => {
    const page = document.createElement("div");
    page.className = entry.blank
      ? "reader-page reader-page--blank"
      : entry.cover
        ? "reader-page reader-page--cover"
        : "reader-page";
    page.dataset.pageNumber = String(index + 1);

    if (entry.blank) {
      page.setAttribute("aria-label", entry.label);
      page.setAttribute("data-page-state", "painted");
      return page;
    }

    const image = document.createElement("img");
    image.alt = entry.cover
      ? "Intrepid Dusk Volume 1 cover"
      : `Intrepid Dusk Volume 1 page ${entry.contentNumber}`;
    image.width = NATIVE_PAGE_WIDTH;
    image.height = NATIVE_PAGE_HEIGHT;
    image.decoding = "async";
    image.draggable = false;
    pageImages[index] = image;

    if (useLifecycle) {
      // Loader owns every request — no boot-time src flood.
      image.loading = "eager";
      page.setAttribute("data-page-state", "idle");
    } else if (index <= OPENING_READY_LAST_INDEX) {
      image.loading = "eager";
      if ("fetchPriority" in image) {
        image.fetchPriority = "high";
      }
      image.src = pageAssetUrl(entry, 0);
      // Paper Loading until complete+painted — never soft-open a white sheet.
      page.classList.add("is-loading");
      page.setAttribute("data-page-state", "loading");
    } else {
      image.loading = "lazy";
    }

    page.append(image);
    if (page.classList.contains("is-loading")) {
      updatePagePlaceholder(index, "loading");
    }
    return page;
  });
}

function createPageFlip(pageElements) {
  const { pageW, pageH } = fitBookToStage();
  const pageFlipInstance = new St.PageFlip(elements.book, {
    width: pageW,
    height: pageH,
    size: "stretch",
    minWidth: Math.min(360, pageW),
    maxWidth: pageW,
    minHeight: Math.min(548, pageH),
    maxHeight: pageH,
    drawShadow: true,
    flippingTime: 580,
    usePortrait: true,
    startZIndex: 0,
    autoSize: false,
    maxShadowOpacity: 0.25,
    showCover: false,
    mobileScrollSupport: false,
    swipeDistance: 24,
    clickEventForward: false,
    useMouseEvents: true,
    showPageCorners: true,
    disableFlipByClick: false,
  });

  pageFlipInstance.on("init", (event) => {
    handlePageTurn(event.data.page);
  });

  pageFlipInstance.on("flip", (event) => {
    var target =
      event.data && typeof event.data === "object"
        ? event.data.page
        : event.data;
    if (!handlePageTurn(target)) {
      pageFlipInstance.turnToPage(lastPageIndex);
    }
  });

  pageFlipInstance.on("changeState", (event) => {
    if (event.data !== "flipping") {
      return;
    }
    ensureNeighborhoodPages(lastPageIndex);
    warmBothFlipDirections();
  });

  pageFlipInstance.loadFromHTML(pageElements);
  // StPageFlip moves the same nodes into .stf__block; rebind so loader/placeholder
  // updates always hit the live book imgs (not a stale detached reference).
  rebindPageImagesFromDom();
  ensureNeighborhoodPages(0);
  preloadAround(0);
  return pageFlipInstance;
}

function rebindPageImagesFromDom() {
  if (!elements.book) {
    return;
  }
  var pages = elements.book.querySelectorAll(".reader-page[data-page-number]");
  for (var i = 0; i < pages.length; i += 1) {
    var page = pages[i];
    var index = Number(page.getAttribute("data-page-number")) - 1;
    if (index < 0 || index >= pageImages.length) {
      continue;
    }
    var img = page.querySelector("img");
    if (img) {
      pageImages[index] = img;
    }
    // Heal: bitmap already ready but lifecycle state still loading/idle.
    if (
      pageLifecycle &&
      img &&
      img.complete &&
      img.naturalWidth > 0 &&
      !pageLifecycle.isPaintReady(index)
    ) {
      pageLifecycle.enqueue(index, pageLifecycle.PRIORITY_VISIBLE);
    }
  }
}

function revealReader() {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      setReaderPreparing(false);
      readerReady = true;
      startPostUnveilWarmQueue();
      if (pendingIssueTwoLand) {
        pendingIssueTwoLand = false;
        landOnIssueTwoStart();
      }
    });
  });
}

function clearOpeningHardFailUi() {
  if (!elements.loadVeil) {
    return;
  }
  elements.loadVeil.classList.remove("is-failed", "is-hard-failed");
  var btn = elements.loadVeil.querySelector("[data-reader-load-retry]");
  if (btn && btn.parentNode) {
    btn.parentNode.removeChild(btn);
  }
}

function showOpeningHardFail(message) {
  if (!elements.loadVeil) {
    return;
  }
  setReaderPreparing(true);
  elements.loadVeil.classList.add("is-failed", "is-hard-failed");
  if (elements.loadProgress) {
    elements.loadProgress.textContent =
      message || "Page couldn't load — Retry.";
  }
  var title = elements.loadVeil.querySelector(".reader-load-veil__title");
  if (title) {
    title.textContent = "Page couldn't load";
  }
  var inner = elements.loadVeil.querySelector(".reader-load-veil__inner");
  var btn = elements.loadVeil.querySelector("[data-reader-load-retry]");
  if (!btn && inner) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reader-load-veil__retry";
    btn.setAttribute("data-reader-load-retry", "");
    btn.textContent = "Retry";
    inner.appendChild(btn);
  }
  if (btn) {
    btn.onclick = function () {
      retryOpeningPrime();
    };
  }
}

function retryOpeningPrime() {
  if (!pageLifecycle || !lifecycleBootPageElements) {
    window.location.reload();
    return;
  }
  clearOpeningHardFailUi();
  if (elements.loadProgress) {
    elements.loadProgress.textContent = "0%";
  }
  var title = elements.loadVeil &&
    elements.loadVeil.querySelector(".reader-load-veil__title");
  if (title) {
    title.textContent = "Preparing the volume…";
  }
  setReaderPreparing(true);
  bootOpened = false;
  if (veilDeadlineId != null) {
    clearTimeout(veilDeadlineId);
    veilDeadlineId = null;
  }
  veilDeadlineId = setTimeout(function () {
    if (!bootOpened) {
      showOpeningHardFail("Page couldn't load — Retry.");
    }
  }, VEIL_OPENING_DEADLINE_MS);

  pageLifecycle
    .retryMany(openingPrimeIndices.length ? openingPrimeIndices : collectOpeningImageIndices())
    .then(function (ok) {
      if (ok) {
        openBook(lifecycleBootPageElements, { softError: false });
      } else if (!bootOpened) {
        showOpeningHardFail("Page couldn't load — Retry.");
      }
    })
    .catch(function () {
      if (!bootOpened) {
        showOpeningHardFail("Page couldn't load — Retry.");
      }
    });
}

function showSoftLoadToast(message) {
  if (!elements.stage || !message) {
    return;
  }
  var existing = elements.stage.querySelector("[data-reader-soft-toast]");
  if (existing) {
    existing.remove();
  }
  var toast = document.createElement("div");
  toast.className = "reader-soft-toast";
  toast.setAttribute("data-reader-soft-toast", "");
  toast.setAttribute("role", "status");
  toast.textContent = message;
  elements.stage.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("is-leaving");
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }, SOFT_TOAST_MS);
}

function openBook(pageElements, options) {
  if (bootOpened) {
    return;
  }
  bootOpened = true;
  if (veilDeadlineId != null) {
    clearTimeout(veilDeadlineId);
    veilDeadlineId = null;
  }
  clearOpeningHardFailUi();

  try {
    if (!pageFlip) {
      pageFlip = createPageFlip(pageElements);
    }
  } catch (err) {
    console.error("[reader] failed to mount page flip", err);
  }

  // Lifecycle path never soft-opens into an empty book.
  if (options && options.softError && !pageLifecycle) {
    showSoftLoadToast("Pages are still loading — flip when ready.");
  }

  revealReader();
  loadReaderMagnifyPlugin(function () {
    initReaderMagnify();
    updateReaderHelpTipCopy();
  });
  initReaderHelpTip();
}

function bootReaderLegacy(pageElements) {
  // Keep for Retry (legacy Retry reloads; store elements for parity).
  lifecycleBootPageElements = pageElements;

  // Never soft-open into a white incomplete cover/first page (build 180).
  // Long deadline: hard-fail Retry unless critical opening art is paint-ready.
  veilDeadlineId = setTimeout(function () {
    if (bootOpened) {
      return;
    }
    if (openingCriticalPaintReady()) {
      openBook(pageElements, { softError: true });
      return;
    }
    showOpeningHardFail("Page couldn't load — Retry.");
  }, VEIL_OPENING_DEADLINE_MS);

  prepareOpeningPages(pageElements)
    .then(function (ok) {
      if (bootOpened) {
        return;
      }
      if (ok) {
        openBook(pageElements, { softError: false });
        return;
      }
      if (openingCriticalPaintReady()) {
        openBook(pageElements, { softError: true });
        return;
      }
      showOpeningHardFail("Page couldn't load — Retry.");
    })
    .catch(function () {
      if (bootOpened) {
        return;
      }
      if (openingCriticalPaintReady()) {
        openBook(pageElements, { softError: true });
        return;
      }
      showOpeningHardFail("Page couldn't load — Retry.");
    });
}

function bootReaderLifecycle(pageElements) {
  lifecycleBootPageElements = pageElements;
  pageLifecycle = createLifecycleLoader();
  if (!pageLifecycle) {
    bootReaderLegacy(pageElements);
    return;
  }

  veilDeadlineId = setTimeout(function () {
    if (!bootOpened) {
      showOpeningHardFail("Page couldn't load — Retry.");
    }
  }, VEIL_OPENING_DEADLINE_MS);

  prepareOpeningPages(pageElements)
    .then(function (ok) {
      if (bootOpened) {
        return;
      }
      if (ok) {
        openBook(pageElements, { softError: false });
        return;
      }
      showOpeningHardFail("Page couldn't load — Retry.");
    })
    .catch(function () {
      if (!bootOpened) {
        showOpeningHardFail("Page couldn't load — Retry.");
      }
    });
}

function bootReader() {
  setReaderPreparing(true);

  loadPageLifecyclePlugin(function (pluginOk) {
    var pageElements = buildPageElements();

    if (!pluginOk || !isPageLifecycleEnabled() || !window.LegendistPageLifecycle) {
      bootReaderLegacy(pageElements);
      return;
    }

    window.LegendistPageLifecycle.loadManifest(PAGE_LIFECYCLE_MANIFEST_URL)
      .then(function (manifest) {
        pageManifestById = window.LegendistPageLifecycle.indexManifest(manifest);
      })
      .catch(function (err) {
        console.warn("[reader] manifest load failed; using entry.src + .jpg fallback", err);
        pageManifestById = {};
      })
      .then(function () {
        bootReaderLifecycle(pageElements);
      });
  });
}

let pageFlip = null;
bootReader();

function resolvePageImageAtPoint(clientX, clientY) {
  var target = document.elementFromPoint(clientX, clientY);
  while (target && target !== elements.book) {
    if (target.tagName === "IMG" && elements.book.contains(target)) {
      if (target.complete && target.naturalWidth > 0) {
        return target;
      }
      break;
    }
    target = target.parentElement;
  }

  var rect = elements.book.getBoundingClientRect();
  if (rect.width > 0) {
    var clickOnRight = clientX - rect.left > rect.width / 2;
    var spreadIndex = clickOnRight ? lastPageIndex + 1 : lastPageIndex;
    if (
      spreadIndex >= 0 &&
      spreadIndex < pageImages.length &&
      pageImages[spreadIndex]
    ) {
      return pageImages[spreadIndex];
    }
  }

  return null;
}

function getReaderReferencePageImage() {
  var img = pageImages[lastPageIndex];
  if (img) {
    return img;
  }
  return pageImages[lastPageIndex + 1] || pageImages[lastPageIndex - 1] || null;
}

function isReaderSpreadMode() {
  var refImg = getReaderReferencePageImage();
  if (!refImg) {
    return false;
  }
  var pageRect = refImg.getBoundingClientRect();
  var bookRect = elements.book.getBoundingClientRect();
  return pageRect.width > 0 && bookRect.width > pageRect.width * 1.4;
}

function getVisibleSpreadImages() {
  if (!isReaderSpreadMode()) {
    return null;
  }

  var left = pageImages[lastPageIndex];
  var right = pageImages[lastPageIndex + 1];
  if (!left || !right) {
    return null;
  }
  if (pageEntries[lastPageIndex] && pageEntries[lastPageIndex].blank) {
    return null;
  }
  if (pageEntries[lastPageIndex + 1] && pageEntries[lastPageIndex + 1].blank) {
    return null;
  }

  var leftRect = left.getBoundingClientRect();
  var rightRect = right.getBoundingClientRect();
  if (!leftRect.width || !rightRect.width) {
    return null;
  }
  if (!left.complete || !right.complete || !left.naturalWidth || !right.naturalWidth) {
    return null;
  }

  return { left: left, right: right };
}

function zoneFromBookRect(clientX, clientY) {
  var bookRect = elements.book.getBoundingClientRect();
  if (!bookRect.width) {
    return "center";
  }
  if (
    clientY < bookRect.top ||
    clientY > bookRect.bottom ||
    clientX < bookRect.left ||
    clientX > bookRect.right
  ) {
    return "center";
  }

  var edge =
    window.IntrepidReaderMagnify && window.IntrepidReaderMagnify.PAGE_TURN_EDGE != null
      ? window.IntrepidReaderMagnify.PAGE_TURN_EDGE
      : 0.15;
  var relX = (clientX - bookRect.left) / bookRect.width;
  if (relX < 0 || relX > 1) {
    return "center";
  }

  if (isReaderSpreadMode()) {
    if (relX < 0.5) {
      var relInLeftHalf = relX / 0.5;
      if (relX < edge || relInLeftHalf < edge) {
        return "left";
      }
      return "center";
    }
    var relInRightHalf = (relX - 0.5) / 0.5;
    if (relX > 1 - edge || relInRightHalf > 1 - edge) {
      return "right";
    }
    return "center";
  }

  if (relX < edge) {
    return "left";
  }
  if (relX > 1 - edge) {
    return "right";
  }
  return "center";
}

function isMagnifyCenterZone(clientX, clientY) {
  if (
    !window.IntrepidReaderMagnify ||
    typeof window.IntrepidReaderMagnify.getPageZone !== "function"
  ) {
    return false;
  }
  if (
    typeof window.IntrepidReaderMagnify.isArmed === "function" &&
    !window.IntrepidReaderMagnify.isArmed()
  ) {
    return false;
  }
  return window.IntrepidReaderMagnify.getPageZone(clientX, clientY) === "center";
}

function blockMagnifyCenterPageFlip(event) {
  if (!isMagnifyCenterZone(event.clientX, event.clientY)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function isBookPageTurnZone(clientX, clientY) {
  if (isMagnifyCenterZone(clientX, clientY)) {
    return false;
  }
  if (
    window.IntrepidReaderMagnify &&
    typeof window.IntrepidReaderMagnify.isPageTurnZone === "function"
  ) {
    return window.IntrepidReaderMagnify.isPageTurnZone(clientX, clientY);
  }

  if (clientY == null) {
    var bookRect = elements.book.getBoundingClientRect();
    clientY = bookRect.top + bookRect.height / 2;
  }

  var img = resolvePageImageAtPoint(clientX, clientY);
  if (img) {
    var rect = img.getBoundingClientRect();
    if (rect.width) {
      var edge =
        window.IntrepidReaderMagnify &&
        window.IntrepidReaderMagnify.PAGE_TURN_EDGE != null
          ? window.IntrepidReaderMagnify.PAGE_TURN_EDGE
          : 0.15;
      var relX = (clientX - rect.left) / rect.width;
      if (relX >= 0 && relX <= 1) {
        if (isReaderSpreadMode()) {
          var spreadBookRect = elements.book.getBoundingClientRect();
          var imgCenterX = rect.left + rect.width / 2;
          var bookCenterX = spreadBookRect.left + spreadBookRect.width / 2;
          if (imgCenterX < bookCenterX) {
            return relX < edge;
          }
          return relX > 1 - edge;
        }
        return relX < edge || relX > 1 - edge;
      }
    }
  }

  return zoneFromBookRect(clientX, clientY) !== "center";
}

function handleStageResize() {
  fitBookToStage();
  if (pageFlip) {
    pageFlip.update();
  }
}

if (typeof ResizeObserver !== "undefined") {
  const stageObserver = new ResizeObserver(handleStageResize);
  stageObserver.observe(elements.stage);
} else {
  window.addEventListener("resize", handleStageResize);
}

elements.book.addEventListener(
  "pointerdown",
  (event) => {
    if (!isBookPageTurnZone(event.clientX, event.clientY)) {
      return;
    }

    var rect = elements.book.getBoundingClientRect();
    if (rect.width) {
      var clickOnRight = event.clientX - rect.left > rect.width / 2;
      if (clickOnRight && !requestPageTurn(lastPageIndex + 1)) {
        event.stopImmediatePropagation();
        return;
      }
    }
    warmFlipTargetFromPointer(event);
    triggerPageFlipAudio();
  },
  true,
);

elements.book.addEventListener("mousedown", blockMagnifyCenterPageFlip, true);
elements.book.addEventListener("click", blockMagnifyCenterPageFlip, true);

if (window.ReaderGate) {
  window.ReaderGate.onUnlocked = function () {
    if (pageFlip && readerReady) {
      pageFlip.flipNext("bottom");
    }
  };
}

function stripSessionIdFromUrl() {
  var url = new URL(window.location.href);
  if (!url.searchParams.has("session_id")) {
    return;
  }
  url.searchParams.delete("session_id");
  var clean =
    url.pathname + (url.search ? url.search : "") + (url.hash || "");
  history.replaceState(null, "", clean);
}

var pendingIssueTwoLand = false;

function landOnIssueTwoStart() {
  if (!pageFlip || !readerReady) {
    pendingIssueTwoLand = true;
    return;
  }
  var issueTwoIndex =
    window.ReaderAccess && window.ReaderAccess.ISSUE_002_START != null
      ? window.ReaderAccess.ISSUE_002_START
      : 23;
  pageFlip.turnToPage(issueTwoIndex);
  handlePageTurn(issueTwoIndex);
}

function handleStripeReturn() {
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get("session_id");
  if (!sessionId) {
    return;
  }

  fetch(
    "/api/verify-session?session_id=" + encodeURIComponent(sessionId),
  )
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      stripSessionIdFromUrl();
      if (data && data.unlock && window.ReaderAccess) {
        window.ReaderAccess.grantGuestIssues();
        if (window.ReaderGate && window.ReaderGate.trackPurchaseSuccess) {
          window.ReaderGate.trackPurchaseSuccess();
        }
        landOnIssueTwoStart();
        return;
      }
      if (window.ReaderGate) {
        window.ReaderGate.show("002");
      }
    })
    .catch(function () {
      stripSessionIdFromUrl();
      if (window.ReaderGate) {
        window.ReaderGate.show("002");
      }
    });
}

handleStripeReturn();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    preloadAround(lastPageIndex);
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    preloadAround(lastPageIndex);
  }
});

function isEditableKeyboardTarget(target) {
  if (!target || !(target instanceof Element)) {
    return false;
  }
  var tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

function isReaderGateOpen() {
  var gate = document.getElementById("reader-backer-gate");
  return !!(gate && !gate.hidden);
}

function unlockReaderAudio() {
  if (window.ReaderAudio) {
    window.ReaderAudio.unlock();
  }
}

function turnReaderPagePrev() {
  if (!pageFlip || !readerReady) {
    return;
  }
  unlockReaderAudio();
  triggerPageFlipAudio();
  if (window.IntrepidReaderMagnify) {
    window.IntrepidReaderMagnify.unmount();
  }
  warmFlipTargetsFromDirection(false);
  pageFlip.flipPrev("bottom");
}

function turnReaderPageNext() {
  if (!pageFlip || !readerReady) {
    return;
  }
  unlockReaderAudio();
  if (!requestPageTurn(lastPageIndex + 1)) {
    return;
  }
  triggerPageFlipAudio();
  if (window.IntrepidReaderMagnify) {
    window.IntrepidReaderMagnify.unmount();
  }
  warmFlipTargetsFromDirection(true);
  pageFlip.flipNext("bottom");
}

function turnReaderPageFirst() {
  if (!pageFlip || !readerReady) {
    return;
  }
  unlockReaderAudio();
  if (window.IntrepidReaderMagnify) {
    window.IntrepidReaderMagnify.unmount();
  }
  pageFlip.turnToPage(0);
  handlePageTurn(0);
}

function turnReaderPageLast() {
  if (!pageFlip || !readerReady) {
    return;
  }
  unlockReaderAudio();
  var lastIndex = pageEntries.length - 1;
  if (!requestPageTurn(lastIndex)) {
    return;
  }
  if (window.IntrepidReaderMagnify) {
    window.IntrepidReaderMagnify.unmount();
  }
  pageFlip.turnToPage(lastIndex);
  handlePageTurn(lastIndex);
}

function handleReaderKeyboardNav(event) {
  if (event.defaultPrevented) {
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  if (isEditableKeyboardTarget(event.target)) {
    return;
  }
  if (isReaderGateOpen()) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    turnReaderPagePrev();
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    turnReaderPageNext();
    return;
  }
  if (event.key === "Home") {
    event.preventDefault();
    turnReaderPageFirst();
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    turnReaderPageLast();
  }
}

document.addEventListener("keydown", handleReaderKeyboardNav);

elements.controls.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "prev") {
    turnReaderPagePrev();
  }
  if (action === "next") {
    turnReaderPageNext();
  }
  if (action === "reset") {
    turnReaderPageFirst();
  }
});
