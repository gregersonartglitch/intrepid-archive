/**
 * Intrepid Reader Magnify plugin (V3 — handheld landscape lens)
 * Draggable magnifying glass over the page; edges still turn pages when lens closed.
 */
(function () {
  var DEFAULT_ZOOM = 1.5;
  var MIN_ZOOM = 1.25;
  var MAX_ZOOM = 2.5;
  var ZOOM_STEP = 0.25;
  var PAGE_TURN_EDGE = 0.15;
  var LENS_ASPECT = 2;
  var LENS_WIDTH_RATIO = 0.5;
  var LENS_MAX_WIDTH_PX = 600;
  var LENS_MAX_HEIGHT_VH = 0.625;
  var LENS_MIN_WIDTH_PX = 325;
  var LENS_MARGIN = 14;
  var STORAGE_ENABLED_KEY = "intrepid_reader_magnify_enabled";
  var STORAGE_DISABLE_KEY = "intrepid_reader_magnify_disabled";

  var mounted = false;
  var options = null;
  var pluginRoot = null;
  var overlay = null;
  var dismissLayer = null;
  var lensEl = null;
  var viewport = null;
  var imageEl = null;
  var imageElRight = null;
  var closeBtn = null;
  var zoomOutBtn = null;
  var zoomInBtn = null;
  var zoomLabel = null;
  var magnifyBtn = null;
  var toggleBtn = null;

  var isOpen = false;
  var zoom = DEFAULT_ZOOM;
  var lensPos = { left: 0, top: 0 };
  var dragging = false;
  var dragStart = null;
  var lensStart = null;
  var boundKeyDown = null;
  var boundResize = null;
  var boundBookPointerMove = null;
  var boundBookPointerLeave = null;
  var boundBookPointerDown = null;
  var boundBookPointerUp = null;
  var boundBookMouseDown = null;
  var boundBookMouseUp = null;
  var boundBookClick = null;
  var boundDocPointerDown = null;
  var boundDocPointerUp = null;
  var boundDocMouseDown = null;
  var boundDocMouseUp = null;
  var boundDocClick = null;
  var bookEl = null;
  var currentSourceImg = null;
  var currentSourceImgRight = null;
  var pendingCenterOpen = null;

  function isRuntimeDisabled() {
    try {
      return localStorage.getItem(STORAGE_DISABLE_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function isUserEnabled() {
    if (isRuntimeDisabled()) {
      return false;
    }
    try {
      var stored = localStorage.getItem(STORAGE_ENABLED_KEY);
      if (stored === null || stored === "0") {
        return false;
      }
      return stored === "1";
    } catch (err) {
      return true;
    }
  }

  function setUserEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_ENABLED_KEY, enabled ? "1" : "0");
    } catch (err) {
      /* ignore */
    }
    updateToggleUI();
    updateMagnifyControlsVisibility();
    if (!enabled) {
      exitMagnify();
      clearBookCursor();
    }
  }

  function teardownDom() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (magnifyBtn && magnifyBtn.parentNode) {
      magnifyBtn.parentNode.removeChild(magnifyBtn);
    }
    if (toggleBtn && toggleBtn.parentNode) {
      toggleBtn.parentNode.removeChild(toggleBtn);
    }
    if (pluginRoot && pluginRoot.parentNode) {
      pluginRoot.parentNode.removeChild(pluginRoot);
    }
    overlay = null;
    dismissLayer = null;
    lensEl = null;
    viewport = null;
    imageEl = null;
    imageElRight = null;
    closeBtn = null;
    zoomOutBtn = null;
    zoomInBtn = null;
    zoomLabel = null;
    magnifyBtn = null;
    toggleBtn = null;
    pluginRoot = null;
  }

  function removeListeners() {
    if (boundKeyDown) {
      document.removeEventListener("keydown", boundKeyDown);
    }
    if (boundResize) {
      window.removeEventListener("resize", boundResize);
    }
    if (bookEl && boundBookPointerMove) {
      bookEl.removeEventListener("pointermove", boundBookPointerMove, true);
    }
    if (bookEl && boundBookPointerLeave) {
      bookEl.removeEventListener("pointerleave", boundBookPointerLeave, true);
    }
    if (bookEl && boundBookPointerDown) {
      bookEl.removeEventListener("pointerdown", boundBookPointerDown, true);
    }
    if (bookEl && boundBookPointerUp) {
      bookEl.removeEventListener("pointerup", boundBookPointerUp, true);
    }
    if (bookEl && boundBookMouseDown) {
      bookEl.removeEventListener("mousedown", boundBookMouseDown, true);
    }
    if (bookEl && boundBookMouseUp) {
      bookEl.removeEventListener("mouseup", boundBookMouseUp, true);
    }
    if (bookEl && boundBookClick) {
      bookEl.removeEventListener("click", boundBookClick, true);
    }
    if (boundDocPointerDown) {
      document.removeEventListener("pointerdown", boundDocPointerDown, true);
    }
    if (boundDocPointerUp) {
      document.removeEventListener("pointerup", boundDocPointerUp, true);
    }
    if (boundDocMouseDown) {
      document.removeEventListener("mousedown", boundDocMouseDown, true);
    }
    if (boundDocMouseUp) {
      document.removeEventListener("mouseup", boundDocMouseUp, true);
    }
    if (boundDocClick) {
      document.removeEventListener("click", boundDocClick, true);
    }
    boundKeyDown = null;
    boundResize = null;
    boundBookPointerMove = null;
    boundBookPointerLeave = null;
    boundBookPointerDown = null;
    boundBookPointerUp = null;
    boundBookMouseDown = null;
    boundBookMouseUp = null;
    boundBookClick = null;
    boundDocPointerDown = null;
    boundDocPointerUp = null;
    boundDocMouseDown = null;
    boundDocMouseUp = null;
    boundDocClick = null;
    bookEl = null;
    pendingCenterOpen = null;
  }

  function getLensSize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var lensW = Math.min(vw * LENS_WIDTH_RATIO, LENS_MAX_WIDTH_PX);
    lensW = Math.max(LENS_MIN_WIDTH_PX, lensW);
    var lensH = lensW / LENS_ASPECT;
    var maxH = vh * LENS_MAX_HEIGHT_VH;
    if (lensH > maxH) {
      lensH = maxH;
      lensW = lensH * LENS_ASPECT;
    }
    return { w: Math.round(lensW), h: Math.round(lensH) };
  }

  function getViewportSize() {
    if (!viewport) {
      return getLensSize();
    }
    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    if (vw > 0 && vh > 0) {
      return { w: vw, h: vh };
    }
    return getLensSize();
  }

  function getLensCenter() {
    var lens = getLensSize();
    return {
      x: lensPos.left + lens.w / 2,
      y: lensPos.top + lens.h / 2,
    };
  }

  function resolveSourceImage(clientX, clientY) {
    if (options.getPageImageAtPoint) {
      return options.getPageImageAtPoint(clientX, clientY);
    }
    if (options.getCurrentPageImage) {
      return options.getCurrentPageImage();
    }
    return null;
  }

  function getPageCenterPoint() {
    var sourceImg = resolveSourceImage(
      window.innerWidth / 2,
      window.innerHeight / 2
    );
    if (!sourceImg) {
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        img: null,
      };
    }
    var rect = sourceImg.getBoundingClientRect();
    if (!rect.width) {
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        img: sourceImg,
      };
    }
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      img: sourceImg,
    };
  }

  function clampLensPosition(left, top) {
    var lens = getLensSize();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    return {
      left: Math.max(LENS_MARGIN, Math.min(vw - lens.w - LENS_MARGIN, left)),
      top: Math.max(LENS_MARGIN, Math.min(vh - lens.h - LENS_MARGIN, top)),
    };
  }

  function applyLensPosition(left, top) {
    var clamped = clampLensPosition(left, top);
    lensPos.left = clamped.left;
    lensPos.top = clamped.top;
    var lens = getLensSize();
    lensEl.style.width = lens.w + "px";
    lensEl.style.height = lens.h + "px";
    lensEl.style.left = lensPos.left + "px";
    lensEl.style.top = lensPos.top + "px";
  }

  function positionLensAtCenter(clientX, clientY) {
    var lens = getLensSize();
    applyLensPosition(clientX - lens.w / 2, clientY - lens.h / 2);
  }

  function normOnImage(clientX, clientY, sourceImg) {
    if (!sourceImg) {
      return { x: 0.5, y: 0.5 };
    }
    var rect = sourceImg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { x: 0.5, y: 0.5 };
    }
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  function isImageReady(sourceImg) {
    return sourceImg && sourceImg.complete && sourceImg.naturalWidth > 0;
  }

  function getSpreadPair() {
    if (options && typeof options.getVisibleSpreadImages === "function") {
      return options.getVisibleSpreadImages();
    }
    if (!isSpreadMode()) {
      return null;
    }
    var book = getBookEl();
    if (!book) {
      return null;
    }
    var bookRect = book.getBoundingClientRect();
    if (!bookRect.width) {
      return null;
    }
    var midY = bookRect.top + bookRect.height / 2;
    var gutterX = bookRect.left + bookRect.width / 2;
    var left = resolveSourceImage(gutterX - 1, midY);
    var right = resolveSourceImage(gutterX + 1, midY);
    if (left && right && left !== right && isImageReady(left) && isImageReady(right)) {
      return { left: left, right: right };
    }
    return null;
  }

  function lensCrossesGutter() {
    if (!isSpreadMode()) {
      return false;
    }
    var book = getBookEl();
    if (!book) {
      return false;
    }
    var bookRect = book.getBoundingClientRect();
    if (!bookRect.width) {
      return false;
    }
    var gutterX = bookRect.left + bookRect.width / 2;
    var lens = getLensSize();
    var lensLeft = lensPos.left;
    var lensRight = lensPos.left + lens.w;
    return lensLeft < gutterX && lensRight > gutterX;
  }

  function applyImageTransform(imgEl, sourceImg, center, vp) {
    var rect = sourceImg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }
    var displayScale = (rect.width / sourceImg.naturalWidth) * zoom;
    var panX = vp.w / 2 + (rect.left - center.x) * zoom;
    var panY = vp.h / 2 + (rect.top - center.y) * zoom;
    imgEl.style.transform =
      "translate(" +
      panX +
      "px, " +
      panY +
      "px) scale(" +
      displayScale +
      ")";
    return true;
  }

  function syncMagnifyImage(imgEl, sourceImg, currentRef) {
    if (!isImageReady(sourceImg)) {
      return { ok: false, current: currentRef };
    }
    if (sourceImg !== currentRef) {
      imgEl.src = sourceImg.currentSrc || sourceImg.src;
      imgEl.alt = sourceImg.alt || "Magnified comic page";
      return { ok: true, current: sourceImg };
    }
    return { ok: true, current: currentRef };
  }

  function updateLensMagnification() {
    if (!isOpen || !imageEl) {
      return;
    }

    var center = getLensCenter();
    var vp = getViewportSize();
    var spreadPair = getSpreadPair();
    var useSpread = spreadPair && lensCrossesGutter();

    if (useSpread) {
      imageEl.style.display = "";
      imageElRight.style.display = "";

      var leftSync = syncMagnifyImage(imageEl, spreadPair.left, currentSourceImg);
      currentSourceImg = leftSync.current;
      var rightSync = syncMagnifyImage(
        imageElRight,
        spreadPair.right,
        currentSourceImgRight
      );
      currentSourceImgRight = rightSync.current;

      if (leftSync.ok) {
        applyImageTransform(imageEl, spreadPair.left, center, vp);
      }
      if (rightSync.ok) {
        applyImageTransform(imageElRight, spreadPair.right, center, vp);
      }
      return;
    }

    imageElRight.style.display = "none";
    currentSourceImgRight = null;

    var sourceImg = resolveSourceImage(center.x, center.y);
    if (!isImageReady(sourceImg)) {
      return;
    }

    var singleSync = syncMagnifyImage(imageEl, sourceImg, currentSourceImg);
    currentSourceImg = singleSync.current;
    if (!singleSync.ok) {
      return;
    }

    applyImageTransform(imageEl, sourceImg, center, vp);
  }

  function updateZoomLabel() {
    if (!zoomLabel) {
      return;
    }
    zoomLabel.textContent = Math.round(zoom * 100) + "%";
    if (zoomOutBtn) {
      zoomOutBtn.disabled = zoom <= MIN_ZOOM + 0.001;
    }
    if (zoomInBtn) {
      zoomInBtn.disabled = zoom >= MAX_ZOOM - 0.001;
    }
  }

  function setZoom(nextZoom) {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    updateZoomLabel();
    updateLensMagnification();
  }

  function isPointInsideLens(clientX, clientY) {
    if (!lensEl) {
      return false;
    }
    var rect = lensEl.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function updateMagnifyButton() {
    if (!magnifyBtn) {
      return;
    }
    magnifyBtn.classList.toggle("is-active", isOpen);
    magnifyBtn.setAttribute("aria-pressed", isOpen ? "true" : "false");
  }

  function updateToggleUI() {
    if (!toggleBtn) {
      return;
    }
    var on = isUserEnabled();
    toggleBtn.classList.toggle("is-on", on);
    toggleBtn.setAttribute("aria-pressed", on ? "true" : "false");
    toggleBtn.textContent = on ? "Magnify: On" : "Magnify: Off";
    toggleBtn.title = on
      ? "Magnify is enabled. Click to turn off."
      : "Magnify is off. Click to turn on.";
  }

  function updateMagnifyControlsVisibility() {
    var show = isUserEnabled();
    if (magnifyBtn) {
      magnifyBtn.hidden = !show;
      magnifyBtn.disabled = !show;
    }
  }

  function exitMagnify() {
    if (!isOpen) {
      return;
    }
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    isOpen = false;
    dragging = false;
    currentSourceImg = null;
    currentSourceImgRight = null;
    clearBookCursor();
    updateMagnifyButton();
    if (options && typeof options.onExitMagnify === "function") {
      options.onExitMagnify();
    }
  }

  function openMagnifyAt(clientX, clientY) {
    if (!isUserEnabled() || isRuntimeDisabled()) {
      return;
    }

    var sourceImg = resolveSourceImage(clientX, clientY);
    if (!sourceImg || !sourceImg.complete || sourceImg.naturalWidth <= 0) {
      return;
    }

    zoom = DEFAULT_ZOOM;
    updateZoomLabel();
    positionLensAtCenter(clientX, clientY);

    var spreadPair = getSpreadPair();
    var useSpread = spreadPair && lensCrossesGutter();

    if (useSpread) {
      currentSourceImg = spreadPair.left;
      currentSourceImgRight = spreadPair.right;
      imageEl.src = spreadPair.left.currentSrc || spreadPair.left.src;
      imageEl.alt = spreadPair.left.alt || "Magnified comic page";
      imageElRight.src = spreadPair.right.currentSrc || spreadPair.right.src;
      imageElRight.alt = spreadPair.right.alt || "Magnified comic page";
      imageElRight.style.display = "";
    } else {
      currentSourceImg = sourceImg;
      currentSourceImgRight = null;
      imageEl.src = sourceImg.currentSrc || sourceImg.src;
      imageEl.alt = sourceImg.alt || "Magnified comic page";
      imageElRight.style.display = "none";
    }

    function reveal() {
      if (!imageEl.naturalWidth) {
        return;
      }
      if (useSpread && imageElRight && !imageElRight.naturalWidth) {
        return;
      }
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
      isOpen = true;
      clearBookCursor();
      updateLensMagnification();
      updateMagnifyButton();
      if (options && typeof options.onEnterMagnify === "function") {
        options.onEnterMagnify();
      }
    }

    if (
      imageEl.complete &&
      imageEl.naturalWidth > 0 &&
      (!useSpread || (imageElRight.complete && imageElRight.naturalWidth > 0))
    ) {
      reveal();
      return;
    }

    imageEl.addEventListener("load", reveal, { once: true });
    imageEl.addEventListener(
      "error",
      function () {
        exitMagnify();
      },
      { once: true }
    );
    if (useSpread && imageElRight) {
      imageElRight.addEventListener("load", reveal, { once: true });
      imageElRight.addEventListener(
        "error",
        function () {
          exitMagnify();
        },
        { once: true }
      );
    }
  }

  function enterMagnify() {
    var point = getPageCenterPoint();
    openMagnifyAt(point.x, point.y);
  }

  function getBookEl() {
    return options && options.root ? options.root.querySelector("#book, .book") : null;
  }

  function isSpreadMode() {
    var currentImg =
      options && options.getCurrentPageImage ? options.getCurrentPageImage() : null;
    if (!currentImg) {
      return false;
    }
    var pageRect = currentImg.getBoundingClientRect();
    var book = getBookEl();
    if (!pageRect.width || !book) {
      return false;
    }
    var bookRect = book.getBoundingClientRect();
    return bookRect.width > pageRect.width * 1.4;
  }

  function isLeftPageInSpread(sourceImg) {
    var book = getBookEl();
    if (!book || !sourceImg) {
      return true;
    }
    var bookRect = book.getBoundingClientRect();
    var imgRect = sourceImg.getBoundingClientRect();
    if (!bookRect.width || !imgRect.width) {
      return true;
    }
    return imgRect.left + imgRect.width / 2 < bookRect.left + bookRect.width / 2;
  }

  function zoneFromImageRect(clientX, sourceImg) {
    var rect = sourceImg.getBoundingClientRect();
    if (!rect.width) {
      return "center";
    }
    var relX = (clientX - rect.left) / rect.width;
    if (relX < 0 || relX > 1) {
      return "center";
    }
    if (isSpreadMode()) {
      if (isLeftPageInSpread(sourceImg)) {
        if (relX < PAGE_TURN_EDGE) {
          return "left";
        }
        return "center";
      }
      if (relX > 1 - PAGE_TURN_EDGE) {
        return "right";
      }
      return "center";
    }
    if (relX < PAGE_TURN_EDGE) {
      return "left";
    }
    if (relX > 1 - PAGE_TURN_EDGE) {
      return "right";
    }
    return "center";
  }

  function zoneFromBookRect(clientX, clientY) {
    var book = getBookEl();
    if (!book) {
      return "center";
    }
    var bookRect = book.getBoundingClientRect();
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
    var relX = (clientX - bookRect.left) / bookRect.width;
    if (relX < 0 || relX > 1) {
      return "center";
    }

    if (isSpreadMode()) {
      if (relX < 0.5) {
        var relInLeftHalf = relX / 0.5;
        if (relX < PAGE_TURN_EDGE || relInLeftHalf < PAGE_TURN_EDGE) {
          return "left";
        }
        return "center";
      }
      var relInRightHalf = (relX - 0.5) / 0.5;
      if (relX > 1 - PAGE_TURN_EDGE || relInRightHalf > 1 - PAGE_TURN_EDGE) {
        return "right";
      }
      return "center";
    }

    if (relX < PAGE_TURN_EDGE) {
      return "left";
    }
    if (relX > 1 - PAGE_TURN_EDGE) {
      return "right";
    }
    return "center";
  }

  function getPageZone(clientX, clientY) {
    if (clientY == null) {
      var book = getBookEl();
      if (book) {
        var bookRect = book.getBoundingClientRect();
        clientY = bookRect.top + bookRect.height / 2;
      } else {
        clientY = window.innerHeight / 2;
      }
    }

    var sourceImg = resolveSourceImage(clientX, clientY);
    if (sourceImg) {
      var imgRect = sourceImg.getBoundingClientRect();
      if (imgRect.width) {
        return zoneFromImageRect(clientX, sourceImg);
      }
    }

    if (isPointOverBook(clientX, clientY)) {
      return zoneFromBookRect(clientX, clientY);
    }
    return "center";
  }

  function isPageTurnZone(clientX, clientY) {
    return getPageZone(clientX, clientY) !== "center";
  }

  function cursorForZone(zone) {
    if (zone === "left") {
      return "w-resize";
    }
    if (zone === "right") {
      return "e-resize";
    }
    return "zoom-in";
  }

  function clearBookCursor() {
    if (bookEl) {
      bookEl.removeAttribute("data-magnify-zone");
      bookEl.style.cursor = "";
    }
  }

  function updateBookCursor(clientX, clientY) {
    if (!bookEl || !isUserEnabled() || isOpen) {
      clearBookCursor();
      return;
    }
    var zone = getPageZone(clientX, clientY);
    bookEl.setAttribute("data-magnify-zone", zone);
    bookEl.style.cursor = cursorForZone(zone);
  }

  function onBookPointerMove(event) {
    updateBookCursor(event.clientX, event.clientY);
  }

  function onBookPointerLeave() {
    clearBookCursor();
  }

  function isPointOverBook(clientX, clientY) {
    var book = getBookEl();
    if (!book) {
      return false;
    }
    var rect = book.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function isCenterMagnifyTarget(clientX, clientY) {
    if (!isUserEnabled() || isRuntimeDisabled() || isOpen) {
      return false;
    }
    if (!isPointOverBook(clientX, clientY)) {
      return false;
    }
    return getPageZone(clientX, clientY) === "center";
  }

  function blockPageFlipEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function isPrimaryButton(event) {
    return event.button === 0 || event.button === undefined;
  }

  function isMouseEvent(event) {
    return event.type.indexOf("mouse") === 0;
  }

  function matchesPendingGesture(event) {
    if (!pendingCenterOpen) {
      return false;
    }
    if (pendingCenterOpen.kind === "mouse") {
      return isMouseEvent(event);
    }
    if (event.pointerId != null && pendingCenterOpen.pointerId != null) {
      return pendingCenterOpen.pointerId === event.pointerId;
    }
    return false;
  }

  function onCenterGestureDown(event) {
    if (!isPrimaryButton(event)) {
      return;
    }
    if (!isCenterMagnifyTarget(event.clientX, event.clientY)) {
      pendingCenterOpen = null;
      return;
    }

    blockPageFlipEvent(event);
    pendingCenterOpen = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId != null ? event.pointerId : null,
      kind: isMouseEvent(event) ? "mouse" : "pointer",
    };
  }

  function onCenterGestureUp(event) {
    if (!isPrimaryButton(event)) {
      return;
    }
    if (!matchesPendingGesture(event)) {
      return;
    }

    var clientX = event.clientX;
    var clientY = event.clientY;
    pendingCenterOpen = null;

    if (!isCenterMagnifyTarget(clientX, clientY)) {
      return;
    }

    blockPageFlipEvent(event);
    openMagnifyAt(clientX, clientY);
  }

  function onCenterGestureClick(event) {
    if (!isPrimaryButton(event)) {
      return;
    }
    if (!isCenterMagnifyTarget(event.clientX, event.clientY)) {
      return;
    }

    blockPageFlipEvent(event);
    if (!isOpen) {
      openMagnifyAt(event.clientX, event.clientY);
    }
  }

  function dismissFromOutside(clientX, clientY) {
    if (!isOpen) {
      return;
    }
    if (isPointInsideLens(clientX, clientY)) {
      return;
    }
    var inTurnZone = isPageTurnZone(clientX, clientY);
    exitMagnify();
    if (inTurnZone && options && typeof options.onDismissInTurnZone === "function") {
      options.onDismissInTurnZone(clientX, clientY);
    }
  }

  function onDismissLayerPointerUp(event) {
    if (!isOpen || event.target !== dismissLayer) {
      return;
    }
    dismissFromOutside(event.clientX, event.clientY);
  }

  function onLensPointerDown(event) {
    if (!isOpen || event.button !== 0) {
      return;
    }
    if (event.target === closeBtn || event.target === zoomOutBtn || event.target === zoomInBtn) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    lensEl.setPointerCapture(event.pointerId);
    dragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    lensStart = { left: lensPos.left, top: lensPos.top };
  }

  function onLensPointerMove(event) {
    if (!isOpen || !dragging || !dragStart || !lensStart) {
      return;
    }
    var dx = event.clientX - dragStart.x;
    var dy = event.clientY - dragStart.y;
    applyLensPosition(lensStart.left + dx, lensStart.top + dy);
    updateLensMagnification();
  }

  function onLensPointerUp(event) {
    if (!dragging) {
      return;
    }
    dragging = false;
    dragStart = null;
    lensStart = null;
    try {
      lensEl.releasePointerCapture(event.pointerId);
    } catch (err) {
      /* ignore */
    }
  }

  function createDom() {
    pluginRoot = document.createElement("div");
    pluginRoot.className = "reader-magnify-root";
    pluginRoot.setAttribute("data-reader-magnify", "root");

    overlay = document.createElement("div");
    overlay.className = "reader-magnify-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Page magnifier lens");
    overlay.setAttribute("aria-modal", "false");

    dismissLayer = document.createElement("div");
    dismissLayer.className = "reader-magnify-dismiss-layer";
    dismissLayer.setAttribute("aria-hidden", "true");

    lensEl = document.createElement("div");
    lensEl.className = "reader-magnify-lens";

    viewport = document.createElement("div");
    viewport.className = "reader-magnify-viewport";

    imageEl = document.createElement("img");
    imageEl.className = "reader-magnify-image";
    imageEl.alt = "";
    imageEl.draggable = false;
    viewport.appendChild(imageEl);

    imageElRight = document.createElement("img");
    imageElRight.className = "reader-magnify-image reader-magnify-image--spread-right";
    imageElRight.alt = "";
    imageElRight.draggable = false;
    imageElRight.style.display = "none";
    viewport.appendChild(imageElRight);

    var zoomBar = document.createElement("div");
    zoomBar.className = "reader-magnify-zoom";

    zoomOutBtn = document.createElement("button");
    zoomOutBtn.type = "button";
    zoomOutBtn.className = "reader-magnify-zoom-btn";
    zoomOutBtn.setAttribute("aria-label", "Zoom out");
    zoomOutBtn.textContent = "\u2212";

    zoomLabel = document.createElement("span");
    zoomLabel.className = "reader-magnify-zoom-label";
    zoomLabel.setAttribute("aria-live", "polite");

    zoomInBtn = document.createElement("button");
    zoomInBtn.type = "button";
    zoomInBtn.className = "reader-magnify-zoom-btn";
    zoomInBtn.setAttribute("aria-label", "Zoom in");
    zoomInBtn.textContent = "+";

    zoomBar.appendChild(zoomOutBtn);
    zoomBar.appendChild(zoomLabel);
    zoomBar.appendChild(zoomInBtn);

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "reader-magnify-close";
    closeBtn.setAttribute("aria-label", "Close magnifier");
    closeBtn.textContent = "\u00d7";

    lensEl.appendChild(viewport);
    lensEl.appendChild(zoomBar);
    lensEl.appendChild(closeBtn);
    overlay.appendChild(dismissLayer);
    overlay.appendChild(lensEl);
    pluginRoot.appendChild(overlay);

    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "reader-magnify-toggle";
    toggleBtn.setAttribute("data-action", "magnify-toggle");
    toggleBtn.setAttribute("aria-pressed", "true");

    magnifyBtn = document.createElement("button");
    magnifyBtn.type = "button";
    magnifyBtn.className = "reader-magnify-button";
    magnifyBtn.setAttribute("data-action", "magnify");
    magnifyBtn.setAttribute(
      "aria-label",
      "Open magnifier lens over the page. Drag the lens to explore."
    );
    magnifyBtn.setAttribute("aria-pressed", "false");
    magnifyBtn.title = "Open magnifier lens (M). Drag to move over the page.";
    magnifyBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>' +
      '</svg><span class="reader-magnify-button-label">Lens</span>';

    pluginRoot.appendChild(toggleBtn);
    pluginRoot.appendChild(magnifyBtn);
    options.root.appendChild(pluginRoot);

    var controls = options.root.querySelector(".controls");
    if (controls) {
      controls.insertBefore(toggleBtn, controls.firstChild);
      controls.insertBefore(magnifyBtn, toggleBtn.nextSibling);
    }

    updateToggleUI();
    updateMagnifyControlsVisibility();
    updateZoomLabel();
  }

  function bindEvents() {
    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      exitMagnify();
    });
    dismissLayer.addEventListener("pointerup", onDismissLayerPointerUp);

    toggleBtn.addEventListener("click", function () {
      setUserEnabled(!isUserEnabled());
    });

    magnifyBtn.addEventListener("click", function () {
      if (!isUserEnabled()) {
        return;
      }
      if (isOpen) {
        exitMagnify();
        return;
      }
      enterMagnify();
    });

    zoomOutBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      setZoom(zoom - ZOOM_STEP);
    });
    zoomInBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      setZoom(zoom + ZOOM_STEP);
    });

    lensEl.addEventListener("pointerdown", onLensPointerDown);
    lensEl.addEventListener("pointermove", onLensPointerMove);
    lensEl.addEventListener("pointerup", onLensPointerUp);
    lensEl.addEventListener("pointercancel", onLensPointerUp);

    boundKeyDown = function (event) {
      if (!isUserEnabled()) {
        return;
      }
      var tag = event.target && event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        exitMagnify();
        return;
      }
      if (
        (event.key === "m" || event.key === "M") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        if (isOpen) {
          exitMagnify();
        } else {
          enterMagnify();
        }
      }
    };
    document.addEventListener("keydown", boundKeyDown);

    boundResize = function () {
      if (!isOpen) {
        return;
      }
      applyLensPosition(lensPos.left, lensPos.top);
      updateLensMagnification();
    };
    window.addEventListener("resize", boundResize);

    bookEl = getBookEl();
    if (bookEl) {
      boundBookPointerMove = onBookPointerMove;
      boundBookPointerLeave = onBookPointerLeave;
      boundBookPointerDown = onCenterGestureDown;
      boundBookPointerUp = onCenterGestureUp;
      boundBookMouseDown = onCenterGestureDown;
      boundBookMouseUp = onCenterGestureUp;
      boundBookClick = onCenterGestureClick;
      bookEl.addEventListener("pointermove", boundBookPointerMove, true);
      bookEl.addEventListener("pointerleave", boundBookPointerLeave, true);
      bookEl.addEventListener("pointerdown", boundBookPointerDown, true);
      bookEl.addEventListener("pointerup", boundBookPointerUp, true);
      bookEl.addEventListener("mousedown", boundBookMouseDown, true);
      bookEl.addEventListener("mouseup", boundBookMouseUp, true);
      bookEl.addEventListener("click", boundBookClick, true);
    }

    /* Document capture intercepts StPageFlip mouse/click handlers on page nodes. */
    boundDocPointerDown = onCenterGestureDown;
    boundDocPointerUp = onCenterGestureUp;
    boundDocMouseDown = onCenterGestureDown;
    boundDocMouseUp = onCenterGestureUp;
    boundDocClick = onCenterGestureClick;
    document.addEventListener("pointerdown", boundDocPointerDown, true);
    document.addEventListener("pointerup", boundDocPointerUp, true);
    document.addEventListener("mousedown", boundDocMouseDown, true);
    document.addEventListener("mouseup", boundDocMouseUp, true);
    document.addEventListener("click", boundDocClick, true);
  }

  function destroyPlugin() {
    exitMagnify();
    removeListeners();
    teardownDom();
    mounted = false;
    options = null;
  }

  function mount(opts) {
    if (!opts || !opts.root || !opts.enabled) {
      return;
    }
    if (isRuntimeDisabled()) {
      return;
    }

    if (mounted) {
      destroyPlugin();
    }

    options = opts;
    createDom();
    bindEvents();
    mounted = true;
  }

  function unmount() {
    if (!mounted) {
      return;
    }
    exitMagnify();
  }

  function getIsArmed() {
    return isUserEnabled() && !isRuntimeDisabled();
  }

  function getIsOpen() {
    return isOpen;
  }

  window.IntrepidReaderMagnify = {
    mount: mount,
    unmount: unmount,
    isArmed: getIsArmed,
    isOpen: getIsOpen,
    openAt: openMagnifyAt,
    isPageTurnZone: isPageTurnZone,
    getPageZone: getPageZone,
    PAGE_TURN_EDGE: PAGE_TURN_EDGE,
    DEFAULT_ZOOM: DEFAULT_ZOOM,
  };
})();
