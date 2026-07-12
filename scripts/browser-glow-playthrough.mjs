#!/usr/bin/env node
/**
 * Browser glow-only playthrough against live FogSystem state.
 * Charts only when a mirrored isClickable (same rules as fog.js) would allow.
 * Letters: marked seen at letter-stop completion (chime Hot) — never fog lottery.
 *
 * Run: node scripts/browser-glow-playthrough.mjs
 * Requires: playwright in .tmp (npm i playwright && npx playwright install chromium)
 */
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 8093;
const TMP = join(ROOT, '.tmp');

const require = createRequire(join(TMP, 'package.json'));
let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.error('Playwright not found in .tmp');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.map': 'application/json'
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = join(ROOT, urlPath.replace(/^\//, ''));
      if (!filePath.startsWith(ROOT) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const server = await startStaticServer();
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('intrepid_cartographer_unlocked', 'granted');
    localStorage.setItem('intrepid_atlas_discovered_v', '20');
    localStorage.setItem('intrepid_atlas_discovered', '{}');
    localStorage.setItem('intrepid_sabella_messages_seen', '{}');
    sessionStorage.setItem('intrepid_archive_entered', '1');
  });

  // ?map skips archive hub and boots the atlas when cartographer LS is set
  await page.goto('http://127.0.0.1:' + PORT + '/?map', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForFunction(
    () => {
      if (!window.FogSystem || !window.LOCATIONS || !window.JOURNEY_PATH) return false;
      if (!window.JOURNEY_PATH.length || window.JOURNEY_PATH.length < 8) return false;
      if (!window.FogSystem.getNextLocation) return false;
      return window.FogSystem.getNextLocation() === 'crossing-pool';
    },
    { timeout: 90000 }
  );

  const result = await page.evaluate(() => {
    var Fog = window.FogSystem;
    var LOCATIONS = window.LOCATIONS;
    var JOURNEY_PATH = window.JOURNEY_PATH;
    var FINAL = 'indras-na';
    var SINN = 'sinn';
    var LETTERS = ['sabellas-hut', 'monastery-wind', 'tower-nine', 'sinn'];
    var TERRITORY_GLOW_RADIUS = 500;
    var TERRITORY_FRONTIER_RADIUS = 1800;
    var SITE_NEAR = 400;
    var LS_KEY = 'intrepid_atlas_discovered';
    var LETTER_LS = 'intrepid_sabella_messages_seen';

    var out = {
      ok: false,
      stuck: null,
      pathLog: [],
      build: window.INTREPID_BUILD,
      sealedSeen: false,
      moonStrongholdInData: LOCATIONS.some(function(l) { return l.id === 'moon-stronghold'; })
    };

    function disc() { return Fog.getDiscovered(); }

    function persist() {
      localStorage.setItem(LS_KEY, JSON.stringify(disc()));
      if (Fog.updateProgress) Fog.updateProgress();
    }

    function letterSeen() {
      try { return JSON.parse(localStorage.getItem(LETTER_LS) || '{}'); }
      catch (e) { return {}; }
    }

    function markLetter(id) {
      var s = letterSeen();
      s[id] = Date.now();
      localStorage.setItem(LETTER_LS, JSON.stringify(s));
    }

    function lettersComplete() {
      var s = letterSeen();
      return LETTERS.every(function(id) { return !!s[id]; });
    }

    function isTerritory(loc) {
      return loc && (loc.type === 'region' || loc.type === 'water');
    }

    function dist(a, b) {
      var dx = a.lat - b.lat, dy = a.lng - b.lng;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function isFully(id) {
      var d = disc()[id];
      if (!d) return false;
      if (d.phase === 'searching') return false;
      var onPath = JOURNEY_PATH.some(function(s) { return s.locationId === id; });
      if (onPath) return d.phase === 'complete' || (!d.phase && d.at);
      return d.phase === 'mist' || d.phase === 'complete' || !d.phase;
    }

    function territoryCount() {
      var n = 0;
      LOCATIONS.forEach(function(l) {
        if (l.type === 'region' && disc()[l.id]) n++;
      });
      return n;
    }

    function explorationComplete() {
      return LOCATIONS.every(function(l) {
        if (l.type === 'region' || l.cartographerSite) return !!disc()[l.id];
        return true;
      });
    }

    function getNext() {
      // Prefer live Fog helper when available
      if (Fog.getNextLocation) {
        var live = Fog.getNextLocation();
        // Live respects letters + sinn gate; OK to use
        return live;
      }
      return null;
    }

    function hasNearNonTerr(loc, radius) {
      var ok = false;
      var dmap = disc();
      Object.keys(dmap).forEach(function(dId) {
        if (ok) return;
        var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
        if (!dLoc || isTerritory(dLoc)) return;
        if (dist(loc, dLoc) < radius) ok = true;
      });
      return ok;
    }

    function hasNearTerr(loc, radius) {
      var ok = false;
      var dmap = disc();
      Object.keys(dmap).forEach(function(dId) {
        if (ok) return;
        var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
        if (!isTerritory(dLoc)) return;
        if (dist(loc, dLoc) < radius) ok = true;
      });
      return ok;
    }

    function fallbackTerritoryId() {
      var und = LOCATIONS.filter(function(l) { return isTerritory(l) && !disc()[l.id]; });
      if (!und.length) return null;
      if (und.some(function(loc) {
        return hasNearNonTerr(loc, TERRITORY_GLOW_RADIUS) || hasNearTerr(loc, TERRITORY_FRONTIER_RADIUS);
      })) return null;
      var best = null, bestD = Infinity;
      und.forEach(function(loc) {
        Object.keys(disc()).forEach(function(dId) {
          var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
          if (!dLoc || isTerritory(dLoc)) return;
          var d = dist(loc, dLoc);
          if (d < bestD) { bestD = d; best = loc; }
        });
      });
      return best ? best.id : null;
    }

    function territoryHasGlow(loc) {
      return hasNearNonTerr(loc, TERRITORY_GLOW_RADIUS) ||
        hasNearTerr(loc, TERRITORY_FRONTIER_RADIUS) ||
        loc.id === fallbackTerritoryId();
    }

    function nearCleared(loc) {
      var ok = false;
      Object.keys(disc()).forEach(function(dId) {
        if (ok) return;
        var dLoc = LOCATIONS.find(function(l) { return l.id === dId; });
        if (!dLoc) return;
        if (dist(loc, dLoc) < SITE_NEAR) ok = true;
      });
      return ok;
    }

    function nearestTerrDisc(loc) {
      var nearest = null, nd = Infinity;
      LOCATIONS.forEach(function(r) {
        if (!isTerritory(r)) return;
        var d = dist(loc, r);
        if (d < nd) { nd = d; nearest = r; }
      });
      return !!(nearest && disc()[nearest.id]);
    }

    function isClickable(locId, tutorialHintId) {
      if (isFully(locId)) return false;
      var loc = LOCATIONS.find(function(l) { return l.id === locId; });
      if (!loc) return false;
      var next = getNext();

      if (locId === SINN) {
        if (territoryCount() < 10) return false;
        return locId === next;
      }
      if (locId === FINAL) {
        if (!explorationComplete()) return false;
        if (!lettersComplete()) return false;
        return locId === next;
      }

      if (!disc()['sabellas-hut'] && tutorialHintId) {
        return locId === tutorialHintId;
      }

      if (loc.type === 'story') {
        return locId === next || nearCleared(loc);
      }
      if (JOURNEY_PATH.some(function(s) { return s.locationId === locId; })) {
        return locId === next;
      }
      if (isTerritory(loc)) return territoryHasGlow(loc);
      if (loc.cartographerSite) return nearCleared(loc) || nearestTerrDisc(loc);
      return false;
    }

    function listClickables(tutorialHintId) {
      return LOCATIONS.filter(function(l) {
        return isClickable(l.id, tutorialHintId);
      }).map(function(l) { return l.id; });
    }

    function chart(id, phase) {
      disc()[id] = { at: Date.now(), phase: phase };
      persist();
    }

    function priorPathComplete() {
      for (var i = 0; i < JOURNEY_PATH.length; i++) {
        var id = JOURNEY_PATH[i].locationId;
        if (id === FINAL) break;
        if (!isFully(id)) return false;
      }
      return true;
    }

    function isSealedFinale() {
      // Prefer live helper only after prior path is actually complete (avoids
      // false sealed when Fog init has not assigned journeyPath yet).
      if (!priorPathComplete()) return false;
      if (Fog.isIndrasNaSealed) return !!Fog.isIndrasNaSealed();
      return !explorationComplete() || !lettersComplete();
    }

    // Tutorial
    var tutorial = ['crossing-pool', 'dawn-spear', 'sabellas-hut'];
    for (var ti = 0; ti < tutorial.length; ti++) {
      var hint = tutorial[ti];
      var clicks = listClickables(hint);
      if (clicks.indexOf(hint) < 0) {
        out.stuck = 'tutorial: ' + hint + ' not glowing; visible=' + clicks.join(',') +
          '; liveNext=' + getNext();
        return out;
      }
      if (clicks.length !== 1 || clicks[0] !== hint) {
        out.stuck = 'tutorial gate leak at ' + hint + ': ' + clicks.join(',');
        return out;
      }
      chart(hint, 'complete');
      out.pathLog.push('T:' + hint);
      if (LETTERS.indexOf(hint) >= 0) {
        markLetter(hint);
        out.pathLog.push('L:' + hint);
      }
    }

    // Sanity after hut
    out.postHutNext = getNext();
    if (out.postHutNext !== 'mish') {
      out.stuck = 'post-hut live next should be mish, got ' + out.postHutNext;
      return out;
    }

    var step = 0;
    while (step < 250 && !isFully(FINAL)) {
      step++;
      var nextId = getNext();
      var clickables = listClickables(null);

      if (isSealedFinale()) {
        out.sealedSeen = true;
        if (isClickable(FINAL, null)) {
          out.stuck = 'sealed Indras was clickable';
          return out;
        }
        if (!lettersComplete()) {
          var recovered = false;
          for (var li = 0; li < LETTERS.length; li++) {
            if (!letterSeen()[LETTERS[li]] && isFully(LETTERS[li])) {
              markLetter(LETTERS[li]);
              out.pathLog.push('Lrec:' + LETTERS[li]);
              recovered = true;
              break;
            }
          }
          if (recovered) continue;
        }
      }

      if (!clickables.length) {
        out.stuck = 'soft-lock: no glows; next=' + nextId +
          ' terr=' + territoryCount() +
          ' sealed=' + isSealedFinale() +
          ' reason=' + ((Fog.getIndrasNaLockedReason && Fog.getIndrasNaLockedReason()) || '');
        return out;
      }

      var pick = null;
      if (nextId && clickables.indexOf(nextId) >= 0) pick = nextId;
      else {
        for (var ci = 0; ci < clickables.length; ci++) {
          var cLoc = LOCATIONS.find(function(l) { return l.id === clickables[ci]; });
          if (cLoc && cLoc.type === 'region') { pick = clickables[ci]; break; }
        }
        if (!pick) {
          for (ci = 0; ci < clickables.length; ci++) {
            cLoc = LOCATIONS.find(function(l) { return l.id === clickables[ci]; });
            if (cLoc && cLoc.cartographerSite) { pick = clickables[ci]; break; }
          }
        }
        if (!pick) pick = clickables[0];
      }

      if (!isClickable(pick, null)) {
        out.stuck = 'picked non-glow ' + pick;
        return out;
      }

      var pickLoc = LOCATIONS.find(function(l) { return l.id === pick; });
      var onPath = JOURNEY_PATH.some(function(s) { return s.locationId === pick; });
      var phase = (onPath || (pickLoc && pickLoc.type === 'story')) ? 'complete' : 'mist';
      chart(pick, phase);
      out.pathLog.push((onPath ? 'J:' : (pickLoc && pickLoc.cartographerSite ? 'S:' : 'R:')) + pick);

      if (phase === 'complete' && LETTERS.indexOf(pick) >= 0) {
        markLetter(pick);
        out.pathLog.push('L:' + pick);
      }
    }

    out.ok = isFully(FINAL);
    out.territories = territoryCount();
    out.letters = LETTERS.filter(function(id) { return !!letterSeen()[id]; }).length;
    out.journey = JOURNEY_PATH.filter(function(s) { return isFully(s.locationId); }).length;
    out.liveNext = getNext();
    out.liveSealed = isSealedFinale();
    out.liveReason = Fog.getIndrasNaLockedReason && Fog.getIndrasNaLockedReason();
    if (!out.ok) {
      out.stuck = out.stuck || 'Indras not complete';
    }
    return out;
  });

  console.log(JSON.stringify({
    ok: result.ok,
    build: result.build,
    stuck: result.stuck,
    sealedSeen: result.sealedSeen,
    moonStrongholdInData: result.moonStrongholdInData,
    journey: result.journey,
    territories: result.territories,
    letters: result.letters,
    pathLen: result.pathLog && result.pathLog.length,
    pathHead: result.pathLog && result.pathLog.slice(0, 12),
    pathTail: result.pathLog && result.pathLog.slice(-12)
  }, null, 2));

  await browser.close();
  server.close();
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
