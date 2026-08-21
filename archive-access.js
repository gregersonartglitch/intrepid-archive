/**
 * Unified archive access — server-validated HttpOnly session (Wave 1 Option B+).
 * No access codes or tier authority in client JavaScript.
 */
(function (global) {
  "use strict";

  var ENABLE_GUEST_ENTRY = false;
  var WANDERER_UNLOCK_AT = "";

  var LS_ATLAS_LABEL = "intrepid_atlas_label";
  var LS_LEGACY_AUTH = "intrepid_atlas_auth";
  var LS_LEGACY_TIER = "intrepid_atlas_tier";
  var LS_READER_LEGACY_PURGED = "intrepid_reader_legacy_purged";
  var LS_LEGACY_AUTH_PURGED = "intrepid_legacy_auth_purged";
  var SS_ARCHIVE_ENTERED = "intrepid_archive_entered";

  /** Legacy keys cleared on reset — no longer grant server access. */
  var ARCHIVE_ACCESS_LS_KEYS = [
    "intrepid_cartographer_unlocked",
    LS_ATLAS_LABEL,
    "intrepid_reader_backer",
    "intrepid_reader_issue_002",
    "intrepid_reader_issue_003",
    LS_LEGACY_AUTH,
    LS_LEGACY_TIER,
    LS_READER_LEGACY_PURGED,
    LS_LEGACY_AUTH_PURGED,
  ];

  var sessionState = {
    loaded: false,
    authenticated: false,
    tier: null,
    reader: false,
    cartographer: false,
    expiresAt: null,
  };

  function applySession(data) {
    sessionState.loaded = true;
    sessionState.authenticated = !!(data && data.authenticated);
    sessionState.tier = data && data.tier ? data.tier : null;
    sessionState.reader = !!(data && data.reader);
    sessionState.cartographer = !!(data && data.cartographer);
    sessionState.expiresAt = data && data.expiresAt ? data.expiresAt : null;
  }

  function refreshSession() {
    return fetch("/api/access/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { ok: false, authenticated: false };
        });
      })
      .then(function (data) {
        applySession(data);
        return data;
      })
      .catch(function () {
        applySession({ authenticated: false });
        return { ok: false, authenticated: false };
      });
  }

  function submitArchiveCode(rawPassword) {
    return fetch("/api/access/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: rawPassword }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (result) {
        if (result.status === 200 && result.body && result.body.ok) {
          applySession({
            authenticated: true,
            tier: result.body.tier,
            reader: result.body.reader,
            cartographer: result.body.cartographer,
            expiresAt: result.body.expiresAt,
          });
          return {
            ok: true,
            cartographer: !!result.body.cartographer,
            reader: !!result.body.reader,
            tier: result.body.tier,
          };
        }
        return { ok: false, reason: "invalid" };
      })
      .catch(function () {
        return { ok: false, reason: "network" };
      });
  }

  function hasCartographerAccess() {
    return sessionState.loaded && sessionState.cartographer === true;
  }

  function hasReaderBackerAccess() {
    return sessionState.loaded && sessionState.reader === true;
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
    if (!sessionState.loaded) return false;
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
      isGuestAllowed: isGuestEntryEnabled(),
    };
  }

  function canEnterAsGuest() {
    return isGuestEntryEnabled();
  }

  function hasPublicContentAccess() {
    if (isGuestEntryEnabled()) return true;
    if (!sessionState.loaded) return false;
    return hasCartographerAccess() || hasReaderBackerAccess();
  }

  function guardPublicContentRoute(redirectPath) {
    if (hasPublicContentAccess()) return true;
    global.location.replace(redirectPath || "/");
    return false;
  }

  function bootstrapPublicContentRoute(redirectPath) {
    if (hasPublicContentAccess()) {
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.classList.add("archive-access-granted");
      }
      return true;
    }
    global.location.replace(redirectPath || "/");
    return false;
  }

  function purgeStaleGuestSession() {
    if (isGuestEntryEnabled()) return;
    if (hasCartographerAccess() || hasReaderBackerAccess()) return;
    if (hasArchiveEntered()) {
      sessionStorage.removeItem(SS_ARCHIVE_ENTERED);
    }
  }

  function resetArchiveAccess() {
    var i;
    for (i = 0; i < ARCHIVE_ACCESS_LS_KEYS.length; i += 1) {
      localStorage.removeItem(ARCHIVE_ACCESS_LS_KEYS[i]);
    }
    sessionStorage.removeItem(SS_ARCHIVE_ENTERED);
    return fetch("/api/access/logout", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(function () {
        applySession({ authenticated: false });
      })
      .catch(function () {
        applySession({ authenticated: false });
      });
  }

  /** @deprecated No client-side tier grants — server cookie only. */
  function grantCartographerAccess(label) {
    if (label) localStorage.setItem(LS_ATLAS_LABEL, label);
  }

  /** @deprecated No client-side tier grants — server cookie only. */
  function grantReaderBackerAccess() {}

  global.IntrepidArchiveAccess = {
    ENABLE_GUEST_ENTRY: ENABLE_GUEST_ENTRY,
    WANDERER_UNLOCK_AT: WANDERER_UNLOCK_AT,
    refreshSession: refreshSession,
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
    bootstrapPublicContentRoute: bootstrapPublicContentRoute,
    purgeStaleGuestSession: purgeStaleGuestSession,
    resetArchiveAccess: resetArchiveAccess,
    ARCHIVE_ACCESS_LS_KEYS: ARCHIVE_ACCESS_LS_KEYS,
    LS_CARTOGRAPHER_KEY: "intrepid_cartographer_unlocked",
    LS_BACKER_KEY: "intrepid_reader_backer",
    SS_ARCHIVE_ENTERED: SS_ARCHIVE_ENTERED,
  };
})(typeof window !== "undefined" ? window : this);
