/**
 * Reader issue access — server session is authoritative (Wave 1 Option B+).
 * Issue 1 is always open. Issues 2–3 require HttpOnly cookie from /api/access/login.
 */
(function () {
  "use strict";

  var ENABLE_READER_GATE = true;

  function isReaderGateEnabled() {
    return ENABLE_READER_GATE;
  }

  var COVER_SPREAD_PAGES = 2;
  var ISSUE_PAGE_COUNTS = [21, 21, 26];
  var ISSUE_002_START = COVER_SPREAD_PAGES + ISSUE_PAGE_COUNTS[0];
  var ISSUE_003_START = ISSUE_002_START + ISSUE_PAGE_COUNTS[1] + 1;

  var ISSUE_BOUNDARIES = [
    { issue: "001", startIndex: 0, endIndex: ISSUE_002_START - 1 },
    { issue: "002", startIndex: ISSUE_002_START, endIndex: ISSUE_003_START - 1 },
    { issue: "003", startIndex: ISSUE_003_START, endIndex: 999 },
  ];

  var ISSUE_COPY = {
    "002": {
      eyebrow: "You've finished Issue 1",
      title: "Issue 2 awaits our backers",
      body:
        "Issues 2 and 3 are reserved for our Kickstarter backers. Enter the access word from your backer update to continue reading.",
      cta: "Unlock Issue 2",
      previewPage: "/api/protected-media/reader-page/page-022",
    },
    "003": {
      eyebrow: "Issue 3 — Backer Preview",
      title: "Thank you for backing Intrepid Dusk",
      body:
        "Issue 3 awaits our backers. Enter the access word from your backer update to read the next chapter.",
      cta: "Unlock Issue 3",
    },
  };

  function hasServerReaderAccess() {
    if (
      window.IntrepidArchiveAccess &&
      window.IntrepidArchiveAccess.hasReaderBackerAccess
    ) {
      return window.IntrepidArchiveAccess.hasReaderBackerAccess();
    }
    return false;
  }

  function isIssueUnlocked(issueId) {
    if (issueId === "001") return true;
    if (!isReaderGateEnabled()) return false;
    return hasServerReaderAccess();
  }

  function normalizePageIndex(pageIndex) {
    if (pageIndex && typeof pageIndex === "object") {
      return pageIndex.page;
    }
    return Number(pageIndex);
  }

  function getIssueForPageIndex(pageIndex) {
    var index = normalizePageIndex(pageIndex);
    if (isNaN(index)) return "001";
    var i;
    for (i = ISSUE_BOUNDARIES.length - 1; i >= 0; i -= 1) {
      if (index >= ISSUE_BOUNDARIES[i].startIndex) {
        return ISSUE_BOUNDARIES[i].issue;
      }
    }
    return "001";
  }

  function submitBackerPassword(pw) {
    if (
      !window.IntrepidArchiveAccess ||
      !window.IntrepidArchiveAccess.submitArchiveCode
    ) {
      return Promise.resolve(false);
    }
    return window.IntrepidArchiveAccess.submitArchiveCode(pw).then(function (result) {
      return !!(result && result.ok && result.reader);
    });
  }

  function buildGateOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "reader-backer-gate";
    overlay.className = "reader-backer-gate";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="reader-backer-gate-preview" id="reader-gate-preview" hidden aria-hidden="true">' +
      '  <img id="reader-gate-preview-img" class="reader-backer-gate-preview-img" alt="" />' +
      "</div>" +
      '<div class="reader-backer-gate-card" role="dialog" aria-modal="true" aria-labelledby="reader-gate-title">' +
      '  <p class="reader-backer-gate-eyebrow" id="reader-gate-eyebrow"></p>' +
      '  <h2 class="reader-backer-gate-title" id="reader-gate-title"></h2>' +
      '  <p class="reader-backer-gate-body" id="reader-gate-body"></p>' +
      '  <div class="reader-backer-gate-input-wrap">' +
      '    <input id="reader-gate-pw" class="reader-backer-gate-input" type="password" placeholder="Enter backer access word" autocomplete="off" spellcheck="false" aria-label="Backer access word">' +
      '    <button type="button" id="reader-gate-eye" class="reader-backer-gate-toggle" aria-label="Show access password">' +
      '      <svg class="pw-toggle-icon pw-toggle-icon--show" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>' +
      '      <svg class="pw-toggle-icon pw-toggle-icon--hide" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>' +
      "    </button>" +
      "  </div>" +
      '  <button type="button" id="reader-gate-submit" class="reader-backer-gate-btn"></button>' +
      '  <p id="reader-gate-err" class="reader-backer-gate-error" aria-live="polite"></p>' +
      '  <button type="button" id="reader-gate-close" class="reader-backer-gate-dismiss">Continue reading Issue 1</button>' +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  var gateEl = null;
  var pendingIssue = null;

  function getGateEl() {
    if (!gateEl) gateEl = buildGateOverlay();
    return gateEl;
  }

  function hideGate() {
    var el = getGateEl();
    el.hidden = true;
    pendingIssue = null;
    var err = document.getElementById("reader-gate-err");
    if (err) err.textContent = "";
    var preview = document.getElementById("reader-gate-preview");
    if (preview) preview.hidden = true;
  }

  function showGate(issueId) {
    if (!isReaderGateEnabled()) return;
    if (isIssueUnlocked(issueId)) return;
    var copy = ISSUE_COPY[issueId] || ISSUE_COPY["002"];
    var el = getGateEl();
    pendingIssue = issueId;

    document.getElementById("reader-gate-eyebrow").textContent = copy.eyebrow;
    document.getElementById("reader-gate-title").textContent = copy.title;
    document.getElementById("reader-gate-body").textContent = copy.body;
    document.getElementById("reader-gate-submit").textContent = copy.cta;

    var previewWrap = document.getElementById("reader-gate-preview");
    var previewImg = document.getElementById("reader-gate-preview-img");
    if (previewWrap && previewImg) {
      if (copy.previewPage) {
        previewImg.src = copy.previewPage;
        previewImg.alt = "Blurred preview of the next page";
        previewWrap.hidden = false;
        previewWrap.setAttribute("aria-hidden", "false");
      } else {
        previewWrap.hidden = true;
        previewWrap.setAttribute("aria-hidden", "true");
        previewImg.removeAttribute("src");
      }
    }

    var pw = document.getElementById("reader-gate-pw");
    pw.value = "";
    el.hidden = false;
    pw.focus();
  }

  function bindGateEvents() {
    var el = getGateEl();
    var submitBtn = document.getElementById("reader-gate-submit");
    var pwInput = document.getElementById("reader-gate-pw");
    var closeBtn = document.getElementById("reader-gate-close");
    var err = document.getElementById("reader-gate-err");
    var eyeBtn = document.getElementById("reader-gate-eye");

    if (eyeBtn && pwInput) {
      eyeBtn.addEventListener("click", function () {
        var isPassword = pwInput.type === "password";
        pwInput.type = isPassword ? "text" : "password";
        eyeBtn.classList.toggle("showing", isPassword);
        eyeBtn.setAttribute(
          "aria-label",
          isPassword ? "Hide access password" : "Show access password"
        );
        pwInput.focus();
      });
    }

    function trySubmit() {
      submitBackerPassword(pwInput.value).then(function (ok) {
        if (ok) {
          hideGate();
          if (window.ReaderGate && window.ReaderGate.onUnlocked) {
            window.ReaderGate.onUnlocked(pendingIssue);
          }
          return;
        }
        err.textContent =
          "That word doesn't match our backer records. Check your Kickstarter update.";
        el.querySelector(".reader-backer-gate-card").classList.remove("shake");
        void el.querySelector(".reader-backer-gate-card").offsetWidth;
        el.querySelector(".reader-backer-gate-card").classList.add("shake");
      });
    }

    submitBtn.addEventListener("click", trySubmit);
    pwInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") trySubmit();
    });
    closeBtn.addEventListener("click", hideGate);
    el.addEventListener("click", function (e) {
      if (e.target === el) hideGate();
    });
  }

  bindGateEvents();

  window.ReaderAccess = {
    isIssueUnlocked: isIssueUnlocked,
    isGateEnabled: isReaderGateEnabled,
    getIssueForPageIndex: getIssueForPageIndex,
    ISSUE_BOUNDARIES: ISSUE_BOUNDARIES,
    ISSUE_002_START: ISSUE_002_START,
    ISSUE_003_START: ISSUE_003_START,
  };

  window.ReaderGate = {
    show: showGate,
    hide: hideGate,
    onUnlocked: null,
  };
})();
