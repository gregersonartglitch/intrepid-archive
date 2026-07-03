/**
 * Reader issue access — Kickstarter backer gates for Issues 2 & 3.
 * Issue 1 is always open. Future paid unlock: call ReaderAccess.grantIssue('002').
 */
(function () {
  "use strict";

  var BACKER_CODES = {
    scribe4: { issues: ["002", "003"], label: "Backer" },
  };

  var LS_ISSUE_PREFIX = "intrepid_reader_issue_";
  var LS_BACKER_KEY = "intrepid_reader_backer";

  var ISSUE_BOUNDARIES = [
    { issue: "001", startIndex: 0, endIndex: 20 },
    { issue: "002", startIndex: 21, endIndex: 41 },
    { issue: "003", startIndex: 43, endIndex: 999 },
  ];

  var ISSUE_COPY = {
    "002": {
      eyebrow: "Issue 2 — Backer Preview",
      title: "Thank you for backing Intrepid Dusk",
      body:
        "Issues 2 and 3 are reserved for our Kickstarter backers. Enter the access word from your backer update to continue reading.",
      cta: "Unlock Issue 2",
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

  function grantAllBackerIssues() {
    localStorage.setItem(LS_BACKER_KEY, "granted");
    grantIssue("002");
    grantIssue("003");
  }

  function isIssueUnlocked(issueId) {
    if (issueId === "001") return true;
    if (localStorage.getItem(LS_BACKER_KEY) === "granted") return true;
    return localStorage.getItem(LS_ISSUE_PREFIX + issueId) === "granted";
  }

  function getIssueForPageIndex(pageIndex) {
    var i;
    for (i = ISSUE_BOUNDARIES.length - 1; i >= 0; i -= 1) {
      if (pageIndex >= ISSUE_BOUNDARIES[i].startIndex) {
        return ISSUE_BOUNDARIES[i].issue;
      }
    }
    return "001";
  }

  function submitBackerPassword(pw) {
    var code = BACKER_CODES[pw.trim().toLowerCase()];
    if (!code) return false;
    grantAllBackerIssues();
    return true;
  }

  function migrateLegacyAuth() {
    if (localStorage.getItem(LS_BACKER_KEY) === "granted") return;
    if (
      localStorage.getItem("intrepid_atlas_auth") === "granted" &&
      localStorage.getItem("intrepid_atlas_tier") === "B"
    ) {
      grantAllBackerIssues();
    }
  }

  function buildGateOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "reader-backer-gate";
    overlay.className = "reader-backer-gate";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="reader-backer-gate-card" role="dialog" aria-modal="true" aria-labelledby="reader-gate-title">' +
      '  <p class="reader-backer-gate-eyebrow" id="reader-gate-eyebrow"></p>' +
      '  <h2 class="reader-backer-gate-title" id="reader-gate-title"></h2>' +
      '  <p class="reader-backer-gate-body" id="reader-gate-body"></p>' +
      '  <div class="reader-backer-gate-input-wrap">' +
      '    <input id="reader-gate-pw" class="reader-backer-gate-input" type="password" placeholder="Enter backer access word" autocomplete="off" spellcheck="false">' +
      '  </div>' +
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
  }

  function showGate(issueId) {
    var copy = ISSUE_COPY[issueId] || ISSUE_COPY["002"];
    var el = getGateEl();
    pendingIssue = issueId;

    document.getElementById("reader-gate-eyebrow").textContent = copy.eyebrow;
    document.getElementById("reader-gate-title").textContent = copy.title;
    document.getElementById("reader-gate-body").textContent = copy.body;
    document.getElementById("reader-gate-submit").textContent = copy.cta;

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
      err.textContent = "That word doesn't match our backer records. Check your Kickstarter update.";
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

  migrateLegacyAuth();
  bindGateEvents();

  window.ReaderAccess = {
    isIssueUnlocked: isIssueUnlocked,
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
