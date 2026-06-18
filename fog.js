/* ═══════════════════════════════════════════════════════════════
   FOG SYSTEM — The Hollowlands Atlas
   Responsibilities: fog canvas rendering, click handling,
   reveal animation, tutorial flow, celebration particles.
   State is managed by StateManager. Cards by CardSystem.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var CLICK_RADIUS = 80;   // how close (px) user must click to the glow
  var TUTORIAL_STEPS = 3;  // guided hand-holding for first 3 discoveries

  // Rendering state (fog-specific, not persisted)
  var markerRefs = {};
  var fogCanvas = null;
  var fogCtx = null;
  var map = null;
  var cfg = null;
  var animatingReveal = null;
  var revealProgress = 0;
  var fogTexture = null;
  var textureReady = false;
  var tutorialStep = 0;
  var tutorialHintLoc = null;

  /* ════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════ */
  function init(leafletMap, mapConfig) {
    map = leafletMap;
    cfg = mapConfig;

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

    // Close button on discovery card
    var closeBtn = document.querySelector('#discovery-card .dc-close');
    if (closeBtn) closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (window.CardSystem) window.CardSystem.close();
    });

    // Tutorial
    var SM = window.StateManager;
    if (SM) {
      var discoveredCount = SM.getProgress().journeyDone;
      tutorialStep = discoveredCount;
    }
    if (tutorialStep < TUTORIAL_STEPS) {
      startTutorial();
    }
  }

  /* ════════════════════════════════════════════════
     CLICK HANDLER — document capture phase
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

      var container = map.getContainer();
      if (!container.contains(e.target)) return;
      if (e.target.closest('#layers, #discovery-card, #progress-container, .leaflet-control-zoom, #fog-reset-btn')) return;

      // Skip drags
      var dx = e.clientX - mouseDownX;
      var dy = e.clientY - mouseDownY;
      if (Math.sqrt(dx * dx + dy * dy) > 8) return;

      // Close card if open
      var card = document.getElementById('discovery-card');
      if (card && card.classList.contains('visible')) {
        if (window.CardSystem) window.CardSystem.close();
        return;
      }

      // Where did user click?
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      // Check proximity to clickable locations
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
        var state = window.StateManager ? window.StateManager.getState(closest.id) : 'fogged';
        if (state === 'dormant') {
          // Dormant click — show sealed card, don't discover
          e.stopPropagation();
          e.preventDefault();
          if (window.CardSystem) window.CardSystem.showDormant(closest);
        } else {
          // Fogged click — discover
          console.log('[FOG] ✓ Discovering:', closest.id);
          e.stopPropagation();
          e.preventDefault();
          discoverLocation(closest);
        }
      }
    }, true);

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
      if (card && card.classList.contains('visible')) {
        if (window.CardSystem) window.CardSystem.close();
        return;
      }

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
      if (closest) {
        var state = window.StateManager ? window.StateManager.getState(closest.id) : 'fogged';
        if (state === 'dormant') {
          e.preventDefault();
          if (window.CardSystem) window.CardSystem.showDormant(closest);
        } else {
          e.preventDefault();
          discoverLocation(closest);
        }
      }
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
    var SM = window.StateManager;
    var nextId = SM ? SM.getNextJourneyLocation() : null;
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
    console.log('[FOG] Tutorial hint for:', loc.id, 'step:', tutorialStep);
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
    var SM = window.StateManager;
    var nextId = SM ? SM.getNextJourneyLocation() : null;
    if (!nextId) { removeTutorialHint(); return; }
    var locs = window.LOCATIONS || [];
    var nextLoc = locs.find(function(l) { return l.id === nextId; });
    if (!nextLoc) { removeTutorialHint(); return; }

    setTimeout(function() {
      map.flyTo([nextLoc.lat, nextLoc.lng], map.getMinZoom() + 3, { duration: 1.5 });
      setTimeout(function() { showTutorialHint(nextLoc); }, 2000);
    }, 2500);
  }

  /* ════════════════════════════════════════════════
     PATH LOGIC — delegates to StateManager
     ════════════════════════════════════════════════ */
  function getNextPathLocation() {
    var SM = window.StateManager;
    return SM ? SM.getNextJourneyLocation() : null;
  }

  function isClickable(locId) {
    var SM = window.StateManager;
    if (!SM) return false;

    // Already discovered → not clickable for fog discovery
    if (SM.isDiscovered(locId)) return false;

    var state = SM.getState(locId);

    // Dormant locations are always clickable (show sealed card)
    if (state === 'dormant') return true;

    // Fogged journey locations — only next in sequence
    var next = SM.getNextJourneyLocation();
    if (next) return locId === next;

    // Journey complete — all fogged locations become clickable
    return state === 'fogged';
  }

  /* ════════════════════════════════════════════════
     DRAW FOG — pure rendering, reads state from StateManager
     ════════════════════════════════════════════════ */
  function draw() {
    if (!map || !fogCtx) return;

    var SM = window.StateManager;
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

    // ── 2. Animated fog texture layer ──
    if (textureReady && fogTexture.width > 0) {
      ctx.globalAlpha = 0.10;
      var ox1 = (time * 8) % fogTexture.width;
      var oy1 = (time * 4) % fogTexture.height;
      for (var tx = -fogTexture.width + ox1; tx < w + fogTexture.width; tx += fogTexture.width) {
        for (var ty = -fogTexture.height + oy1; ty < h + fogTexture.height; ty += fogTexture.height) {
          ctx.drawImage(fogTexture, tx, ty);
        }
      }
      ctx.globalAlpha = 0.06;
      var ox2 = -(time * 5) % fogTexture.width;
      var oy2 = -(time * 3) % fogTexture.height;
      for (tx = -fogTexture.width + ox2; tx < w + fogTexture.width; tx += fogTexture.width) {
        for (ty = -fogTexture.height + oy2; ty < h + fogTexture.height; ty += fogTexture.height) {
          ctx.drawImage(fogTexture, tx, ty);
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // ── 3. Golden glow on clickable locations ──
    var locs = window.LOCATIONS || [];
    var nextId = getNextPathLocation();

    if (nextId) {
      // Journey mode: glow on next target only
      var nextLoc = locs.find(function(l) { return l.id === nextId; });
      if (nextLoc) {
        var npt = map.latLngToContainerPoint([nextLoc.lat, nextLoc.lng]);
        var pulse = 0.4 + 0.3 * Math.sin(time * 2.5);
        var gR = 60 * Math.pow(2, zoom * 0.3);
        var glow = ctx.createRadialGradient(npt.x, npt.y, 0, npt.x, npt.y, gR);
        glow.addColorStop(0, 'rgba(212,168,67,' + pulse + ')');
        glow.addColorStop(0.4, 'rgba(212,168,67,' + (pulse * 0.4) + ')');
        glow.addColorStop(1, 'rgba(212,168,67,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(npt.x, npt.y, gR, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Post-journey: faint glows on all undiscovered locations
      locs.forEach(function(loc) {
        if (SM && SM.isDiscovered(loc.id)) return;
        if (SM && SM.getState(loc.id) === 'dormant') return; // dormant has own markers
        var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
        var gR = 30 * Math.pow(2, zoom * 0.3);
        var faintPulse = 0.12 + 0.08 * Math.sin(time * 1.5 + loc.lat * 0.01);
        var glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, gR);
        glow.addColorStop(0, 'rgba(212,168,67,' + faintPulse + ')');
        glow.addColorStop(1, 'rgba(212,168,67,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, gR, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── 4. Punch clear holes for discovered locations ──
    ctx.globalCompositeOperation = 'destination-out';

    // Get discovered IDs from StateManager
    var discoveredIds = [];
    if (SM) {
      locs.forEach(function(loc) {
        if (SM.isDiscovered(loc.id)) discoveredIds.push(loc);
      });
    }

    discoveredIds.forEach(function(loc) {
      var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
      var baseR = 180;
      var r = baseR * Math.pow(2, zoom);

      // If this is the currently-animating reveal, scale by progress
      var alpha = 1;
      if (animatingReveal === loc.id) alpha = revealProgress;

      var grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      grad.addColorStop(0,    'rgba(0,0,0,' + alpha + ')');
      grad.addColorStop(0.5,  'rgba(0,0,0,' + alpha + ')');
      grad.addColorStop(0.75, 'rgba(0,0,0,' + (alpha * 0.6) + ')');
      grad.addColorStop(0.9,  'rgba(0,0,0,' + (alpha * 0.15) + ')');
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // ── 5. Tutorial hint (drawn on canvas) ──
    if (tutorialHintLoc && tutorialStep < TUTORIAL_STEPS) {
      var hpt = map.latLngToContainerPoint([tutorialHintLoc.lat, tutorialHintLoc.lng]);
      var hx = hpt.x;
      var hy = hpt.y;
      var bob = Math.sin(time * 3) * 6;

      ctx.save();
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d4a843';
      ctx.shadowColor = 'rgba(212, 168, 67, 0.9)';
      ctx.shadowBlur = 20;
      ctx.fillText('▼', hx, hy - 30 + bob);
      ctx.restore();

      var msg = tutorialMessages[Math.min(tutorialStep, tutorialMessages.length - 1)];
      ctx.save();
      ctx.font = '600 14px "Cinzel", "Cormorant Garamond", serif';
      var tw = ctx.measureText(msg.toUpperCase()).width + 32;
      var th = 32;
      var ttx = hx - tw / 2;
      var tty = hy - 70 + bob;

      ctx.fillStyle = 'rgba(10, 12, 16, 0.92)';
      ctx.beginPath();
      ctx.roundRect(ttx, tty, tw, th, 6);
      ctx.fill();

      ctx.strokeStyle = 'rgba(198, 141, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(ttx, tty, tw, th, 6);
      ctx.stroke();

      ctx.fillStyle = '#efe7d2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '2px';
      ctx.fillText(msg.toUpperCase(), hx, tty + th / 2);
      ctx.restore();
    }
  }

  /* ════════════════════════════════════════════════
     DISCOVER — delegates state to StateManager, cards to CardSystem
     ════════════════════════════════════════════════ */
  function discoverLocation(loc) {
    var SM = window.StateManager;
    if (SM) SM.discover(loc.id);

    removeTutorialHint();
    revealMarker(loc.id);
    animateReveal(loc);
    showCelebration(loc);
    setTimeout(function() {
      if (window.CardSystem) window.CardSystem.showRevealed(loc);
    }, 600);
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
      revealProgress = 1 - Math.pow(1 - revealProgress, 3);
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
     PROGRESS BAR — reads from StateManager
     ════════════════════════════════════════════════ */
  function updateProgress() {
    var SM = window.StateManager;
    var progress = SM ? SM.getProgress() : { journeyDone: 0, journeyTotal: 0, rank: 'Wanderer', pct: 0 };

    var fill = document.getElementById('progress-fill');
    var label = document.getElementById('progress-label');
    var title = document.getElementById('progress-title');

    if (fill) fill.style.width = (progress.pct * 100) + '%';
    if (label) label.textContent = progress.journeyDone + ' / ' + progress.journeyTotal + ' charted';
    if (title) title.textContent = progress.rank;
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
        var SM = window.StateManager;
        if (SM) SM.reset();
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
    isDiscovered: function(locId) {
      var SM = window.StateManager;
      return SM ? SM.isDiscovered(locId) : false;
    },
    discover: discoverLocation,
    closeCard: function() {
      if (window.CardSystem) window.CardSystem.close();
    },
    updateProgress: updateProgress,
    startDrift: startDrift,
    stopDrift: stopDrift,
    getDiscovered: function() {
      var SM = window.StateManager;
      return SM ? SM.getLocationsByState('revealed') : [];
    },
    getNextLocation: getNextPathLocation,
    reset: function() {
      var SM = window.StateManager;
      if (SM) SM.reset();
      location.reload();
    }
  };
})();
