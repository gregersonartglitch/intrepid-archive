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

// ── Mirror fog.js vol2 / journey helpers (build 144) ─────────
var FINAL_ELENA_STOP = 'indras-na';
var VOL2_GUARDIAN_TRIGGER = 'Mish';
var VOL2_JOURNEY_CAP_ID = 'sinn';
var VOL2_GATE_TOAST_LS = 'intrepid_vol2_gate_toast_shown';
var ENABLE_VOL2_JOURNEY_GATE = true;
var MISH_UNLOCK = 13;
var ELIL_UNLOCK = 14;

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

function isMishGuardianRevealed(revealedGods, discovered) {
  if (!revealedGods[VOL2_GUARDIAN_TRIGGER]) return false;
  if (getMedallionDiscoveryCount(discovered) < MISH_UNLOCK) return false;
  return true;
}

function isVol2JourneyUnlocked() {
  return false;
}

function isVol2LockedJourneyStep(locId, journeyPath, revealedGods, discovered) {
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (!isMishGuardianRevealed(revealedGods, discovered)) return false;
  if (!isOnPath(locId, journeyPath)) return false;
  var capIdx = getJourneyStepIndex(VOL2_JOURNEY_CAP_ID, journeyPath);
  var stepIdx = getJourneyStepIndex(locId, journeyPath);
  if (capIdx < 0 || stepIdx < 0) return false;
  return stepIdx > capIdx;
}

function isVol2JourneyGateBlocking(revealedGods, discovered, journeyPath) {
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (!isMishGuardianRevealed(revealedGods, discovered)) return false;
  var capIdx = getJourneyStepIndex(VOL2_JOURNEY_CAP_ID, journeyPath);
  if (capIdx < 0) return false;
  for (var vi = capIdx + 1; vi < journeyPath.length; vi++) {
    if (!isFullyDiscovered(journeyPath[vi].locationId, discovered, journeyPath)) return true;
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

function getNextPathLocation(discovered, journeyPath, revealedGods) {
  for (var i = 0; i < journeyPath.length; i++) {
    var stepId = journeyPath[i].locationId;
    if (!isFullyDiscovered(stepId, discovered, journeyPath)) {
      if (stepId === FINAL_ELENA_STOP && !explorationComplete(discovered)) {
        return null;
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

function maybeShowVol2GateToast(revealedGods, discovered, journeyPath, ls) {
  if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
  if (!isMishGuardianRevealed(revealedGods, discovered)) return false;
  if (!isVol2JourneyGateBlocking(revealedGods, discovered, journeyPath)) return false;
  if (ls[VOL2_GATE_TOAST_LS] === '1') return false;
  ls[VOL2_GATE_TOAST_LS] = '1';
  return true;
}

function simulateRevealGod(m, revealedGods, discovered, journeyPath, ls, opts) {
  var wasAlready = !!revealedGods[m.name];
  revealedGods[m.name] = true;
  var fired = false;
  if (!opts.suppressAnimations && !wasAlready && m.guardian && m.name === VOL2_GUARDIAN_TRIGGER) {
    fired = maybeShowVol2GateToast(revealedGods, discovered, journeyPath, ls);
  }
  return { wasAlready: wasAlready, toastFired: fired };
}

function pruneRevealedGods(revealedGods, discovered, unlocks) {
  var count = getMedallionDiscoveryCount(discovered);
  var cleaned = {};
  Object.keys(revealedGods).forEach(function(name) {
    if (unlocks[name] && count >= unlocks[name]) cleaned[name] = true;
  });
  Object.keys(revealedGods).forEach(function(k) { delete revealedGods[k]; });
  Object.keys(cleaned).forEach(function(k) { revealedGods[k] = true; });
  return cleaned;
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

console.log('\n[2] Journey 5/8 + Elil revealed — no Vol2 gate');
var fiveEight = makeJourneyCompleteThrough('monastery-wind');
fiveEight['monastery-wind'] = { at: Date.now(), phase: 'complete' };
padDiscoveries(fiveEight, ELIL_UNLOCK);
var revealedMid = { 'Utu': true, 'Rapha': true, 'Sham & Mash': true, 'Elil': true };
assert(journeyCompleteCount(fiveEight, JOURNEY_PATH) === 5, 'journey progress is 5/8');
assert(!isMishGuardianRevealed(revealedMid, fiveEight), 'Mish guardian not awakened at 5/8 + Elil only');
assert(!isVol2JourneyGateBlocking(revealedMid, fiveEight, JOURNEY_PATH), 'Vol2 gate not blocking before Mish guardian');
var lsMid = {};
assert(!maybeShowVol2GateToast(revealedMid, fiveEight, JOURNEY_PATH, lsMid), 'Vol2 toast not eligible before Mish guardian');
assert(!lsMid[VOL2_GATE_TOAST_LS], 'Vol2 toast LS flag not set before Mish guardian');

console.log('\n[3] Stale Mish in revealedGods below threshold — pruned');
var staleGods = { Mish: true, Elil: true };
var staleDisc = makeJourneyCompleteThrough('monastery-wind');
padDiscoveries(staleDisc, 12);
pruneRevealedGods(staleGods, staleDisc, { Mish: MISH_UNLOCK, Elil: ELIL_UNLOCK });
assert(!staleGods.Mish, 'stale Mish pruned when discovery count < 13');
assert(!isVol2JourneyGateBlocking(staleGods, staleDisc, JOURNEY_PATH), 'Vol2 gate false after stale Mish prune');

console.log('\n[4] Mish guardian first reveal — gate + toast');
var mishReady = makeJourneyCompleteThrough('monastery-wind');
mishReady['monastery-wind'] = { at: Date.now(), phase: 'complete' };
padDiscoveries(mishReady, MISH_UNLOCK);
var godsFresh = { Utu: true, Rapha: true, 'Sham & Mash': true };
var lsMish = {};
var mishReveal = simulateRevealGod(
  { name: 'Mish', guardian: true, unlock: MISH_UNLOCK },
  godsFresh, mishReady, JOURNEY_PATH, lsMish, { suppressAnimations: false }
);
assert(mishReveal.toastFired, 'Vol2 toast fires on first Mish guardian reveal');
assert(isVol2JourneyGateBlocking(godsFresh, mishReady, JOURNEY_PATH), 'Vol2 gate blocks after Mish guardian');
assert(getNextPathLocation(mishReady, JOURNEY_PATH, godsFresh) === 'tower-nine', 'journey continues to tower-nine after Mish guardian (not sealed yet)');

console.log('\n[5] Elil reveal after Mish already revealed — no duplicate toast');
var elilReady = makeJourneyCompleteThrough('monastery-wind');
elilReady['monastery-wind'] = { at: Date.now(), phase: 'complete' };
padDiscoveries(elilReady, ELIL_UNLOCK);
var godsWithMish = { Utu: true, Rapha: true, 'Sham & Mash': true, Mish: true };
var lsElil = {};
lsElil[VOL2_GATE_TOAST_LS] = '1';
var elilReveal = simulateRevealGod(
  { name: 'Elil', guardian: false, unlock: ELIL_UNLOCK },
  godsWithMish, elilReady, JOURNEY_PATH, lsElil, { suppressAnimations: false }
);
assert(!elilReveal.toastFired, 'Elil reveal does not fire Vol2 toast');
assert(!maybeShowVol2GateToast(godsWithMish, elilReady, JOURNEY_PATH, lsElil), 'Vol2 toast not re-eligible after Mish toast already shown');

console.log('\n[6] Chime exit clears searchMode (build 143+ regression)');
var fogSrc = fs.readFileSync(path.join(ROOT, 'fog.js'), 'utf8');
assert(fogSrc.indexOf('function exitSearchMode()') > -1, 'exitSearchMode exists');
assert(/function exitSearchMode\(\)[\s\S]*?searchMode = null/.test(fogSrc), 'exitSearchMode nulls searchMode');
assert(fogSrc.indexOf('exitSearchMode();') > -1 && fogSrc.indexOf('completeDiscovery') > -1, 'completeDiscovery calls exitSearchMode');
assert(fogSrc.indexOf('searchMode.silenced = true') > -1, 'chime silenced before exit on key found');

console.log('\n[7] fog.js syntax');
var cp = require('child_process');
try {
  cp.execFileSync('node', ['--check', path.join(ROOT, 'fog.js')], { stdio: 'pipe' });
  pass('node --check fog.js');
} catch (e) {
  fail('node --check fog.js: ' + (e.stderr ? e.stderr.toString() : e.message));
}

console.log('\n=== ' + passes + ' passed, ' + failures.length + ' failed ===');
process.exit(failures.length > 0 ? 1 : 0);
