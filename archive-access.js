/**
 * Unified archive access — single password entry on home unlocks eligible tiers.
 * Issue 1 + dossier stay public. Map reset clears cartographer only (not reader keys).
 */
(function (global) {
  "use strict";

  var CODES = {
    hollowlands9: { cartographer: true, reader: true, label: "Patron" },
    scribe4: { cartographer: false, reader: true, label: "Backer" },
  };

  var LS_CARTOGRAPHER_KEY = "intrepid_cartographer_unlocked";
  var LS_ATLAS_LABEL = "intrepid_atlas_label";
  var LS_BACKER_KEY = "intrepid_reader_backer";
  var LS_ISSUE_PREFIX = "intrepid_reader_issue_";
  var SS_ARCHIVE_ENTERED = "intrepid_archive_entered";

  function grantCartographerAccess(label) {
    localStorage.setItem(LS_CARTOGRAPHER_KEY, "granted");
    if (label) localStorage.setItem(LS_ATLAS_LABEL, label);
  }

  function grantReaderBackerAccess() {
    localStorage.setItem(LS_BACKER_KEY, "granted");
    localStorage.setItem(LS_ISSUE_PREFIX + "002", "granted");
    localStorage.setItem(LS_ISSUE_PREFIX + "003", "granted");
  }

  function hasCartographerAccess() {
    return localStorage.getItem(LS_CARTOGRAPHER_KEY) === "granted";
  }

  function hasReaderBackerAccess() {
    if (localStorage.getItem(LS_BACKER_KEY) === "granted") return true;
    return (
      localStorage.getItem(LS_ISSUE_PREFIX + "002") === "granted" &&
      localStorage.getItem(LS_ISSUE_PREFIX + "003") === "granted"
    );
  }

  function submitArchiveCode(rawPassword) {
    var normalized = String(rawPassword || "")
      .trim()
      .toLowerCase();
    var tier = CODES[normalized];
    if (!tier) {
      return { ok: false, reason: "invalid" };
    }
    if (tier.cartographer) grantCartographerAccess(tier.label);
    if (tier.reader) grantReaderBackerAccess();
    return {
      ok: true,
      code: normalized,
      cartographer: !!tier.cartographer,
      reader: !!tier.reader,
      label: tier.label,
    };
  }

  function getUnlockStatus() {
    return {
      cartographer: hasCartographerAccess(),
      reader: hasReaderBackerAccess(),
    };
  }

  function hasArchiveEntered() {
    return sessionStorage.getItem(SS_ARCHIVE_ENTERED) === "1";
  }

  function setArchiveEntered() {
    sessionStorage.setItem(SS_ARCHIVE_ENTERED, "1");
  }

  function shouldSkipArchiveEntry() {
    if (hasArchiveEntered()) return true;
    if (hasCartographerAccess()) return true;
    if (hasReaderBackerAccess()) return true;
    return false;
  }

  global.IntrepidArchiveAccess = {
    submitArchiveCode: submitArchiveCode,
    grantCartographerAccess: grantCartographerAccess,
    grantReaderBackerAccess: grantReaderBackerAccess,
    hasCartographerAccess: hasCartographerAccess,
    hasReaderBackerAccess: hasReaderBackerAccess,
    getUnlockStatus: getUnlockStatus,
    hasArchiveEntered: hasArchiveEntered,
    setArchiveEntered: setArchiveEntered,
    shouldSkipArchiveEntry: shouldSkipArchiveEntry,
    LS_CARTOGRAPHER_KEY: LS_CARTOGRAPHER_KEY,
    LS_BACKER_KEY: LS_BACKER_KEY,
    SS_ARCHIVE_ENTERED: SS_ARCHIVE_ENTERED,
  };
})(typeof window !== "undefined" ? window : this);
