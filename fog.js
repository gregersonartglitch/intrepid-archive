/* ═══════════════════════════════════════════════════════════════
   FOG SYSTEM — The Hollowlands Atlas
   Clean implementation: textured fog, simple radial clearing,
   3-step guided tutorial, document-level click handling.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var LS_KEY = 'intrepid_atlas_discovered';
  var CLICK_RADIUS = 80;   // how close (px) user must click to the glow
  var TUTORIAL_STEPS = 3;  // guided hand-holding for first 3 discoveries

  // State
  var discovered = {};
  var markerRefs = {};
  var fogCanvas = null;
  var fogCtx = null;
  var map = null;
  var cfg = null;
  var animatingReveal = null;
  var revealProgress = 0;
  var journeyPath = [];
  var fogTexture = null;
  var textureReady = false;
  var tutorialStep = 0;
  var tutorialHintLoc = null;
  var tutorialHint = null;

  /* ════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════ */
  function init(leafletMap, mapConfig) {
    map = leafletMap;
    cfg = mapConfig;
    journeyPath = window.JOURNEY_PATH || [];

    // Auto-clear stale localStorage when fog system version changes
    var FOG_VERSION = 13;
    var storedVersion = parseInt(localStorage.getItem(LS_KEY + '_v') || '0');
    if (storedVersion !== FOG_VERSION) {
      localStorage.removeItem(LS_KEY);
      localStorage.setItem(LS_KEY + '_v', FOG_VERSION);
      console.log('[FOG] Cleared old state (v' + storedVersion + ' → v' + FOG_VERSION + ')');
    }

    // Load saved state
    try { discovered = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch(e) { discovered = {}; }

    // Load fog texture
    fogTexture = new Image();
    fogTexture.onload = function() { textureReady = true; draw(); };
    fogTexture.src = 'fog_texture.png';

    // Create fog canvas (pointer-events: none — never blocks anything)
    fogCanvas = document.createElement('canvas');
    fogCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:450;pointer-events:none;';
    map.getContainer().appendChild(fogCanvas);
    fogCtx = fogCanvas.getContext('2d');

    // Setup click handling on document (capture phase — unfailable)
    setupClickHandler();

    // Redraw on map events
    map.on('move zoom viewreset resize zoomend', draw);
    window.addEventListener('resize', draw);
    draw();

    // UI
    updateProgress();
    addResetButton();

    // Tutorial
    tutorialStep = Object.keys(discovered).length;
    if (tutorialStep < TUTORIAL_STEPS) {
      startTutorial();
    }
  }

  /* ════════════════════════════════════════════════
     CLICK HANDLER — document capture phase
     Fires before ALL other click handlers on the page.
     ════════════════════════════════════════════════ */
  function setupClickHandler() {
    var mouseDownX = 0, mouseDownY = 0;

    document.addEventListener('mousedown', function(e) {
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
    }, true);

    document.addEventListener('click', function(e) {
      if (window.EDIT_MODE) return;
      if (!map) return;

      // Only clicks inside the map
      var container = map.getContainer();
      if (!container.contains(e.target)) return;

      // Skip UI elements
      if (e.target.closest('#layers, #discovery-card, #progress-container, .leaflet-control-zoom, #fog-reset-btn')) return;

      // Skip drags
      var dx = e.clientX - mouseDownX;
      var dy = e.clientY - mouseDownY;
      if (Math.sqrt(dx * dx + dy * dy) > 8) return;

      // Close card if open
      var card = document.getElementById('discovery-card');
      if (card && card.classList.contains('visible')) {
        card.classList.remove('visible');
        return;
      }

      // Where did user click (container-relative)?
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      // Check proximity to the next clickable location
      var locs = window.LOCATIONS || [];
      var closest = null;
      var closestDist = Infinity;

      locs.forEach(function(loc) {
        if (!isClickable(loc.id)) return;
        var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
        var d = Math.sqrt(Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2));
        if (d < CLICK_RADIUS && d < closestDist) {
          closest = loc;
          closestDist = d;
        }
      });

      if (closest) {
        console.log('[FOG] ✓ Discovering:', closest.id);
        e.stopPropagation();
        e.preventDefault();
        discoverLocation(closest);
      } else {
        // Debug: log why it missed
        var nextId = getNextPathLocation();
        if (nextId) {
          var nl = locs.find(function(l) { return l.id === nextId; });
          if (nl) {
            var npt = map.latLngToContainerPoint([nl.lat, nl.lng]);
            console.log('[FOG] ✗ Missed. Target:', nextId,
              'at (' + npt.x.toFixed(0) + ',' + npt.y.toFixed(0) + ')',
              'click (' + x.toFixed(0) + ',' + y.toFixed(0) + ')',
              'dist:', Math.sqrt(Math.pow(x-npt.x,2)+Math.pow(y-npt.y,2)).toFixed(0) + 'px',
              '(need <' + CLICK_RADIUS + ')');
          }
        }
      }
    }, true); // CAPTURE PHASE

    // Touch support
    var touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', function(e) {
      if (e.touches[0]) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
    }, true);

    document.addEventListener('touchend', function(e) {
      if (window.EDIT_MODE || !map) return;
      var container = map.getContainer();
      if (!container.contains(e.target)) return;
      if (e.target.closest('#layers, #discovery-card, #progress-container, .leaflet-control-zoom, #fog-reset-btn')) return;

      var touch = e.changedTouches[0];
      if (!touch) return;
      if (Math.sqrt(Math.pow(touch.clientX-touchStartX,2)+Math.pow(touch.clientY-touchStartY,2)) > 15) return;

      var card = document.getElementById('discovery-card');
      if (card && card.classList.contains('visible')) { card.classList.remove('visible'); return; }

      var rect = container.getBoundingClientRect();
      var x = touch.clientX - rect.left;
      var y = touch.clientY - rect.top;
      var locs = window.LOCATIONS || [];
      var closest = null, closestDist = Infinity;
      locs.forEach(function(loc) {
        if (!isClickable(loc.id)) return;
        var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
        var d = Math.sqrt(Math.pow(x-pt.x,2)+Math.pow(y-pt.y,2));
        if (d < CLICK_RADIUS && d < closestDist) { closest = loc; closestDist = d; }
      });
      if (closest) { e.preventDefault(); discoverLocation(closest); }
    }, true);
  }

  /* ════════════════════════════════════════════════
     TUTORIAL — 3-step guided flow
     ════════════════════════════════════════════════ */
  var tutorialMessages = [
    'Touch the light',
    'Follow the path',
    'One more'
  ];

  function startTutorial() {
    var nextId = getNextPathLocation();
    if (!nextId) return;
    var locs = window.LOCATIONS || [];
    var loc = locs.find(function(l) { return l.id === nextId; });
    if (!loc) return;

    setTimeout(function() {
      map.flyTo([loc.lat, loc.lng], map.getMinZoom() + 3, { duration: 2 });
      setTimeout(function() { showTutorialHint(loc); }, 2500);
    }, 1500);
  }

  function showTutorialHint(loc) {
    removeTutorialHint();
    tutorialHintLoc = loc;
    // The canvas draw() function reads tutorialHintLoc and draws the hint
    console.log('[FOG] Tutorial hint for:', loc.id, 'step:', tutorialStep);
  }

  function positionHint() {
    // No-op: canvas handles positioning in draw()
  }

  function removeTutorialHint() {
    tutorialHintLoc = null;
  }

  function advanceTutorial() {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_STEPS) {
      removeTutorialHint();
      return;
    }
    var nextId = getNextPathLocation();
    if (!nextId) { removeTutorialHint(); return; }
    var locs = window.LOCATIONS || [];
    var nextLoc = locs.find(function(l) { return l.id === nextId; });
    if (!nextLoc) { removeTutorialHint(); return; }

    // Wait for card to be seen, then fly to next
    setTimeout(function() {
      map.flyTo([nextLoc.lat, nextLoc.lng], map.getMinZoom() + 3, { duration: 1.5 });
      setTimeout(function() { showTutorialHint(nextLoc); }, 2000);
    }, 2500);
  }

  /* ════════════════════════════════════════════════
     PATH LOGIC
     ════════════════════════════════════════════════ */
  function getNextPathLocation() {
    for (var i = 0; i < journeyPath.length; i++) {
      if (!discovered[journeyPath[i].locationId]) {
        return journeyPath[i].locationId;
      }
    }
    return null;
  }

  function isOnPath(locId) {
    return journeyPath.some(function(s) { return s.locationId === locId; });
  }

  function isPathComplete() {
    return journeyPath.every(function(s) { return !!discovered[s.locationId]; });
  }

  function isClickable(locId) {
    if (discovered[locId]) return false;
    var next = getNextPathLocation();
    if (next) return locId === next;
    return true; // path done, everything clickable
  }

  /* ════════════════════════════════════════════════
     DRAW FOG
     ════════════════════════════════════════════════ */
  function draw() {
    if (!map || !fogCtx) return;

    var container = map.getContainer();
    var w = container.clientWidth;
    var h = container.clientHeight;
    fogCanvas.width = w;
    fogCanvas.height = h;

    var ctx = fogCtx;
    var zoom = map.getZoom();
    var time = Date.now() / 1000;

    // ── 1. Solid dark base (fully opaque) ──
    ctx.fillStyle = '#141820';
    ctx.fillRect(0, 0, w, h);

    // ── 2. Fog texture overlay ──
    if (textureReady && fogTexture) {
      // Layer 1 — primary drift
      ctx.save();
      ctx.globalAlpha = 0.55;
      var tSize = 512;
      var originPt = map.latLngToContainerPoint([0, 0]);
      var ox = (originPt.x + time * 8) % tSize;
      var oy = (originPt.y + time * 3) % tSize;
      for (var tx = -tSize + ox; tx < w + tSize; tx += tSize) {
        for (var ty = -tSize + oy; ty < h + tSize; ty += tSize) {
          ctx.drawImage(fogTexture, tx, ty, tSize, tSize);
        }
      }
      ctx.restore();

      // Layer 2 — slower counter-drift
      ctx.save();
      ctx.globalAlpha = 0.25;
      var tSize2 = 768;
      var ox2 = (originPt.x + time * -5) % tSize2;
      var oy2 = (originPt.y + time * 6) % tSize2;
      for (var tx2 = -tSize2 + ox2; tx2 < w + tSize2; tx2 += tSize2) {
        for (var ty2 = -tSize2 + oy2; ty2 < h + tSize2; ty2 += tSize2) {
          ctx.drawImage(fogTexture, tx2, ty2, tSize2, tSize2);
        }
      }
      ctx.restore();
    }

    // ── 3. Golden glow on next clickable location ──
    var nextId = getNextPathLocation();
    var locs = window.LOCATIONS || [];

    if (nextId) {
      var glowLoc = locs.find(function(l) { return l.id === nextId; });
      if (glowLoc) {
        var gpt = map.latLngToContainerPoint([glowLoc.lat, glowLoc.lng]);
        if (gpt.x > -100 && gpt.x < w + 100 && gpt.y > -100 && gpt.y < h + 100) {
          // Outer glow
          var pulse = 0.3 + Math.sin(time * 2) * 0.15;
          var outerR = 50 + Math.sin(time * 1.5) * 12;
          var glow = ctx.createRadialGradient(gpt.x, gpt.y, 0, gpt.x, gpt.y, outerR);
          glow.addColorStop(0, 'rgba(239, 231, 210, ' + (pulse + 0.25) + ')');
          glow.addColorStop(0.25, 'rgba(212, 168, 67, ' + (pulse + 0.1) + ')');
          glow.addColorStop(0.6, 'rgba(198, 141, 85, ' + pulse + ')');
          glow.addColorStop(1, 'rgba(198, 141, 85, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(gpt.x, gpt.y, outerR, 0, Math.PI * 2);
          ctx.fill();

          // Bright core
          var core = ctx.createRadialGradient(gpt.x, gpt.y, 0, gpt.x, gpt.y, 10);
          core.addColorStop(0, 'rgba(255, 248, 230, 0.9)');
          core.addColorStop(1, 'rgba(212, 168, 67, 0)');
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(gpt.x, gpt.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (isPathComplete()) {
      // After path is done, show faint glows on all remaining undiscovered
      locs.forEach(function(loc) {
        if (discovered[loc.id]) return;
        var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
        if (pt.x < -40 || pt.x > w + 40 || pt.y < -40 || pt.y > h + 40) return;
        var p = 0.08 + Math.sin(time * 1.5 + loc.lat * 0.01) * 0.04;
        var g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 15);
        g.addColorStop(0, 'rgba(198, 141, 85, ' + p + ')');
        g.addColorStop(1, 'rgba(198, 141, 85, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 15, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── 4. Clear holes for discovered locations ──
    // Simple radial gradient: fully clear center → soft translucent edge → fog
    ctx.globalCompositeOperation = 'destination-out';
    locs.forEach(function(loc) {
      if (!discovered[loc.id]) return;
      var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);

      // Base radius scaled by zoom
      var baseR = 180;
      var r = baseR * Math.pow(2, zoom);
      if (r < 30) r = 30;

      var alpha = 1;
      if (animatingReveal === loc.id) alpha = revealProgress;

      // One simple radial gradient: clear center → translucent → opaque edge
      var grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      grad.addColorStop(0,    'rgba(0,0,0,' + alpha + ')');       // fully clear
      grad.addColorStop(0.5,  'rgba(0,0,0,' + (alpha * 0.95) + ')');  // still clear
      grad.addColorStop(0.75, 'rgba(0,0,0,' + (alpha * 0.5) + ')');   // translucent
      grad.addColorStop(0.9,  'rgba(0,0,0,' + (alpha * 0.15) + ')');  // mostly fog
      grad.addColorStop(1,    'rgba(0,0,0,0)');                       // full fog
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // ── 5. Tutorial hint (drawn on canvas — guaranteed visible) ──
    if (tutorialHintLoc && tutorialStep < TUTORIAL_STEPS) {
      var hpt = map.latLngToContainerPoint([tutorialHintLoc.lat, tutorialHintLoc.lng]);
      var hx = hpt.x;
      var hy = hpt.y;
      var bob = Math.sin(time * 3) * 6; // bobbing animation

      // Arrow ▼
      ctx.save();
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d4a843';
      ctx.shadowColor = 'rgba(212, 168, 67, 0.9)';
      ctx.shadowBlur = 20;
      ctx.fillText('▼', hx, hy - 30 + bob);
      ctx.restore();

      // Text background pill
      var msg = tutorialMessages[Math.min(tutorialStep, tutorialMessages.length - 1)];
      ctx.save();
      ctx.font = '600 14px "Cinzel", "Cormorant Garamond", serif';
      var tw = ctx.measureText(msg.toUpperCase()).width + 32;
      var th = 32;
      var tx = hx - tw / 2;
      var ty = hy - 70 + bob;

      // Dark background
      ctx.fillStyle = 'rgba(10, 12, 16, 0.92)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 6);
      ctx.fill();

      // Golden border
      ctx.strokeStyle = 'rgba(198, 141, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 6);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#efe7d2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '2px';
      ctx.fillText(msg.toUpperCase(), hx, ty + th / 2);
      ctx.restore();
    }
  }

  /* ════════════════════════════════════════════════
     DISCOVER
     ════════════════════════════════════════════════ */
  function discoverLocation(loc) {
    discovered[loc.id] = { at: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(discovered));

    removeTutorialHint();
    revealMarker(loc.id);
    animateReveal(loc);
    showCelebration(loc);
    setTimeout(function() { showDiscoveryCard(loc); }, 600);
    updateProgress();

    if (tutorialStep < TUTORIAL_STEPS) {
      advanceTutorial();
    }
  }

  /* ════════════════════════════════════════════════
     REVEAL ANIMATION
     ════════════════════════════════════════════════ */
  function animateReveal(loc) {
    animatingReveal = loc.id;
    revealProgress = 0;
    var start = performance.now();
    var dur = 900;

    function frame(now) {
      revealProgress = Math.min(1, (now - start) / dur);
      revealProgress = 1 - Math.pow(1 - revealProgress, 3); // ease-out
      draw();
      if (revealProgress < 1) requestAnimationFrame(frame);
      else animatingReveal = null;
    }
    requestAnimationFrame(frame);
  }

  /* ════════════════════════════════════════════════
     MARKERS
     ════════════════════════════════════════════════ */
  function revealMarker(locId) {
    var refs = markerRefs[locId];
    if (!refs) return;
    if (refs.dot && refs.dot._icon) {
      refs.dot._icon.classList.remove('fog-hidden');
      refs.dot._icon.classList.add('fog-revealed');
    }
    if (refs.label && refs.label._icon) {
      refs.label._icon.classList.remove('fog-hidden');
      refs.label._icon.classList.add('fog-revealed');
    }
  }

  function registerMarker(locId, type, marker) {
    if (!markerRefs[locId]) markerRefs[locId] = {};
    markerRefs[locId][type] = marker;
  }

  function isDiscovered(locId) { return !!discovered[locId]; }

  /* ════════════════════════════════════════════════
     CELEBRATION
     ════════════════════════════════════════════════ */
  function showCelebration(loc) {
    var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
    var c = map.getContainer();

    var burst = document.createElement('div');
    burst.className = 'celebration-burst';
    burst.style.left = pt.x + 'px';
    burst.style.top = pt.y + 'px';
    c.appendChild(burst);

    var ring = document.createElement('div');
    ring.className = 'celebration-ring';
    burst.appendChild(ring);

    var count = 14;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'celebration-particle';
      var a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var d = 40 + Math.random() * 60;
      p.style.setProperty('--tx', Math.cos(a) * d + 'px');
      p.style.setProperty('--ty', Math.sin(a) * d + 'px');
      p.style.animationDelay = (Math.random() * 0.15) + 's';
      burst.appendChild(p);
    }
    setTimeout(function() { burst.remove(); }, 1500);
  }

  /* ════════════════════════════════════════════════
     DISCOVERY CARD
     ════════════════════════════════════════════════ */
  function showDiscoveryCard(loc) {
    var card = document.getElementById('discovery-card');
    if (!card) return;

    var step = journeyPath.find(function(s) { return s.locationId === loc.id; });
    card.querySelector('.dc-name').textContent = loc.name;
    card.querySelector('.dc-sub').textContent = loc.sub || (step ? step.label : '');
    card.querySelector('.dc-desc').textContent = loc.desc || 'This location awaits further charting...';

    var typeLabel = { region: 'Region', capital: 'Capital City', city: 'City', town: 'Settlement',
                      story: 'Story Location', sacred: 'Sacred Site', water: 'Body of Water' }[loc.type] || 'Location';
    card.querySelector('.dc-type').textContent = step ? 'Step ' + step.step + ' · ' + typeLabel : typeLabel;

    var loreEl = card.querySelector('.dc-lore');
    if (loc.lore && loreEl) { loreEl.textContent = loc.lore; loreEl.style.display = 'block'; }
    else if (loreEl) { loreEl.style.display = 'none'; }
    // Art image
    var artEl = card.querySelector('.dc-art');
    if (loc.art && artEl) { artEl.src = loc.art; artEl.style.display = 'block'; }
    else if (artEl) { artEl.style.display = 'none'; }

    card.classList.add('visible');
  }

  function closeDiscoveryCard() {
    var card = document.getElementById('discovery-card');
    if (card) card.classList.remove('visible');
  }

  /* ════════════════════════════════════════════════
     PROGRESS BAR
     ════════════════════════════════════════════════ */
  function updateProgress() {
    var total = journeyPath.length;
    var found = journeyPath.filter(function(s) { return !!discovered[s.locationId]; }).length;
    var pct = total > 0 ? found / total : 0;

    var fill = document.getElementById('progress-fill');
    var label = document.getElementById('progress-label');
    var title = document.getElementById('progress-title');

    if (fill) fill.style.width = (pct * 100) + '%';
    if (label) label.textContent = found + ' / ' + total + ' charted';

    var rank = 'Wanderer';
    if (pct > 0.15) rank = 'Pathfinder';
    if (pct > 0.4) rank = 'Surveyor';
    if (pct > 0.65) rank = 'Cartographer';
    if (pct > 0.85) rank = 'Master Cartographer';
    if (title) title.textContent = rank;
  }

  /* ════════════════════════════════════════════════
     RESET BUTTON
     ════════════════════════════════════════════════ */
  function addResetButton() {
    var btn = document.createElement('button');
    btn.id = 'fog-reset-btn';
    btn.textContent = '↺ Reset';
    btn.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:800;' +
      'background:rgba(10,12,16,0.85);color:#d4a843;border:1px solid rgba(198,141,85,0.4);' +
      'border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;' +
      'letter-spacing:1px;text-transform:uppercase;font-family:inherit;';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (confirm('Reset all discoveries and start over?')) {
        localStorage.removeItem(LS_KEY);
        location.reload();
      }
    });
    document.body.appendChild(btn);
  }

  /* ════════════════════════════════════════════════
     DRIFT (continuous fog animation)
     ════════════════════════════════════════════════ */
  var driftRAF = null;
  function startDrift() {
    function tick() { draw(); driftRAF = requestAnimationFrame(tick); }
    driftRAF = requestAnimationFrame(tick);
  }
  function stopDrift() { if (driftRAF) cancelAnimationFrame(driftRAF); }

  /* ════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════ */
  window.FogSystem = {
    init: init,
    draw: draw,
    registerMarker: registerMarker,
    isDiscovered: isDiscovered,
    discover: discoverLocation,
    closeCard: closeDiscoveryCard,
    updateProgress: updateProgress,
    startDrift: startDrift,
    stopDrift: stopDrift,
    getDiscovered: function() { return discovered; },
    getNextLocation: getNextPathLocation,
    reset: function() { localStorage.removeItem(LS_KEY); location.reload(); }
  };
})();
