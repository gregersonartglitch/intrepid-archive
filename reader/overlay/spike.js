const ENABLE_READER_MAGNIFY = true;
const READER_MAGNIFY_DISABLE_KEY = "intrepid_reader_magnify_disabled";
const READER_MAGNIFY_ENABLED_KEY = "intrepid_reader_magnify_enabled";

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

const PRELOAD_BACK = 2;
const PRELOAD_AHEAD = 3;
const pageImages = new Array(pageEntries.length);
const warmedPages = new Set();
let lastPageIndex = 0;

const elements = {
  book: document.querySelector("#book"),
  page: document.querySelector("[data-page]"),
  controls: document.querySelector(".controls"),
  stage: document.querySelector(".reader-stage"),
  readerRoot: document.querySelector(".reader"),
};

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
    return;
  }

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "../plugins/magnify/magnify-plugin.css?v=9";
  document.head.appendChild(css);

  var script = document.createElement("script");
  script.src = "../plugins/magnify/magnify-plugin.js?v=9";
  script.onload = callback;
  document.head.appendChild(script);
}

function initReaderMagnify() {
  if (!window.IntrepidReaderMagnify || !elements.readerRoot) {
    return;
  }

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
        if (!requestPageTurn(lastPageIndex + 1)) {
          return;
        }
        warmPageImage(lastPageIndex + 1);
        warmPageImage(lastPageIndex + 2);
        pageFlip.flipNext("bottom");
        return;
      }
      warmPageImage(lastPageIndex - 1);
      warmPageImage(lastPageIndex - 2);
      pageFlip.flipPrev("bottom");
    },
  });
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

function decodePageImage(image) {
  if (typeof image.decode === "function") {
    return image.decode().catch(function () {});
  }
  return Promise.resolve();
}

function markPageReady(image) {
  image.classList.add("is-ready");
}

function whenPageImageReady(image) {
  if (image.classList.contains("is-ready")) {
    return Promise.resolve();
  }

  if (image.complete && image.naturalWidth > 0) {
    return decodePageImage(image).then(function () {
      markPageReady(image);
    });
  }

  return new Promise(function (resolve) {
    image.addEventListener(
      "load",
      function () {
        decodePageImage(image).then(function () {
          markPageReady(image);
          resolve();
        });
      },
      { once: true },
    );
  });
}

function warmPageImage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= pageEntries.length) {
    return;
  }

  if (pageEntries[pageIndex].blank) {
    return;
  }

  const image = pageImages[pageIndex];
  if (!image) {
    return;
  }

  image.loading = "eager";

  if (warmedPages.has(pageIndex)) {
    whenPageImageReady(image);
    return;
  }

  warmedPages.add(pageIndex);
  whenPageImageReady(image);
}

function preloadAround(centerIndex) {
  for (let offset = -PRELOAD_BACK; offset <= PRELOAD_AHEAD; offset += 1) {
    warmPageImage(centerIndex + offset);
  }
}

function invalidateWarmCache() {
  warmedPages.clear();
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

function warmFlipTargetFromPointer(event) {
  const rect = elements.book.getBoundingClientRect();
  if (!rect.width) {
    return;
  }

  const clickOnRight = event.clientX - rect.left > rect.width / 2;
  const targetIndex = clickOnRight ? lastPageIndex + 1 : lastPageIndex - 1;
  warmPageImage(targetIndex);
  warmPageImage(targetIndex + (clickOnRight ? 1 : -1));
}

function createPageFlip() {
  elements.book.innerHTML = "";
  const pageElements = pageEntries.map((entry, index) => {
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
    image.src = entry.src;
    image.alt = entry.cover
      ? "Intrepid Dusk Volume 1 cover"
      : `Intrepid Dusk Volume 1 page ${entry.contentNumber}`;
    image.width = NATIVE_PAGE_WIDTH;
    image.height = NATIVE_PAGE_HEIGHT;
    image.decoding = "async";
    image.loading = index < 6 ? "eager" : "lazy";
    image.draggable = false;
    pageImages[index] = image;

    if (index < 6) {
      whenPageImageReady(image);
    }

    page.append(image);
    return page;
  });

  const { pageW, pageH } = fitBookToStage();
  const pageFlip = new St.PageFlip(elements.book, {
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

  pageFlip.on("init", (event) => {
    handlePageTurn(event.data.page);
  });

  pageFlip.on("flip", (event) => {
    var target = event.data;
    if (!handlePageTurn(target)) {
      pageFlip.turnToPage(lastPageIndex);
    }
  });

  pageFlip.loadFromHTML(pageElements);
  preloadAround(0);
  return pageFlip;
}

let pageFlip = createPageFlip();

loadReaderMagnifyPlugin(initReaderMagnify);

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
  pageFlip.update();
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
    pageFlip.flipNext("bottom");
  };
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    invalidateWarmCache();
    preloadAround(lastPageIndex);
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    invalidateWarmCache();
    preloadAround(lastPageIndex);
  }
});

elements.controls.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "prev" || action === "next") {
    triggerPageFlipAudio();
  }

  if (window.ReaderAudio) {
    window.ReaderAudio.unlock();
  }

  if (action === "prev") {
    if (window.IntrepidReaderMagnify) {
      window.IntrepidReaderMagnify.unmount();
    }
    warmPageImage(lastPageIndex - 1);
    warmPageImage(lastPageIndex - 2);
    pageFlip.flipPrev("bottom");
  }
  if (action === "next") {
    if (!requestPageTurn(lastPageIndex + 1)) return;
    if (window.IntrepidReaderMagnify) {
      window.IntrepidReaderMagnify.unmount();
    }
    warmPageImage(lastPageIndex + 1);
    warmPageImage(lastPageIndex + 2);
    pageFlip.flipNext("bottom");
  }
  if (action === "reset") {
    if (window.IntrepidReaderMagnify) {
      window.IntrepidReaderMagnify.unmount();
    }
    pageFlip.turnToPage(0);
    handlePageTurn(0);
  }
});
