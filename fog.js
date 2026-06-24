/* ═══════════════════════════════════════════════════════════════
   FOG SYSTEM — The Hollowlands Atlas
   Clean implementation: textured fog, simple radial clearing,
   3-step guided tutorial, document-level click handling.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var LS_KEY = 'intrepid_atlas_discovered';
  var CLICK_RADIUS = 110;   // how close (px) user must click to the glow
  var TUTORIAL_STEPS = 6;  // 6-step guided walkthrough
  var SPOTLIGHT_RADIUS = 60; // px — size of the mouse lantern
  var KEY_FIND_RADIUS = 50;  // px — how close to key to reveal it
  var KEY_CLICK_RADIUS = 50; // px — how close to key to click it
  var PINHOLE_SCALE = 0.2;   // fraction of full reveal radius for pinhole
  var HINT_DELAY = 5000;     // ms before key starts hinting
  var BREATH_SPEED = 0.15;   // how fast the fog edges breathe (cycles/sec)
  var BREATH_AMP = 0.06;     // how much the edges expand/contract (fraction)

  // Proximity whispers — incomplete cartographer's notes at the fog edge
  var WHISPERS = {
    'tower-of-nine':    'Nine windows. Only three face —',
    'crossing-pool':    'The water remembers every face that —',
    'sabellas-hut':     'Larger inside. She warned me not to measure —',
    'monastery':        'The monks stopped writing three days before —',
    'star-clearing':    'The constellations here do not match any —',
    'dawn':             'Light arrives before the sun. I cannot explain —',
    'atras-empire':     'Every road leads to Nin. No road leads —',
    'kur-north':        'The border moved south again. On the fourth expedition we —',
    'kur-south':        'The ground is warm. Bones surface without —',
    'golden-wastes':    'The sand sings at dusk. I recorded the pitch but my —',
    'western-expanse':  'The cartographers who mapped this did not come back the same —',
    'emerald-coast':    'The tides follow a calendar we haven\u2019t —',
    'nin':              'The capital does not expand. It remembers territory it has not yet —',
    'azu':              'Port city. Ships arrive from directions that should be —',
    'ddr':              'The silence here is not absence. It is —',
    'wellspring':       'The water rises but the source is below the underworld\u2019s —',
    'ironhearth':       'I heard the forges before I saw them. Three days before —',
    'vael':             'A city that insists it was never —',
    'tidemark':         'The high-water line changes with the moon but also with —',
    'broken-gate':      'The gate was not broken from outside. Something inside —',
    'obsidian-spire':   'The stone absorbs light. I lit a torch and it —',
    'waters-of-kur':    'I came back from here twice before I —',
    'the-threshold':    'The bridge holds but —',
    'hollow-gate':      'Entry is not refused. It is —'
  };

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

  // Spotlight search state
  var searchMode = null;  // { locId, loc, keyLat, keyLng, startTime }
  var spotlightPos = null; // { x, y } container coords (null = no spotlight)
  var lastMousePos = null; // { x, y } for whisper proximity outside search mode

  // Audio — divining rod pings
  var audioCtx = null;
  var lastPingTime = 0;
  var audioUnlocked = false;

  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioUnlocked = true;
    } catch(e) { /* no audio support */ }
  }

  function playPing(frequency, duration, volume) {
    if (!audioCtx || audioCtx.state === 'suspended') {
      if (audioCtx) audioCtx.resume();
      return;
    }
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playDiscoveryChime() {
    if (!audioCtx) return;
    // Three-note ascending chime
    var notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach(function(freq, i) {
      setTimeout(function() {
        playPing(freq, 0.4, 0.1);
      }, i * 120);
    });
  }

  // Called from draw() during search mode — pings based on proximity
  function updateDiviningAudio(proximity) {
    if (!audioCtx || !searchMode) return;
    var now = Date.now();

    // Ping interval: 800ms when far → 100ms when close
    var interval = 800 - proximity * 700;
    if (interval < 100) interval = 100;

    // Pitch: 300Hz far → 900Hz close
    var freq = 300 + proximity * 600;

    if (now - lastPingTime > interval) {
      playPing(freq, 0.08 + proximity * 0.1, 0.04 + proximity * 0.08);
      lastPingTime = now;
    }
  }

  /* ════════════════════════════════════════════════
     AMBIENT SOUNDSCAPE — generative procedural music
     ════════════════════════════════════════════════ */
  var ambientStarted = false;
  var ambientMuted = false;
  var ambientMaster = null;
  var ambientNodes = [];
  var sparkleTimer = null;

  function startAmbient() {
    if (ambientStarted || !audioCtx) return;
    ambientStarted = true;

    // Master gain — controls overall volume + mute
    ambientMaster = audioCtx.createGain();
    ambientMaster.gain.setValueAtTime(0, audioCtx.currentTime);
    ambientMaster.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 4);
    ambientMaster.connect(audioCtx.destination);

    // ── Layer 1: Bass drone (very low, filtered) ──
    var drone = audioCtx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 65;
    var droneGain = audioCtx.createGain();
    droneGain.gain.value = 0.4;
    var droneLFO = audioCtx.createOscillator();
    droneLFO.type = 'sine';
    droneLFO.frequency.value = 0.08;
    var lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 3;
    droneLFO.connect(lfoGain);
    lfoGain.connect(drone.frequency);
    droneLFO.start();
    drone.connect(droneGain);
    droneGain.connect(ambientMaster);
    drone.start();
    ambientNodes.push(drone, droneLFO);

    // ── Layer 2: Harmonic pad (Cm chord, triangle waves) ──
    [130.81, 155.56, 196.00].forEach(function(noteFreq) {
      var pad = audioCtx.createOscillator();
      pad.type = 'triangle';
      pad.frequency.value = noteFreq;
      var padLFO = audioCtx.createOscillator();
      padLFO.type = 'sine';
      padLFO.frequency.value = 0.05 + Math.random() * 0.06;
      var padLFOGain = audioCtx.createGain();
      padLFOGain.gain.value = 2;
      padLFO.connect(padLFOGain);
      padLFOGain.connect(pad.detune);
      padLFO.start();
      var padGain = audioCtx.createGain();
      padGain.gain.value = 0.15;
      pad.connect(padGain);
      padGain.connect(ambientMaster);
      pad.start();
      ambientNodes.push(pad, padLFO);
    });

    // ── Layer 3: Wind texture (filtered noise) ──
    var bufferSize = audioCtx.sampleRate * 2;
    var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var nd = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) nd[i] = Math.random() * 2 - 1;
    var noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    var noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 1;
    var filterLFO = audioCtx.createOscillator();
    filterLFO.type = 'sine';
    filterLFO.frequency.value = 0.03;
    var filterLFOGain = audioCtx.createGain();
    filterLFOGain.gain.value = 200;
    filterLFO.connect(filterLFOGain);
    filterLFOGain.connect(noiseFilter.frequency);
    filterLFO.start();
    var noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ambientMaster);
    noise.start();
    ambientNodes.push(noise, filterLFO);

    // ── Layer 4: Sparkle notes (pentatonic bells) ──
    var sparkleNotes = [523, 587, 698, 784, 880, 1047, 1175];
    function scheduleSparkle() {
      if (!audioCtx || ambientMuted) {
        sparkleTimer = setTimeout(scheduleSparkle, 3000 + Math.random() * 5000);
        return;
      }
      var note = sparkleNotes[Math.floor(Math.random() * sparkleNotes.length)];
      var osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note;
      var env = audioCtx.createGain();
      env.gain.setValueAtTime(0, audioCtx.currentTime);
      env.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.3);
      env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      osc.connect(env);
      env.connect(ambientMaster);
      osc.start();
      osc.stop(audioCtx.currentTime + 2.5);
      sparkleTimer = setTimeout(scheduleSparkle, 3000 + Math.random() * 5000);
    }
    sparkleTimer = setTimeout(scheduleSparkle, 2000);
  }

  function toggleAmbient() {
    if (!ambientMaster) return;
    ambientMuted = !ambientMuted;
    ambientMaster.gain.linearRampToValueAtTime(
      ambientMuted ? 0 : 0.12,
      audioCtx.currentTime + 0.5
    );
    var btn = document.getElementById('ambient-toggle');
    if (btn) btn.textContent = ambientMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  }

  /* ════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════ */
  function init(leafletMap, mapConfig) {
    map = leafletMap;
    cfg = mapConfig;
    journeyPath = window.JOURNEY_PATH || [];

    // Auto-clear stale localStorage when fog system version changes
    var FOG_VERSION = 16;
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
    setupSpotlightTracking();

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
      ensureAudio(); // Initialize audio on first user interaction
      startAmbient(); // Begin ambient soundscape

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

      // During search mode: check for key click
      if (searchMode) {
        var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
        var keyDist = Math.sqrt(Math.pow(x - keyPt.x, 2) + Math.pow(y - keyPt.y, 2));
        if (keyDist < KEY_CLICK_RADIUS) {
          e.stopPropagation();
          e.preventDefault();
          completeDiscovery(searchMode.loc);
        }
        return; // during search, no other clicks
      }

      if (closest) {
        console.log('[FOG] ✓ Discovering:', closest.id);
        e.stopPropagation();
        e.preventDefault();
        discoverLocation(closest);
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
      // During search mode: check for key click (touch)
      if (searchMode) {
        var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
        var keyDist = Math.sqrt(Math.pow(x - keyPt.x, 2) + Math.pow(y - keyPt.y, 2));
        if (keyDist < KEY_CLICK_RADIUS + 10) { // slightly larger for touch
          e.preventDefault();
          completeDiscovery(searchMode.loc);
        }
        return;
      }
      if (closest) { e.preventDefault(); discoverLocation(closest); }
    }, true);
  }

  /* ════════════════════════════════════════════════
     TUTORIAL — 6-step guided walkthrough
     Step 0: Click a glow (instant reveal)
     Step 1: Read the card (wait for card close)
     Step 2: Follow the path (instant reveal)
     Step 3: Spotlight search intro (first pinhole)
     Step 4: Find the key (wait for key click)
     Step 5: Free exploration (brief encouragement)
     ════════════════════════════════════════════════ */
  var TUTORIAL_DEFS = [
    { msg: 'A light stirs in the mist. Touch it.', action: 'click' },
    { msg: 'Scroll to read, then close the card.', action: 'close-card' },
    { msg: 'The path leads on. Follow the light.', action: 'click' },
    { msg: 'The mist thickens. Move your cursor to search.', action: 'search' },
    { msg: 'A sigil glimmers. Find it and touch it.', action: 'find-key' },
    { msg: 'The archive is yours, Cartographer. Chart the unknown.', action: 'auto' }
  ];

  // Which tutorial steps use instant reveal (no spotlight search)
  var TUTORIAL_INSTANT_STEPS = [0, 1, 2];
  // Step that waits for card close (doesn't advance on discover)
  var TUTORIAL_CARD_STEP = 1;

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
    console.log('[TUTORIAL] Step', tutorialStep, ':', TUTORIAL_DEFS[tutorialStep].msg);

    // Step 1 (card reading) — listen for card close
    if (tutorialStep === TUTORIAL_CARD_STEP) {
      waitForCardClose();
    }
  }

  function waitForCardClose() {
    var card = document.getElementById('discovery-card');
    var panelEl = document.getElementById('panel');
    var advanced = false; // guard against double-fire

    function onClose() {
      if (advanced) return;
      advanced = true;
      advanceTutorial();
    }

    // Watch discovery-card for class change
    if (card) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.attributeName === 'class' && !card.classList.contains('visible')) {
            observer.disconnect();
            onClose();
          }
        });
      });
      observer.observe(card, { attributes: true });
    }

    // Also watch panel close as fallback
    if (panelEl) {
      var panelObs = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.attributeName === 'class' && !panelEl.classList.contains('open')) {
            panelObs.disconnect();
            onClose();
          }
        });
      });
      panelObs.observe(panelEl, { attributes: true });
    }
  }

  function positionHint() {
    // No-op: canvas handles positioning in draw()
  }

  function removeTutorialHint() {
    tutorialHintLoc = null;
  }

  function advanceTutorial() {
    tutorialStep++;
    console.log('[TUTORIAL] Advanced to step', tutorialStep);

    if (tutorialStep >= TUTORIAL_STEPS) {
      removeTutorialHint();
      console.log('[TUTORIAL] Complete!');
      return;
    }

    var def = TUTORIAL_DEFS[tutorialStep];

    // Auto-dismiss steps (like step 5 encouragement)
    if (def.action === 'auto') {
      removeTutorialHint();
      // Show a brief toast instead of a hint arrow
      showTutorialToast(def.msg);
      setTimeout(function() { advanceTutorial(); }, 4000);
      return;
    }

    // Card-close step doesn't need to fly anywhere — hint shows next to card
    if (def.action === 'close-card') {
      // tutorialHintLoc was set by instantDiscover before advancing
      waitForCardClose();
      return;
    }

    // Search + find-key steps don't fly — they happen at the current location
    if (def.action === 'search' || def.action === 'find-key') {
      // Keep current hint location
      return;
    }

    // Click steps — show hint immediately, then fly to next location
    var nextId = getNextPathLocation();
    if (!nextId) { removeTutorialHint(); return; }
    var locs = window.LOCATIONS || [];
    var nextLoc = locs.find(function(l) { return l.id === nextId; });
    if (!nextLoc) { removeTutorialHint(); return; }

    // Show hint RIGHT AWAY at the next location (even before camera arrives)
    showTutorialHint(nextLoc);

    // Fly camera to the next location
    setTimeout(function() {
      map.flyTo([nextLoc.lat, nextLoc.lng], map.getMinZoom() + 3, { duration: 1.2 });
    }, 300);
  }

  function showTutorialToast(msg) {
    var old = document.getElementById('tutorial-toast');
    if (old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'tutorial-toast';
    toast.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:900;' +
      'background:rgba(10,12,16,0.92);border:1px solid rgba(198,141,85,0.4);' +
      'border-radius:8px;padding:16px 32px;text-align:center;' +
      'font-family:"Cinzel",serif;color:#efe7d2;pointer-events:none;' +
      'font-size:16px;font-style:italic;letter-spacing:1px;' +
      'opacity:0;transition:opacity 0.8s ease;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 800);
    }, 3500);
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
    // Regions are always clickable — they're geography
    var locs = window.LOCATIONS || [];
    var loc = locs.find(function(l) { return l.id === locId; });
    if (loc && (loc.type === 'region' || loc.type === 'water')) return true;
    // Story locations follow the journey path
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
    }

    // ── 3b. Faint glows for undiscovered regions (always visible) ──
    locs.forEach(function(loc) {
      if (discovered[loc.id]) return;
      if (loc.type !== 'region') return;
      var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
      if (pt.x < -60 || pt.x > w + 60 || pt.y < -60 || pt.y > h + 60) return;
      var p = 0.12 + Math.sin(time * 1.2 + loc.lat * 0.02) * 0.06;
      var rGlow = 25 + Math.sin(time * 0.8 + loc.lng * 0.01) * 5;
      var g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rGlow);
      g.addColorStop(0, 'rgba(198, 141, 85, ' + (p + 0.1) + ')');
      g.addColorStop(0.5, 'rgba(198, 141, 85, ' + p + ')');
      g.addColorStop(1, 'rgba(198, 141, 85, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rGlow, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!nextId && isPathComplete()) {
      // After path is done, show faint glows on all remaining undiscovered (non-region)
      locs.forEach(function(loc) {
        if (discovered[loc.id]) return;
        if (loc.type === 'region') return; // already handled above
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
    ctx.globalCompositeOperation = 'destination-out';

    // Breathing offset — slow, per-location phase shift
    var breathTime = time * BREATH_SPEED * Math.PI * 2;

    // Pass 1: Mist-phase regions (semi-transparent reveal)
    locs.forEach(function(loc) {
      if (!discovered[loc.id]) return;
      var disc = discovered[loc.id];
      if (disc.phase !== 'mist') return;

      var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
      var mistR = 320 * Math.pow(2, zoom);
      if (mistR < 60) mistR = 60;

      // Breathing: each location breathes at its own phase
      var breathPhase = (loc.lat + loc.lng) * 0.01;
      var breath = 1 + Math.sin(breathTime + breathPhase) * BREATH_AMP;
      mistR *= breath;

      var mistAlpha = 0.35;
      if (animatingReveal === loc.id) mistAlpha *= revealProgress;

      var grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, mistR);
      grad.addColorStop(0,    'rgba(0,0,0,' + mistAlpha + ')');
      grad.addColorStop(0.5,  'rgba(0,0,0,' + (mistAlpha * 0.9) + ')');
      grad.addColorStop(0.75, 'rgba(0,0,0,' + (mistAlpha * 0.5) + ')');
      grad.addColorStop(0.9,  'rgba(0,0,0,' + (mistAlpha * 0.15) + ')');
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, mistR, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pass 2: Full-clear holes (complete + searching pinhole)
    locs.forEach(function(loc) {
      if (!discovered[loc.id]) return;
      var disc = discovered[loc.id];
      if (disc.phase === 'mist') return;

      var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);

      var baseR = (disc.phase === 'searching') ? 180 : 250;
      var scale = (disc.phase === 'searching') ? PINHOLE_SCALE : 1;
      var r = baseR * scale * Math.pow(2, zoom);
      if (r < 20) r = 20;

      // Breathing: completed holes gently expand/contract
      if (disc.phase === 'complete') {
        var breathPhase = (loc.lat + loc.lng) * 0.01;
        var breath = 1 + Math.sin(breathTime + breathPhase) * BREATH_AMP;
        r *= breath;
      }

      var alpha = 1;
      if (animatingReveal === loc.id) alpha = revealProgress;

      var grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      grad.addColorStop(0,    'rgba(0,0,0,' + alpha + ')');
      grad.addColorStop(0.5,  'rgba(0,0,0,' + (alpha * 0.95) + ')');
      grad.addColorStop(0.75, 'rgba(0,0,0,' + (alpha * 0.5) + ')');
      grad.addColorStop(0.9,  'rgba(0,0,0,' + (alpha * 0.15) + ')');
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── 4b. Spotlight with divining rod effect ──
    if (searchMode && spotlightPos) {
      var kpt2 = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
      var distToKey = Math.sqrt(Math.pow(spotlightPos.x - kpt2.x, 2) + Math.pow(spotlightPos.y - kpt2.y, 2));

      // Proximity: 0 = far, 1 = on top of key
      var maxDist = 300;
      var proximity = Math.max(0, 1 - distToKey / maxDist);

      // Audio: divining rod pings accelerate near key
      updateDiviningAudio(proximity);

      // Divining rod: spotlight grows and pulses faster when closer
      var pulseSpeed = 2 + proximity * 6; // 2Hz far → 8Hz close
      var pulseAmp = 0.05 + proximity * 0.2;
      var pulse = 1 + Math.sin(time * pulseSpeed) * pulseAmp;

      var sR = (SPOTLIGHT_RADIUS + proximity * 25) * pulse * Math.pow(2, Math.max(0, zoom * 0.3));

      // Color shifts warm as you get closer
      var warmR = Math.floor(30 * proximity);
      var warmG = Math.floor(15 * proximity);
      var clearAlpha = 0.7 + proximity * 0.25;

      var sGrad = ctx.createRadialGradient(spotlightPos.x, spotlightPos.y, 0, spotlightPos.x, spotlightPos.y, sR);
      sGrad.addColorStop(0,   'rgba(' + warmR + ',' + warmG + ',0,' + clearAlpha + ')');
      sGrad.addColorStop(0.6, 'rgba(0,0,0,' + (0.3 + proximity * 0.1) + ')');
      sGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(spotlightPos.x, spotlightPos.y, sR, 0, Math.PI * 2);
      ctx.fill();

      // Directional pull arrow (small triangle pointing toward key)
      if (distToKey > KEY_FIND_RADIUS && distToKey < maxDist) {
        var angle = Math.atan2(kpt2.y - spotlightPos.y, kpt2.x - spotlightPos.x);
        var arrowDist = sR * 0.4;
        var ax = spotlightPos.x + Math.cos(angle) * arrowDist;
        var ay = spotlightPos.y + Math.sin(angle) * arrowDist;
        var arrowSize = 4 + proximity * 4;
        var arrowAlpha = 0.15 + proximity * 0.5;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(212, 168, 67, ' + arrowAlpha + ')';
        ctx.shadowColor = 'rgba(212, 168, 67, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(angle) * arrowSize, ay + Math.sin(angle) * arrowSize);
        ctx.lineTo(ax + Math.cos(angle + 2.3) * arrowSize, ay + Math.sin(angle + 2.3) * arrowSize);
        ctx.lineTo(ax + Math.cos(angle - 2.3) * arrowSize, ay + Math.sin(angle - 2.3) * arrowSize);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'destination-out';
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // ── 4c. Draw key glyph ──
    if (searchMode) {
      var kpt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
      var kDist = spotlightPos ?
        Math.sqrt(Math.pow(spotlightPos.x - kpt.x, 2) + Math.pow(spotlightPos.y - kpt.y, 2)) : 9999;
      var elapsed = Date.now() - searchMode.startTime;

      // Always show a faint pulse so key is findable
      var basePulse = 0.12 + 0.08 * Math.sin(time * 2.5);

      // After HINT_DELAY, pulse gets much stronger
      var hintAlpha = basePulse;
      if (elapsed > HINT_DELAY) {
        hintAlpha = Math.min(0.7, basePulse + (elapsed - HINT_DELAY) / 8000) * (0.5 + 0.5 * Math.sin(time * 3));
      }

      var keyVisible = kDist < KEY_FIND_RADIUS;
      var keyNear = kDist < KEY_FIND_RADIUS * 2;
      var kAlpha = keyVisible ? 0.9 : (keyNear ? 0.4 : hintAlpha);
      var kSize = keyVisible ? 10 : (keyNear ? 7 : 5);

      ctx.save();
      ctx.shadowColor = 'rgba(212, 168, 67, 0.8)';
      ctx.shadowBlur = keyVisible ? 25 : 12;

      // Draw sigil — diamond with inner dot
      ctx.fillStyle = 'rgba(212, 168, 67, ' + kAlpha + ')';
      ctx.beginPath();
      ctx.moveTo(kpt.x, kpt.y - kSize);
      ctx.lineTo(kpt.x + kSize, kpt.y);
      ctx.lineTo(kpt.x, kpt.y + kSize);
      ctx.lineTo(kpt.x - kSize, kpt.y);
      ctx.closePath();
      ctx.fill();

      // Inner dot
      if (keyVisible || keyNear) {
        ctx.fillStyle = 'rgba(255, 248, 230, ' + (keyVisible ? 0.9 : 0.4) + ')';
        ctx.beginPath();
        ctx.arc(kpt.x, kpt.y, keyVisible ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── 4d. Tower of the Nine — storm effect ──
    if (discovered['tower-nine']) {
      var towerPt = map.latLngToContainerPoint([4480, 4091]);
      var tx = towerPt.x, ty = towerPt.y;

      // Scale effect based on zoom level
      var zoomScale = Math.pow(2, map.getZoom() - map.getMinZoom());
      var stormRadius = 40 * zoomScale;
      var stormCenterY = ty - 35 * zoomScale; // above the tower peak

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      // ── Swirling cloud wisps ──
      var numWisps = 6;
      for (var wi = 0; wi < numWisps; wi++) {
        var wAngle = time * (0.3 + wi * 0.08) + wi * (Math.PI * 2 / numWisps);
        var wDist = stormRadius * (0.4 + 0.3 * Math.sin(time * 0.5 + wi));
        var wx = tx + Math.cos(wAngle) * wDist;
        var wy = stormCenterY + Math.sin(wAngle) * wDist * 0.4; // flattened ellipse
        var wSize = stormRadius * (0.25 + 0.15 * Math.sin(time + wi * 2));
        var wAlpha = 0.06 + 0.04 * Math.sin(time * 0.8 + wi);

        var wGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, wSize);
        wGrad.addColorStop(0, 'rgba(80, 90, 110, ' + wAlpha + ')');
        wGrad.addColorStop(0.6, 'rgba(50, 55, 70, ' + (wAlpha * 0.5) + ')');
        wGrad.addColorStop(1, 'rgba(30, 35, 50, 0)');
        ctx.fillStyle = wGrad;
        ctx.beginPath();
        ctx.arc(wx, wy, wSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Occasional lightning ──
      // Use a deterministic pseudo-random: lightning every ~3-6 seconds
      var lightningCycle = Math.floor(time * 0.4);
      var lightningPhase = (time * 0.4) % 1;
      var lightningActive = lightningPhase < 0.04; // flash for ~100ms

      // Add a secondary flash for double-strike feel
      var lightningActive2 = lightningPhase > 0.08 && lightningPhase < 0.11;

      if (lightningActive || lightningActive2) {
        // Seed bolt path from lightning cycle
        var boltSeed = lightningCycle * 7 + 3;
        var bx = tx + ((boltSeed * 13 % 60) - 30) * zoomScale * 0.5;
        var by = stormCenterY - stormRadius * 0.3;

        ctx.strokeStyle = lightningActive
          ? 'rgba(200, 210, 255, 0.7)'
          : 'rgba(200, 210, 255, 0.35)';
        ctx.lineWidth = lightningActive ? 1.5 : 1;
        ctx.shadowColor = 'rgba(180, 200, 255, 0.9)';
        ctx.shadowBlur = lightningActive ? 20 : 10;
        ctx.beginPath();
        ctx.moveTo(bx, by);

        // Jagged bolt — 4-5 segments
        var segments = 4 + (boltSeed % 2);
        var boltLen = stormRadius * 0.6;
        for (var si = 1; si <= segments; si++) {
          var segY = by + (boltLen / segments) * si;
          var segX = bx + ((boltSeed * (si + 1) * 17 % 20) - 10) * zoomScale * 0.3;
          ctx.lineTo(segX, segY);
        }
        ctx.stroke();

        // Brief ambient flash
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

      ctx.restore();
    }

    // ── 4e. Constellation lines (finale — journey complete) ──
    var fs = window._finaleState;
    if (fs && fs.constellationLines && fs.constellationLines.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      var drawProg = fs.constellationDrawProgress || 0;
      var pulseLine = 0.55 + 0.15 * Math.sin(time * 1.8);

      for (var li = 0; li < fs.constellationLines.length; li++) {
        var segAlpha = Math.min(1, Math.max(0, drawProg - li));
        if (segAlpha <= 0) break;

        var lineA = fs.constellationLines[li].a;
        var lineB = fs.constellationLines[li].b;
        var ptA = map.latLngToContainerPoint([lineA.lat, lineA.lng]);
        var ptB = map.latLngToContainerPoint([lineB.lat, lineB.lng]);

        // Partial segment during animation
        var endX = ptA.x + (ptB.x - ptA.x) * segAlpha;
        var endY = ptA.y + (ptB.y - ptA.y) * segAlpha;

        // Glowing gold line
        ctx.beginPath();
        ctx.moveTo(ptA.x, ptA.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(212, 168, 67, ' + (pulseLine * (segAlpha === 1 ? 1 : segAlpha)).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(212, 168, 67, 0.6)';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Node dot at each end
        if (segAlpha === 1) {
          ctx.fillStyle = 'rgba(212, 168, 67, ' + (pulseLine * 0.9).toFixed(3) + ')';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(ptB.x, ptB.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── 4f. Fog wave clear (finale — vol1 complete) ──
    var waveP = window._fogWaveClearProgress ? window._fogWaveClearProgress() : 0;
    if (waveP > 0) {
      // Thin the fog globally using a semi-transparent overlay that erases fog
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      var eased = waveP * waveP * (3 - 2 * waveP); // smoothstep
      ctx.fillStyle = 'rgba(0,0,0,' + (eased * 0.55).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ── 5. Tutorial hint (drawn on canvas — guaranteed visible) ──
    if (tutorialHintLoc && tutorialStep < TUTORIAL_STEPS) {
      var def = TUTORIAL_DEFS[tutorialStep];
      var msg = def ? def.msg : '';
      var hpt = map.latLngToContainerPoint([tutorialHintLoc.lat, tutorialHintLoc.lng]);
      var hx = hpt.x;
      var hy = hpt.y;
      var bob = Math.sin(time * 3) * 6;

      // For find-key/search steps, point arrow at the KEY location
      if (searchMode && def && (def.action === 'find-key' || def.action === 'search')) {
        var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
        hx = keyPt.x;
        hy = keyPt.y;
      }

      // For card-close step, point arrow at the card's close button
      var arrowAbove = true;
      if (def && def.action === 'close-card') {
        var card = document.getElementById('discovery-card');
        if (card && card.classList.contains('visible')) {
          var closeBtn = card.querySelector('.dc-close');
          if (closeBtn) {
            var cbr = closeBtn.getBoundingClientRect();
            var container = map.getContainer();
            var containerRect = container.getBoundingClientRect();
            hx = cbr.left - containerRect.left + cbr.width / 2;
            hy = cbr.top - containerRect.top + cbr.height / 2;
            arrowAbove = false; // arrow points from left
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';

      // Pulsing golden arrow ▼ (always shown, including for close-card)
      ctx.save();
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      var arrowPulse = 0.7 + 0.3 * Math.sin(time * 4);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + arrowPulse + ')';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 25;
      if (arrowAbove) {
        ctx.fillText('\u25BC', hx, hy - 25 + bob);
      } else {
        // Arrow points right ▶ toward the close button
        ctx.fillText('\u25B6', hx - 35 + bob, hy + 4);
      }
      ctx.restore();

      // Text background pill — bigger and more prominent
      ctx.save();
      ctx.font = 'italic 600 15px "Cinzel", "Cormorant Garamond", serif';
      var tw = ctx.measureText(msg).width + 40;
      var th = 36;
      var tx, ty;
      if (arrowAbove) {
        tx = hx - tw / 2;
        ty = hy - 80 + bob;
      } else {
        // Position tooltip to the left of the close button
        tx = hx - tw - 50;
        ty = hy - th / 2;
      }

      // Clamp to viewport
      if (tx < 10) tx = 10;
      if (tx + tw > w - 10) tx = w - tw - 10;
      if (ty < 10) ty = 10;

      ctx.fillStyle = 'rgba(10, 12, 16, 0.95)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 8);
      ctx.stroke();

      ctx.fillStyle = '#efe7d2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, tx + tw / 2, ty + th / 2);
      ctx.restore();
    }

    // ── 6. Navigation beacon — arrow pointing to next journey step ──
    if (!searchMode) {
      var navId = getNextPathLocation();
      if (navId) {
        var navLoc = locs.find(function(l) { return l.id === navId; });
        if (navLoc) {
          var npt = map.latLngToContainerPoint([navLoc.lat, navLoc.lng]);
          var margin = 80;
          var isOffscreen = npt.x < margin || npt.x > w - margin || npt.y < margin || npt.y > h - margin;

          if (isOffscreen) {
            // Draw arrow at edge of screen pointing toward next location
            var cx = w / 2, cy = h / 2;
            var navAngle = Math.atan2(npt.y - cy, npt.x - cx);
            var edgeX = cx + Math.cos(navAngle) * (w / 2 - margin);
            var edgeY = cy + Math.sin(navAngle) * (h / 2 - margin);

            // Clamp to viewport edges
            edgeX = Math.max(margin, Math.min(w - margin, edgeX));
            edgeY = Math.max(margin, Math.min(h - margin, edgeY));

            var navPulse = 0.3 + 0.2 * Math.sin(time * 2);
            var aSize = 10;

            ctx.save();
            ctx.fillStyle = 'rgba(198, 141, 85, ' + navPulse + ')';
            ctx.shadowColor = 'rgba(198, 141, 85, 0.6)';
            ctx.shadowBlur = 15;

            // Triangle arrow
            ctx.beginPath();
            ctx.moveTo(edgeX + Math.cos(navAngle) * aSize * 1.5, edgeY + Math.sin(navAngle) * aSize * 1.5);
            ctx.lineTo(edgeX + Math.cos(navAngle + 2.5) * aSize, edgeY + Math.sin(navAngle + 2.5) * aSize);
            ctx.lineTo(edgeX + Math.cos(navAngle - 2.5) * aSize, edgeY + Math.sin(navAngle - 2.5) * aSize);
            ctx.closePath();
            ctx.fill();

            // Small dot trail
            for (var di = 1; di <= 3; di++) {
              var dx = edgeX - Math.cos(navAngle) * di * 12;
              var dy = edgeY - Math.sin(navAngle) * di * 12;
              ctx.beginPath();
              ctx.arc(dx, dy, 2.5 - di * 0.5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(198, 141, 85, ' + (navPulse * (1 - di * 0.25)) + ')';
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }
    }

    // ── 7. Proximity whispers — cartographer's unfinished notes at the fog edge ──
    // Suppress during tutorial so hint text doesn't compete
    if ((spotlightPos || !searchMode) && tutorialStep >= TUTORIAL_STEPS) {
      var mousePos = spotlightPos;
      if (!mousePos && lastMousePos) mousePos = lastMousePos;
      if (mousePos) {
        ctx.globalCompositeOperation = 'source-over';

        // Find the single closest undiscovered location with a whisper
        var whisperRange = 220;
        var closestWhisper = null;
        var closestWhisperDist = whisperRange;

        locs.forEach(function(loc) {
          if (discovered[loc.id]) return;
          var whisper = WHISPERS[loc.id];
          if (!whisper) return;
          var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
          var d = Math.sqrt(Math.pow(mousePos.x - pt.x, 2) + Math.pow(mousePos.y - pt.y, 2));
          if (d < closestWhisperDist && d > 30) {
            closestWhisperDist = d;
            closestWhisper = { loc: loc, whisper: whisper, pt: pt, dist: d };
          }
        });

        if (closestWhisper) {
          // Fade based on distance
          var wFade = Math.max(0, 1 - (closestWhisper.dist - 60) / (whisperRange - 60));
          wFade = wFade * wFade;
          var breathPhase = (closestWhisper.loc.lat + closestWhisper.loc.lng) * 0.01;
          var breathFade = 0.85 + 0.15 * Math.sin(breathTime + breathPhase);
          var wAlpha = wFade * breathFade;
          if (wAlpha > 0.03) {
            ctx.save();
            ctx.font = 'italic 16px "Cormorant Garamond", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Position: above the cursor, clamped to viewport
            var textX = mousePos.x;
            var textY = mousePos.y - 55;
            var tw = ctx.measureText(closestWhisper.whisper).width + 32;
            var th = 34;
            var tx = textX - tw / 2;
            var ty = textY - th / 2;
            if (tx < 10) tx = 10;
            if (tx + tw > w - 10) tx = w - tw - 10;
            if (ty < 10) ty = 10;

            // Dark pill background
            ctx.fillStyle = 'rgba(8, 10, 14, ' + (wAlpha * 0.88).toFixed(3) + ')';
            ctx.beginPath();
            ctx.roundRect(tx, ty, tw, th, 8);
            ctx.fill();

            // Subtle border
            ctx.strokeStyle = 'rgba(180, 160, 120, ' + (wAlpha * 0.35).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(tx, ty, tw, th, 8);
            ctx.stroke();

            // Text
            ctx.fillStyle = 'rgba(210, 200, 175, ' + wAlpha.toFixed(3) + ')';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText(closestWhisper.whisper, tx + tw / 2, ty + th / 2);
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }
      }
    }
  }

  /* ════════════════════════════════════════════════
     DISCOVER
     ════════════════════════════════════════════════ */
  function discoverLocation(loc) {
    // Tutorial: instant reveal for steps 0-2, spotlight search for step 3+
    var isTutorial = tutorialStep < TUTORIAL_STEPS;
    var useInstant = isTutorial && TUTORIAL_INSTANT_STEPS.indexOf(tutorialStep) > -1;

    if (useInstant) {
      instantDiscover(loc);
      return;
    }

    // Regions get immediate complete discovery (they show in mist visually but count as found)
    if (loc.type === 'region' || loc.type === 'water') {
      discovered[loc.id] = { at: Date.now(), phase: 'mist' };
      localStorage.setItem(LS_KEY, JSON.stringify(discovered));
      revealMarker(loc.id);
      animateReveal(loc);
      showCelebration(loc);
      playDiscoveryChime();
      setTimeout(function() { showDiscoveryCard(loc); }, 600);
      updateProgress();
      showDiscoveryToast(loc);
      return;
    }

    // Phase 1: pinhole + enter search mode
    discovered[loc.id] = { at: Date.now(), phase: 'searching' };
    localStorage.setItem(LS_KEY, JSON.stringify(discovered));

    removeTutorialHint();
    animateReveal(loc);
    enterSearchMode(loc);
    updateProgress();

    // During tutorial, show the search hint after pinhole opens
    if (isTutorial && TUTORIAL_DEFS[tutorialStep] && TUTORIAL_DEFS[tutorialStep].action === 'search') {
      // Show search tooltip, then advance to find-key step
      setTimeout(function() {
        tutorialHintLoc = loc;
        advanceTutorial(); // moves to step 4 (find-key)
      }, 800);
    }
  }

  function instantDiscover(loc) {
    discovered[loc.id] = { at: Date.now(), phase: 'complete' };
    localStorage.setItem(LS_KEY, JSON.stringify(discovered));

    removeTutorialHint();
    revealMarker(loc.id);
    animateReveal(loc);
    showCelebration(loc);
    playDiscoveryChime();
    setTimeout(function() { showDiscoveryCard(loc); }, 600);
    updateProgress();
    showDiscoveryToast(loc);

    if (tutorialStep < TUTORIAL_STEPS) {
      // Restore hint loc so the next step has a position to anchor to
      tutorialHintLoc = loc;
      if (tutorialStep === TUTORIAL_CARD_STEP - 1) {
        // Step 0 done → advance to step 1 (card reading)
        advanceTutorial();
      } else if (tutorialStep !== TUTORIAL_CARD_STEP) {
        // Normal advance for click steps
        advanceTutorial();
      }
    }
  }

  // Enter search mode — place a hidden key in the fog ring
  function enterSearchMode(loc) {
    // Random angle and distance for the key
    var angle = Math.random() * Math.PI * 2;
    var dist = 30 + Math.random() * 30; // world units from loc center (closer = findable)

    searchMode = {
      locId: loc.id,
      loc: loc,
      keyLat: loc.lat + Math.sin(angle) * dist,
      keyLng: loc.lng + Math.cos(angle) * dist,
      startTime: Date.now()
    };

    // Initialize spotlight at the pinhole center so it works immediately
    var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
    spotlightPos = { x: pt.x, y: pt.y };

    console.log('[FOG] Search mode: find the key for', loc.name);
  }

  function completeDiscovery(loc) {
    console.log('[FOG] \u2713 Key found! Full reveal:', loc.name);

    // Keep spotlight visible during reveal animation — don't snap away
    // searchMode and spotlightPos stay alive until animation ends

    discovered[loc.id] = { at: discovered[loc.id].at, phase: 'complete' };
    localStorage.setItem(LS_KEY, JSON.stringify(discovered));

    revealMarker(loc.id);
    animateReveal(loc, PINHOLE_SCALE, function() {
      // Clear search mode AFTER the reveal animation completes
      searchMode = null;
      spotlightPos = null;
    });
    showCelebration(loc);
    playDiscoveryChime();
    setTimeout(function() { showDiscoveryCard(loc); }, 600);
    updateProgress();
    showDiscoveryToast(loc);

    // Advance tutorial if in search steps
    if (tutorialStep < TUTORIAL_STEPS) {
      advanceTutorial();
    }
  }

  // Mouse/touch tracking for spotlight
  function setupSpotlightTracking() {
    document.addEventListener('mousemove', function(e) {
      if (!map) return;
      var container = map.getContainer();
      var rect = container.getBoundingClientRect();
      var pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      lastMousePos = pos; // always track for whispers
      if (searchMode) spotlightPos = pos;
    });

    document.addEventListener('touchmove', function(e) {
      if (!map) return;
      var touch = e.touches[0];
      if (!touch) return;
      var container = map.getContainer();
      var rect = container.getBoundingClientRect();
      var pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      lastMousePos = pos;
      if (searchMode) spotlightPos = pos;
    }, { passive: true });
  }

  function showDiscoveryToast(loc) {
    var total = (window.LOCATIONS || []).length;
    var found = Object.keys(discovered).filter(function(id) {
      return discovered[id].phase === 'complete';
    }).length;

    var old = document.getElementById('discovery-toast');
    if (old) old.remove();

    var toast = document.createElement('div');
    toast.id = 'discovery-toast';
    toast.style.cssText =
      'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);z-index:900;' +
      'background:rgba(10,12,16,0.92);border:1px solid rgba(198,141,85,0.4);' +
      'border-radius:8px;padding:12px 24px;text-align:center;' +
      'font-family:"Cinzel",serif;color:#efe7d2;pointer-events:none;' +
      'opacity:0;transition:opacity 0.5s ease;';

    toast.innerHTML =
      '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c68d55;margin-bottom:4px;">Location Discovered</div>' +
      '<div style="font-size:15px;font-weight:600;">' + loc.name + '</div>' +
      '<div style="font-size:12px;color:#bfb299;margin-top:6px;">' + found + ' of ' + total + ' locations charted</div>';

    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 600);
    }, 3000);
  }

  /* ════════════════════════════════════════════════
     REVEAL ANIMATION
     ════════════════════════════════════════════════ */
  function animateReveal(loc, startFrom, onComplete) {
    animatingReveal = loc.id;
    var fromVal = startFrom || 0;
    revealProgress = fromVal;
    var start = performance.now();
    var dur = 1100; // slightly longer for drama

    // Elastic ease-out: overshoots to ~115% then settles
    function elasticOut(t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -8 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    }

    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = elasticOut(t);
      revealProgress = fromVal + (1 - fromVal) * eased;
      draw();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        revealProgress = 1; // settle exactly at 1
        animatingReveal = null;
        if (onComplete) onComplete();
      }
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

    // Primary burst — golden dust
    var count = 20;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'celebration-particle';
      var a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var d = 50 + Math.random() * 80;
      p.style.setProperty('--tx', Math.cos(a) * d + 'px');
      p.style.setProperty('--ty', Math.sin(a) * d + 'px');
      p.style.animationDelay = (Math.random() * 0.15) + 's';
      burst.appendChild(p);
    }

    // Secondary wave — smaller, slower particles
    setTimeout(function() {
      for (var j = 0; j < 8; j++) {
        var p2 = document.createElement('div');
        p2.className = 'celebration-particle';
        p2.style.width = '3px';
        p2.style.height = '3px';
        var a2 = Math.random() * Math.PI * 2;
        var d2 = 30 + Math.random() * 50;
        p2.style.setProperty('--tx', Math.cos(a2) * d2 + 'px');
        p2.style.setProperty('--ty', Math.sin(a2) * d2 + 'px');
        p2.style.animationDelay = (Math.random() * 0.2) + 's';
        p2.style.animationDuration = '1.2s';
        burst.appendChild(p2);
      }
    }, 200);

    setTimeout(function() { burst.remove(); }, 2000);
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
    var locs = window.LOCATIONS || [];

    // ── Elena's Journey track ──
    var journeyTotal = journeyPath.length;
    var journeyFound = journeyPath.filter(function(s) { return !!discovered[s.locationId]; }).length;
    var journeyPct = journeyTotal > 0 ? journeyFound / journeyTotal : 0;

    // ── Regions track ──
    var regionLocs = locs.filter(function(l) { return l.type === 'region' || l.type === 'water'; });
    var regionTotal = regionLocs.length;
    var regionFound = regionLocs.filter(function(l) { return !!discovered[l.id]; }).length;
    var regionPct = regionTotal > 0 ? regionFound / regionTotal : 0;

    // Combined pct for rank
    var combined = (journeyFound + regionFound) / Math.max(1, journeyTotal + regionTotal);

    var fillJ  = document.getElementById('progress-fill');
    var countJ = document.getElementById('progress-count');
    var fillR  = document.getElementById('progress-fill-regions');
    var countR = document.getElementById('progress-count-regions');
    var title  = document.getElementById('progress-title');
    var label  = document.getElementById('progress-label');

    if (fillJ)  fillJ.style.width  = (journeyPct * 100) + '%';
    if (countJ) countJ.innerHTML   = journeyFound + ' <span>/ ' + journeyTotal + '</span>';
    if (fillR)  fillR.style.width  = (regionPct * 100) + '%';
    if (countR) countR.innerHTML   = regionFound + ' <span>/ ' + regionTotal + '</span>';
    if (label)  label.textContent  = '';  // unused now

    var rank = 'Apprentice Scribe';
    if (combined > 0.12) rank = 'Cartographer';
    if (combined > 0.35) rank = 'Senior Cartographer';
    if (combined > 0.60) rank = 'Magus Scribe';
    if (combined > 0.82) rank = 'Master Cartographer';
    if (title) title.textContent = rank;

    // Check god reveals — count ALL completed discoveries
    var totalDiscovered = Object.keys(discovered).filter(function(id) {
      return discovered[id].phase === 'complete';
    }).length;
    checkGodReveals(totalDiscovered);

    // Milestone sparks at 5, 10, 15 (total combined discoveries)
    var milestones = [5, 10, 15];
    if (milestones.indexOf(totalDiscovered) > -1 && totalDiscovered > 0) {
      triggerMilestoneSpark(totalDiscovered);
    }

    // Pulse whichever count just changed
    function pulseEl(el, color) {
      if (!el) return;
      el.style.transition = 'none';
      el.style.color = color || '#d4a843';
      el.style.transform = 'scale(1.25)';
      setTimeout(function() {
        el.style.transition = 'color 0.8s ease, transform 0.6s ease';
        el.style.color = '';
        el.style.transform = '';
      }, 50);
    }
    pulseEl(countJ, '#d4a843');
    pulseEl(countR, '#7ab8c8');

    // ── Finale checks ──
    checkJourneyFinale(journeyFound, journeyTotal);
    checkVol1Finale();
  }

  // Track whether finales have already fired
  var finaleState = {
    journey: false,
    vol1: false,
    constellationLines: [] // [{x1,y1,x2,y2}, ...] persisted after draw
  };

  function checkJourneyFinale(found, total) {
    if (finaleState.journey) return;
    if (found < total || total === 0) return;
    finaleState.journey = true;
    // Build constellation line data
    buildConstellationLines();
    // Short pause then draw lines + show closing toast
    setTimeout(drawConstellationAnimation, 800);
    setTimeout(showJourneyToast, 5000);
  }

  function checkVol1Finale() {
    if (finaleState.vol1) return;
    var vol1Locs = (window.LOCATIONS || []).filter(function(l) { return l.volume1; });
    var vol1Found = vol1Locs.filter(function(l) {
      return discovered[l.id] && discovered[l.id].phase === 'complete';
    }).length;
    if (vol1Found < vol1Locs.length || vol1Locs.length === 0) return;
    finaleState.vol1 = true;
    setTimeout(triggerFogWaveClear, 2000);
    setTimeout(awakenAzu, 5500);
  }

  function buildConstellationLines() {
    finaleState.constellationLines = [];
    for (var i = 0; i < journeyPath.length - 1; i++) {
      var a = journeyPath[i];
      var b = journeyPath[i + 1];
      if (discovered[a.locationId] && discovered[b.locationId]) {
        var locA = (window.LOCATIONS || []).find(function(l) { return l.id === a.locationId; });
        var locB = (window.LOCATIONS || []).find(function(l) { return l.id === b.locationId; });
        if (locA && locB) {
          finaleState.constellationLines.push({ a: locA, b: locB });
        }
      }
    }
  }

  // Animate constellation lines drawing in one by one
  function drawConstellationAnimation() {
    var lines = finaleState.constellationLines;
    if (!lines.length) return;
    var lineProgress = 0; // which line segment we're drawing (float)
    var totalLines = lines.length;
    var start = performance.now();
    var lineDur = 300; // ms per segment

    function frame(now) {
      lineProgress = Math.min(totalLines, (now - start) / lineDur);
      finaleState.constellationDrawProgress = lineProgress;
      draw();
      if (lineProgress < totalLines) {
        requestAnimationFrame(frame);
      } else {
        finaleState.constellationDrawProgress = totalLines;
        draw();
      }
    }
    requestAnimationFrame(frame);
  }

  // Fog wave clear — gentle radial sweep from center
  var fogWaveClearProgress = 0; // 0 = no clear, 1 = fully thinned
  function triggerFogWaveClear() {
    var start = performance.now();
    var dur = 3500;
    function frame(now) {
      fogWaveClearProgress = Math.min(1, (now - start) / dur);
      draw();
      if (fogWaveClearProgress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function awakenAzu() {
    var el = document.getElementById('azu-medallion');
    if (!el) return;
    el.classList.add('azu-awakening');
    // Play a grand chord
    if (audioCtx) {
      [130, 196, 261, 392].forEach(function(freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + i * 0.08 + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 4);
        osc.start(audioCtx.currentTime + i * 0.08);
        osc.stop(audioCtx.currentTime + 4.5);
      });
    }
    setTimeout(function() { el.classList.add('azu-unlocked'); }, 1500);
  }

  function triggerMilestoneSpark(count) {
    // Spark from the progress bar area
    var bar = document.getElementById('progress-container');
    if (!bar) return;
    var rect = bar.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top;
    for (var i = 0; i < 14; i++) {
      var spark = document.createElement('div');
      spark.style.cssText =
        'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:4px;height:4px;' +
        'border-radius:50%;background:#d4a843;pointer-events:none;z-index:900;' +
        'animation:spark-fly 1.2s ease-out forwards;';
      var a = (i / 14) * Math.PI * 2;
      var d = 40 + Math.random() * 60;
      spark.style.setProperty('--sx', Math.cos(a) * d + 'px');
      spark.style.setProperty('--sy', Math.sin(a) * d + 'px');
      spark.style.animationDelay = (Math.random() * 0.2) + 's';
      document.body.appendChild(spark);
      setTimeout(function(s) { s.remove(); }, 1500, spark);
    }
  }

  function showJourneyToast() {
    var overlay = document.getElementById('finale-overlay');
    if (overlay) overlay.classList.add('visible');
  }

  // Constellation lines are drawn in the main draw() loop — hook them in here
  // This flag tells draw() to render them
  window._finaleState = finaleState;
  window._fogWaveClearProgress = function() { return fogWaveClearProgress; };

  /* ════════════════════════════════════════════════
     GOD REVEALS — driven by MEDALLION_DEFS array
     ════════════════════════════════════════════════ */

  var revealedGods = {}; // track which gods have been revealed

  function checkGodReveals(count) {
    var defs = window.MEDALLION_DEFS;
    if (!defs) return;
    defs.forEach(function(m) {
      if (revealedGods[m.name]) return; // already revealed
      if (m.unlock && count >= m.unlock) {
        revealGod(m);
      }
    });
  }

  function revealGod(m) {
    revealedGods[m.name] = true;

    // Play a deep chime — guardians get a higher, brighter tone
    if (audioCtx) {
      var freq = m.guardian ? 220 : 130; // A3 for guardians, C2 for the Nine
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 3);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 3);

      // Add harmonic overtone for richer sound
      var osc2 = audioCtx.createOscillator();
      var gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.5; // perfect fifth
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 2.5);
    }

    // Show celebration toast
    var typeLabel = m.guardian ? 'GUARDIAN AWAKENED' : 'THE FRAME STIRS';
    showGodRevealToast(m.name, m.role, typeLabel);

    // Permanently reveal via torch overlay
    if (window.addPermanentMedallionGlow) window.addPermanentMedallionGlow(m.name);

    // Save to localStorage
    try {
      var saved = JSON.parse(localStorage.getItem('revealedGods') || '{}');
      saved[m.name] = true;
      localStorage.setItem('revealedGods', JSON.stringify(saved));
    } catch(e) {}
  }

  function initTetradCircles() {
    // Restore previously revealed gods — but validate against current discovery count
    var currentCount = Object.keys(discovered).length;
    var defs = window.MEDALLION_DEFS || [];
    try {
      var saved = JSON.parse(localStorage.getItem('revealedGods') || '{}');
      Object.keys(saved).forEach(function(name) {
        // Find the medallion def to check threshold
        var def = defs.find(function(m) { return m.name === name; });
        if (def && def.unlock && currentCount >= def.unlock && !revealedGods[name]) {
          revealedGods[name] = true;
          if (window.addPermanentMedallionGlow) window.addPermanentMedallionGlow(name);
        }
      });
    } catch(e) {}
  }

  function showGodRevealToast(name, role, typeLabel) {
    var old = document.getElementById('god-toast');
    if (old) old.remove();

    // Screen-edge gold glow
    var glow = document.createElement('div');
    glow.id = 'god-toast-glow';
    glow.style.cssText =
      'position:fixed;inset:0;z-index:949;pointer-events:none;' +
      'box-shadow:inset 0 0 120px rgba(212,168,67,0.4), inset 0 0 60px rgba(198,141,85,0.2);' +
      'opacity:0;transition:opacity 1.5s ease;';
    document.body.appendChild(glow);

    var toast = document.createElement('div');
    toast.id = 'god-toast';
    toast.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);z-index:950;' +
      'background:radial-gradient(ellipse at center, rgba(15,12,8,0.97), rgba(10,12,16,0.95));' +
      'border:1px solid rgba(212,168,67,0.5);' +
      'border-radius:12px;padding:30px 60px;text-align:center;pointer-events:none;' +
      'opacity:0;transition:opacity 1.2s ease, transform 1.2s ease;' +
      'box-shadow:0 0 60px rgba(212,168,67,0.15), 0 0 20px rgba(0,0,0,0.8);';
    toast.innerHTML =
      '<div style="font-family:Cinzel,serif;font-size:10px;color:#c68d55;text-transform:uppercase;letter-spacing:4px;margin-bottom:10px;opacity:0.8;">' + (typeLabel || 'THE FRAME STIRS') + '</div>' +
      '<div style="font-family:Cinzel,serif;font-size:28px;color:#d4a843;letter-spacing:3px;text-shadow:0 0 20px rgba(212,168,67,0.4);">' + name + '</div>' +
      (role ? '<div style="font-family:EB Garamond,serif;font-size:14px;color:#bfb299;font-style:italic;margin-top:8px;letter-spacing:1px;">' + role + '</div>' : '') +
      '<div style="font-family:EB Garamond,serif;font-size:12px;color:#8a7d6b;margin-top:14px;letter-spacing:2px;text-transform:uppercase;">has awakened</div>';
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
      glow.style.opacity = '1';
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%,-50%) scale(1)';
      setTimeout(function() {
        glow.style.opacity = '0';
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%,-50%) scale(1.05)';
        setTimeout(function() { toast.remove(); glow.remove(); }, 1500);
      }, 5000);
    });
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
    toggleAmbient: toggleAmbient,
    getDiscovered: function() { return discovered; },
    getNextLocation: getNextPathLocation,
    initTetradCircles: initTetradCircles,
    _revealedGods: revealedGods,
    reset: function() { localStorage.removeItem(LS_KEY); localStorage.removeItem('revealedGods'); location.reload(); }
  };
})();
