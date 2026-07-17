#!/usr/bin/env node
/**
 * Smoke checks for fog.js journey path, Vol 2 gate, and chime exit.
 * Run: node scripts/smoke-journey-flow.js
 * Exit 0 = pass, 1 = fail
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var failures = [];
var passes = 0;

function pass(msg) {
  passes++;
  console.log('  PASS: ' + msg);
}

function fail(msg) {
  failures.push(msg);
  console.error('  FAIL: ' + msg);
}

function assert(cond, msg) {
  if (cond) pass(msg);
  else fail(msg);
}

// ── Load data.js ─────────────────────────────────────────────
var dataCode = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
var dataCtx = { window: {} };
vm.runInNewContext(dataCode, dataCtx);
var LOCATIONS = dataCtx.window.LOCATIONS;
var JOURNEY_PATH = dataCtx.window.JOURNEY_PATH;

console.log('\n[0] Retired hotspot — moon-stronghold folded into sinn (build 168)');
assert(!LOCATIONS.some(function(l) { return l.id === 'moon-stronghold'; }),
  'moon-stronghold removed from LOCATIONS');
assert(JOURNEY_PATH.every(function(s) { return s.locationId !== 'moon-stronghold'; }),
  'moon-stronghold not on journey path');
assert(JOURNEY_PATH.every(function(s) { return s.locationId !== 'mish'; }),
  'mish is territory/guardian — not on Elena journey');
assert(JOURNEY_PATH.length === 7, 'Elena journey has 7 stops');
var sinnLoc = LOCATIONS.find(function(l) { return l.id === 'sinn'; });
assert(!!sinnLoc && /silver-walled seat/.test(sinnLoc.desc || ''),
  'sinn desc folds stronghold / Sabella seat lore');
assert(LOCATIONS.filter(function(l) { return !!l.cartographerSite; }).length === 13,
  'Cities & Sites cartographer count stays 13 (stronghold was never a site)');

// ── Mirror fog.js vol2 / journey helpers (build 154) ─────────
var FINAL_ELENA_STOP = 'indras-na';
var VOL2_GUARDIAN_TRIGGER = 'Mish';
var VOL2_JOURNEY_CAP_ID = 'sinn';
var VOL2_GATE_TOAST_LS = 'intrepid_vol2_gate_toast_shown';
var ENABLE_VOL2_JOURNEY_GATE = true;
var ENABLE_SABELLA_MESSAGES = true;
var SINN_CITY_ID = 'sinn';
var SINN_TERRITORY_GATE = 10;
var SABELLA_LETTER_PREREQ_IDS = ['sabellas-hut', 'monastery-wind', 'tower-nine', 'sinn'];
var SABELLA_MESSAGES_SEEN = {}; // test-local stand-in for intrepid_sabella_messages_seen
// Vol 1 clock sequence — clockwise 12→6; Mish last (must match fog.js VOL1_REVEAL_ORDER)
var VOL1_REVEAL_ORDER = ['Utu', 'Sham & Mash', 'Elil', 'Rapha', 'Ningal', 'An', 'Mish'];
// Territory thresholds (charted regions) — must match index.html MEDALLION_DEFS unlock values
var MEDALLION_UNLOCKS = {
  'Utu': 2, 'Sham & Mash': 4, 'Elil': 5, 'Rapha': 8,
  'Ningal': 11, 'An': 14, 'Mish': 17
};
var MISH_UNLOCK = MEDALLION_UNLOCKS.Mish;
var ELIL_UNLOCK = MEDALLION_UNLOCKS.Elil;

function isSabellaMessagesEnabled() {
  return !!ENABLE_SABELLA_MESSAGES;
}

function countSabellaPrereqLettersCollected() {
  var n = 0;
  for (var i = 0; i < SABELLA_LETTER_PREREQ_IDS.length; i++) {
    if (SABELLA_MESSAGES_SEEN[SABELLA_LETTER_PREREQ_IDS[i]]) n++;
  }
  return n;
}

function sabellaPrereqLettersComplete() {
  return countSabellaPrereqLettersCollected() >= SABELLA_LETTER_PREREQ_IDS.length;
}

function collectSabellaPrereqLetters() {
  for (var i = 0; i < SABELLA_LETTER_PREREQ_IDS.length; i++) {
    SABELLA_MESSAGES_SEEN[SABELLA_LETTER_PREREQ_IDS[i]] = Date.now();
  }
}

function clearSabellaLetters() {
  SABELLA_MESSAGES_SEEN = {};
}

function hasUnseenSabellaMessage(locId) {
  return !SABELLA_MESSAGES_SEEN[locId];
}

function getJourneyStepIndex(locId, journeyPath) {
  for (var ji = 0; ji < journeyPath.length; ji++) {
    if (journeyPath[ji].locationId === locId) return ji;
  }
  return -1;
}

function isOnPath(locId, journeyPath) {
  return journeyPath.some(function(s) { return s.locationId === locId; });
}

function getMedallionDiscoveryCount(discovered) {
  return Object.keys(discovered).length;
}

function getTerritoryDiscoveryCount(discovered) {
  var n = 0;
  LOCATIONS.forEach(function(l) {
    if (l.type === 'region' && discovered[l.id]) n++;
  });
  return n;
}

function padTerritories(discovered, count) {
  var regionLocs = LOCATIONS.filter(function(l) { return l.type === 'region'; });
  for (var ri = 0; ri < regionLocs.length && getTerritoryDiscoveryCount(discovered) < count; ri++) {
    if (!discovered[regionLocs[ri].id]) {
      discovered[regionLocs[ri].id] = { at: Date.now(), phase: 'mist' };
    }
  }
}

function getJourneyCompleteCount(discovered, journeyPath) {
  return journeyCompleteCount(discovered, journeyPath);
}

function meetsMishUnlockCriteria(territoryCount, discovered, journeyPath) {
  if (!isFullyDiscovered(FINAL_ELENA_STOP, discovered, journeyPath)) return false;
  return territoryCount >= MISH_UNLOCK;
}

function isGuardianUnlockEligible(name, threshold, territoryCount, discovered, journeyPath) {
  if (!threshold) return false;
  if (name === 'Mish') return meetsMishUnlockCriteria(territoryCount, discovered, journeyPath);
  return territoryCount >= threshold;
}

function isMishGuardianRevealed(revealedGods, discovered, journeyPath) {
  if (!revealedGods[VOL2_GUARDIAN_TRIGGER]) return false;
  return meetsMishUnlockCriteria(getTerritoryDiscoveryCount(discovered), discovered, journeyPath);
}

function isVol2JourneyUnlocked() {
  return false;
}

function isVol2LockedJourneyStep(locId, journeyPath, revealedGods, discovered) {
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (locId === FINAL_ELENA_STOP) return false;
  if (!isMishGuardianRevealed(revealedGods, discovered, journeyPath)) return false;
  if (!isOnPath(locId, journeyPath)) return false;
  var capIdx = getJourneyStepIndex(VOL2_JOURNEY_CAP_ID, journeyPath);
  var stepIdx = getJourneyStepIndex(locId, journeyPath);
  if (capIdx < 0 || stepIdx < 0) return false;
  return stepIdx > capIdx;
}

function isVol2JourneyGateBlocking(revealedGods, discovered, journeyPath) {
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (!isMishGuardianRevealed(revealedGods, discovered, journeyPath)) return false;
  var capIdx = getJourneyStepIndex(VOL2_JOURNEY_CAP_ID, journeyPath);
  if (capIdx < 0) return false;
  for (var vi = capIdx + 1; vi < journeyPath.length; vi++) {
    var stepId = journeyPath[vi].locationId;
    if (stepId === FINAL_ELENA_STOP) continue;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) return true;
  }
  return false;
}

function isFullyDiscovered(locId, discovered, journeyPath) {
  var d = discovered[locId];
  if (!d) return false;
  if (d.phase === 'searching') return false;
  if (isOnPath(locId, journeyPath)) {
    return d.phase === 'complete' || (!d.phase && d.at);
  }
  if (d.phase === 'mist' || d.phase === 'complete') return true;
  if (!d.phase) return true;
  return false;
}

function explorationComplete(discovered) {
  var regionLocs = LOCATIONS.filter(function(l) { return l.type === 'region'; });
  var regionsComplete = regionLocs.every(function(l) { return !!discovered[l.id]; });
  var siteLocs = LOCATIONS.filter(function(l) { return !!l.cartographerSite; });
  var sitesComplete = siteLocs.every(function(l) { return !!discovered[l.id]; });
  return regionsComplete && sitesComplete;
}

function meetsSinnTerritoryGate(discovered) {
  return getTerritoryDiscoveryCount(discovered) >= SINN_TERRITORY_GATE;
}

function isSinnTerritoryGated(discovered, journeyPath) {
  if (isFullyDiscovered(SINN_CITY_ID, discovered, journeyPath)) return false;
  if (meetsSinnTerritoryGate(discovered)) return false;
  var ji;
  for (ji = 0; ji < journeyPath.length; ji++) {
    var stepId = journeyPath[ji].locationId;
    if (stepId === SINN_CITY_ID) break;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) return false;
  }
  return true;
}

function getSinnLockedReason(discovered, journeyPath) {
  if (isFullyDiscovered(SINN_CITY_ID, discovered, journeyPath)) return null;
  var ji;
  for (ji = 0; ji < journeyPath.length; ji++) {
    var stepId = journeyPath[ji].locationId;
    if (stepId === SINN_CITY_ID) break;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) {
      return 'Sinn waits further along Elena\u2019s road. Follow the golden glow.';
    }
  }
  if (!meetsSinnTerritoryGate(discovered)) {
    var named = getTerritoryDiscoveryCount(discovered);
    return 'Sinn waits until more of the Hollowlands are charted. (' +
      named + ' of ' + SINN_TERRITORY_GATE + ' lands named)';
  }
  return null;
}

// Mirror fog.js getIndrasNaLockedReason — returns sealed copy or null when unlockable
function getIndrasNaLockedReason(discovered, journeyPath) {
  if (isFullyDiscovered(FINAL_ELENA_STOP, discovered, journeyPath)) return null;

  var ji;
  for (ji = 0; ji < journeyPath.length; ji++) {
    var stepId = journeyPath[ji].locationId;
    if (stepId === FINAL_ELENA_STOP) break;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) {
      return 'Indras Na waits at the end of Elena\u2019s road. Follow the golden glow through Sinn before this gate will open.';
    }
  }

  if (!explorationComplete(discovered)) {
    var undiscRegions = LOCATIONS.filter(function(l) { return l.type === 'region' && !discovered[l.id]; }).length;
    var undiscSites = LOCATIONS.filter(function(l) { return !!l.cartographerSite && !discovered[l.id]; }).length;
    var remaining = [];
    if (undiscRegions > 0) {
      remaining.push(undiscRegions + (undiscRegions === 1 ? ' territory' : ' territories'));
    }
    if (undiscSites > 0) {
      remaining.push(undiscSites === 1
        ? '1 of Sabella\u2019s marks'
        : undiscSites + ' of Sabella\u2019s remaining marks');
    }
    if (!remaining.length) {
      return 'Indras Na stays sealed until the Hollowlands are fully charted.';
    }
    return 'Indras Na stays sealed until Elena\u2019s path and Sabella\u2019s remaining marks are charted. ' +
      remaining.join(' and ') + ' still wait in the fog.';
  }

  if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) {
    var found = countSabellaPrereqLettersCollected();
    var need = SABELLA_LETTER_PREREQ_IDS.length;
    var DISPLAY = {
      'sabellas-hut': 'Sabella\u2019s Hut',
      'monastery-wind': 'Monastery of the Wind',
      'tower-nine': 'Tower of the Nine',
      'sinn': 'Sinn'
    };
    var missingNames = [];
    var seen = SABELLA_MESSAGES_SEEN;
    for (var mi = 0; mi < SABELLA_LETTER_PREREQ_IDS.length; mi++) {
      var mid = SABELLA_LETTER_PREREQ_IDS[mi];
      if (!seen[mid]) missingNames.push(DISPLAY[mid] || mid);
    }
    var stillNeeded = missingNames.length
      ? missingNames.join(', ')
      : 'an unread letter along Elena\u2019s road';
    return 'Sabella\u2019s letters: ' + found + ' of ' + need +
      ' found. Still needed: ' + stillNeeded +
      '. Tap a completed letter-stop again if you missed the parchment during the chime.';
  }

  return null;
}

function isIndrasNaSealed(discovered, journeyPath) {
  if (isFullyDiscovered(FINAL_ELENA_STOP, discovered, journeyPath)) return false;
  var ji;
  for (ji = 0; ji < journeyPath.length; ji++) {
    var stepId = journeyPath[ji].locationId;
    if (stepId === FINAL_ELENA_STOP) break;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) return false;
  }
  return !!getIndrasNaLockedReason(discovered, journeyPath);
}

function getFirstMissingSabellaLetterId() {
  for (var i = 0; i < SABELLA_LETTER_PREREQ_IDS.length; i++) {
    if (!SABELLA_MESSAGES_SEEN[SABELLA_LETTER_PREREQ_IDS[i]]) return SABELLA_LETTER_PREREQ_IDS[i];
  }
  return null;
}

function getNextPathLocation(discovered, journeyPath, revealedGods) {
  for (var i = 0; i < journeyPath.length; i++) {
    var stepId = journeyPath[i].locationId;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) {
      if (stepId === SINN_CITY_ID) {
        if (!meetsSinnTerritoryGate(discovered)) return null;
      }
      if (stepId === FINAL_ELENA_STOP) {
        if (!explorationComplete(discovered)) return null;
        if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) return null;
      }
      if (isVol2LockedJourneyStep(stepId, journeyPath, revealedGods, discovered)) {
        continue;
      }
      return stepId;
    }
  }
  return null;
}

function journeyCompleteCount(discovered, journeyPath) {
  var n = 0;
  for (var i = 0; i < journeyPath.length; i++) {
    if (isFullyDiscovered(journeyPath[i].locationId, discovered, journeyPath)) n++;
  }
  return n;
}

function makeJourneyCompleteThrough(stepId) {
  var discovered = {};
  var found = false;
  for (var i = 0; i < JOURNEY_PATH.length; i++) {
    var id = JOURNEY_PATH[i].locationId;
    if (id === stepId) {
      found = true;
      break;
    }
    discovered[id] = { at: Date.now(), phase: 'complete' };
  }
  if (!found) throw new Error('Unknown journey step: ' + stepId);
  return discovered;
}

function padDiscoveries(discovered, count) {
  var n = 0;
  var i = 0;
  while (getMedallionDiscoveryCount(discovered) < count) {
    var fillerId = '_smoke-filler-' + i;
    discovered[fillerId] = { at: Date.now(), phase: 'mist' };
    i++;
    n++;
  }
  return n;
}

function padAllExploration(discovered) {
  LOCATIONS.forEach(function(l) {
    if (l.type === 'region' || l.cartographerSite) {
      if (!discovered[l.id]) discovered[l.id] = { at: Date.now(), phase: 'mist' };
    }
  });
}

function isJourneyPathClickable(locId, discovered, journeyPath, revealedGods) {
  if (isFullyDiscovered(locId, discovered, journeyPath)) return false;
  if (locId === SINN_CITY_ID) {
    if (!meetsSinnTerritoryGate(discovered)) return false;
    return locId === getNextPathLocation(discovered, journeyPath, revealedGods);
  }
  if (locId === FINAL_ELENA_STOP) {
    if (!explorationComplete(discovered)) return false;
    if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) return false;
    return locId === getNextPathLocation(discovered, journeyPath, revealedGods);
  }
  if (isVol2LockedJourneyStep(locId, journeyPath, revealedGods, discovered)) return false;
  if (isOnPath(locId, journeyPath)) {
    return locId === getNextPathLocation(discovered, journeyPath, revealedGods);
  }
  return false;
}

// Mirror finale reward gate: fires on Indras Na complete (no letter wait — letters end at Sinn)
function maybeShowVol2GateToast(revealedGods, discovered, journeyPath, ls, opts) {
  opts = opts || {};
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (!isFullyDiscovered(FINAL_ELENA_STOP, discovered, journeyPath)) return false;
  if (ls[VOL2_GATE_TOAST_LS] === '1') return false;
  ls[VOL2_GATE_TOAST_LS] = '1';
  return true;
}

function simulateCompleteDiscovery(locId, discovered, journeyPath, revealedGods, ls, opts) {
  discovered[locId] = { at: Date.now(), phase: 'complete' };
  var fired = false;
  if (locId === FINAL_ELENA_STOP) {
    fired = maybeShowVol2GateToast(revealedGods, discovered, journeyPath, ls, opts);
  }
  return { toastFired: fired };
}

function simulateRevealGod(m, revealedGods, discovered, journeyPath, ls, opts) {
  var wasAlready = !!revealedGods[m.name];
  revealedGods[m.name] = true;
  return { wasAlready: wasAlready, toastFired: false };
}

function pruneRevealedGods(revealedGods, discovered, unlocks) {
  var territoryCount = getTerritoryDiscoveryCount(discovered);
  var cleaned = getValidRevealedGodsForCount(territoryCount, unlocks, discovered, JOURNEY_PATH);
  Object.keys(revealedGods).forEach(function(k) { delete revealedGods[k]; });
  Object.keys(cleaned).forEach(function(k) { revealedGods[k] = true; });
  return cleaned;
}

function getValidRevealedGodsForCount(territoryCount, unlocks, discovered, journeyPath) {
  var cleaned = {};
  for (var i = 0; i < VOL1_REVEAL_ORDER.length; i++) {
    var name = VOL1_REVEAL_ORDER[i];
    var threshold = unlocks[name];
    if (!threshold) break;
    if (!isGuardianUnlockEligible(name, threshold, territoryCount, discovered, journeyPath)) break;
    cleaned[name] = true;
  }
  return cleaned;
}

function simulateCheckGodReveals(territoryCount, revealedGods, unlocks, discovered, journeyPath, opts) {
  var revealed = [];
  for (var i = 0; i < VOL1_REVEAL_ORDER.length; i++) {
    var name = VOL1_REVEAL_ORDER[i];
    if (revealedGods[name]) continue;
    var threshold = unlocks[name];
    if (!threshold) break;
    if (isGuardianUnlockEligible(name, threshold, territoryCount, discovered, journeyPath)) {
      revealedGods[name] = true;
      revealed.push(name);
      if (opts && opts.onePerTick) break;
    } else {
      break;
    }
  }
  return revealed;
}

// ── Tests ────────────────────────────────────────────────────
console.log('=== smoke-journey-flow ===\n');

console.log('Journey steps (' + JOURNEY_PATH.length + '):');
JOURNEY_PATH.forEach(function(s) {
  console.log('  ' + s.step + '. ' + s.locationId + ' — ' + s.label);
});

console.log('\n[1] Post-Sabella next glow');
var postSabella = makeJourneyCompleteThrough('sabellas-hut');
postSabella['sabellas-hut'] = { at: Date.now(), phase: 'complete' };
var nextAfterSabella = getNextPathLocation(postSabella, JOURNEY_PATH, {});
assert(nextAfterSabella === 'monastery-wind', 'getNextPathLocation after Sabella is monastery-wind (not mish)');

console.log('\n[2] Journey 5/7 + 8 territories — clock caps at Rapha (3pm), not Mish');
var sixEight = makeJourneyCompleteThrough('tower-nine');
sixEight['tower-nine'] = { at: Date.now(), phase: 'complete' };
padTerritories(sixEight, 8);
var validAt8 = getValidRevealedGodsForCount(8, MEDALLION_UNLOCKS, sixEight, JOURNEY_PATH);
assert(journeyCompleteCount(sixEight, JOURNEY_PATH) === 5, 'journey progress is 5/7');
assert(validAt8.Utu && validAt8['Sham & Mash'] && validAt8.Elil && validAt8.Rapha,
  'at 8 territories clock chain reaches Rapha (4th guardian)');
assert(!validAt8.Ningal, 'Ningal (4pm) not lit at 8 territories');
assert(!validAt8.An, 'An (5pm) not lit at 8 territories');
assert(!validAt8.Mish, 'Mish (6pm) not lit without Indras Na');
var revealedMid = { Utu: true, 'Sham & Mash': true, Elil: true, Rapha: true };
assert(!isMishGuardianRevealed(revealedMid, sixEight, JOURNEY_PATH), 'Mish guardian not awakened at 5/7 + Rapha only');
assert(!isVol2JourneyGateBlocking(revealedMid, sixEight, JOURNEY_PATH), 'Vol2 gate not blocking before Mish guardian');
var lsMid = {};
assert(!maybeShowVol2GateToast(revealedMid, sixEight, JOURNEY_PATH, lsMid), 'Vol2 reward toast not eligible before Indras Na complete');
assert(!lsMid[VOL2_GATE_TOAST_LS], 'Vol2 reward LS flag not set before Indras Na complete');

console.log('\n[2s] Sinn territory gate — locked below 10 lands, open at 10+');
var preSinn = makeJourneyCompleteThrough('sinn');
assert(getTerritoryDiscoveryCount(preSinn) === 0, 'pre-sinn snap starts with 0 territories');
assert(isSinnTerritoryGated(preSinn, JOURNEY_PATH), 'Sinn gated when path ready but 0 lands named');
assert(getNextPathLocation(preSinn, JOURNEY_PATH, {}) === null,
  'getNextPathLocation null while Sinn territory-gated (no golden glow)');
assert(!isJourneyPathClickable(SINN_CITY_ID, preSinn, JOURNEY_PATH, {}),
  'Sinn not clickable while territory-gated');
var reason0 = getSinnLockedReason(preSinn, JOURNEY_PATH);
assert(reason0 && reason0.indexOf('0 of 10 lands named') > -1,
  'locked copy reports 0 of 10 lands named');

padTerritories(preSinn, 7);
assert(getTerritoryDiscoveryCount(preSinn) === 7, 'padded to 7 territories (user case)');
assert(isSinnTerritoryGated(preSinn, JOURNEY_PATH), 'Sinn still gated at 7/10');
assert(getNextPathLocation(preSinn, JOURNEY_PATH, {}) === null,
  'no Sinn golden glow at 7 territories');
assert(!isJourneyPathClickable(SINN_CITY_ID, preSinn, JOURNEY_PATH, {}),
  'Sinn not clickable at 7 territories');
var reason7 = getSinnLockedReason(preSinn, JOURNEY_PATH);
assert(reason7 && reason7.indexOf('7 of 10 lands named') > -1,
  'locked copy reports 7 of 10 lands named');
assert(reason7.indexOf('Sinn waits until more of the Hollowlands are charted') > -1,
  'locked copy uses Hollowlands charted phrasing');

padTerritories(preSinn, 10);
assert(getTerritoryDiscoveryCount(preSinn) === 10, 'padded to 10 territories');
assert(!isSinnTerritoryGated(preSinn, JOURNEY_PATH), 'Sinn ungated at 10 lands');
assert(getNextPathLocation(preSinn, JOURNEY_PATH, {}) === SINN_CITY_ID,
  'getNextPathLocation is sinn at 10+ territories');
assert(isJourneyPathClickable(SINN_CITY_ID, preSinn, JOURNEY_PATH, {}),
  'Sinn clickable at 10 territories');
assert(getSinnLockedReason(preSinn, JOURNEY_PATH) === null,
  'no Sinn locked reason once gate met');

// Gate is journey pacing — still applies when Sabella messages are off
var flagWas = ENABLE_SABELLA_MESSAGES;
ENABLE_SABELLA_MESSAGES = false;
var preSinnFlagOff = makeJourneyCompleteThrough('sinn');
padTerritories(preSinnFlagOff, 7);
assert(getNextPathLocation(preSinnFlagOff, JOURNEY_PATH, {}) === null,
  'Sinn still gated at 7 when ENABLE_SABELLA_MESSAGES false');
assert(!isJourneyPathClickable(SINN_CITY_ID, preSinnFlagOff, JOURNEY_PATH, {}),
  'Sinn not clickable at 7 with Sabella flag off');
padTerritories(preSinnFlagOff, 10);
assert(getNextPathLocation(preSinnFlagOff, JOURNEY_PATH, {}) === SINN_CITY_ID,
  'Sinn opens at 10 with Sabella flag off');
ENABLE_SABELLA_MESSAGES = flagWas;

console.log('\n[2e] Indras Na clickability — sealed until map whole + road letters, then sole journey target');
clearSabellaLetters();
var preFinale = makeJourneyCompleteThrough('sinn');
preFinale['sinn'] = { at: Date.now(), phase: 'complete' };
assert(!isJourneyPathClickable(FINAL_ELENA_STOP, preFinale, JOURNEY_PATH, {}),
  'indras-na not clickable before all territories + sites charted');
assert(getNextPathLocation(preFinale, JOURNEY_PATH, {}) === null,
  'no golden glow on indras-na until exploration complete');
padAllExploration(preFinale);
assert(getNextPathLocation(preFinale, JOURNEY_PATH, {}) === null,
  'no golden glow on indras-na until Sabella road letters collected (flag on)');
assert(!isJourneyPathClickable(FINAL_ELENA_STOP, preFinale, JOURNEY_PATH, {}),
  'indras-na not clickable with map whole but letters missing');
collectSabellaPrereqLetters();
assert(getNextPathLocation(preFinale, JOURNEY_PATH, {}) === FINAL_ELENA_STOP,
  'indras-na is the only journey glow when map whole + prior steps + 4 letters done');
assert(isJourneyPathClickable(FINAL_ELENA_STOP, preFinale, JOURNEY_PATH, {}),
  'indras-na clickable when it is the active finale target');
assert(!isJourneyPathClickable('sinn', preFinale, JOURNEY_PATH, {}),
  'prior journey stops not clickable when indras-na is next');
assert(!isVol2LockedJourneyStep(FINAL_ELENA_STOP, JOURNEY_PATH, { Mish: true }, preFinale),
  'indras-na never sealed by Vol2 journey gate');

console.log('\n[2g] Locked Indras Na click feedback — reason string while sealed');
clearSabellaLetters();
var lockedMidPath = makeJourneyCompleteThrough('tower-nine');
lockedMidPath['tower-nine'] = { at: Date.now(), phase: 'complete' };
var midReason = getIndrasNaLockedReason(lockedMidPath, JOURNEY_PATH);
assert(typeof midReason === 'string' && midReason.indexOf('Sinn') > -1,
  'locked reason when prior path incomplete mentions Sinn');
var lockedPreExplore = makeJourneyCompleteThrough('sinn');
lockedPreExplore['sinn'] = { at: Date.now(), phase: 'complete' };
var exploreReason = getIndrasNaLockedReason(lockedPreExplore, JOURNEY_PATH);
assert(typeof exploreReason === 'string' && exploreReason.indexOf('Sabella') > -1,
  'locked reason when exploration incomplete mentions Sabella marks');
assert(exploreReason.indexOf('territor') > -1 || exploreReason.indexOf('marks') > -1,
  'locked reason names remaining chart work');
var lockedLetters = makeJourneyCompleteThrough('sinn');
lockedLetters['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(lockedLetters);
SABELLA_MESSAGES_SEEN['sabellas-hut'] = 1;
SABELLA_MESSAGES_SEEN['monastery-wind'] = 1;
SABELLA_MESSAGES_SEEN['tower-nine'] = 1;
// sinn letter missing → 3 of 4
var letterReason = getIndrasNaLockedReason(lockedLetters, JOURNEY_PATH);
assert(typeof letterReason === 'string' && letterReason.indexOf('3 of 4') > -1,
  'locked reason when 4 letters missing shows count (3 of 4)');
assert(letterReason.indexOf('Still needed:') > -1 && letterReason.indexOf('Sinn') > -1,
  'locked reason lists missing letter stop name (Sinn)');
assert(isIndrasNaSealed(lockedLetters, JOURNEY_PATH),
  'sinn done + letters incomplete → Indras Na sealed beacon state');
assert(getNextPathLocation(lockedLetters, JOURNEY_PATH, {}) === null,
  'no golden glow while Indras sealed on letters');
assert(getFirstMissingSabellaLetterId() === 'sinn',
  'first missing letter is sinn when hut/monastery/tower collected');
assert(!isJourneyPathClickable(FINAL_ELENA_STOP, lockedLetters, JOURNEY_PATH, {}),
  '3 of 4 letters → indras-na locked (not golden-clickable)');
collectSabellaPrereqLetters();
var unlockedSnap = makeJourneyCompleteThrough('sinn');
unlockedSnap['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(unlockedSnap);
assert(getIndrasNaLockedReason(unlockedSnap, JOURNEY_PATH) === null,
  'locked reason null when Indras Na is unlockable');
assert(!isIndrasNaSealed(unlockedSnap, JOURNEY_PATH),
  'not sealed when unlockable — golden glow path');
assert(getNextPathLocation(unlockedSnap, JOURNEY_PATH, {}) === FINAL_ELENA_STOP,
  'sinn done + all prereqs → golden glow on indras-na');
var doneSnap = Object.assign({}, unlockedSnap);
doneSnap[FINAL_ELENA_STOP] = { at: Date.now(), phase: 'complete' };
assert(getIndrasNaLockedReason(doneSnap, JOURNEY_PATH) === null,
  'locked reason null after Indras Na discovered');

console.log('\n[2h] Sabella letter gate off → no secret requirement');
ENABLE_SABELLA_MESSAGES = false;
clearSabellaLetters();
var flagOffSnap = makeJourneyCompleteThrough('sinn');
flagOffSnap['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(flagOffSnap);
assert(getIndrasNaLockedReason(flagOffSnap, JOURNEY_PATH) === null,
  'flag off → no secret gate (locked reason null with map whole)');
assert(getNextPathLocation(flagOffSnap, JOURNEY_PATH, {}) === FINAL_ELENA_STOP,
  'flag off → indras-na glow without letters');
assert(isJourneyPathClickable(FINAL_ELENA_STOP, flagOffSnap, JOURNEY_PATH, {}),
  'flag off → indras-na clickable without letters');
ENABLE_SABELLA_MESSAGES = true;
collectSabellaPrereqLetters();

console.log('\n[2f] User snapshot — 6/7 journey, 17/17 territories, 13/13 sites + 4 letters → indras-na clickable');
collectSabellaPrereqLetters();
var userSnap = makeJourneyCompleteThrough('sinn');
userSnap['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(userSnap);
assert(journeyCompleteCount(userSnap, JOURNEY_PATH) === 6, 'journey progress is 6/7');
assert(getTerritoryDiscoveryCount(userSnap) === 17, 'all 17 territories charted');
assert(explorationComplete(userSnap), 'exploration complete for finale unlock');
assert(getNextPathLocation(userSnap, JOURNEY_PATH, {}) === FINAL_ELENA_STOP,
  'golden glow targets indras-na at 6/7 with full map');
assert(isJourneyPathClickable(FINAL_ELENA_STOP, userSnap, JOURNEY_PATH, {}),
  'indras-na clickable at user snapshot state');
var staleMishGods = { Utu: true, 'Sham & Mash': true, Elil: true, Rapha: true, Ningal: true, An: true, Mish: true };
assert(getNextPathLocation(userSnap, JOURNEY_PATH, staleMishGods) === FINAL_ELENA_STOP,
  'stale Mish reveal does not steal finale glow from indras-na');
assert(isJourneyPathClickable(FINAL_ELENA_STOP, userSnap, JOURNEY_PATH, staleMishGods),
  'stale Mish reveal does not block indras-na click');
userSnap[FINAL_ELENA_STOP] = { at: Date.now(), phase: 'searching' };
assert(getNextPathLocation(userSnap, JOURNEY_PATH, {}) === FINAL_ELENA_STOP,
  'indras-na stays active target while chime search in progress');
assert(isJourneyPathClickable(FINAL_ELENA_STOP, userSnap, JOURNEY_PATH, {}),
  'indras-na remains clickable during searching phase');
assert(!isGuardianUnlockEligible('Mish', MISH_UNLOCK, 17, userSnap, JOURNEY_PATH),
  'Mish not eligible while Indras Na search is in progress');

console.log('\n[2b] Stale out-of-order reveals pruned — Mish removed at 8 territories');
var staleOrder = { Utu: true, Rapha: true, Mish: true };
pruneRevealedGods(staleOrder, sixEight, MEDALLION_UNLOCKS);
assert(staleOrder.Utu && staleOrder.Rapha && !staleOrder.Mish,
  'prune keeps sequential prefix; Mish stripped without Indras Na');

console.log('\n[2c] 17 territories without Indras Na — Mish stays locked');
var allTerrNoIndras = makeJourneyCompleteThrough('sinn');
allTerrNoIndras['sinn'] = { at: Date.now(), phase: 'complete' };
padTerritories(allTerrNoIndras, 17);
var validNoIndras = getValidRevealedGodsForCount(17, MEDALLION_UNLOCKS, allTerrNoIndras, JOURNEY_PATH);
assert(validNoIndras.An && !validNoIndras.Mish,
  '17 territories reaches An but Mish blocked until Indras Na discovered');

console.log('\n[2d] Indras Na + 17 territories + full chain — Mish can reveal');
var mishEligible = makeJourneyCompleteThrough('indras-na');
mishEligible['indras-na'] = { at: Date.now(), phase: 'complete' };
padTerritories(mishEligible, 17);
var seqGods = {};
simulateCheckGodReveals(17, seqGods, MEDALLION_UNLOCKS, mishEligible, JOURNEY_PATH, { onePerTick: false });
assert(seqGods.Mish, 'Mish revealed when Indras Na discovered + 17 territories + chain');
assert(seqGods.Utu && seqGods['Sham & Mash'] && seqGods.Elil && seqGods.Rapha && seqGods.Ningal && seqGods.An,
  'full Vol1 clock chain lit before Mish');

console.log('\n[3] Stale Mish in revealedGods without Indras Na — pruned');
var staleGods = { Mish: true, Elil: true };
var staleDisc = makeJourneyCompleteThrough('monastery-wind');
padTerritories(staleDisc, 17);
pruneRevealedGods(staleGods, staleDisc, MEDALLION_UNLOCKS);
assert(!staleGods.Mish, 'stale Mish pruned when Indras Na not discovered');
assert(!isVol2JourneyGateBlocking(staleGods, staleDisc, JOURNEY_PATH), 'Vol2 gate false after stale Mish prune');

console.log('\n[4] Indras Na completion fires Vol1 reward toast (not Mish reveal)');
collectSabellaPrereqLetters();
var finaleReady = makeJourneyCompleteThrough('sinn');
finaleReady['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(finaleReady);
var lsFinale = {};
var finaleComplete = simulateCompleteDiscovery(FINAL_ELENA_STOP, finaleReady, JOURNEY_PATH, {}, lsFinale);
assert(finaleComplete.toastFired, 'Vol1 reward toast fires on Indras Na completion');
assert(lsFinale[VOL2_GATE_TOAST_LS] === '1', 'reward toast LS flag set on Indras Na complete');

console.log('\n[4c] Indras Na has no letter — congrats fires on discovery (letters end at Sinn)');
clearSabellaLetters();
collectSabellaPrereqLetters();
var paceReady = makeJourneyCompleteThrough('sinn');
paceReady['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(paceReady);
var lsPace = {};
var paceDone = simulateCompleteDiscovery(FINAL_ELENA_STOP, Object.assign({}, paceReady), JOURNEY_PATH, {}, lsPace, {});
assert(paceDone.toastFired, 'congrats fires on Indras Na complete without waiting for a letter');
assert(lsPace[VOL2_GATE_TOAST_LS] === '1', 'reward LS set on Indras complete (no Indras letter)');
var fogLetters = fs.readFileSync(path.join(ROOT, 'fog.js'), 'utf8');
var msgBlock = fogLetters.match(/var SABELLA_MESSAGES = \{[\s\S]*?\n  \};/);
assert(msgBlock && msgBlock[0].indexOf("'indras-na'") === -1,
  'SABELLA_MESSAGES has no indras-na letter entry');
assert(msgBlock && msgBlock[0].indexOf("'sinn'") > -1,
  'SABELLA_MESSAGES includes sinn as last road letter');
assert(/western gate waits/.test(fogLetters),
  'Sinn letter carries farewell beat toward western gate');

console.log('\n[4b] Mish guardian reveal alone does not fire reward toast');
var mishOnlyGods = { Utu: true, 'Sham & Mash': true, Elil: true, Rapha: true, Ningal: true, An: true };
var mishOnlyDisc = makeJourneyCompleteThrough('monastery-wind');
mishOnlyDisc['monastery-wind'] = { at: Date.now(), phase: 'complete' };
padTerritories(mishOnlyDisc, 17);
mishOnlyDisc[FINAL_ELENA_STOP] = { at: Date.now(), phase: 'complete' };
var lsMishOnly = {};
var mishReveal = simulateRevealGod(
  { name: 'Mish', guardian: true, unlock: MISH_UNLOCK },
  mishOnlyGods, mishOnlyDisc, JOURNEY_PATH, lsMishOnly, { suppressAnimations: false }
);
assert(!mishReveal.toastFired, 'Mish guardian reveal does not fire Vol1 reward toast');
assert(!lsMishOnly[VOL2_GATE_TOAST_LS], 'reward LS flag unset after Mish reveal without Indras Na ceremony path');

console.log('\n[4d] Mid-journey (4/7) never triggers reward toast');
var midJourney = makeJourneyCompleteThrough('monastery-wind');
midJourney['monastery-wind'] = { at: Date.now(), phase: 'complete' };
var lsMidJourney = {};
assert(!maybeShowVol2GateToast({}, midJourney, JOURNEY_PATH, lsMidJourney),
  'reward toast not eligible at 4/7 journey without Indras Na');

console.log('\n[5] Elil reveal after Mish already revealed — no duplicate toast');
var elilReady = makeJourneyCompleteThrough('monastery-wind');
elilReady['monastery-wind'] = { at: Date.now(), phase: 'complete' };
padTerritories(elilReady, ELIL_UNLOCK);
var godsWithMish = { Utu: true, 'Sham & Mash': true, Elil: true, Rapha: true, Ningal: true, An: true, Mish: true };
var lsElil = {};
lsElil[VOL2_GATE_TOAST_LS] = '1';
var elilReveal = simulateRevealGod(
  { name: 'Elil', guardian: false, unlock: ELIL_UNLOCK },
  godsWithMish, elilReady, JOURNEY_PATH, lsElil, { suppressAnimations: false }
);
assert(!elilReveal.toastFired, 'Elil reveal does not fire Vol1 reward toast');
assert(!maybeShowVol2GateToast(godsWithMish, elilReady, JOURNEY_PATH, lsElil), 'reward toast not re-eligible after flag already shown');

console.log('\n[6] fog.js territory-paced guardians + Indras Na finale (build 154)');
var fogSrc = fs.readFileSync(path.join(ROOT, 'fog.js'), 'utf8');
assert(fogSrc.indexOf('VOL1_REVEAL_ORDER') > -1, 'VOL1_REVEAL_ORDER defined in fog.js');
assert(fogSrc.indexOf('getTerritoryDiscoveryCount') > -1, 'getTerritoryDiscoveryCount helper in fog.js');
assert(/function isClickable[\s\S]*?isFullyDiscovered\(locId\)/.test(fogSrc),
  'isClickable allows in-progress journey stops (searching phase)');
assert(/meetsMishUnlockCriteria[\s\S]*?isFullyDiscovered\(FINAL_ELENA_STOP\)/.test(fogSrc),
  'Mish unlock requires Indras Na fully complete');
assert(/isVol2LockedJourneyStep[\s\S]*?locId === FINAL_ELENA_STOP/.test(fogSrc),
  'indras-na excluded from Vol2 journey seal');
assert(/maybeShowVol2GateToast[\s\S]*?isFullyDiscovered\(FINAL_ELENA_STOP\)/.test(fogSrc),
  'reward toast gated on Indras Na completion');
assert(fogSrc.indexOf('function runAfterCeremonyClear') > -1 &&
  fogSrc.indexOf('function isBlockingCeremonyOpen') > -1,
  'ceremony queue helpers exist (defer congrats over guardian lore)');
assert(/checkJourneyFinale[\s\S]*?runAfterCeremonyClear\(showJourneyToast/.test(fogSrc),
  'archive-complete overlay deferred until ceremony clear');
assert(/maybeShowVol2GateToast[\s\S]*?runAfterCeremonyClear\(/.test(fogSrc),
  'Vol2 Indras congrats deferred until ceremony clear');
assert(fogSrc.indexOf('maybeShowVol2GateToast();') > -1 &&
  /completeDiscovery[\s\S]*?FINAL_ELENA_STOP[\s\S]*?maybeShowVol2GateToast/.test(fogSrc),
  'completeDiscovery triggers reward toast on Indras Na');
assert(fogSrc.indexOf('function getIndrasNaLockedReason') > -1,
  'getIndrasNaLockedReason helper exists');
assert(fogSrc.indexOf('getIndrasNaLockedReason()') > -1 &&
  fogSrc.indexOf('showLockedMessage()') > -1,
  'locked indras-na click path calls showLockedMessage via getIndrasNaLockedReason');
assert(fogSrc.indexOf('Indras Na Is Sealed') > -1,
  'locked modal title present');
assert(fogSrc.indexOf('Sabella\\u2019s remaining marks') > -1 ||
  fogSrc.indexOf('Sabella\u2019s remaining marks') > -1,
  'locked copy references Sabella marks');
assert(fogSrc.indexOf('SABELLA_LETTER_PREREQ_IDS') > -1 &&
  fogSrc.indexOf('sabellaPrereqLettersComplete') > -1,
  'Sabella road-letter prereq gate helpers exist');
assert(/getIndrasNaLockedReason[\s\S]*?Still needed:/.test(fogSrc),
  'locked copy lists still-needed letter stop names');
assert(/getNextPathLocation[\s\S]*?sabellaPrereqLettersComplete/.test(fogSrc),
  'getNextPathLocation seals indras-na until road letters complete');
assert(fogSrc.indexOf('function isIndrasNaSealed') > -1, 'isIndrasNaSealed helper exists');
assert(fogSrc.indexOf('function getMissingSabellaLetterIds') > -1, 'missing letter id helper exists');
assert(fogSrc.indexOf('function maybeRecoverSabellaLetter') > -1, 'letter recovery helper exists');
assert(fogSrc.indexOf('function forceShowSabellaLetter') > -1, 'forceShowSabellaLetter exists');
assert(fogSrc.indexOf('SABELLA_LETTER_DISPLAY_NAMES') > -1 &&
  fogSrc.indexOf("'monastery-wind': 'Monastery of the Wind'") > -1,
  'canonical Monastery of the Wind display name (not Mercury)');
assert(fogSrc.indexOf('function sabellaLetterDisplayName') > -1,
  'sabellaLetterDisplayName helper exists');
assert(/forceShowSabellaLetter[\s\S]*?locked[\s\S]*?removeChild|locked\.parentNode\.removeChild/.test(fogSrc) ||
  /function forceShowSabellaLetter[\s\S]*?getElementById\('locked-msg'\)[\s\S]*?removeChild/.test(fogSrc),
  'forceShow clears locked-msg before showing letter');
assert(fogSrc.indexOf('Sabella left one more letter at') > -1,
  'Guide Me toast copy for single missing letter');
assert(fogSrc.indexOf('Search with the lantern for Sabella') > -1,
  'Guide Me tip prompts lantern search for missing letter');
assert(/function runGuideMe[\s\S]*?getFirstMissingSabellaLetterId[\s\S]*?enterLetterSearchMode/.test(fogSrc),
  'Guide Me steers to first missing letter and starts letter lantern search when charted');
assert(/else if \(isIndrasNaSealed\(\)\)[\s\S]*?FINAL_ELENA_STOP/.test(fogSrc),
  'drawBeaconGlows draws sealed Indras Na beacon');
assert(fogSrc.indexOf('maybeRecoverSabellaLetter(discLoc)') > -1,
  'clicking completed letter-stop recovers skipped letter');
assert(fogSrc.indexOf('forceShowSabellaLetter(bestMiss)') === -1,
  'no wide fog hit-test force-shows parchment (letter recovery is marker/Guide Me only)');
assert(fogSrc.indexOf('function enterLetterSearchMode') > -1 &&
  fogSrc.indexOf('letterRecovery: true') > -1,
  'letter-recovery search mode exists');
assert(fogSrc.indexOf('function placeSearchKeyOffset') > -1 &&
  fogSrc.indexOf('KEY_OFFSET_MIN') > -1 &&
  fogSrc.indexOf('placeSearchKeyOffset(loc)') > -1,
  'chime key is offset from beacon for all search enters (shared helper)');
assert(fogSrc.indexOf('function ensureSabellaLetterBeforeChart') > -1 &&
  fogSrc.indexOf('ensureSabellaLetterBeforeChart(searchMode.loc)') > -1,
  'KEY_CLICK grants Sabella letter before charting (cannot skip Hot)');
assert(fogSrc.indexOf('maybeShowSabellaLetterOnChime(proximity)') > -1 &&
  fogSrc.indexOf('ensureSabellaLetterBeforeChart') > -1,
  'Sabella letters fire on chime Hot band or KEY_CLICK (not auto at beacon center)');
assert(/glowSearching[\s\S]*?phase === 'searching'/.test(fogSrc),
  'golden glow suppressed while journey stop is in chime search');
assert(fogSrc.indexOf('function isSabellaLetterUiBlocked') > -1 &&
  fogSrc.indexOf('maxWaitMs') > -1,
  'scheduleSabellaMessage uses visible-overlay gate + max wait (no soft-lock)');
assert(/completeDiscovery[\s\S]*?maybeFlyToNextJourneyStep/.test(fogSrc),
  'completeDiscovery flies toward next/sealed Indras when off-screen');
assert(fogSrc.indexOf('locked-msg-close') > -1 &&
  fogSrc.indexOf('function lockedMsgCloseHtml') > -1 &&
  fogSrc.indexOf('function wireLockedMsgDismiss') > -1,
  'locked modals share prominent Close button helper');
assert(fogSrc.indexOf('lockedMsgCloseHtml()') > -1 &&
  /showLockedMessage[\s\S]*?lockedMsgCloseHtml\(\)[\s\S]*?showVol2LockedMessage[\s\S]*?lockedMsgCloseHtml\(\)/.test(fogSrc),
  'Indras Na + Vol2 locked modals both use Close button');
assert(!/requireManualDismiss[\s\S]*?FINAL_ELENA_STOP/.test(fogSrc),
  'no Indras Na letter manual-Close path (letters end at Sinn)');
assert(!/maybeShowVol2GateToast[\s\S]*?hasUnseenSabellaMessage\(FINAL_ELENA_STOP\)/.test(fogSrc),
  'congrats does not wait for an Indras letter');
assert(/if \(loc\.id === FINAL_ELENA_STOP\) \{\s*maybeShowVol2GateToast\(\);/.test(fogSrc),
  'Indras complete calls maybeShowVol2GateToast directly');
assert(/SABELLA_LETTER_PREREQ_IDS = \['sabellas-hut', 'monastery-wind', 'tower-nine', 'sinn'\]/.test(fogSrc),
  'exactly 4 road-letter prereqs ending at sinn');
assert(/sabellaLettersTotal[\s\S]*?Object\.keys\(SABELLA_MESSAGES\)\.length/.test(fogSrc),
  'Secrets total derived from SABELLA_MESSAGES keys (4)');
assert(fogSrc.indexOf('SINN_TERRITORY_GATE') > -1 && fogSrc.indexOf('SINN_TERRITORY_GATE = 10') > -1,
  'SINN_TERRITORY_GATE constant is 10');
assert(fogSrc.indexOf('function getSinnLockedReason') > -1 &&
  fogSrc.indexOf('function isSinnTerritoryGated') > -1,
  'Sinn territory gate helpers exist');
assert(/getNextPathLocation[\s\S]*?SINN_CITY_ID[\s\S]*?meetsSinnTerritoryGate/.test(fogSrc),
  'getNextPathLocation seals sinn until territory gate');
assert(fogSrc.indexOf('Sinn Is Sealed') > -1 &&
  fogSrc.indexOf('showSinnLockedMessage') > -1,
  'Sinn locked modal title + show helper present');
assert(fogSrc.indexOf('lands named') > -1,
  'Sinn locked copy reports lands named count');

console.log('\n[7] Chime exit clears searchMode (build 143+ regression)');
assert(fogSrc.indexOf('function exitSearchMode()') > -1, 'exitSearchMode exists');
assert(/function exitSearchMode\(\)[\s\S]*?searchMode = null/.test(fogSrc), 'exitSearchMode nulls searchMode');
assert(fogSrc.indexOf('exitSearchMode();') > -1 && fogSrc.indexOf('completeDiscovery') > -1, 'completeDiscovery calls exitSearchMode');
assert(fogSrc.indexOf('searchMode.silenced = true') > -1, 'chime silenced before exit on key found');

console.log('\n[8] fog.js syntax');
var cp = require('child_process');
try {
  cp.execFileSync('node', ['--check', path.join(ROOT, 'fog.js')], { stdio: 'pipe' });
  pass('node --check fog.js');
} catch (e) {
  fail('node --check fog.js: ' + (e.stderr ? e.stderr.toString() : e.message));
}

// ── [9] Glow-only sequential playthrough ─────────────────────
// Simulates a real player: only click what isClickable() would allow
// (visible beacon). No fog-lottery NE clicks for letters — letters fire
// on chime-hot at letter stops (or Guide Me / marker recovery).
console.log('\n[9] Glow-only sequential playthrough (visible beacons only)');

var TERRITORY_GLOW_RADIUS = 500;
var TERRITORY_FRONTIER_RADIUS = 1800;
var SITE_NEAR_CLEARED = 400;

function isTerritoryLoc(loc) {
  return loc && (loc.type === 'region' || loc.type === 'water');
}

function distLL(a, b) {
  var dx = a.lat - b.lat;
  var dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

function hasNearbyNonTerritoryDiscoveryPT(discovered, loc, radius) {
  var nearby = false;
  Object.keys(discovered).forEach(function(dId) {
    if (nearby) return;
    var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
    if (!dLoc || isTerritoryLoc(dLoc)) return;
    if (distLL(loc, dLoc) < radius) nearby = true;
  });
  return nearby;
}

function hasNearbyTerritoryDiscoveryPT(discovered, loc, radius) {
  var nearby = false;
  Object.keys(discovered).forEach(function(dId) {
    if (nearby) return;
    var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
    if (!isTerritoryLoc(dLoc)) return;
    if (distLL(loc, dLoc) < radius) nearby = true;
  });
  return nearby;
}

function getFallbackTerritoryIdPT(discovered) {
  var undiscoveredTerritories = LOCATIONS.filter(function(l) {
    return isTerritoryLoc(l) && !discovered[l.id];
  });
  if (!undiscoveredTerritories.length) return null;
  var hasNormalGlow = undiscoveredTerritories.some(function(loc) {
    return hasNearbyNonTerritoryDiscoveryPT(discovered, loc, TERRITORY_GLOW_RADIUS) ||
           hasNearbyTerritoryDiscoveryPT(discovered, loc, TERRITORY_FRONTIER_RADIUS);
  });
  if (hasNormalGlow) return null;
  var best = null;
  var bestD = Infinity;
  undiscoveredTerritories.forEach(function(loc) {
    Object.keys(discovered).forEach(function(dId) {
      var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
      if (!dLoc || isTerritoryLoc(dLoc)) return;
      var d = distLL(loc, dLoc);
      if (d < bestD) { bestD = d; best = loc; }
    });
  });
  return best ? best.id : null;
}

function territoryHasGlowPT(discovered, loc) {
  return hasNearbyNonTerritoryDiscoveryPT(discovered, loc, TERRITORY_GLOW_RADIUS) ||
         hasNearbyTerritoryDiscoveryPT(discovered, loc, TERRITORY_FRONTIER_RADIUS) ||
         loc.id === getFallbackTerritoryIdPT(discovered);
}

function nearestTerritoryIsDiscoveredPT(discovered, loc) {
  var nearestRegion = null;
  var nrDist = Infinity;
  LOCATIONS.forEach(function(r) {
    if (!isTerritoryLoc(r)) return;
    var d = distLL(loc, r);
    if (d < nrDist) { nrDist = d; nearestRegion = r; }
  });
  return !!(nearestRegion && discovered[nearestRegion.id]);
}

function nearClearedFogPT(discovered, loc) {
  var nearCleared = false;
  Object.keys(discovered).forEach(function(dId) {
    if (nearCleared) return;
    var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
    if (!dLoc) return;
    if (distLL(loc, dLoc) < SITE_NEAR_CLEARED) nearCleared = true;
  });
  return nearCleared;
}

// Mirror fog.js isClickable — glow-only contract for the playthrough
function isClickablePT(locId, discovered, journeyPath, revealedGods, tutorialHintId, clusterPeek) {
  if (isFullyDiscovered(locId, discovered, journeyPath)) return false;
  var loc = LOCATIONS.find(function(l) { return l.id === locId; });
  if (!loc) return false;
  clusterPeek = clusterPeek || {};

  if (locId === SINN_CITY_ID) {
    if (!meetsSinnTerritoryGate(discovered)) return false;
    return locId === getNextPathLocation(discovered, journeyPath, revealedGods);
  }
  if (locId === FINAL_ELENA_STOP) {
    if (!explorationComplete(discovered)) return false;
    if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) return false;
    return locId === getNextPathLocation(discovered, journeyPath, revealedGods);
  }
  if (isVol2LockedJourneyStep(locId, journeyPath, revealedGods, discovered)) return false;

  // Tutorial gate: only the current hint glow
  if (!discovered['sabellas-hut'] && tutorialHintId) {
    return locId === tutorialHintId;
  }

  // Match fog.js drawBeaconGlows: golden next-step, or amber on-path/cluster-peek near fog
  if (loc.type === 'story') {
    if (locId === getNextPathLocation(discovered, journeyPath, revealedGods)) return true;
    if (!nearClearedFogPT(discovered, loc)) return false;
    return isOnPath(locId, journeyPath) || !!clusterPeek[locId];
  }
  if (isOnPath(locId, journeyPath)) {
    return locId === getNextPathLocation(discovered, journeyPath, revealedGods);
  }
  if (isTerritoryLoc(loc)) {
    return territoryHasGlowPT(discovered, loc);
  }
  if (loc.cartographerSite) {
    return nearClearedFogPT(discovered, loc) || nearestTerritoryIsDiscoveredPT(discovered, loc);
  }
  return false;
}

function listClickablesPT(discovered, journeyPath, revealedGods, tutorialHintId, clusterPeek) {
  return LOCATIONS.filter(function(l) {
    return isClickablePT(l.id, discovered, journeyPath, revealedGods, tutorialHintId, clusterPeek);
  }).map(function(l) { return l.id; });
}

function runGlowOnlyPlaythrough() {
  clearSabellaLetters();
  var discovered = {};
  var revealedGods = {};
  var clusterPeek = {};
  var pathLog = [];
  var stuck = null;
  var maxSteps = 250;
  var step = 0;
  var sealedIndrasChecked = false;

  // --- Tutorial: crossing-pool → dawn-spear → sabellas-hut ---
  var tutorialOrder = ['crossing-pool', 'dawn-spear', 'sabellas-hut'];
  for (var ti = 0; ti < tutorialOrder.length; ti++) {
    var hintId = tutorialOrder[ti];
    var clicks = listClickablesPT(discovered, JOURNEY_PATH, revealedGods, hintId, clusterPeek);
    if (clicks.indexOf(hintId) < 0) {
      stuck = 'tutorial: ' + hintId + ' not clickable (visible=' + clicks.join(',') + ')';
      break;
    }
    // Soft-lock check: only the hint should be clickable during tutorial
    if (clicks.length !== 1 || clicks[0] !== hintId) {
      stuck = 'tutorial gate leak at ' + hintId + ': clickables=' + clicks.join(',');
      break;
    }
    discovered[hintId] = { at: Date.now(), phase: 'complete' };
    pathLog.push('T:' + hintId);
    // Letter at hut fires on chime Hot (designed) — not fog lottery
    if (SABELLA_LETTER_PREREQ_IDS.indexOf(hintId) >= 0) {
      SABELLA_MESSAGES_SEEN[hintId] = Date.now();
      pathLog.push('L:' + hintId);
    }
  }
  if (stuck) return { ok: false, stuck: stuck, pathLog: pathLog, discovered: discovered };

  // --- Post-tutorial free play following glows only ---
  while (step < maxSteps && !isFullyDiscovered(FINAL_ELENA_STOP, discovered, JOURNEY_PATH)) {
    step++;
    var nextId = getNextPathLocation(discovered, JOURNEY_PATH, revealedGods);
    var clickables = listClickablesPT(discovered, JOURNEY_PATH, revealedGods, null, clusterPeek);

    // Sealed Indras: path through Sinn done, but gates remain — glow drawn, not clickable
    if (isIndrasNaSealed(discovered, JOURNEY_PATH)) {
      if (!sealedIndrasChecked) {
        sealedIndrasChecked = true;
        if (isClickablePT(FINAL_ELENA_STOP, discovered, JOURNEY_PATH, revealedGods, null, clusterPeek)) {
          stuck = 'sealed Indras Na was clickable while gated';
          break;
        }
      }
      // Letter recovery (designed): if letters missing at completed stops, collect via
      // Guide Me / marker recovery — never invent a fog lottery click
      if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) {
        var missId = getFirstMissingSabellaLetterId();
        if (missId && isFullyDiscovered(missId, discovered, JOURNEY_PATH)) {
          SABELLA_MESSAGES_SEEN[missId] = Date.now();
          pathLog.push('Lrec:' + missId);
          continue;
        }
        if (missId && clickables.indexOf(missId) >= 0) {
          // Should not happen — letter stops on path are golden-only when incomplete
        }
      }
    }

    if (!clickables.length) {
      stuck = 'soft-lock: no glowing clickables after ' + pathLog.join(' > ') +
        ' (next=' + nextId + ', territories=' + getTerritoryDiscoveryCount(discovered) +
        '/17, letters=' + countSabellaPrereqLettersCollected() + '/4, explore=' +
        explorationComplete(discovered) + ')';
      break;
    }

    var pick = null;
    // Prefer golden journey next when glowing
    if (nextId && clickables.indexOf(nextId) >= 0) {
      pick = nextId;
    } else {
      // Need territories for Sinn / Indras, or sites for Indras — only glowing ones
      var needTerr = getTerritoryDiscoveryCount(discovered) < 17 ||
        (nextId == null && isSinnTerritoryGated(discovered, JOURNEY_PATH));
      var needSites = !explorationComplete(discovered) &&
        LOCATIONS.some(function(l) { return l.cartographerSite && !discovered[l.id]; });

      if (needTerr) {
        for (var ci = 0; ci < clickables.length; ci++) {
          var cLoc = LOCATIONS.find(function(l) { return l.id === clickables[ci]; });
          if (cLoc && cLoc.type === 'region') { pick = clickables[ci]; break; }
        }
        if (!pick) {
          for (ci = 0; ci < clickables.length; ci++) {
            cLoc = LOCATIONS.find(function(l) { return l.id === clickables[ci]; });
            if (cLoc && isTerritoryLoc(cLoc)) { pick = clickables[ci]; break; }
          }
        }
      }
      if (!pick && needSites) {
        for (ci = 0; ci < clickables.length; ci++) {
          cLoc = LOCATIONS.find(function(l) { return l.id === clickables[ci]; });
          if (cLoc && cLoc.cartographerSite && !isOnPath(cLoc.id, JOURNEY_PATH)) {
            pick = clickables[ci];
            break;
          }
        }
        // mish is cartographer site (not journey) — take if glowing
        if (!pick && clickables.indexOf('mish') >= 0 && !discovered.mish) pick = 'mish';
      }
      // Tower cluster companion once peeked
      if (!pick && clickables.indexOf('maxim-stone') >= 0 && !discovered['maxim-stone']) {
        pick = 'maxim-stone';
      }
      if (!pick) pick = clickables[0];
    }

    if (!isClickablePT(pick, discovered, JOURNEY_PATH, revealedGods, null, clusterPeek)) {
      stuck = 'chose non-clickable ' + pick;
      break;
    }

    var pickLoc = LOCATIONS.find(function(l) { return l.id === pick; });
    var phase = (isOnPath(pick, JOURNEY_PATH) || (pickLoc && pickLoc.type === 'story'))
      ? 'complete'
      : 'mist';
    discovered[pick] = { at: Date.now(), phase: phase };
    delete clusterPeek[pick];
    // Mirror fog.js: tower-nine immediately peeks maxim-stone
    if (pick === 'tower-nine') {
      clusterPeek['maxim-stone'] = true;
    }
    pathLog.push((isOnPath(pick, JOURNEY_PATH) ? 'J:' : (pickLoc && pickLoc.cartographerSite ? 'S:' : 'R:')) + pick);

    // Sabella letter on chime Hot at letter-stop completion only
    if (phase === 'complete' && SABELLA_LETTER_PREREQ_IDS.indexOf(pick) >= 0) {
      SABELLA_MESSAGES_SEEN[pick] = Date.now();
      pathLog.push('L:' + pick);
    }
  }

  if (stuck) return { ok: false, stuck: stuck, pathLog: pathLog, discovered: discovered };
  if (!isFullyDiscovered(FINAL_ELENA_STOP, discovered, JOURNEY_PATH)) {
    return {
      ok: false,
      stuck: 'did not reach Indras Na in ' + maxSteps + ' steps; path=' + pathLog.join(' > '),
      pathLog: pathLog,
      discovered: discovered
    };
  }
  return {
    ok: true,
    stuck: null,
    pathLog: pathLog,
    discovered: discovered,
    territories: getTerritoryDiscoveryCount(discovered),
    letters: countSabellaPrereqLettersCollected(),
    journey: journeyCompleteCount(discovered, JOURNEY_PATH),
    sealedIndrasChecked: sealedIndrasChecked
  };
}

var pt = runGlowOnlyPlaythrough();
assert(pt.ok, 'glow-only playthrough reaches Indras Na' +
  (pt.stuck ? ' — STUCK: ' + pt.stuck : ''));
if (pt.ok) {
  pass('glow-only path length ' + pt.pathLog.length +
    ' (journey ' + pt.journey + '/7, territories ' + pt.territories +
    ', letters ' + pt.letters + '/4)');
  // Path must include full Elena road in order
  var journeyHits = pt.pathLog.filter(function(x) { return x.indexOf('J:') === 0 || x.indexOf('T:') === 0; })
    .map(function(x) { return x.slice(2); });
  var expectedJourney = JOURNEY_PATH.map(function(s) { return s.locationId; });
  var jiOk = true;
  var jpos = 0;
  for (var jh = 0; jh < expectedJourney.length; jh++) {
    var foundAt = journeyHits.indexOf(expectedJourney[jh], jpos);
    if (foundAt < 0) { jiOk = false; break; }
    jpos = foundAt + 1;
  }
  assert(jiOk, 'Elena journey stops charted in order via glows');
  assert(pt.letters === 4, 'all 4 Sabella letters via chime-hot / designed recovery');
  assert(explorationComplete(pt.discovered), 'all regions + cartographer sites charted before/with Indras');
  assert(pt.sealedIndrasChecked, 'playthrough observed sealed Indras Na (glow without click) before unlock');
  // Sanity: moon-stronghold never appears in playthrough
  assert(pt.pathLog.every(function(x) { return x.indexOf('moon-stronghold') < 0; }),
    'playthrough never touches moon-stronghold');
} else {
  console.error('  path so far: ' + pt.pathLog.join(' > '));
}

// Mid-path assertion: after hut, monastery-wind is the golden clickable (Mish is not journey)
clearSabellaLetters();
var postHut = {
  'crossing-pool': { at: 1, phase: 'complete' },
  'dawn-spear': { at: 1, phase: 'complete' },
  'sabellas-hut': { at: 1, phase: 'complete' }
};
SABELLA_MESSAGES_SEEN['sabellas-hut'] = 1;
assert(getNextPathLocation(postHut, JOURNEY_PATH, {}) === 'monastery-wind',
  'post-hut golden next is monastery-wind');
assert(isClickablePT('monastery-wind', postHut, JOURNEY_PATH, {}, null),
  'post-hut monastery-wind is glow-clickable');
assert(!isClickablePT('mish', postHut, JOURNEY_PATH, {}, null),
  'post-hut mish is not journey-glow clickable');
assert(!isClickablePT('indras-na', postHut, JOURNEY_PATH, {}, null),
  'post-hut indras-na not clickable');
// Maxim Stone: near Sabella fog but off journey — no amber until tower peeks cluster
assert(!isClickablePT('maxim-stone', postHut, JOURNEY_PATH, {}, null, {}),
  'post-hut maxim-stone not clickable without cluster peek (glow sync)');
var postTower = Object.assign({}, postHut, {
  mish: { at: 1, phase: 'mist' },
  'monastery-wind': { at: 1, phase: 'complete' },
  'tower-nine': { at: 1, phase: 'complete' }
});
assert(!isClickablePT('maxim-stone', postTower, JOURNEY_PATH, {}, null, {}),
  'post-tower maxim-stone still dark without clusterPeek');
assert(isClickablePT('maxim-stone', postTower, JOURNEY_PATH, {}, null, { 'maxim-stone': true }),
  'post-tower maxim-stone glow-clickable after cluster peek');

// After tower-nine with <10 territories: Sinn sealed, at least one territory glows
clearSabellaLetters();
var preSinn = makeJourneyCompleteThrough('sinn');
SABELLA_LETTER_PREREQ_IDS.forEach(function(id) {
  if (preSinn[id] || id === 'sinn') return;
  if (isFullyDiscovered(id, preSinn, JOURNEY_PATH)) SABELLA_MESSAGES_SEEN[id] = 1;
});
assert(isSinnTerritoryGated(preSinn, JOURNEY_PATH),
  'after tower-nine with 0 territories, Sinn is gated');
assert(getNextPathLocation(preSinn, JOURNEY_PATH, {}) === null,
  'Sinn gate: no golden next until 10 lands');
assert(!isClickablePT('sinn', preSinn, JOURNEY_PATH, {}, null),
  'gated Sinn is not clickable');
var preSinnClicks = listClickablesPT(preSinn, JOURNEY_PATH, {}, null);
var preSinnTerrGlow = preSinnClicks.some(function(id) {
  var loc = LOCATIONS.find(function(l) { return l.id === id; });
  return loc && isTerritoryLoc(loc);
});
assert(preSinnTerrGlow,
  'when Sinn gated, at least one territory/water beacon is glow-clickable (no dead end)');

console.log('\n=== ' + passes + ' passed, ' + failures.length + ' failed ===');
process.exit(failures.length > 0 ? 1 : 0);
