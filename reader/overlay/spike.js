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

const pageEntries = contentPages.flatMap((page) => {
  if (page.contentNumber === 43) {
    return [{ blank: true, label: "Chapter 3 spacer" }, page];
  }

  return [page];
});

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
};

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
    image.decode().catch(() => {});
  }
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
    if (image.complete && image.naturalWidth > 0) {
      decodePageImage(image);
    }
    return;
  }

  warmedPages.add(pageIndex);

  if (image.complete && image.naturalWidth > 0) {
    decodePageImage(image);
    return;
  }

  image.addEventListener("load", () => decodePageImage(image), { once: true });
}

function preloadAround(centerIndex) {
  for (let offset = -PRELOAD_BACK; offset <= PRELOAD_AHEAD; offset += 1) {
    warmPageImage(centerIndex + offset);
  }
}

function invalidateWarmCache() {
  warmedPages.clear();
}

function handlePageTurn(pageIndex) {
  lastPageIndex = pageIndex;
  setPageLabel(pageIndex);
  preloadAround(pageIndex);
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
    page.className = entry.blank ? "reader-page reader-page--blank" : "reader-page";
    page.dataset.pageNumber = String(index + 1);

    if (entry.blank) {
      page.setAttribute("aria-label", entry.label);
      return page;
    }

    const image = document.createElement("img");
    image.src = entry.src;
    image.alt = `Intrepid Dusk Volume 1 page ${entry.contentNumber}`;
    image.decoding = "async";
    image.loading = index < 6 ? "eager" : "lazy";
    image.draggable = false;
    pageImages[index] = image;

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
    handlePageTurn(event.data);
  });

  pageFlip.loadFromHTML(pageElements);
  preloadAround(0);
  return pageFlip;
}

let pageFlip = createPageFlip();

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
    warmFlipTargetFromPointer(event);
    triggerPageFlipAudio();
  },
  true,
);

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
    warmPageImage(lastPageIndex - 1);
    warmPageImage(lastPageIndex - 2);
    pageFlip.flipPrev("bottom");
  }
  if (action === "next") {
    warmPageImage(lastPageIndex + 1);
    warmPageImage(lastPageIndex + 2);
    pageFlip.flipNext("bottom");
  }
  if (action === "reset") {
    pageFlip.turnToPage(0);
    handlePageTurn(0);
  }
});
