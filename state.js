/* ═══════════════════════════════════════════════════════════════
   STATE MANAGER — The Hollowlands Atlas
   Single source of truth for all location and discovery state.
   All other modules read from here; none write to localStorage directly.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var LS_KEY = 'intrepid_atlas_discovered';
  var VERSION_KEY = LS_KEY + '_v';
  var STATE_VERSION = 15;  // Bump to clear stale state

  // Internal state
  var discovered = {};
  var locations = [];
  var locById = {};
  var journeyPath = [];
  var listeners = {};

  /* ════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════ */
  function init() {
    locations = window.LOCATIONS || [];
    journeyPath = window.JOURNEY_PATH || [];

    // Build lookup map
    locations.forEach(function(loc) {
      locById[loc.id] = loc;
    });

    // Auto-clear stale localStorage
    var storedVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0');
    if (storedVersion !== STATE_VERSION || location.search.indexOf('reset') > -1) {
      localStorage.removeItem(LS_KEY);
      localStorage.setItem(VERSION_KEY, STATE_VERSION);
      console.log('[STATE] Cleared old state (v' + storedVersion + ' → v' + STATE_VERSION + ')');
    }

    // Load saved discoveries
    try { discovered = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch(e) { discovered = {}; }

    console.log('[STATE] Initialized with ' + Object.keys(discovered).length + ' discoveries, ' + locations.length + ' locations');
  }

  /* ════════════════════════════════════════════════
     STATE QUERIES
     ════════════════════════════════════════════════ */

  // Get effective state for a location
  // If discovered in localStorage, it's 'revealed' regardless of data.js state
  function getState(locId) {
    if (discovered[locId]) return 'revealed';
    var loc = locById[locId];
    if (!loc) return 'fogged';
    return loc.state || 'fogged';
  }

  function isDiscovered(locId) {
    return !!discovered[locId];
  }

  function getLocation(locId) {
    return locById[locId] || null;
  }

  function getLocations() {
    return locations;
  }

  function getLocationsByState(state) {
    return locations.filter(function(loc) {
      return getState(loc.id) === state;
    });
  }

  function getLocationsByQuadrant(quadrant) {
    return locations.filter(function(loc) {
      return loc.quadrant === quadrant;
    });
  }

  function getDormantLocations() {
    return locations.filter(function(loc) {
      return getState(loc.id) === 'dormant';
    });
  }

  /* ════════════════════════════════════════════════
     JOURNEY PATH
     ════════════════════════════════════════════════ */

  function getJourneyPath() {
    return journeyPath;
  }

  function getNextJourneyLocation() {
    for (var i = 0; i < journeyPath.length; i++) {
      if (!discovered[journeyPath[i].locationId]) {
        return journeyPath[i].locationId;
      }
    }
    return null; // all journey steps complete
  }

  function isJourneyComplete() {
    return getNextJourneyLocation() === null;
  }

  function getJourneyStep(locId) {
    var step = journeyPath.find(function(s) { return s.locationId === locId; });
    return step || null;
  }

  /* ════════════════════════════════════════════════
     DISCOVERY (MUTATION)
     ════════════════════════════════════════════════ */

  function discover(locId) {
    if (discovered[locId]) return false; // already discovered
    discovered[locId] = { at: Date.now() };
    save();
    emit('discover', locById[locId]);
    emit('stateChange', { locId: locId, from: 'fogged', to: 'revealed' });
    return true;
  }

  // Awaken: dormant → revealed (for future content drops)
  function awaken(locId) {
    var loc = locById[locId];
    if (!loc || getState(locId) !== 'dormant') return false;
    discovered[locId] = { at: Date.now(), awakened: true };
    save();
    emit('awaken', loc);
    emit('stateChange', { locId: locId, from: 'dormant', to: 'revealed' });
    return true;
  }

  function reset() {
    discovered = {};
    localStorage.removeItem(LS_KEY);
    console.log('[STATE] Reset all discoveries');
    emit('reset');
  }

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(discovered));
  }

  /* ════════════════════════════════════════════════
     PROGRESS
     ════════════════════════════════════════════════ */

  function getProgress() {
    var revealed = 0;
    var dormant = 0;
    var fogged = 0;
    var total = locations.length;

    locations.forEach(function(loc) {
      var s = getState(loc.id);
      if (s === 'revealed') revealed++;
      else if (s === 'dormant') dormant++;
      else fogged++;
    });

    // Journey progress
    var journeyDone = journeyPath.filter(function(s) { return !!discovered[s.locationId]; }).length;
    var journeyTotal = journeyPath.length;

    // Rank based on journey progress
    var pct = journeyTotal > 0 ? journeyDone / journeyTotal : 0;
    var rank = 'Wanderer';
    if (pct > 0.85) rank = 'Master Cartographer';
    else if (pct > 0.65) rank = 'Cartographer';
    else if (pct > 0.40) rank = 'Surveyor';
    else if (pct > 0.15) rank = 'Pathfinder';

    return {
      revealed: revealed,
      dormant: dormant,
      fogged: fogged,
      total: total,
      journeyDone: journeyDone,
      journeyTotal: journeyTotal,
      rank: rank,
      pct: pct
    };
  }

  /* ════════════════════════════════════════════════
     DORMANT FLAVOR TEXT
     ════════════════════════════════════════════════ */

  function getDormantFlavor(loc) {
    var pool = window.DORMANT_FLAVOR || {};
    var quadrant = loc.quadrant || 'center';
    var lines = pool[quadrant] || pool.center || ['This place holds its silence.'];

    // Hash location ID to get consistent index
    var hash = 0;
    for (var i = 0; i < loc.id.length; i++) {
      hash = ((hash << 5) - hash) + loc.id.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    var index = Math.abs(hash) % lines.length;
    return lines[index];
  }

  /* ════════════════════════════════════════════════
     EVENT SYSTEM
     ════════════════════════════════════════════════ */

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function(cb) { return cb !== callback; });
  }

  function emit(event, data) {
    var cbs = listeners[event] || [];
    cbs.forEach(function(cb) {
      try { cb(data); } catch(e) { console.error('[STATE] Event error:', event, e); }
    });
  }

  /* ════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════ */
  window.StateManager = {
    init: init,

    // Queries
    getState: getState,
    isDiscovered: isDiscovered,
    getLocation: getLocation,
    getLocations: getLocations,
    getLocationsByState: getLocationsByState,
    getLocationsByQuadrant: getLocationsByQuadrant,
    getDormantLocations: getDormantLocations,

    // Journey
    getJourneyPath: getJourneyPath,
    getNextJourneyLocation: getNextJourneyLocation,
    isJourneyComplete: isJourneyComplete,
    getJourneyStep: getJourneyStep,

    // Mutations
    discover: discover,
    awaken: awaken,
    reset: reset,

    // Progress
    getProgress: getProgress,

    // Dormant
    getDormantFlavor: getDormantFlavor,

    // Events
    on: on,
    off: off
  };
})();
