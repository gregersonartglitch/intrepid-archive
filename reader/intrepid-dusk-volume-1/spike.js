const ENABLE_READER_MAGNIFY = true;
const READER_MAGNIFY_DISABLE_KEY = "intrepid_reader_magnify_disabled";
const READER_MAGNIFY_ENABLED_KEY = "intrepid_reader_magnify_enabled";
const READER_HELP_TIP_SEEN_KEY = "intrepid_reader_help_tip_seen_v1";

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
// Cover + first content spread(s) must decode before the book is revealed.
const OPENING_READY_LAST_INDEX = 5;
const IMAGE_LOAD_MAX_ATTEMPTS = 3;
const IMAGE_LOAD_TIMEOUT_MS = 12000;
const PAGE_ASSET_VERSION = 162;
const pageImages = new Array(pageEntries.length);
const warmedPages = new Set();
const decodedPages = new Set();
const prefetchImages = {};
const linkPreloads = {};
let lastPageIndex = 0;
let readerReady = false;

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
  return ensurePageImageReady(pageIndex, { soft: true });
}

function ensurePageImageReady(pageIndex, options) {
  var soft = !!(options && options.soft);
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

    var attempt = 0;
    var settled = false;
    var timeoutId = null;

    function settle(ok) {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      resolve(ok);
    }

    function markReady() {
      decodedPages.add(pageIndex);
      warmedPages.add(pageIndex);
      settle(true);
    }

    function runDecode() {
      if (typeof image.decode !== "function") {
        markReady();
        return;
      }
      image.decode().then(markReady).catch(markReady);
    }

    function isLoaded() {
      return !!(image.complete && image.naturalWidth > 0);
    }

    function isBrokenComplete() {
      return !!(image.complete && image.naturalWidth === 0 && image.getAttribute("src"));
    }

    function bindAttempt() {
      if (isLoaded()) {
        runDecode();
        return;
      }

      function onLoad() {
        cleanup();
        runDecode();
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
          settle(false);
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
    }

    timeoutId = setTimeout(function () {
      settle(isLoaded());
    }, soft ? Math.min(4000, IMAGE_LOAD_TIMEOUT_MS) : IMAGE_LOAD_TIMEOUT_MS);

    bindAttempt();
  });
}

function injectLinkPreload(pageIndex) {
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
  for (let offset = 1; offset <= LINK_PRELOAD_AHEAD; offset += 1) {
    injectLinkPreload(centerIndex + offset);
    injectLinkPreload(centerIndex - offset);
  }
}

function warmPageImage(pageIndex) {
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

  image.loading = "eager";
  decodePageImage(pageIndex);

  if (warmedPages.has(pageIndex)) {
    return;
  }

  warmedPages.add(pageIndex);

  // StPageFlip may not mount lazy imgs until flip — probe warms HTTP cache + decode.
  if (!prefetchImages[pageIndex]) {
    const probe = new Image();
    probe.decoding = "async";
    probe.src = pageAssetUrl(entry, 0);
    probe.addEventListener(
      "load",
      function onProbeLoad() {
        probe.removeEventListener("load", onProbeLoad);
        decodePageImage(pageIndex);
      },
      { once: true },
    );
    prefetchImages[pageIndex] = probe;
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

function prepareOpeningPages(pageElements) {
  var indices = collectOpeningImageIndices();
  var done = 0;
  updateLoadProgress(0, indices.length || 1);

  for (var i = 0; i < indices.length; i += 1) {
    injectLinkPreload(indices[i]);
  }

  if (!indices.length) {
    return Promise.resolve(true);
  }

  return Promise.all(
    indices.map(function (pageIndex) {
      return ensurePageImageReady(pageIndex).then(function (ok) {
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
          ? "Unable to load pages — retrying…"
          : "Almost ready…";
    }
    // Soft-fail: still mount if at least the cover (or any page) decoded.
    return results.some(Boolean) || failed < results.length;
  });
}

function preloadAround(centerIndex) {
  for (let offset = -PRELOAD_BACK; offset <= PRELOAD_AHEAD; offset += 1) {
    warmPageImage(centerIndex + offset);
  }
  syncLinkPreloads(centerIndex);
}

function bootstrapIssueOne() {
  for (let index = 0; index <= ISSUE_001_LAST_INDEX; index += 1) {
    warmPageImage(index);
    injectLinkPreload(index);
  }
}

function bootstrapUnlockedIssues() {
  if (!window.ReaderAccess) {
    return;
  }
  if (window.ReaderAccess.isIssueUnlocked("002")) {
    for (let index = ISSUE_002_START; index < ISSUE_003_START; index += 1) {
      warmPageImage(index);
      injectLinkPreload(index);
    }
  }
  if (window.ReaderAccess.isIssueUnlocked("003")) {
    for (let index = ISSUE_003_START; index < pageEntries.length; index += 1) {
      warmPageImage(index);
      injectLinkPreload(index);
    }
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
  preloadAround(pageIndex);
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
  warmPageImage(lastPageIndex + step);
  warmPageImage(lastPageIndex + step * 2);
  warmPageImage(lastPageIndex + step * 3);
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
      return page;
    }

    const image = document.createElement("img");
    image.alt = entry.cover
      ? "Intrepid Dusk Volume 1 cover"
      : `Intrepid Dusk Volume 1 page ${entry.contentNumber}`;
    image.width = NATIVE_PAGE_WIDTH;
    image.height = NATIVE_PAGE_HEIGHT;
    image.decoding = "async";
    image.loading = "eager";
    if (index <= OPENING_READY_LAST_INDEX && "fetchPriority" in image) {
      image.fetchPriority = "high";
    }
    image.draggable = false;
    image.src = pageAssetUrl(entry, 0);
    pageImages[index] = image;

    page.append(image);
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
    warmBothFlipDirections();
  });

  pageFlipInstance.loadFromHTML(pageElements);
  bootstrapIssueOne();
  bootstrapUnlockedIssues();
  preloadAround(0);
  return pageFlipInstance;
}

function revealReader() {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      setReaderPreparing(false);
      readerReady = true;
      if (pendingIssueTwoLand) {
        pendingIssueTwoLand = false;
        landOnIssueTwoStart();
      }
    });
  });
}

function bootReader() {
  setReaderPreparing(true);
  var pageElements = buildPageElements();

  prepareOpeningPages(pageElements)
    .then(function (ok) {
      if (!ok && elements.loadProgress) {
        // Last-chance retry for opening pages before reveal.
        return Promise.all(
          collectOpeningImageIndices().map(function (pageIndex) {
            decodedPages.delete(pageIndex);
            warmedPages.delete(pageIndex);
            var entry = pageEntries[pageIndex];
            var image = pageImages[pageIndex];
            if (image && entry) {
              image.src = pageAssetUrl(entry, 1);
            }
            return ensurePageImageReady(pageIndex);
          }),
        ).then(function () {
          return true;
        });
      }
      return true;
    })
    .then(function () {
      pageFlip = createPageFlip(pageElements);
      revealReader();
      loadReaderMagnifyPlugin(function () {
        initReaderMagnify();
        updateReaderHelpTipCopy();
      });
      initReaderHelpTip();
    })
    .catch(function () {
      // Never leave the reader stuck behind the veil.
      try {
        pageFlip = createPageFlip(pageElements);
      } catch (err) {
        console.error("[reader] failed to mount page flip", err);
      }
      if (elements.loadProgress) {
        elements.loadProgress.textContent = "Opening…";
      }
      revealReader();
      loadReaderMagnifyPlugin(function () {
        initReaderMagnify();
        updateReaderHelpTipCopy();
      });
      initReaderHelpTip();
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
