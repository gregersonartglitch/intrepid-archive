/**
 * Unified archive access — single password entry on home unlocks eligible tiers.
 * Issue 1 + dossier stay public. Map reset clears cartographer only (not reader keys).
 */
(function (global) {
  "use strict";

  // Reversible switch: set true to restore guest entry.
  var ENABLE_GUEST_ENTRY = false;
  // UTC unlock target for guest-access countdown visuals (does not override ENABLE_GUEST_ENTRY).
  // WANDERER_UNLOCK_AT / getWandererUnlockWindow: legacy internal names (KS Wanderer tier collision).
  // Empty = no countdown (Jon 2026-07-18: shelve timer until public window is scheduled).
  // Example when re-enabling: "2026-08-16T00:00:00Z"
  var WANDERER_UNLOCK_AT = "";

  var CODES = {
    hollowlands9: { cartographer: true, reader: true, label: "Patron" },
    scribe4: { cartographer: false, reader: true, label: "Backer" },
  };

  var LS_CARTOGRAPHER_KEY = "intrepid_cartographer_unlocked";
  var LS_ATLAS_LABEL = "intrepid_atlas_label";
  var LS_BACKER_KEY = "intrepid_reader_backer";
  var LS_ISSUE_PREFIX = "intrepid_reader_issue_";
  var LS_LEGACY_AUTH = "intrepid_atlas_auth";
  var LS_LEGACY_TIER = "intrepid_atlas_tier";
  var LS_READER_LEGACY_PURGED = "intrepid_reader_legacy_purged";
  var LS_LEGACY_AUTH_PURGED = "intrepid_legacy_auth_purged";
  var SS_ARCHIVE_ENTERED = "intrepid_archive_entered";

  /** All keys that grant or track archive/reader access — cleared by resetArchiveAccess(). */
  var ARCHIVE_ACCESS_LS_KEYS = [
    LS_CARTOGRAPHER_KEY,
    LS_ATLAS_LABEL,
    LS_BACKER_KEY,
    LS_ISSUE_PREFIX + "002",
    LS_ISSUE_PREFIX + "003",
    LS_LEGACY_AUTH,
    LS_LEGACY_TIER,
    LS_READER_LEGACY_PURGED,
    LS_LEGACY_AUTH_PURGED,
  ];

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
    if (hasCartographerAccess()) return true;
    if (hasReaderBackerAccess()) return true;
    if (isGuestEntryEnabled() && hasArchiveEntered()) return true;
    return false;
  }

  function isGuestEntryEnabled() {
    return ENABLE_GUEST_ENTRY === true;
  }

  function getWandererUnlockWindow(nowMs) {
    var parsed = Date.parse(WANDERER_UNLOCK_AT);
    var hasValidUnlockTime = !isNaN(parsed);
    var currentMs = typeof nowMs === "number" ? nowMs : Date.now();
    var remainingMs = hasValidUnlockTime ? Math.max(0, parsed - currentMs) : 0;
    var isTimeReached = hasValidUnlockTime ? currentMs >= parsed : false;
    return {
      unlockAt: WANDERER_UNLOCK_AT,
      unlockAtMs: hasValidUnlockTime ? parsed : null,
      hasValidUnlockTime: hasValidUnlockTime,
      remainingMs: remainingMs,
      isTimeReached: isTimeReached,
      isGuestEnabled: isGuestEntryEnabled(),
      // Safety: timestamp never auto-enables guest path on its own.
      isGuestAllowed: isGuestEntryEnabled(),
    };
  }

  function canEnterAsGuest() {
    return isGuestEntryEnabled();
  }

  /** Reader + dossier without a code — only when guest entry is enabled or tier keys exist. */
  function hasPublicContentAccess() {
    if (isGuestEntryEnabled()) return true;
    if (hasCartographerAccess()) return true;
    if (hasReaderBackerAccess()) return true;
    return false;
  }

  /** Redirect anonymous visitors away from public-content deep links when guest entry is off. */
  function guardPublicContentRoute(redirectPath) {
    if (hasPublicContentAccess()) return true;
    var dest = redirectPath || "/";
    window.location.replace(dest);
    return false;
  }

  /** Drop guest-only session flag when guest entry is disabled and no tier keys exist. */
  function purgeStaleGuestSession() {
    if (isGuestEntryEnabled()) return;
    if (hasCartographerAccess() || hasReaderBackerAccess()) return;
    if (hasArchiveEntered()) {
      sessionStorage.removeItem(SS_ARCHIVE_ENTERED);
    }
  }

  /** Clear archive access keys only — does not wipe map fog progress. */
  function resetArchiveAccess() {
    var i;
    for (i = 0; i < ARCHIVE_ACCESS_LS_KEYS.length; i += 1) {
      localStorage.removeItem(ARCHIVE_ACCESS_LS_KEYS[i]);
    }
    sessionStorage.removeItem(SS_ARCHIVE_ENTERED);
  }

  global.IntrepidArchiveAccess = {
    ENABLE_GUEST_ENTRY: ENABLE_GUEST_ENTRY,
    WANDERER_UNLOCK_AT: WANDERER_UNLOCK_AT,
    submitArchiveCode: submitArchiveCode,
    grantCartographerAccess: grantCartographerAccess,
    grantReaderBackerAccess: grantReaderBackerAccess,
    hasCartographerAccess: hasCartographerAccess,
    hasReaderBackerAccess: hasReaderBackerAccess,
    getUnlockStatus: getUnlockStatus,
    hasArchiveEntered: hasArchiveEntered,
    setArchiveEntered: setArchiveEntered,
    shouldSkipArchiveEntry: shouldSkipArchiveEntry,
    isGuestEntryEnabled: isGuestEntryEnabled,
    getWandererUnlockWindow: getWandererUnlockWindow,
    canEnterAsGuest: canEnterAsGuest,
    hasPublicContentAccess: hasPublicContentAccess,
    guardPublicContentRoute: guardPublicContentRoute,
    purgeStaleGuestSession: purgeStaleGuestSession,
    resetArchiveAccess: resetArchiveAccess,
    ARCHIVE_ACCESS_LS_KEYS: ARCHIVE_ACCESS_LS_KEYS,
    LS_CARTOGRAPHER_KEY: LS_CARTOGRAPHER_KEY,
    LS_BACKER_KEY: LS_BACKER_KEY,
    SS_ARCHIVE_ENTERED: SS_ARCHIVE_ENTERED,
  };
})(typeof window !== "undefined" ? window : this);
