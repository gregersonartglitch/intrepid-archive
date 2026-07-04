/**
 * tower-storm.js — Tower of the Nine storm effect (self-contained module).
 *
 * Discrete, portable chunk: fog.js calls TowerStorm.draw(opts) once per frame
 * from its draw loop, after fog passes and before beacons. Delete the script
 * tag (or set TowerStorm.enabled = false) and the map behaves as if the
 * effect never existed. No other integration points.
 *
 * INTEGRATION (2 lines):
 *   index.html:  <script src="tower-storm.js?v=N"></script>   (before fog.js)
 *   fog.js:      if (window.TowerStorm) TowerStorm.draw({ ctx: ctx, map: map,
 *                  w: w, h: h, time: time, discovered: discovered,
 *                  fogTexture: fogTexture, textureReady: textureReady });
 *
 * Behavior:
 *  - Hidden until the tower "emerges" (within 400 units of any discovery —
 *    same proximity rule the beacons use). Quiet storm pre-discovery,
 *    full storm + lightning once tower-nine is discovered.
 *  - Viewport-culled: near-zero cost when the tower is off-screen.
 *  - Cold blue-grey only, never gold/orange/yellow — cannot read as a beacon
 *    (invariant: no glow = not clickable).
 *  - Particle system: 24 sprites in 3 layers (haze / storm bands / tendrils),
 *    4 sprite variants cut from the map's own fog texture, noise-driven
 *    drift, no group rotation. Fully parametric in `time` — no per-frame
 *    state, safe across pauses and Leaflet redraws.
 *
 * ES5 only. No dependencies beyond the fog texture passed in.
 */
(function () {
  'use strict';

  // Tower anchor in map coords (tuned to the artwork; anchor is near the
  // tower base — the storm centers ~19 units above it, on the peak)
  var TOWER_ANCHOR = [4480, 4091];
  var TOWER_ID = 'tower-nine';
  var EMERGE_RADIUS = 400;   // map units — matches beacon proximity rule
  var TOWER_LATLNG = { lat: 4568, lng: 4097 }; // data.js marker, for emerge check

  var sprites = null;        // cached sprite variants
  var emergedCache = null;   // { key: discoveredCount, value: bool }

  function rnd(i, k) {
    var v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  function buildSprites(fogTexture) {
    var makeSprite = function (sw, sh, srcX, srcY, lobes) {
      var cv = document.createElement('canvas');
      cv.width = sw; cv.height = sh;
      var c = cv.getContext('2d');
      c.drawImage(fogTexture, srcX, srcY, sw * 2, sh * 2, 0, 0, sw, sh);
      var mk = document.createElement('canvas');
      mk.width = sw; mk.height = sh;
      var m = mk.getContext('2d');
      for (var li = 0; li < lobes.length; li++) {
        var lb = lobes[li];
        var g = m.createRadialGradient(lb.x, lb.y, lb.r * 0.12, lb.x, lb.y, lb.r);
        g.addColorStop(0, 'rgba(0,0,0,0.9)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.fillRect(0, 0, sw, sh);
      }
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(mk, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(95, 108, 140, 0.55)';
      c.fillRect(0, 0, sw, sh);
      return cv;
    };
    var s = [];
    // v0/v1: soft lumpy round puffs from different texture regions
    s.push(makeSprite(96, 96, 32, 32,
      [{ x: 48, y: 48, r: 44 }, { x: 34, y: 40, r: 26 }, { x: 62, y: 58, r: 24 }]));
    s.push(makeSprite(96, 96, 224, 160,
      [{ x: 48, y: 44, r: 42 }, { x: 60, y: 56, r: 26 }, { x: 32, y: 56, r: 20 }]));
    // v2: lumpy stretched strip
    s.push(makeSprite(192, 72, 0, 96,
      [{ x: 140, y: 36, r: 32 }, { x: 104, y: 28, r: 26 }, { x: 72, y: 40, r: 22 },
       { x: 44, y: 32, r: 16 }, { x: 22, y: 38, r: 10 }]));
    // v3: thin long tendril
    s.push(makeSprite(224, 40, 96, 208,
      [{ x: 180, y: 20, r: 18 }, { x: 140, y: 16, r: 15 }, { x: 100, y: 24, r: 13 },
       { x: 62, y: 18, r: 10 }, { x: 28, y: 22, r: 7 }]));
    return s;
  }

  // layer defs: count, scale lo-hi (×R), alpha lo-hi, drift speed ×, sprite ids
  var LAYERS = [
    { n: 4,  sLo: 1.8, sHi: 2.6, aLo: 0.06, aHi: 0.13, spd: 0.35, sprites: [0, 1] },     // background haze
    { n: 14, sLo: 0.7, sHi: 1.3, aLo: 0.15, aHi: 0.33, spd: 1.0,  sprites: [0, 1, 2] },  // mid storm bands
    { n: 6,  sLo: 1.1, sHi: 1.7, aLo: 0.10, aHi: 0.22, spd: 1.6,  sprites: [3] }         // foreground tendrils
  ];

  function isEmerged(discovered) {
    if (discovered[TOWER_ID]) return true;
    var keys = Object.keys(discovered);
    // cheap cache: discovery set only grows; re-check only when it changes
    if (emergedCache && emergedCache.key === keys.length) return emergedCache.value;
    var locs = window.LOCATIONS || [];
    var emerged = keys.some(function (dId) {
      var dLoc = null;
      for (var i = 0; i < locs.length; i++) { if (locs[i].id === dId) { dLoc = locs[i]; break; } }
      if (!dLoc) return false;
      var dx = TOWER_LATLNG.lat - dLoc.lat, dy = TOWER_LATLNG.lng - dLoc.lng;
      return Math.sqrt(dx * dx + dy * dy) < EMERGE_RADIUS;
    });
    emergedCache = { key: keys.length, value: emerged };
    return emerged;
  }

  function draw(opts) {
    if (!TowerStorm.enabled) return;
    var ctx = opts.ctx, map = opts.map, w = opts.w, h = opts.h, time = opts.time;
    var discovered = opts.discovered || {};
    if (!ctx || !map) return;

    var towerDiscovered = !!discovered[TOWER_ID];
    if (!towerDiscovered && !isEmerged(discovered)) return;

    // Viewport cull — near-zero cost when the tower is off-screen
    var zoomScale = Math.pow(2, map.getZoom() - map.getMinZoom());
    var towerPt = map.latLngToContainerPoint(TOWER_ANCHOR);
    var cullR = 80 * zoomScale;
    if (towerPt.x < -cullR || towerPt.x > w + cullR ||
        towerPt.y < -cullR || towerPt.y > h + cullR) return;

    if (!sprites && opts.textureReady && opts.fogTexture) sprites = buildSprites(opts.fogTexture);

    var stormDim = towerDiscovered ? 1 : 0.6;
    var tx = towerPt.x;
    var stormRadius = 16 * zoomScale;
    var stormCenterY = towerPt.y - 19 * zoomScale; // storm sits on the tower top

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // ── Graded mist veil: base ~100% clear, peak keeps ~30% mist ──
    var veilGrad = ctx.createRadialGradient(tx, stormCenterY, 0, tx, stormCenterY, stormRadius * 2.2);
    veilGrad.addColorStop(0,    'rgba(20, 24, 32, ' + (0.30 * stormDim) + ')');
    veilGrad.addColorStop(0.55, 'rgba(20, 24, 32, ' + (0.18 * stormDim) + ')');
    veilGrad.addColorStop(1,    'rgba(20, 24, 32, 0)');
    ctx.fillStyle = veilGrad;
    ctx.beginPath();
    ctx.ellipse(tx, stormCenterY, stormRadius * 2.2, stormRadius * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Particles: 3 layers, noise-driven drift, no group rotation ──
    if (sprites) {
      var pid = 0;
      for (var Li = 0; Li < LAYERS.length; Li++) {
        var L = LAYERS[Li];
        for (var pi = 0; pi < L.n; pi++, pid++) {
          var homeAng = rnd(pid, 1) * Math.PI * 2;
          var homeR = stormRadius * Math.sqrt(rnd(pid, 2)) * 1.1;
          var creep = (0.04 + 0.05 * rnd(pid, 3)) * L.spd;   // weak collective swirl
          var ang = homeAng + time * creep;
          var nAmp = stormRadius * (0.25 + 0.15 * rnd(pid, 4)) * L.spd;
          var nx = nAmp * (Math.sin(time * (0.11 + 0.13 * rnd(pid, 5)) + rnd(pid, 6) * 6.28)
                 + 0.5 * Math.sin(time * (0.31 + 0.17 * rnd(pid, 7)) + rnd(pid, 8) * 6.28));
          var ny = nAmp * 0.6 * (Math.sin(time * (0.09 + 0.15 * rnd(pid, 9)) + rnd(pid, 10) * 6.28)
                 + 0.5 * Math.sin(time * (0.27 + 0.19 * rnd(pid, 11)) + rnd(pid, 12) * 6.28));
          var px = tx + Math.cos(ang) * homeR + nx;
          var py = stormCenterY + Math.sin(ang) * homeR * 0.5 + ny;
          var rot = rnd(pid, 13) * 6.28 + time * (rnd(pid, 14) - 0.5) * 0.1;
          var fade = 0.5 + 0.5 * Math.sin(time * (0.2 + 0.2 * rnd(pid, 15)) + rnd(pid, 16) * 6.28);
          var alpha = (L.aLo + (L.aHi - L.aLo) * fade) * stormDim;
          if (alpha < 0.02) continue;

          var sp = sprites[L.sprites[pid % L.sprites.length]];
          var scl = stormRadius * (L.sLo + (L.sHi - L.sLo) * rnd(pid, 17));
          var sh2 = scl * (sp.height / sp.width);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(px, py);
          ctx.rotate(rot);
          if (pid % 2) ctx.scale(1, -1);
          ctx.drawImage(sp, -scl / 2, -sh2 / 2, scl, sh2);
          ctx.restore();
        }
      }
    }

    // ── Occasional lightning — only once the tower is discovered ──
    if (towerDiscovered) {
      var lightningCycle = Math.floor(time * 0.4);
      var lightningPhase = (time * 0.4) % 1;
      var lightningActive = lightningPhase < 0.04;                        // ~100ms flash
      var lightningActive2 = lightningPhase > 0.08 && lightningPhase < 0.11; // double strike

      if (lightningActive || lightningActive2) {
        var boltSeed = lightningCycle * 7 + 3;
        var bx = tx + ((boltSeed * 13 % 60) - 30) * zoomScale * 0.5;
        var by = stormCenterY - stormRadius * 0.3;
        var bright = lightningActive ? 1 : 0.5;

        // Build the trunk path once (deterministic from boltSeed, so the
        // bolt keeps its exact shape for every frame of one flash)
        var segments = 5 + (boltSeed % 3);
        var boltLen = stormRadius * 0.75;
        var pts = [{ x: bx, y: by }];
        for (var si = 1; si <= segments; si++) {
          pts.push({
            x: bx + (rnd(boltSeed, si) - 0.5) * 22 * zoomScale * 0.35
                 + (rnd(boltSeed, si + 40) - 0.5) * 6 * zoomScale * 0.35,
            y: by + (boltLen / segments) * si
          });
        }

        // Stroke helper: polyline from index i0..i1 with given width/alpha
        var strokePath = function (path, width, alpha, blur) {
          ctx.strokeStyle = 'rgba(205, 215, 255, ' + (alpha * bright) + ')';
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(180, 200, 255, ' + (0.9 * bright) + ')';
          ctx.shadowBlur = blur;
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (var k = 1; k < path.length; k++) ctx.lineTo(path[k].x, path[k].y);
          ctx.stroke();
        };

        // Trunk: tapered — draw per-segment with shrinking width, in two
        // passes (wide dim glow under a thin bright core)
        var wTop = 3.2, wTip = 0.8;
        for (var ti = 0; ti < pts.length - 1; ti++) {
          var frac = ti / (pts.length - 1);
          var wSeg = wTop + (wTip - wTop) * frac;
          var segPath = [pts[ti], pts[ti + 1]];
          strokePath(segPath, wSeg * 2.4, 0.16, 14);   // outer glow
          strokePath(segPath, wSeg, 0.75, 6);          // bright core
        }

        // Branch tendrils: 2-3 thin forks off mid-trunk joints, angled out,
        // each a short 2-3 segment zigzag at ~40% trunk width
        var numBranches = 2 + (boltSeed % 2);
        for (var bi2 = 0; bi2 < numBranches; bi2++) {
          var joint = 1 + Math.floor(rnd(boltSeed, 60 + bi2) * (pts.length - 3));
          var side = rnd(boltSeed, 70 + bi2) > 0.5 ? 1 : -1;
          var bAng = Math.PI / 2 + side * (0.5 + 0.5 * rnd(boltSeed, 80 + bi2)); // down + out
          var bLen = boltLen * (0.2 + 0.2 * rnd(boltSeed, 90 + bi2));
          var bSegs = 2 + (boltSeed + bi2) % 2;
          var bp = [{ x: pts[joint].x, y: pts[joint].y }];
          for (var bs = 1; bs <= bSegs; bs++) {
            bp.push({
              x: bp[0].x + Math.cos(bAng) * (bLen / bSegs) * bs
                   + (rnd(boltSeed, 100 + bi2 * 10 + bs) - 0.5) * 5 * zoomScale * 0.3,
              y: bp[0].y + Math.sin(bAng) * (bLen / bSegs) * bs
            });
          }
          var jf = joint / (pts.length - 1);
          var bW = (wTop + (wTip - wTop) * jf) * 0.4;   // 40% of trunk width there
          strokePath(bp, bW * 2.2, 0.10, 8);            // faint glow
          strokePath(bp, bW, 0.5, 4);                   // core
        }
        ctx.shadowBlur = 0;

        if (lightningActive) {
          var flashGrad = ctx.createRadialGradient(tx, stormCenterY, 0, tx, stormCenterY, stormRadius * 1.5);
          flashGrad.addColorStop(0, 'rgba(180, 200, 255, 0.08)');
          flashGrad.addColorStop(1, 'rgba(180, 200, 255, 0)');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(tx, stormCenterY, stormRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  var TowerStorm = {
    enabled: true,
    draw: draw
  };
  window.TowerStorm = TowerStorm;
})();
