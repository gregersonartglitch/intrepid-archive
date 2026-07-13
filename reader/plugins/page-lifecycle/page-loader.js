/**
 * Legendist / Intrepid page lifecycle loader (P0)
 * Single owner for page image requests: concurrency queue, WebP→JPG fallback,
 * per-page readiness states, placeholder hooks. StPageFlip stays the flip adapter.
 *
 * States (Jon P0): loading | decoded | painted | failed
 * Internal idle until requested. Intentional blanks are painted with role blank.
 */
(function (root) {
  "use strict";

  var STATE_IDLE = "idle";
  var STATE_LOADING = "loading";
  var STATE_DECODED = "decoded";
  var STATE_PAINTED = "painted";
  var STATE_FAILED = "failed";

  var PRIORITY_VISIBLE = 0;
  var PRIORITY_NEIGHBOR = 1;
  var PRIORITY_BACKGROUND = 2;

  function noop() {}

  function createLoader(options) {
    options = options || {};
    var maxInFlight = options.maxInFlight || 4;
    var timeoutMs = options.timeoutMs || 8000;
    var assetVersion = options.assetVersion || 1;
    var pageImages = options.pageImages || [];
    var pageEntries = options.pageEntries || [];
    var canAccess =
      typeof options.canAccess === "function"
        ? options.canAccess
        : function () {
            return true;
          };
    var getPrimaryUrl =
      typeof options.getPrimaryUrl === "function" ? options.getPrimaryUrl : null;
    var getFallbackUrl =
      typeof options.getFallbackUrl === "function"
        ? options.getFallbackUrl
        : function () {
            return "";
          };
    var onStateChange =
      typeof options.onStateChange === "function" ? options.onStateChange : noop;
    var onPlaceholder =
      typeof options.onPlaceholder === "function" ? options.onPlaceholder : noop;

    var states = {};
    var queue = [];
    var inFlight = 0;
    var active = {};
    var waiters = {};
    var destroyed = false;
    var backgroundPaused = false;

    function entryAt(pageIndex) {
      return pageEntries[pageIndex] || null;
    }

    function imageAt(pageIndex) {
      return pageImages[pageIndex] || null;
    }

    function isBlank(pageIndex) {
      var entry = entryAt(pageIndex);
      return !!(entry && entry.blank);
    }

    function getState(pageIndex) {
      if (isBlank(pageIndex)) {
        return STATE_PAINTED;
      }
      return states[pageIndex] || STATE_IDLE;
    }

    function isPaintReady(pageIndex) {
      var state = getState(pageIndex);
      return state === STATE_PAINTED || state === STATE_DECODED;
    }

    function isSettled(pageIndex) {
      var state = getState(pageIndex);
      return (
        state === STATE_PAINTED ||
        state === STATE_DECODED ||
        state === STATE_FAILED ||
        isBlank(pageIndex)
      );
    }

    function notifyWaiters(pageIndex) {
      var list = waiters[pageIndex];
      if (!list || !list.length) {
        return;
      }
      if (!isSettled(pageIndex)) {
        return;
      }
      waiters[pageIndex] = [];
      var ok = isPaintReady(pageIndex);
      for (var i = 0; i < list.length; i += 1) {
        try {
          list[i](ok);
        } catch (err) {
          /* ignore waiter errors */
        }
      }
    }

    function setState(pageIndex, state) {
      if (destroyed) {
        return;
      }
      states[pageIndex] = state;
      var image = imageAt(pageIndex);
      var pageEl = image && image.parentElement;
      if (pageEl) {
        pageEl.setAttribute("data-page-state", state);
        pageEl.classList.toggle("is-loading", state === STATE_LOADING);
        pageEl.classList.toggle("is-failed", state === STATE_FAILED);
        pageEl.classList.toggle(
          "is-ready",
          state === STATE_PAINTED || state === STATE_DECODED,
        );
      }
      onPlaceholder(pageIndex, state);
      onStateChange(pageIndex, state);
      notifyWaiters(pageIndex);
    }

    function withCacheBust(url, attempt) {
      if (!url) {
        return "";
      }
      var query = "v=" + assetVersion;
      if (attempt > 0) {
        query += "&r=" + attempt + "&t=" + Date.now();
      }
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + query;
    }

    function resolvePrimary(pageIndex, attempt) {
      if (getPrimaryUrl) {
        return withCacheBust(getPrimaryUrl(pageIndex), attempt);
      }
      var entry = entryAt(pageIndex);
      if (!entry || !entry.src) {
        return "";
      }
      return withCacheBust(entry.src, attempt);
    }

    function resolveFallback(pageIndex, attempt) {
      return withCacheBust(getFallbackUrl(pageIndex) || "", attempt);
    }

    function queueSort() {
      queue.sort(function (a, b) {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.seq - b.seq;
      });
    }

    function removeQueued(pageIndex) {
      queue = queue.filter(function (job) {
        return job.pageIndex !== pageIndex;
      });
    }

    var seqCounter = 0;

    function healIfBitmapReady(pageIndex) {
      if (isBlank(pageIndex) || isPaintReady(pageIndex)) {
        return false;
      }
      var image = imageAt(pageIndex);
      if (!image || !(image.complete && image.naturalWidth > 0)) {
        return false;
      }
      // Img already has pixels but state lagged (hung decode, missed load event,
      // or StPageFlip remount). Promote without another network hop.
      if (active[pageIndex]) {
        finishJob(pageIndex, true);
      } else {
        markDecodedThenPainted(pageIndex);
      }
      return true;
    }

    function enqueue(pageIndex, priority) {
      if (destroyed) {
        return;
      }
      if (pageIndex < 0 || pageIndex >= pageEntries.length) {
        return;
      }
      if (!canAccess(pageIndex)) {
        return;
      }
      if (isBlank(pageIndex)) {
        setState(pageIndex, STATE_PAINTED);
        return;
      }
      if (healIfBitmapReady(pageIndex)) {
        return;
      }
      if (isPaintReady(pageIndex)) {
        return;
      }
      if (active[pageIndex]) {
        if (typeof priority === "number" && priority < active[pageIndex].priority) {
          active[pageIndex].priority = priority;
        }
        return;
      }

      var existing = null;
      for (var i = 0; i < queue.length; i += 1) {
        if (queue[i].pageIndex === pageIndex) {
          existing = queue[i];
          break;
        }
      }
      if (existing) {
        if (priority < existing.priority) {
          existing.priority = priority;
          queueSort();
        }
        return;
      }

      seqCounter += 1;
      queue.push({
        pageIndex: pageIndex,
        priority: priority,
        seq: seqCounter,
      });
      queueSort();
      pump();
    }

    function clearImageHandlers(image, meta) {
      if (!image || !meta) {
        return;
      }
      if (meta.onLoad) {
        image.removeEventListener("load", meta.onLoad);
      }
      if (meta.onError) {
        image.removeEventListener("error", meta.onError);
      }
      if (meta.timeoutId != null) {
        clearTimeout(meta.timeoutId);
        meta.timeoutId = null;
      }
    }

    function finishJob(pageIndex, ok) {
      var meta = active[pageIndex];
      if (!meta || meta.finished) {
        return;
      }
      meta.finished = true;
      clearImageHandlers(imageAt(pageIndex), meta);
      delete active[pageIndex];
      if (inFlight > 0) {
        inFlight -= 1;
      }
      if (ok) {
        markDecodedThenPainted(pageIndex);
      } else {
        setState(pageIndex, STATE_FAILED);
      }
      updateBackgroundPause();
      pump();
    }

    function markDecodedThenPainted(pageIndex) {
      var image = imageAt(pageIndex);
      if (!image || !(image.complete && image.naturalWidth > 0)) {
        setState(pageIndex, STATE_FAILED);
        return;
      }

      // Paint immediately once complete+naturalWidth. Never *block* readiness on
      // image.decode(): finishJob already cleared the active timeout/handlers, so
      // a hung decode() (Firefox / StPageFlip remount) left pages stuck in
      // "loading" forever with no Retry (build 173). Decode is best-effort only;
      // naturalWidth-without-complete must never promote to painted (half-white).
      setState(pageIndex, STATE_DECODED);
      setState(pageIndex, STATE_PAINTED);

      if (typeof image.decode === "function") {
        try {
          var decoded = image.decode();
          if (decoded && typeof decoded.catch === "function") {
            decoded.catch(noop);
          }
        } catch (err) {
          /* ignore decode errors — bitmap already paint-ready */
        }
      }
    }

    function updateBackgroundPause() {
      var paused = false;
      for (var key in active) {
        if (!Object.prototype.hasOwnProperty.call(active, key)) {
          continue;
        }
        if (active[key].priority === PRIORITY_VISIBLE) {
          var st = getState(Number(key));
          if (st === STATE_LOADING || st === STATE_IDLE) {
            paused = true;
            break;
          }
        }
      }
      backgroundPaused = paused;
    }

    function assignSrc(image, href) {
      if (!image || !href) {
        return;
      }
      // Eager before src — lazy+transform can starve StPageFlip nodes (Firefox).
      image.loading = "eager";
      if ("fetchPriority" in image) {
        image.fetchPriority = "high";
      }
      if (image.getAttribute("src") !== href) {
        image.src = href;
      }
    }

    function startJob(job) {
      var pageIndex = job.pageIndex;
      var image = imageAt(pageIndex);
      var entry = entryAt(pageIndex);

      if (!image || !entry || entry.blank) {
        if (entry && entry.blank) {
          setState(pageIndex, STATE_PAINTED);
        }
        pump();
        return;
      }

      inFlight += 1;
      setState(pageIndex, STATE_LOADING);

      var meta = {
        priority: job.priority,
        usingFallback: false,
        attempt: 0,
        timeoutId: null,
        onLoad: null,
        onError: null,
      };
      active[pageIndex] = meta;
      updateBackgroundPause();

      function bindCurrent() {
        clearImageHandlers(image, meta);

        var href = meta.usingFallback
          ? resolveFallback(pageIndex, meta.attempt)
          : resolvePrimary(pageIndex, meta.attempt);

        if (!href) {
          if (!meta.usingFallback) {
            tryFallback();
            return;
          }
          finishJob(pageIndex, false);
          return;
        }

        function onLoad() {
          clearImageHandlers(image, meta);
          if (image.complete && image.naturalWidth > 0) {
            finishJob(pageIndex, true);
            return;
          }
          // Broken complete (0-width) — treat as error.
          onError();
        }

        function onError() {
          clearImageHandlers(image, meta);
          if (!meta.usingFallback) {
            tryFallback();
            return;
          }
          finishJob(pageIndex, false);
        }

        meta.onLoad = onLoad;
        meta.onError = onError;
        image.addEventListener("load", onLoad);
        image.addEventListener("error", onError);

        meta.timeoutId = setTimeout(function () {
          if (!active[pageIndex]) {
            return;
          }
          clearImageHandlers(image, meta);
          if (image.complete && image.naturalWidth > 0) {
            finishJob(pageIndex, true);
            return;
          }
          if (!meta.usingFallback) {
            tryFallback();
            return;
          }
          finishJob(pageIndex, false);
        }, timeoutMs);

        assignSrc(image, href);

        if (image.complete && image.naturalWidth > 0) {
          onLoad();
        } else if (image.complete && image.naturalWidth === 0 && image.getAttribute("src")) {
          onError();
        }
      }

      function tryFallback() {
        var fallback = resolveFallback(pageIndex, 0);
        if (!fallback || fallback === resolvePrimary(pageIndex, 0)) {
          finishJob(pageIndex, false);
          return;
        }
        meta.usingFallback = true;
        meta.attempt = 0;
        // Clear failed primary so the browser fetches fallback cleanly.
        try {
          image.removeAttribute("src");
        } catch (err) {
          /* ignore */
        }
        bindCurrent();
      }

      bindCurrent();
    }

    function pump() {
      if (destroyed) {
        return;
      }
      while (inFlight < maxInFlight && queue.length) {
        if (backgroundPaused && queue[0].priority >= PRIORITY_BACKGROUND) {
          break;
        }
        var job = queue.shift();
        if (isPaintReady(job.pageIndex) || active[job.pageIndex]) {
          continue;
        }
        if (!canAccess(job.pageIndex)) {
          continue;
        }
        startJob(job);
      }
    }

    function whenSettled(pageIndex, timeoutOverride) {
      return new Promise(function (resolve) {
        if (isSettled(pageIndex)) {
          resolve(isPaintReady(pageIndex));
          return;
        }
        if (!waiters[pageIndex]) {
          waiters[pageIndex] = [];
        }
        var done = false;
        var timer = setTimeout(
          function () {
            if (done) {
              return;
            }
            done = true;
            resolve(isPaintReady(pageIndex));
          },
          typeof timeoutOverride === "number" ? timeoutOverride : timeoutMs * 2,
        );
        waiters[pageIndex].push(function (ok) {
          if (done) {
            return;
          }
          done = true;
          clearTimeout(timer);
          resolve(ok);
        });
      });
    }

    function request(pageIndex, priority) {
      enqueue(
        pageIndex,
        typeof priority === "number" ? priority : PRIORITY_NEIGHBOR,
      );
      return whenSettled(pageIndex);
    }

    function setCenter(centerIndex, radius, aheadBias) {
      var r = typeof radius === "number" ? radius : 2;
      var ahead = typeof aheadBias === "number" ? aheadBias : 3;
      var i;
      for (i = -r; i <= r; i += 1) {
        var idx = centerIndex + i;
        var pri =
          i === 0 || i === 1 ? PRIORITY_VISIBLE : PRIORITY_NEIGHBOR;
        enqueue(idx, pri);
      }
      for (i = r + 1; i <= r + ahead; i += 1) {
        enqueue(centerIndex + i, PRIORITY_BACKGROUND);
        enqueue(centerIndex - i, PRIORITY_BACKGROUND);
      }
    }

    function prime(indices) {
      var list = indices || [];
      for (var i = 0; i < list.length; i += 1) {
        enqueue(list[i], PRIORITY_VISIBLE);
      }
      return Promise.all(
        list.map(function (pageIndex) {
          return whenSettled(pageIndex, timeoutMs * 3);
        }),
      ).then(function (results) {
        var allOk = true;
        for (var j = 0; j < results.length; j += 1) {
          if (!results[j]) {
            allOk = false;
            break;
          }
        }
        return allOk;
      });
    }

    function retry(pageIndex) {
      if (isBlank(pageIndex)) {
        setState(pageIndex, STATE_PAINTED);
        return Promise.resolve(true);
      }
      var image = imageAt(pageIndex);
      if (image) {
        try {
          image.removeAttribute("src");
        } catch (err) {
          /* ignore */
        }
      }
      removeQueued(pageIndex);
      if (active[pageIndex]) {
        clearImageHandlers(image, active[pageIndex]);
        delete active[pageIndex];
        if (inFlight > 0) {
          inFlight -= 1;
        }
      }
      states[pageIndex] = STATE_IDLE;
      enqueue(pageIndex, PRIORITY_VISIBLE);
      return whenSettled(pageIndex, timeoutMs * 3);
    }

    function retryMany(indices) {
      var list = indices || [];
      return Promise.all(
        list.map(function (pageIndex) {
          return retry(pageIndex);
        }),
      ).then(function (results) {
        for (var i = 0; i < results.length; i += 1) {
          if (!results[i]) {
            return false;
          }
        }
        return true;
      });
    }

    function getBudgetStats() {
      return {
        inFlight: inFlight,
        queued: queue.length,
        backgroundPaused: backgroundPaused,
      };
    }

    function destroy() {
      destroyed = true;
      queue = [];
      for (var key in active) {
        if (!Object.prototype.hasOwnProperty.call(active, key)) {
          continue;
        }
        clearImageHandlers(imageAt(Number(key)), active[key]);
      }
      active = {};
      inFlight = 0;
      waiters = {};
    }

    // Mark blanks painted up front.
    for (var b = 0; b < pageEntries.length; b += 1) {
      if (isBlank(b)) {
        states[b] = STATE_PAINTED;
      }
    }

    return {
      STATE_IDLE: STATE_IDLE,
      STATE_LOADING: STATE_LOADING,
      STATE_DECODED: STATE_DECODED,
      STATE_PAINTED: STATE_PAINTED,
      STATE_FAILED: STATE_FAILED,
      PRIORITY_VISIBLE: PRIORITY_VISIBLE,
      PRIORITY_NEIGHBOR: PRIORITY_NEIGHBOR,
      PRIORITY_BACKGROUND: PRIORITY_BACKGROUND,
      getState: getState,
      isPaintReady: isPaintReady,
      isSettled: isSettled,
      request: request,
      enqueue: enqueue,
      setCenter: setCenter,
      prime: prime,
      retry: retry,
      retryMany: retryMany,
      whenSettled: whenSettled,
      getBudgetStats: getBudgetStats,
      destroy: destroy,
    };
  }

  function loadManifest(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) {
        throw new Error("manifest HTTP " + res.status);
      }
      return res.json();
    });
  }

  function indexManifest(manifest) {
    var byId = {};
    if (!manifest || !manifest.pages) {
      return byId;
    }
    for (var i = 0; i < manifest.pages.length; i += 1) {
      var page = manifest.pages[i];
      if (page && page.id) {
        byId[page.id] = page;
      }
    }
    return byId;
  }

  function assetUrlFromManifest(manifestPage, kind, assetsBase) {
    if (!manifestPage) {
      return "";
    }
    var rel = kind === "fallback" ? manifestPage.fallback : manifestPage.webp;
    if (!rel) {
      return "";
    }
    var base = assetsBase || "./assets/";
    if (rel.indexOf("./") === 0) {
      rel = rel.slice(2);
    }
    if (rel.indexOf("pages/") === 0 || rel.indexOf("assets/") === 0) {
      return base.replace(/\/?$/, "/") + rel.replace(/^assets\//, "");
    }
    return base.replace(/\/?$/, "/") + rel;
  }

  root.LegendistPageLifecycle = {
    create: createLoader,
    loadManifest: loadManifest,
    indexManifest: indexManifest,
    assetUrlFromManifest: assetUrlFromManifest,
    STATE_IDLE: STATE_IDLE,
    STATE_LOADING: STATE_LOADING,
    STATE_DECODED: STATE_DECODED,
    STATE_PAINTED: STATE_PAINTED,
    STATE_FAILED: STATE_FAILED,
    PRIORITY_VISIBLE: PRIORITY_VISIBLE,
    PRIORITY_NEIGHBOR: PRIORITY_NEIGHBOR,
    PRIORITY_BACKGROUND: PRIORITY_BACKGROUND,
  };
})(typeof window !== "undefined" ? window : this);
