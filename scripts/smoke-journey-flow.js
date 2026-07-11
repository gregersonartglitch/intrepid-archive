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

// ── Mirror fog.js vol2 / journey helpers (build 154) ─────────
var FINAL_ELENA_STOP = 'indras-na';
var VOL2_GUARDIAN_TRIGGER = 'Mish';
var VOL2_JOURNEY_CAP_ID = 'sinn';
var VOL2_GATE_TOAST_LS = 'intrepid_vol2_gate_toast_shown';
var ENABLE_VOL2_JOURNEY_GATE = true;
var ENABLE_SABELLA_MESSAGES = true;
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
    return 'Indras Na stays sealed until Sabella\u2019s remaining letters along Elena\u2019s road are found. ' +
      found + ' of ' + need + ' letters found along Elena\u2019s road.';
  }

  return null;
}

function getNextPathLocation(discovered, journeyPath, revealedGods) {
  for (var i = 0; i < journeyPath.length; i++) {
    var stepId = journeyPath[i].locationId;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) {
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

// Mirror finale reward gate: no toast while letter open / unseen Indras letter owed
function maybeShowVol2GateToast(revealedGods, discovered, journeyPath, ls, opts) {
  opts = opts || {};
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (!isFullyDiscovered(FINAL_ELENA_STOP, discovered, journeyPath)) return false;
  if (opts.letterPopupOpen || opts.sabellaMessagePending) return false;
  if (isSabellaMessagesEnabled() && hasUnseenSabellaMessage(FINAL_ELENA_STOP)) return false;
  if (ls[VOL2_GATE_TOAST_LS] === '1') return false;
  ls[VOL2_GATE_TOAST_LS] = '1';
  return true;
}

function simulateCompleteDiscovery(locId, discovered, journeyPath, revealedGods, ls, opts) {
  discovered[locId] = { at: Date.now(), phase: 'complete' };
  var fired = false;
  if (locId === FINAL_ELENA_STOP) {
    // Letter-first: if Indras letter unseen / open, toast waits (attach dismiss → toast)
    if (isSabellaMessagesEnabled() &&
        (hasUnseenSabellaMessage(FINAL_ELENA_STOP) || (opts && (opts.letterPopupOpen || opts.sabellaMessagePending)))) {
      fired = false;
    } else {
      fired = maybeShowVol2GateToast(revealedGods, discovered, journeyPath, ls, opts);
    }
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
assert(nextAfterSabella === 'mish', 'getNextPathLocation after Sabella is mish (not null)');

console.log('\n[2] Journey 6/8 + 8 territories — clock caps at Rapha (3pm), not Mish');
var sixEight = makeJourneyCompleteThrough('tower-nine');
sixEight['tower-nine'] = { at: Date.now(), phase: 'complete' };
padTerritories(sixEight, 8);
var validAt8 = getValidRevealedGodsForCount(8, MEDALLION_UNLOCKS, sixEight, JOURNEY_PATH);
assert(journeyCompleteCount(sixEight, JOURNEY_PATH) === 6, 'journey progress is 6/8');
assert(validAt8.Utu && validAt8['Sham & Mash'] && validAt8.Elil && validAt8.Rapha,
  'at 8 territories clock chain reaches Rapha (4th guardian)');
assert(!validAt8.Ningal, 'Ningal (4pm) not lit at 8 territories');
assert(!validAt8.An, 'An (5pm) not lit at 8 territories');
assert(!validAt8.Mish, 'Mish (6pm) not lit without Indras Na');
var revealedMid = { Utu: true, 'Sham & Mash': true, Elil: true, Rapha: true };
assert(!isMishGuardianRevealed(revealedMid, sixEight, JOURNEY_PATH), 'Mish guardian not awakened at 6/8 + Rapha only');
assert(!isVol2JourneyGateBlocking(revealedMid, sixEight, JOURNEY_PATH), 'Vol2 gate not blocking before Mish guardian');
var lsMid = {};
assert(!maybeShowVol2GateToast(revealedMid, sixEight, JOURNEY_PATH, lsMid), 'Vol2 reward toast not eligible before Indras Na complete');
assert(!lsMid[VOL2_GATE_TOAST_LS], 'Vol2 reward LS flag not set before Indras Na complete');

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
assert(letterReason.indexOf('letters found along Elena') > -1,
  'locked reason names Sabella letters along Elena\u2019s road');
assert(!isJourneyPathClickable(FINAL_ELENA_STOP, lockedLetters, JOURNEY_PATH, {}),
  '4 letters missing → indras-na locked');
collectSabellaPrereqLetters();
var unlockedSnap = makeJourneyCompleteThrough('sinn');
unlockedSnap['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(unlockedSnap);
assert(getIndrasNaLockedReason(unlockedSnap, JOURNEY_PATH) === null,
  'locked reason null when Indras Na is unlockable');
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

console.log('\n[2f] User snapshot — 7/8 journey, 17/17 territories, 13/13 sites + 4 letters → indras-na clickable');
collectSabellaPrereqLetters();
var userSnap = makeJourneyCompleteThrough('sinn');
userSnap['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(userSnap);
assert(journeyCompleteCount(userSnap, JOURNEY_PATH) === 7, 'journey progress is 7/8');
assert(getTerritoryDiscoveryCount(userSnap) === 17, 'all 17 territories charted');
assert(explorationComplete(userSnap), 'exploration complete for finale unlock');
assert(getNextPathLocation(userSnap, JOURNEY_PATH, {}) === FINAL_ELENA_STOP,
  'golden glow targets indras-na at 7/8 with full map');
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
SABELLA_MESSAGES_SEEN[FINAL_ELENA_STOP] = Date.now(); // letter already read
var finaleReady = makeJourneyCompleteThrough('sinn');
finaleReady['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(finaleReady);
var lsFinale = {};
var finaleComplete = simulateCompleteDiscovery(FINAL_ELENA_STOP, finaleReady, JOURNEY_PATH, {}, lsFinale);
assert(finaleComplete.toastFired, 'Vol1 reward toast fires on Indras Na completion');
assert(lsFinale[VOL2_GATE_TOAST_LS] === '1', 'reward toast LS flag set on Indras Na complete');

console.log('\n[4c] Finale letter pacing — congrats waits for letter Close');
clearSabellaLetters();
collectSabellaPrereqLetters();
delete SABELLA_MESSAGES_SEEN[FINAL_ELENA_STOP];
var paceReady = makeJourneyCompleteThrough('sinn');
paceReady['sinn'] = { at: Date.now(), phase: 'complete' };
padAllExploration(paceReady);
var lsPace = {};
var paceHot = simulateCompleteDiscovery(FINAL_ELENA_STOP, Object.assign({}, paceReady), JOURNEY_PATH, {}, lsPace, {
  letterPopupOpen: true
});
assert(!paceHot.toastFired, 'congrats does not fire while Indras letter still open');
assert(!lsPace[VOL2_GATE_TOAST_LS], 'reward LS not set while letter open');
var lsUnseen = {};
var paceUnseen = simulateCompleteDiscovery(FINAL_ELENA_STOP, Object.assign({}, paceReady), JOURNEY_PATH, {}, lsUnseen, {});
assert(!paceUnseen.toastFired, 'congrats does not fire while Indras letter still unseen');
assert(!lsUnseen[VOL2_GATE_TOAST_LS], 'reward LS not set while letter unseen');
SABELLA_MESSAGES_SEEN[FINAL_ELENA_STOP] = Date.now();
var lsAfter = {};
var paceAfter = simulateCompleteDiscovery(FINAL_ELENA_STOP, Object.assign({}, paceReady), JOURNEY_PATH, {}, lsAfter, {});
assert(paceAfter.toastFired, 'congrats fires after Indras letter dismissed / already seen');
assert(lsAfter[VOL2_GATE_TOAST_LS] === '1', 'reward LS set after letter resolved');

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

console.log('\n[4d] Mid-journey (5/8) never triggers reward toast');
var midJourney = makeJourneyCompleteThrough('monastery-wind');
midJourney['monastery-wind'] = { at: Date.now(), phase: 'complete' };
var lsMidJourney = {};
assert(!maybeShowVol2GateToast({}, midJourney, JOURNEY_PATH, lsMidJourney),
  'reward toast not eligible at 5/8 journey without Indras Na');

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
assert(/getIndrasNaLockedReason[\s\S]*?letters found along Elena/.test(fogSrc),
  'locked copy reports letter count along Elena\u2019s road');
assert(/getNextPathLocation[\s\S]*?sabellaPrereqLettersComplete/.test(fogSrc),
  'getNextPathLocation seals indras-na until road letters complete');
assert(fogSrc.indexOf('locked-msg-close') > -1 &&
  fogSrc.indexOf('function lockedMsgCloseHtml') > -1 &&
  fogSrc.indexOf('function wireLockedMsgDismiss') > -1,
  'locked modals share prominent Close button helper');
assert(fogSrc.indexOf('lockedMsgCloseHtml()') > -1 &&
  /showLockedMessage[\s\S]*?lockedMsgCloseHtml\(\)[\s\S]*?showVol2LockedMessage[\s\S]*?lockedMsgCloseHtml\(\)/.test(fogSrc),
  'Indras Na + Vol2 locked modals both use Close button');
assert(/requireManualDismiss[\s\S]*?FINAL_ELENA_STOP/.test(fogSrc) ||
  /locId === FINAL_ELENA_STOP[\s\S]*?lockedMsgCloseHtml/.test(fogSrc),
  'Indras Na letter uses manual Close (no auto-dismiss path)');
assert(/maybeShowVol2GateToast[\s\S]*?sabella-message-popup[\s\S]*?hasUnseenSabellaMessage\(FINAL_ELENA_STOP\)/.test(fogSrc),
  'congrats waits for Indras letter dismiss / already-seen');
assert(/scheduleSabellaMessage[\s\S]*?sabella-message-popup[\s\S]*?sabellaMessageOnDismiss/.test(fogSrc),
  'scheduleSabellaMessage attaches congrats callback while letter open');

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

console.log('\n=== ' + passes + ' passed, ' + failures.length + ' failed ===');
process.exit(failures.length > 0 ? 1 : 0);
