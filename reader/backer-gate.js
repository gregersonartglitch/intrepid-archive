/**
 * Reader issue access — Kickstarter backer gates for Issues 2 & 3.
 * Issue 1 is always open. Future paid unlock: call ReaderAccess.grantIssue('002').
 *
 * ENABLE_READER_GATE — reversible kill switch (also unlocks gated PDFs via isIssueUnlocked).
 * false = open window (backer invite / pre–early-August): no Issue 2–3 modal, all PDFs free.
 * true  = after early August: Ch1 free; one unlock opens Issues 2+3 and Ch2/Ch3/full PDFs.
 * localStorage opt-out: intrepid_reader_gate_disabled=1 forces off even when flag is true.
 */
(function () {
  "use strict";

  // Re-enable after early August for public Ch1-free / pay-after-Ch1.
  var ENABLE_READER_GATE = false;

  function isReaderGateEnabled() {
    try {
      if (localStorage.getItem("intrepid_reader_gate_disabled") === "1") {
        return false;
      }
    } catch (e) {}
    return ENABLE_READER_GATE;
  }

  var BACKER_CODES = {
    scribe4: { issues: ["002", "003"], label: "Backer" },
  };

  var LS_ISSUE_PREFIX = "intrepid_reader_issue_";
  var LS_BACKER_KEY = "intrepid_reader_backer";

  // Must match reader spike.js pageEntries:
  // coverSpread (2) + issue1 (21) + issue2 (21) + ch3 spacer (1) + issue3 (26) + back cover (1)
  // Gate uses page index only through ISSUE_003 endIndex 999 — trailing back cover stays Issue 3.
  var COVER_SPREAD_PAGES = 2;
  var ISSUE_PAGE_COUNTS = [21, 21, 26];
  var ISSUE_002_START = COVER_SPREAD_PAGES + ISSUE_PAGE_COUNTS[0];
  var ISSUE_003_START =
    ISSUE_002_START + ISSUE_PAGE_COUNTS[1] + 1;

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
      previewPage: "./assets/pages/page-022.webp",
    },
    "003": {
      eyebrow: "Issue 3 — Backer Preview",
      title: "Thank you for backing Intrepid Dusk",
      body:
        "Issue 3 awaits our backers. Enter the access word from your backer update to read the next chapter.",
      cta: "Unlock Issue 3",
    },
  };

  function grantIssue(issueId) {
    localStorage.setItem(LS_ISSUE_PREFIX + issueId, "granted");
  }

  var LS_CARTOGRAPHER_KEY = "intrepid_cartographer_unlocked";

  function grantAllBackerIssues() {
    if (
      window.IntrepidArchiveAccess &&
      window.IntrepidArchiveAccess.grantReaderBackerAccess
    ) {
      window.IntrepidArchiveAccess.grantReaderBackerAccess();
      return;
    }
    localStorage.setItem(LS_BACKER_KEY, "granted");
    grantIssue("002");
    grantIssue("003");
  }

  function isIssueUnlocked(issueId) {
    if (issueId === "001") return true;
    // Open window: treat full volume (and gated PDFs) as unlocked.
    if (!isReaderGateEnabled()) return true;
    if (localStorage.getItem(LS_BACKER_KEY) === "granted") return true;
    if (localStorage.getItem(LS_CARTOGRAPHER_KEY) === "granted") return true;
    if (
      window.IntrepidArchiveAccess &&
      window.IntrepidArchiveAccess.hasReaderBackerAccess &&
      window.IntrepidArchiveAccess.hasReaderBackerAccess()
    ) {
      return true;
    }
    return localStorage.getItem(LS_ISSUE_PREFIX + issueId) === "granted";
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
      window.IntrepidArchiveAccess &&
      window.IntrepidArchiveAccess.submitArchiveCode
    ) {
      var result = window.IntrepidArchiveAccess.submitArchiveCode(pw);
      if (result.ok && result.reader) return true;
      return false;
    }
    var code = BACKER_CODES[String(pw || "").trim().toLowerCase()];
    if (!code) return false;
    grantAllBackerIssues();
    return true;
  }

  function purgeMigratedLegacyAuth() {
    if (localStorage.getItem("intrepid_reader_legacy_purged") === "yes") return;
    if (
      localStorage.getItem(LS_BACKER_KEY) === "granted" &&
      localStorage.getItem("intrepid_atlas_auth") === "granted" &&
      localStorage.getItem("intrepid_atlas_tier") === "B" &&
      localStorage.getItem(LS_ISSUE_PREFIX + "002") !== "granted"
    ) {
      localStorage.removeItem(LS_BACKER_KEY);
    }
    localStorage.setItem("intrepid_reader_legacy_purged", "yes");
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

    function trySubmit() {
      if (submitBackerPassword(pwInput.value)) {
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

  purgeMigratedLegacyAuth();
  bindGateEvents();

  window.ReaderAccess = {
    isIssueUnlocked: isIssueUnlocked,
    isGateEnabled: isReaderGateEnabled,
    grantIssue: grantIssue,
    grantAllBackerIssues: grantAllBackerIssues,
    submitBackerPassword: submitBackerPassword,
    getIssueForPageIndex: getIssueForPageIndex,
    ISSUE_BOUNDARIES: ISSUE_BOUNDARIES,
  };

  window.ReaderGate = {
    show: showGate,
    hide: hideGate,
    onUnlocked: null,
  };
})();
