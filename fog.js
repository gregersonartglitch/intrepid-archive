/* ═══════════════════════════════════════════════════════════════
   FOG SYSTEM — The Hollowlands Atlas
   Clean implementation: textured fog, simple radial clearing,
   3-step guided tutorial, document-level click handling.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var LS_KEY = 'intrepid_atlas_discovered';
  var CLICK_RADIUS = 110;   // how close (px) user must click to the glow
  var TUTORIAL_STEPS = 7;  // 7-step guided walkthrough
  var SPOTLIGHT_RADIUS = 60; // px — size of the mouse lantern
  var SPOTLIGHT_ATTACH_RADIUS = 320; // px — lantern detaches beyond this from search center/key
  var KEY_FIND_RADIUS = 50;  // px — how close to key to reveal it
  var KEY_CLICK_RADIUS = 50; // px — how close to key to click it
  var PINHOLE_SCALE = 0.2;   // fraction of full reveal radius for pinhole
  var HINT_DELAY = 5000;     // ms before key starts hinting
  var CHIME_ESCAPE_MS = 60000;    // after 60s in search mode, boost hints
  var CHIME_ESCAPE_CLICKS = 20;   // or after N map clicks during search
  var POST_TUTORIAL_HINT_LS = 'intrepid_post_tutorial_hinted';
  var POST_TUTORIAL_HINT_TIMEOUT = 15000;
  var BREATH_SPEED = 0.15;   // how fast the fog edges breathe (cycles/sec)
  var BREATH_AMP = 0.06;     // how much the edges expand/contract (fraction)
  // Medallion reveal announcement — much larger than normal site reveal (80 map units)
  var GUARDIAN_REVEAL_GLOW_MIN = 360;  // px — Tetrad guardians (Utu, Rapha, Mish, Gu)
  var GOD_REVEAL_GLOW_MIN = 300;       // px — The Eight Apkallu sigils
  var MEDALLION_REVEAL_MS = 5200;      // how long the announcing pulse runs
  // Volume 2 journey gate — fires when Mish guardian medallion awakens (6:00 · unlock 13).
  // NOT on Mish map location discovery — player continues through sinn first.
  // Kill switch: ENABLE_VOL2_JOURNEY_GATE = false removes the gate entirely.
  // Manual unlock: localStorage.setItem('intrepid_vol2_journey_unlocked','1')
  // Force lock:   localStorage.setItem('intrepid_vol2_journey_locked','1')
  // URL override: ?vol2unlock on the map URL (local QA only)
  var ENABLE_VOL2_JOURNEY_GATE = true;
  var VOL2_UNLOCK_AT = '2026-12-01T00:00:00Z'; // set to Vol 2 launch UTC when known
  var VOL2_GUARDIAN_TRIGGER = 'Mish'; // Tetrad South · winged archer · MEDALLION_DEFS unlock 13
  var VOL2_JOURNEY_CAP_ID = 'sinn'; // last journey stop before Vol 2 seals onward (indras-na)
  var VOL2_GATE_LS_UNLOCK = 'intrepid_vol2_journey_unlocked';
  var VOL2_GATE_LS_LOCK = 'intrepid_vol2_journey_locked';
  var VOL2_GATE_TOAST_LS = 'intrepid_vol2_gate_toast_shown';
  var VOL2_FEEDBACK_EMAIL = 'info@intrepidgraphicnovel.com';
  // Sabella/Scribe chime-heat clue popups — default OFF until Jon approves.
  // Enable: ?sabellaclues on map URL, or localStorage intrepid_sabella_clues_enabled=1
  // Kill switch: ENABLE_SABELLA_CLUE_POPUPS = false
  var ENABLE_SABELLA_CLUE_POPUPS = false;
  var SABELLA_CLUES_LS = 'intrepid_sabella_clues_enabled';
  var SECRETS_COLLECTED_LS = 'intrepid_secrets_collected';
  var CHIME_CLUE_BANDS = [
    { id: 'warm', threshold: 0.35, eyebrow: 'Getting warmer' },
    { id: 'hot', threshold: 0.65, eyebrow: 'Getting hotter' },
    { id: 'burning', threshold: 0.85, eyebrow: 'Almost there' }
  ];
  var CHIME_CLUE_CONTENT = {
    'sabellas-hut': {
      warm: { speaker: 'Scribe', text: 'Faster beeps mean you draw closer to the hidden sigil.' },
      hot: { speaker: 'Sabella', text: 'Larger inside than it looks from the road. She warned me not to measure the rooms.' },
      burning: { speaker: 'Scribe', text: 'The sigil glows beneath your lantern — tap it.' }
    },
    '_default': {
      warm: { speaker: 'Scribe', text: 'Listen — the chime quickens when your lantern nears the mark.' },
      hot: { speaker: 'Sabella', text: 'She left this trace in the fog. The chime is your compass now.' },
      burning: { speaker: 'Scribe', text: 'You are almost upon it. Look for the amber sigil.' }
    }
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
  var clusterPeek = {};        // undiscovered cluster siblings made visible after parent find
  var locationPanelFn = null;  // set by index.html — all location lore uses the right sidebar
  var postTutorialHintTimer = null;
  var postTutorialHintPending = false;

  // When a journey site is found, its nearby companions become visible + glow.
  var SITE_CLUSTERS = {
    'tower-nine': ['maxim-stone']
  };

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
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(function() {
        playPing(frequency, duration, volume);
      });
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
    if (!audioCtx || !searchMode || searchMode.silenced) return;
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
     AMBIENT SOUNDSCAPE — shared MP3 loop (default on)
     ════════════════════════════════════════════════ */
  var AMBIENT_LS_KEY = 'intrepid_ambient_enabled';
  var AMBIENT_SRC = 'assets/audio/ambient.mp3';
  var AMBIENT_VOLUME = 0.2;
  var AMBIENT_FADE_MS = 2500;
  var ambientStarted = false;
  var ambientEnabled = true;
  var ambientAudio = null;
  var ambientFadeRAF = null;

  function loadAmbientPreference() {
    try {
      var stored = localStorage.getItem(AMBIENT_LS_KEY);
      if (stored === null) {
        ambientEnabled = true;
      } else {
        ambientEnabled = stored === 'true';
      }
    } catch (e) {
      ambientEnabled = true;
    }
  }

  function updateAmbientButton() {
    var btn = document.getElementById('ambient-toggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', ambientEnabled ? 'true' : 'false');
    btn.classList.toggle('is-off', !ambientEnabled);
  }

  function ensureAmbientAudio() {
    if (ambientAudio) return ambientAudio;
    ambientAudio = new Audio(AMBIENT_SRC);
    ambientAudio.loop = true;
    ambientAudio.volume = 0;
    ambientAudio.preload = 'auto';
    ambientAudio.load();
    return ambientAudio;
  }

  function cancelAmbientFade() {
    if (ambientFadeRAF) {
      cancelAnimationFrame(ambientFadeRAF);
      ambientFadeRAF = null;
    }
  }

  function fadeAmbientIn() {
    var audio = ensureAmbientAudio();
    if (ambientFadeRAF) return;
    if (audio.volume >= AMBIENT_VOLUME) return;
    var fromVol = audio.volume;
    var startTime = null;
    function step(ts) {
      if (!ambientEnabled) {
        cancelAmbientFade();
        return;
      }
      if (!startTime) startTime = ts;
      var t = Math.min(1, (ts - startTime) / AMBIENT_FADE_MS);
      audio.volume = fromVol + (AMBIENT_VOLUME - fromVol) * t;
      if (t < 1) {
        ambientFadeRAF = requestAnimationFrame(step);
      } else {
        ambientFadeRAF = null;
        audio.volume = AMBIENT_VOLUME;
      }
    }
    ambientFadeRAF = requestAnimationFrame(step);
  }

  function startAmbientPlayback() {
    var audio = ensureAmbientAudio();
    if (!audio.paused && audio.volume >= AMBIENT_VOLUME * 0.95) return;
    var playPromise = audio.play();
    if (playPromise && playPromise.then) {
      playPromise.then(function() { fadeAmbientIn(); }).catch(function() { /* blocked */ });
    } else {
      fadeAmbientIn();
    }
  }

  function playAmbient() {
    ensureAmbientAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(function() { startAmbientPlayback(); });
      return;
    }
    startAmbientPlayback();
  }

  function stopAmbient() {
    cancelAmbientFade();
    if (!ambientAudio) return;
    ambientAudio.pause();
    ambientAudio.volume = 0;
  }

  function initAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;
    loadAmbientPreference();
    updateAmbientButton();
    if (ambientEnabled) playAmbient();
  }

  function toggleAmbient() {
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (!ambientStarted) {
      ambientStarted = true;
      loadAmbientPreference();
    }
    ambientEnabled = !ambientEnabled;
    try {
      localStorage.setItem(AMBIENT_LS_KEY, ambientEnabled ? 'true' : 'false');
    } catch (e) { /* private browsing */ }
    updateAmbientButton();
    if (ambientEnabled) playAmbient();
    else stopAmbient();
  }

  function unlockAmbientOnGesture() {
    if (!ambientStarted) {
      ambientStarted = true;
      loadAmbientPreference();
      updateAmbientButton();
    }
    if (!ambientEnabled) return;
    playAmbient();
  }

  /* ════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════ */
  function init(leafletMap, mapConfig) {
    map = leafletMap;
    cfg = mapConfig;
    journeyPath = window.JOURNEY_PATH || [];

    // Auto-clear stale localStorage when fog system version changes
    var FOG_VERSION = 20;
    var storedVersion = parseInt(localStorage.getItem(LS_KEY + '_v') || '0');
    if (storedVersion !== FOG_VERSION) {
      localStorage.removeItem(LS_KEY);
      localStorage.setItem(LS_KEY + '_v', FOG_VERSION);
      console.log('[FOG] Cleared old state (v' + storedVersion + ' → v' + FOG_VERSION + ')');
    }

    // Load saved state
    try { discovered = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch(e) { discovered = {}; }

    loadAmbientPreference();
    updateAmbientButton();
    ensureAmbientAudio();

    // Load fog texture (solid #141820 fill still renders if missing)
    fogTexture = new Image();
    fogTexture.onload = function() { textureReady = true; draw(); };
    fogTexture.onerror = function() { textureReady = false; draw(); };
    fogTexture.src = 'fog_texture.png';

    // Remove any stale fog canvas (e.g. from older builds that used fogPane or beacon split)
    var staleFog = map.getContainer().querySelectorAll('.fog-canvas, .beacon-canvas');
    for (var si = 0; si < staleFog.length; si++) staleFog[si].remove();

    // Create fog canvas on the map container (must not live in a 0×0 Leaflet pane)
    fogCanvas = document.createElement('canvas');
    fogCanvas.className = 'fog-canvas';
    fogCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:450;pointer-events:none;';
    map.getContainer().appendChild(fogCanvas);
    fogCtx = fogCanvas.getContext('2d');

    // Setup click handling on document (capture phase — unfailable)
    setupClickHandler();
    setupSpotlightTracking();

    // Redraw on map events; detach lantern when pan moves search zone off-screen
    map.on('move', syncSpotlightAttachment);
    map.on('move zoom viewreset resize zoomend', draw);
    window.addEventListener('resize', draw);
    draw();

    // Prune stale god reveals before progress/gate logic (MEDALLION_DEFS set in index.html)
    if (window.MEDALLION_DEFS && window.MEDALLION_DEFS.length) {
      initTetradCircles();
    }

    // UI
    updateProgress();
    suppressAnimations = false; // from now on, new reveals get the full ceremony
    addResetButton();
    addGuideButton();

    // Tutorial — never derive step from total discovery count (early sites inflate it).
    resolveTutorialStepOnInit();
    if (tutorialStep < TUTORIAL_STEPS) {
      startTutorial();
    }
    // Post-tutorial: golden glow guides the player — no auto-fly to distant Mish.

    if (isFullyDiscovered('sabellas-hut') && shouldShowPostTutorialHint()) {
      maybeFlyToNextJourneyStep(2000);
      setTimeout(schedulePostTutorialHint, 2000);
    }

    if (discovered['tower-nine']) {
      peekClusterSites('tower-nine');
    }

    // Sync marker visibility with saved discoveries (buildMarkers runs before init)
    var savedIds = Object.keys(discovered);
    for (var ri = 0; ri < savedIds.length; ri++) {
      revealMarker(savedIds[ri]);
    }
  }

  /* ════════════════════════════════════════════════
     CLICK HANDLER — document capture phase
     Fires before ALL other click handlers on the page.
     ════════════════════════════════════════════════ */
  function setupClickHandler() {
    var mouseDownX = 0, mouseDownY = 0;
    // UI chrome — bail before audio init or proximity scans (capture phase runs first)
    var FOG_UI_SKIP = '#layers, #panel, #discovery-card, #progress-container, .leaflet-control-zoom, ' +
      '#medallion-hotspots, .medallion-hot, ' +
      '#fog-reset-btn, #fog-guide-btn, #ambient-toggle, .journey-fab, .hdr-v1-btn, .hdr-home-btn, ' +
      '#sabella-clue-popup, #post-tutorial-hint, #chime-escape-hint, #guide-hint-toast, ' +
      '.panel-close, #welcome, #landing, #gate, #journey-toast, #coord-unlock, #finale-overlay, ' +
      '.zctl-btn, .landing-action, .welcome-btn, .gate-card, .jt-btn, .finale-action, #gate-btn, ' +
      '#gate-eye, #gate-pw, #coord-toggle, #coord-submit, #coord-input';

    function isFogUiTarget(e) {
      return !!(e.target && e.target.closest && e.target.closest(FOG_UI_SKIP));
    }

    function primeAudioDeferred() {
      ensureAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      // Defer ambient unlock so discovery/reveal runs in this turn first
      if (!ambientStarted) setTimeout(initAmbient, 0);
      else if (ambientEnabled) playAmbient();
    }

    document.addEventListener('mousedown', function(e) {
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
    }, true);

    document.addEventListener('click', function(e) {
      if (window.EDIT_MODE) return;
      if (!map) return;

      var container = map.getContainer();
      var clickedInsideMap = container.contains(e.target);

      // Allow close button to dismiss card
      if (e.target.closest('.dc-close, .dc-dismiss-btn')) {
        var card = document.getElementById('discovery-card');
        if (card) card.classList.remove('visible');
        return;
      }

      // Marker/label clicks are handled by Leaflet in edit mode only.
      if (window.EDIT_MODE && e.target.closest('.leaflet-marker-icon')) return;

      // Skip UI elements — must run before audio/proximity (capture phase blocks their handlers)
      if (isFogUiTarget(e)) return;

      // Normal discovery clicks must start inside the map. Search-mode clicks
      // may land over the decorative frame/medallions, because the hidden key
      // can appear visually behind that art at some zoom levels.
      if (!clickedInsideMap && !searchMode) return;

      // Skip drags
      var dx = e.clientX - mouseDownX;
      var dy = e.clientY - mouseDownY;
      if (Math.sqrt(dx * dx + dy * dy) > 8) return;

      // Close location panel if open
      var panelEl = document.getElementById('panel');
      if (panelEl && panelEl.classList.contains('open')) {
        if (window.closeLocationPanel) window.closeLocationPanel();
        else panelEl.classList.remove('open');
        return;
      }

      // Close discovery card if open (medallions / sigils)
      var card = document.getElementById('discovery-card');
      if (card && card.classList.contains('visible')) {
        card.classList.remove('visible');
        return;
      }

      primeAudioDeferred();

      // Where did user click (container-relative)?
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      // Check proximity to the next clickable location
      // ── Direct golden-glow click: if user clicks within the section 3 glow
      // area, trigger the next journey step immediately. This ensures the large
      // visible golden orb is always clickable regardless of radius edge cases.
      if (!searchMode) {
        var glowNextId = getNextPathLocation();
        if (glowNextId) {
          var glowNextLoc = (window.LOCATIONS || []).find(function(l) { return l.id === glowNextId; });
          if (glowNextLoc) {
            var gnpt = map.latLngToContainerPoint([glowNextLoc.lat, glowNextLoc.lng]);
            var gnDist = Math.sqrt(Math.pow(x - gnpt.x, 2) + Math.pow(y - gnpt.y, 2));
            if (gnDist < 130) {
              e.stopPropagation(); e.preventDefault();
              if (glowNextId === FINAL_ELENA_STOP && !explorationComplete()) {
                showLockedMessage();
                return;
              }
              discoverLocation(glowNextLoc);
              return;
            }
          }
        }
      }

      // Vol 2 sealed beacon — click the dim star at Monastery of the Wind, etc.
      if (!searchMode && isVol2JourneyGateBlocking()) {
        var sealedId = getVol2FirstSealedStepId();
        var sealedLoc = sealedId ? (window.LOCATIONS || []).find(function(l) { return l.id === sealedId; }) : null;
        if (sealedLoc) {
          var spt = map.latLngToContainerPoint([sealedLoc.lat, sealedLoc.lng]);
          var sDist = Math.sqrt(Math.pow(x - spt.x, 2) + Math.pow(y - spt.y, 2));
          if (sDist < 130) {
            e.stopPropagation(); e.preventDefault();
            showVol2LockedMessage(false);
            return;
          }
        }
      }

      var locs = window.LOCATIONS || [];
      var closest = null;
      var closestDist = Infinity;

      locs.forEach(function(loc) {
        if (!isClickable(loc.id)) return;
        var pt = map.latLngToContainerPoint(getInteractionLatLng(loc));
        var d = Math.sqrt(Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2));
        var locRadius = clickRadiusFor(loc);
        if (d < locRadius && d < closestDist) {
          closest = loc;
          closestDist = d;
        }
      });

      // During search mode: check for key click first
      if (searchMode) {
        searchMode.mapClicks = (searchMode.mapClicks || 0) + 1;
        maybeChimeEscapeHint();
        var clickRadius = searchMode.escapeBoost ? KEY_CLICK_RADIUS * 1.6 : KEY_CLICK_RADIUS;
        var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
        var keyDist = Math.sqrt(Math.pow(x - keyPt.x, 2) + Math.pow(y - keyPt.y, 2));
        if (keyDist < clickRadius) {
          e.stopPropagation();
          e.preventDefault();
          completeDiscovery(searchMode.loc);
          return;
        }
        // If the click hit a non-story location (region, city, etc), allow it through
        if (closest && closest.type !== 'story') {
          discoverLocation(closest);
        }
        return; // still block story location clicks during search
      }

      if (closest) {
        console.log('[FOG] ✓ Discovering:', closest.id);
        e.stopPropagation();
        e.preventDefault();
        discoverLocation(closest);
      } else {
        // Check for a DISCOVERED location nearby — reopen its card
        var discLoc = null, discDist = Infinity;
        (window.LOCATIONS || []).forEach(function(loc) {
          var d2 = discovered[loc.id];
          if (!d2 || d2.phase === 'searching') return; // not yet complete
          var pt = map.latLngToContainerPoint(getInteractionLatLng(loc));
          var d = Math.sqrt(Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2));
          if (d < clickRadiusFor(loc) && d < discDist) { discLoc = loc; discDist = d; }
        });
        if (discLoc) {
          e.stopPropagation();
          e.preventDefault();
          showDiscoveryCard(discLoc);
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
      var touchedInsideMap = container.contains(e.target);
      if (isFogUiTarget(e)) return;
      if (e.target.closest('.leaflet-marker-icon')) return;
      if (!touchedInsideMap && !searchMode) return;

      var touch = e.changedTouches[0];
      if (!touch) return;
      if (Math.sqrt(Math.pow(touch.clientX-touchStartX,2)+Math.pow(touch.clientY-touchStartY,2)) > 15) return;

      var panelEl = document.getElementById('panel');
      if (panelEl && panelEl.classList.contains('open')) {
        if (window.closeLocationPanel) window.closeLocationPanel();
        else panelEl.classList.remove('open');
        return;
      }

      var card = document.getElementById('discovery-card');
      if (card && card.classList.contains('visible')) { card.classList.remove('visible'); return; }

      primeAudioDeferred();

      var rect = container.getBoundingClientRect();
      var x = touch.clientX - rect.left;
      var y = touch.clientY - rect.top;
      var locs = window.LOCATIONS || [];
      var closest = null, closestDist = Infinity;
      locs.forEach(function(loc) {
        if (!isClickable(loc.id)) return;
        var pt = map.latLngToContainerPoint(getInteractionLatLng(loc));
        var d = Math.sqrt(Math.pow(x-pt.x,2)+Math.pow(y-pt.y,2));
        if (d < clickRadiusFor(loc) && d < closestDist) { closest = loc; closestDist = d; }
      });
      // During search mode: check for key tap first
      if (searchMode) {
        searchMode.mapClicks = (searchMode.mapClicks || 0) + 1;
        maybeChimeEscapeHint();
        var touchClickRadius = searchMode.escapeBoost ? (KEY_CLICK_RADIUS + 18) : (KEY_CLICK_RADIUS + 10);
        var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
        var keyDist = Math.sqrt(Math.pow(x - keyPt.x, 2) + Math.pow(y - keyPt.y, 2));
        if (keyDist < touchClickRadius) { // slightly larger for touch
          e.preventDefault();
          completeDiscovery(searchMode.loc);
          return;
        }
        // Allow non-story locations (regions, cities) to be tapped during search
        if (closest && closest.type !== 'story') {
          e.preventDefault();
          discoverLocation(closest);
        }
        return;
      }
      if (closest) {
        e.preventDefault();
        discoverLocation(closest);
      } else {
        // Check for a DISCOVERED location nearby — reopen its card
        var discLoc = null, discDist = Infinity;
        (window.LOCATIONS || []).forEach(function(loc) {
          var d2 = discovered[loc.id];
          if (!d2 || d2.phase === 'searching') return;
          var pt = map.latLngToContainerPoint(getInteractionLatLng(loc));
          var d = Math.sqrt(Math.pow(x-pt.x,2)+Math.pow(y-pt.y,2));
          if (d < clickRadiusFor(loc) && d < discDist) { discLoc = loc; discDist = d; }
        });
        if (discLoc) {
          e.preventDefault();
          showDiscoveryCard(discLoc);
        }
      }
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
    { msg: 'Do you see the light in the mist? Tap it.', action: 'click', display: 'canvas' },
    { msg: 'You made a discovery! Read the card, then close it.', action: 'close-card', display: 'toast' },
    { msg: 'A new light has appeared. Follow it.', action: 'click', display: 'canvas' },
    { msg: 'Close the card — then look for the next glow nearby.', action: 'search', display: 'toast' },
    { msg: 'Listen for the chime — faster beeps mean you are over the target. Look for the diagonal point.', action: 'find-key', display: 'canvas' },
    { msg: 'When the beeping quickens, tap that spot to reveal what lies beneath.', action: 'auto', display: 'toast' },
    { msg: 'The archive is yours, Cartographer. Explore freely.', action: 'auto', display: 'toast' }
  ];

  // Which tutorial steps use instant reveal (no spotlight search)
  var TUTORIAL_INSTANT_STEPS = [0, 1, 2];
  // Step that waits for card close (doesn't advance on discover)
  var TUTORIAL_CARD_STEP = 1;

  // Tutorial resume on reload — discovery count is wrong when territories/sites were
  // found early (e.g. Gates/Ashal during Sabella chime search).
  function resolveTutorialStepOnInit() {
    if (isFullyDiscovered('sabellas-hut')) {
      tutorialStep = TUTORIAL_STEPS;
      return;
    }
    if (discovered['sabellas-hut']) {
      // Pinhole open, key not found — resume the find-key step.
      tutorialStep = 4;
      return;
    }
    var clusterIds = ['crossing-pool', 'dawn-spear', 'sabellas-hut'];
    var step = 0;
    for (var ci = 0; ci < clusterIds.length; ci++) {
      if (!isFullyDiscovered(clusterIds[ci])) break;
      step = ci + 1;
    }
    tutorialStep = Math.min(step, TUTORIAL_STEPS - 1);
  }

  function isPostTutorial() {
    return !!discovered['sabellas-hut'];
  }

  // Pan to the next journey glow when it would be off-screen (Mish is ~2k units from Sabella's cluster).
  function maybeFlyToNextJourneyStep(delayMs) {
    if (!map) return;
    var nextId = getNextPathLocation();
    if (!nextId) return;
    var nextLoc = (window.LOCATIONS || []).find(function(l) { return l.id === nextId; });
    if (!nextLoc) return;
    var center = map.getCenter();
    var dx = center.lat - nextLoc.lat;
    var dy = center.lng - nextLoc.lng;
    if (Math.sqrt(dx * dx + dy * dy) < 600) return;
    setTimeout(function() {
      if (!map) return;
      map.flyTo([nextLoc.lat, nextLoc.lng], map.getMinZoom() + 2, { duration: 1.8 });
    }, delayMs || 1200);
  }

  function startTutorial() {
    if (isFullyDiscovered('sabellas-hut')) return;
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
    var def = TUTORIAL_DEFS[tutorialStep];
    console.log('[TUTORIAL] Step', tutorialStep, ':', def.msg);

    // Toast-type messages: show as big centered screen overlay
    if (def.display === 'toast') {
      showPersistentTutorialToast(def.msg);
    }

    // Step 1 (card reading) — listen for card close
    if (tutorialStep === TUTORIAL_CARD_STEP) {
      waitForCardClose();
    }
  }

  // Persistent toast that stays until the next tutorial step — very prominent
  function showPersistentTutorialToast(msg) {
    removePersistentToast();

    // Inject pulse animation once
    if (!document.getElementById('tut-toast-style')) {
      var s = document.createElement('style');
      s.id = 'tut-toast-style';
      s.textContent = '@keyframes tutBorderPulse { 0%,100%{border-color:rgba(198,141,85,0.4)} 50%{border-color:rgba(212,168,67,0.9)} }';
      document.head.appendChild(s);
    }

    var toast = document.createElement('div');
    toast.id = 'tutorial-persistent-toast';
    toast.style.cssText =
      'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:2000;' +
      'background:rgba(8,10,14,0.97);' +
      'border:2px solid rgba(198,141,85,0.6);border-radius:14px;' +
      'padding:24px 48px;text-align:center;max-width:520px;width:90%;' +
      'font-family:"Montserrat","Segoe UI",sans-serif;color:#efe7d2;pointer-events:none;' +
      'font-size:20px;letter-spacing:0.5px;line-height:1.6;' +
      'box-shadow:0 12px 60px rgba(0,0,0,0.85),0 0 40px rgba(198,141,85,0.12);' +
      'animation:tutBorderPulse 2s ease-in-out infinite;' +
      'opacity:0;transition:opacity 0.5s ease;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
  }

  function removePersistentToast() {
    var old = document.getElementById('tutorial-persistent-toast');
    if (old) {
      old.style.opacity = '0';
      setTimeout(function() { old.remove(); }, 600);
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
    removePersistentToast();
  }

  function advanceTutorial() {
    tutorialStep++;
    console.log('[TUTORIAL] Advanced to step', tutorialStep);

    if (tutorialStep >= TUTORIAL_STEPS) {
      removeTutorialHint();
      console.log('[TUTORIAL] Complete!');
      schedulePostTutorialHint();
      return;
    }

    var def = TUTORIAL_DEFS[tutorialStep];

    // Always show the screen toast first for toast-type steps
    if (def.display === 'toast') {
      showPersistentTutorialToast(def.msg);
    }

    // Auto-dismiss steps — show toast, wait, then advance
    if (def.action === 'auto') {
      removeTutorialHint();
      setTimeout(function() { advanceTutorial(); }, 2500);
      return;
    }

    // Card-close step — show the toast, then wait for card close
    if (def.action === 'close-card') {
      // tutorialHintLoc was set by instantDiscover before advancing
      waitForCardClose();
      return;
    }

    // Search step — update hint to the NEXT journey location so the player can click it
    // to enter pinhole/chime search mode. Without this, tutorialHintLoc stays on the
    // just-discovered previous step and blocks the click.
    if (def.action === 'search') {
      var nextId = getNextPathLocation();
      var locs = window.LOCATIONS || [];
      var nextLoc = locs.find(function(l) { return l.id === nextId; });
      if (nextLoc) tutorialHintLoc = nextLoc; // makes sabellas-hut clickable
      return;
    }

    // Find-key step — tutorialHintLoc is already the search location (set by discoverLocation)
    if (def.action === 'find-key') {
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
     POST-TUTORIAL HINT — glow legend after Sabella's Hut
     ════════════════════════════════════════════════ */
  function shouldShowPostTutorialHint() {
    if (localStorage.getItem(POST_TUTORIAL_HINT_LS) === 'yes') return false;
    return isFullyDiscovered('sabellas-hut');
  }

  function dismissPostTutorialHint(save) {
    if (postTutorialHintTimer) {
      clearTimeout(postTutorialHintTimer);
      postTutorialHintTimer = null;
    }
    postTutorialHintPending = false;
    var toast = document.getElementById('post-tutorial-hint');
    if (toast) {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 500);
    }
    if (save) {
      try { localStorage.setItem(POST_TUTORIAL_HINT_LS, 'yes'); } catch (e) {}
    }
  }

  function showPostTutorialHint() {
    if (!shouldShowPostTutorialHint()) return;
    if (document.getElementById('post-tutorial-hint')) return;

    if (!document.getElementById('tut-toast-style')) {
      var s = document.createElement('style');
      s.id = 'tut-toast-style';
      s.textContent = '@keyframes tutBorderPulse { 0%,100%{border-color:rgba(198,141,85,0.4)} 50%{border-color:rgba(212,168,67,0.9)} }';
      document.head.appendChild(s);
    }

    var toast = document.createElement('div');
    toast.id = 'post-tutorial-hint';
    toast.style.cssText =
      'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:2000;cursor:pointer;' +
      'background:rgba(8,10,14,0.97);' +
      'border:2px solid rgba(198,141,85,0.6);border-radius:14px;' +
      'padding:22px 36px;text-align:center;max-width:520px;width:90%;' +
      'font-family:"Montserrat","Segoe UI",sans-serif;color:#efe7d2;' +
      'box-shadow:0 12px 60px rgba(0,0,0,0.85),0 0 40px rgba(198,141,85,0.12);' +
      'animation:tutBorderPulse 2s ease-in-out infinite;' +
      'opacity:0;transition:opacity 0.5s ease;';
    toast.innerHTML =
      '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#d4a843;' +
        'margin-bottom:12px;font-family:Cinzel,serif;">Cartographer\u2019s Charge</div>' +
      '<div style="font-size:18px;letter-spacing:0.3px;line-height:1.6;margin-bottom:14px;">' +
        'Seek the glowing marks on the map \u2014 click each one to chart what lies hidden.</div>' +
      '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;text-align:left;display:inline-block;">' +
        '<span style="color:#d4a843;">\u25cf</span> Gold \u2014 Elena\u2019s next step<br>' +
        '<span style="color:#e08a40;">\u25cf</span> Orange \u2014 uncharted territories<br>' +
        '<span style="color:#e8c840;">\u25cf</span> Amber \u2014 cartographer sites</div>' +
      '<div style="font-size:9px;color:#5a5045;margin-top:14px;font-style:italic;' +
        'font-family:EB Garamond,serif;">tap to dismiss</div>';
    toast.addEventListener('click', function() { dismissPostTutorialHint(true); });
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    postTutorialHintTimer = setTimeout(function() {
      dismissPostTutorialHint(true);
    }, POST_TUTORIAL_HINT_TIMEOUT);
  }

  function schedulePostTutorialHint() {
    if (!shouldShowPostTutorialHint()) return;
    if (postTutorialHintPending || document.getElementById('post-tutorial-hint')) return;
    postTutorialHintPending = true;

    function tryShow() {
      var panelEl = document.getElementById('panel');
      var cardEl = document.getElementById('discovery-card');
      var panelOpen = panelEl && panelEl.classList.contains('open');
      var cardOpen = cardEl && cardEl.classList.contains('visible');
      var tutToast = document.getElementById('tutorial-persistent-toast');

      if (panelOpen || cardOpen || tutToast) {
        setTimeout(tryShow, 400);
        return;
      }
      postTutorialHintPending = false;
      showPostTutorialHint();
    }

    setTimeout(tryShow, 800);
  }

  function maybeDismissPostTutorialOnDiscover(loc) {
    if (!document.getElementById('post-tutorial-hint')) return;
    if (isTerritory(loc) || loc.cartographerSite) {
      dismissPostTutorialHint(true);
    }
  }

  /* ════════════════════════════════════════════════
     PATH LOGIC
     ════════════════════════════════════════════════ */
  // The final Elena stop — locked until all territories + cartographer sites are charted
  var FINAL_ELENA_STOP = 'indras-na';

  function getJourneyStepIndex(locId) {
    for (var ji = 0; ji < journeyPath.length; ji++) {
      if (journeyPath[ji].locationId === locId) return ji;
    }
    return -1;
  }

  function getMedallionDiscoveryCount() {
    return Object.keys(discovered).length;
  }

  function getMishGuardianDef() {
    var defs = window.MEDALLION_DEFS || [];
    for (var mi = 0; mi < defs.length; mi++) {
      if (defs[mi].name === VOL2_GUARDIAN_TRIGGER) return defs[mi];
    }
    return null;
  }

  // Mish guardian only counts as awakened when reveal state matches discovery threshold.
  function isMishGuardianRevealed() {
    if (!revealedGods[VOL2_GUARDIAN_TRIGGER]) return false;
    var mishDef = getMishGuardianDef();
    if (mishDef && mishDef.unlock && getMedallionDiscoveryCount() < mishDef.unlock) return false;
    return true;
  }

  function getVol2CapStepIndex() {
    return getJourneyStepIndex(VOL2_JOURNEY_CAP_ID);
  }

  function getVol2FirstSealedStepId() {
    var capIdx = getVol2CapStepIndex();
    if (capIdx < 0 || capIdx + 1 >= journeyPath.length) return null;
    return journeyPath[capIdx + 1].locationId;
  }

  function isVol2JourneyUnlocked() {
    if (!ENABLE_VOL2_JOURNEY_GATE) return true;
    if (typeof location !== 'undefined' && location.search.indexOf('vol2unlock') > -1) return true;
    try {
      if (localStorage.getItem(VOL2_GATE_LS_UNLOCK) === '1') return true;
      if (localStorage.getItem(VOL2_GATE_LS_LOCK) === '1') return false;
    } catch (e) {}
    var parsed = Date.parse(VOL2_UNLOCK_AT);
    if (!isNaN(parsed) && Date.now() >= parsed) return true;
    return false;
  }

  function isVol2LockedJourneyStep(locId) {
    if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
    if (!isMishGuardianRevealed()) return false;
    if (!isOnPath(locId)) return false;
    var capIdx = getVol2CapStepIndex();
    var stepIdx = getJourneyStepIndex(locId);
    if (capIdx < 0 || stepIdx < 0) return false;
    return stepIdx > capIdx;
  }

  function isVol2JourneyGateBlocking() {
    if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return false;
    if (!isMishGuardianRevealed()) return false;
    var capIdx = getVol2CapStepIndex();
    if (capIdx < 0) return false;
    for (var vi = capIdx + 1; vi < journeyPath.length; vi++) {
      if (!isFullyDiscovered(journeyPath[vi].locationId)) return true;
    }
    return false;
  }

  function formatVol2Countdown() {
    var parsed = Date.parse(VOL2_UNLOCK_AT);
    if (isNaN(parsed)) return '';
    var remainingMs = Math.max(0, parsed - Date.now());
    if (remainingMs <= 0) return '';
    var totalMin = Math.ceil(remainingMs / 60000);
    var days = Math.floor(totalMin / (60 * 24));
    var hours = Math.floor((totalMin % (60 * 24)) / 60);
    var mins = totalMin % 60;
    if (days > 0) return days + 'd ' + hours + 'h';
    if (hours > 0) return hours + 'h ' + mins + 'm';
    return mins + 'm';
  }

  function explorationComplete() {
    var allLocs = window.LOCATIONS || [];
    var regionLocs = allLocs.filter(function(l) { return l.type === 'region'; });
    var regionsComplete = regionLocs.every(function(l) { return !!discovered[l.id]; });
    var siteLocs = allLocs.filter(function(l) { return !!l.cartographerSite; });
    var sitesComplete = siteLocs.every(function(l) { return !!discovered[l.id]; });
    return regionsComplete && sitesComplete;
  }

  function getNextPathLocation() {
    for (var i = 0; i < journeyPath.length; i++) {
      var stepId = journeyPath[i].locationId;
      // Must match updateProgress / isFullyDiscovered — searching phase is not complete
      if (!isFullyDiscovered(stepId)) {
        // Final Elena beat stays sealed until the map is fully charted
        if (stepId === FINAL_ELENA_STOP && !explorationComplete()) {
          return null;
        }
        // Vol 2 gate — skip sealed post-sinn stops after Mish guardian awakens
        if (isVol2LockedJourneyStep(stepId)) {
          continue;
        }
        return stepId;
      }
    }
    return null;
  }

  function isOnPath(locId) {
    return journeyPath.some(function(s) { return s.locationId === locId; });
  }

  function isFullyDiscovered(locId) {
    var d = discovered[locId];
    if (!d) return false;
    if (d.phase === 'searching') return false;
    // Journey stops (chime search) only count after phase:'complete'
    if (isOnPath(locId)) {
      return d.phase === 'complete' || (!d.phase && d.at);
    }
    // Other locations: mist reveal or legacy saves without phase
    if (d.phase === 'mist' || d.phase === 'complete') return true;
    if (!d.phase) return true;
    return false;
  }

  function isPathComplete() {
    return journeyPath.every(function(s) { return isFullyDiscovered(s.locationId); });
  }

  var TERRITORY_GLOW_RADIUS = 500;
  var TERRITORY_FRONTIER_RADIUS = 1800;

  function isTerritory(loc) {
    return loc && (loc.type === 'region' || loc.type === 'water');
  }

  function getInteractionLatLng(loc) {
    return [
      loc.hotspotLat != null ? loc.hotspotLat : loc.lat,
      loc.hotspotLng != null ? loc.hotspotLng : loc.lng
    ];
  }

  function hasNearbyNonTerritoryDiscovery(loc, radius) {
    var allLocs = window.LOCATIONS || [];
    var nearby = false;
    Object.keys(discovered).forEach(function(dId) {
      if (nearby) return;
      var dLoc = allLocs.find(function(l) { return l.id === dId; });
      if (!dLoc || isTerritory(dLoc)) return;
      var dx = loc.lat - dLoc.lat, dy = loc.lng - dLoc.lng;
      if (Math.sqrt(dx * dx + dy * dy) < radius) nearby = true;
    });
    return nearby;
  }

  function hasNearbyTerritoryDiscovery(loc, radius) {
    var allLocs = window.LOCATIONS || [];
    var nearby = false;
    Object.keys(discovered).forEach(function(dId) {
      if (nearby) return;
      var dLoc = allLocs.find(function(l) { return l.id === dId; });
      if (!isTerritory(dLoc)) return;
      var dx = loc.lat - dLoc.lat, dy = loc.lng - dLoc.lng;
      if (Math.sqrt(dx * dx + dy * dy) < radius) nearby = true;
    });
    return nearby;
  }

  var _fallbackTerritoryCache = null;
  var _fallbackTerritoryDiscCount = -1;

  function getFallbackTerritoryId() {
    var discCount = Object.keys(discovered).length;
    if (_fallbackTerritoryDiscCount === discCount) return _fallbackTerritoryCache;

    var allLocs = window.LOCATIONS || [];
    var undiscoveredTerritories = allLocs.filter(function(l) {
      return isTerritory(l) && !discovered[l.id];
    });
    if (!undiscoveredTerritories.length) {
      _fallbackTerritoryCache = null;
      _fallbackTerritoryDiscCount = discCount;
      return null;
    }

    // Normal/frontier glows take priority. Fallback only prevents dead-ends
    // after coordinate edits leave every territory outside the intended radius.
    var hasNormalGlow = undiscoveredTerritories.some(function(loc) {
      return hasNearbyNonTerritoryDiscovery(loc, TERRITORY_GLOW_RADIUS) ||
             hasNearbyTerritoryDiscovery(loc, TERRITORY_FRONTIER_RADIUS);
    });
    if (hasNormalGlow) {
      _fallbackTerritoryCache = null;
      _fallbackTerritoryDiscCount = discCount;
      return null;
    }

    var best = null;
    var bestD = Infinity;
    undiscoveredTerritories.forEach(function(loc) {
      Object.keys(discovered).forEach(function(dId) {
        var dLoc = allLocs.find(function(l) { return l.id === dId; });
        if (!dLoc || isTerritory(dLoc)) return;
        var dx = loc.lat - dLoc.lat, dy = loc.lng - dLoc.lng;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) {
          bestD = d;
          best = loc;
        }
      });
    });
    _fallbackTerritoryCache = best ? best.id : null;
    _fallbackTerritoryDiscCount = discCount;
    return _fallbackTerritoryCache;
  }

  function territoryHasGlow(loc) {
    return hasNearbyNonTerritoryDiscovery(loc, TERRITORY_GLOW_RADIUS) ||
           hasNearbyTerritoryDiscovery(loc, TERRITORY_FRONTIER_RADIUS) ||
           loc.id === getFallbackTerritoryId();
  }

  function nearestTerritoryIsDiscovered(loc) {
    var allLocs = window.LOCATIONS || [];
    var nearestRegion = null, nrDist = Infinity;
    allLocs.forEach(function(r) {
      if (!isTerritory(r)) return;
      var dx = loc.lat - r.lat, dy = loc.lng - r.lng;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < nrDist) {
        nrDist = d;
        nearestRegion = r;
      }
    });
    return !!(nearestRegion && discovered[nearestRegion.id]);
  }

  function isClickable(locId) {
    if (discovered[locId]) return false;

    var allLocs = window.LOCATIONS || [];
    var loc = allLocs.find(function(l) { return l.id === locId; });
    if (!loc) return false;

    // Gate the final Elena stop: requires all territories + cartographer sites first
    if (locId === FINAL_ELENA_STOP && !explorationComplete()) {
      return false;
    }

    // Vol 2 gate — post-sinn journey stops stay dark after Mish guardian awakens
    if (isVol2LockedJourneyStep(locId)) {
      return false;
    }

    // During tutorial (before Sabella's Hut is found): ONLY the current guided
    // journey step is clickable. The instant sabellas-hut is discovered, the
    // full proximity system unlocks — no waiting for toast delays.
    if (!isPostTutorial() && tutorialHintLoc) {
      return locId === tutorialHintLoc.id;
    }

    // ── Post-tutorial: NO GLOW = NOT CLICKABLE ──
    // Check if this location is within 400 units of any discovered location
    // (same proximity gate the beacon draw uses)
    var nearCleared = false;
    Object.keys(discovered).forEach(function(dId) {
      if (nearCleared) return;
      var dLoc = allLocs.find(function(l) { return l.id === dId; });
      if (!dLoc) return;
      var dx = loc.lat - dLoc.lat, dy = loc.lng - dLoc.lng;
      if (Math.sqrt(dx * dx + dy * dy) < 400) nearCleared = true;
    });

    // Story path locations: clickable if it's the next step (golden glow)
    // OR if cleared fog has reached it (amber star visible)
    // OR if it's a revealed cluster companion at this tower
    if (loc.type === 'story') {
      return locId === getNextPathLocation() || nearCleared || !!clusterPeek[locId];
    }

    // Journey cities (Sinn, Indras Na, etc.) — follow the golden path only
    if (isOnPath(locId)) {
      return locId === getNextPathLocation();
    }

    // Territories: clickable exactly when their orange glow is visible.
    if (isTerritory(loc)) {
      return territoryHasGlow(loc);
    }

    // CartographerSites (amber star): clickable when the same amber star is visible.
    if (loc.cartographerSite) {
      return nearCleared || nearestTerritoryIsDiscovered(loc) || !!clusterPeek[locId];
    }

    // Everything else: no glow drawn, not clickable
    return false;
  }


  // Show a brief locked message when the player clicks the final stop too early
  function showLockedMessage() {
    var old = document.getElementById('locked-msg');
    if (old) old.remove();

    // Count remaining work to give specific guidance
    var locs = window.LOCATIONS || [];
    var undiscRegions = locs.filter(function(l) { return l.type === 'region' && !discovered[l.id]; }).length;
    var undiscCities  = locs.filter(function(l) { return !!l.cartographerSite && !discovered[l.id]; }).length;
    var remaining = [];
    if (undiscRegions > 0) remaining.push(undiscRegions + ' ' + (undiscRegions === 1 ? 'territory' : 'territories'));
    if (undiscCities  > 0) remaining.push(undiscCities  + ' ' + (undiscCities  === 1 ? 'city or site' : 'cities &amp; sites'));

    var el = document.createElement('div');
    el.id = 'locked-msg';
    el.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-60%);z-index:1100;cursor:pointer;' +
      'background:rgba(8,10,14,0.97);border:2px solid rgba(180,80,60,0.7);' +
      'border-radius:14px;padding:28px 48px;text-align:center;max-width:560px;width:90%;' +
      'font-family:"EB Garamond",Georgia,serif;color:#efe7d2;' +
      'font-size:16px;line-height:1.7;' +
      'box-shadow:0 12px 60px rgba(0,0,0,0.85),0 0 40px rgba(180,80,60,0.15);' +
      'opacity:0;transition:opacity 0.4s ease;';
    el.innerHTML =
      '<div style="font-size:12px;color:#c87060;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;font-family:Cinzel,serif;">The Path Is Sealed</div>' +
      '<div style="margin-bottom:14px;">Chart every territory and ancient site before Elena\'s journey can end. <strong style="color:#d4a843;">' + remaining.join(' and ') + '</strong> remain uncharted.</div>' +
      '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;">' +
        '<span style="color:#d99040;">◈ Orange shimmer in the fog</span> — an undiscovered territory. Click it to reveal.<br>' +
        '<span style="color:#d4a843;">★ Amber star</span> — a hidden location. Click to search with hot &amp; cold chime.' +
      '</div>' +
      '<div style="font-size:11px;color:#6a6055;margin-top:16px;font-style:italic;">tap to dismiss</div>';
    document.body.appendChild(el);

    function dismiss() {
      el.style.opacity = '0';
      setTimeout(function() { el.remove(); }, 600);
    }
    el.addEventListener('click', dismiss);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { el.style.opacity = '1'; });
    });
    setTimeout(dismiss, 7000);
  }

  // Brief modal when Elena cannot continue past Mish until Volume 2 Kickstarter
  function showVol2LockedMessage(isWelcome) {
    var old = document.getElementById('locked-msg');
    if (old) old.remove();

    var sealedId = getVol2FirstSealedStepId();
    var sealedLoc = (window.LOCATIONS || []).find(function(l) { return l.id === sealedId; });
    var nextName = sealedLoc ? sealedLoc.name : 'the next chapter';
    var countdown = formatVol2Countdown();
    var countdownLine = countdown
      ? '<div style="font-size:13px;color:#8ab4d4;margin-top:10px;">Volume 2 Kickstarter opens in <strong style="color:#b8d4f0;">' + countdown + '</strong></div>'
      : '';
    var emailLink =
      '<a href="mailto:' + VOL2_FEEDBACK_EMAIL + '" style="color:#b8d4f0;text-decoration:underline;" onclick="event.stopPropagation();">' +
      VOL2_FEEDBACK_EMAIL + '</a>';

    var el = document.createElement('div');
    el.id = 'locked-msg';
    el.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-60%);z-index:1100;cursor:pointer;' +
      'background:rgba(8,10,14,0.97);border:2px solid rgba(100,140,200,0.55);' +
      'border-radius:14px;padding:28px 48px;text-align:center;max-width:560px;width:90%;' +
      'font-family:"EB Garamond",Georgia,serif;color:#efe7d2;' +
      'font-size:16px;line-height:1.7;' +
      'box-shadow:0 12px 60px rgba(0,0,0,0.85),0 0 40px rgba(100,140,200,0.12);' +
      'opacity:0;transition:opacity 0.4s ease;';
    el.innerHTML =
      '<div style="font-size:12px;color:#8ab4d4;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;font-family:Cinzel,serif;">' +
        'Congratulations' +
      '</div>' +
      '<div style="margin-bottom:14px;">You\u2019ve awakened <strong style="color:#d4a843;">Mish</strong>, Defender of the South \u2014 Volume 1 is complete. More journey locations will open with the <strong style="color:#b8d4f0;">kickstarter launch of Volume 2</strong>. <strong style="color:#d4a843;">' + nextName + '</strong> and the stops beyond await that launch.</div>' +
      '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;margin-bottom:10px;">You can still chart territories and hidden sites across the Hollowlands.</div>' +
      '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;">Spotted a bug or have feedback? Write us at ' + emailLink + '.</div>' +
      countdownLine +
      '<div style="font-size:11px;color:#6a6055;margin-top:16px;font-style:italic;">tap to dismiss</div>';
    document.body.appendChild(el);

    function dismiss() {
      el.style.opacity = '0';
      setTimeout(function() { el.remove(); }, 600);
    }
    el.addEventListener('click', dismiss);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { el.style.opacity = '1'; });
    });
    setTimeout(dismiss, isWelcome ? 9000 : 7000);
  }

  function maybeShowVol2GateToast() {
    if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return;
    if (!isMishGuardianRevealed()) return;
    if (!isVol2JourneyGateBlocking()) return;
    try {
      if (localStorage.getItem(VOL2_GATE_TOAST_LS) === '1') return;
      localStorage.setItem(VOL2_GATE_TOAST_LS, '1');
    } catch (e) {}
    setTimeout(function() { showVol2LockedMessage(true); }, 1400);
  }


  /* ════════════════════════════════════════════════
     CANVAS SIZE — match container rect + devicePixelRatio
     ════════════════════════════════════════════════ */
  function syncFogCanvasSize() {
    var container = map.getContainer();
    var rect = container.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(rect.width));
    var cssH = Math.max(1, Math.round(rect.height));
    var dpr = window.devicePixelRatio || 1;
    var bufW = Math.round(cssW * dpr);
    var bufH = Math.round(cssH * dpr);

    if (fogCanvas.width !== bufW || fogCanvas.height !== bufH) {
      fogCanvas.width = bufW;
      fogCanvas.height = bufH;
      fogCanvas.style.width = cssW + 'px';
      fogCanvas.style.height = cssH + 'px';
      fogCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return { w: cssW, h: cssH };
  }

  // Golden / orange / amber beacons — drawn AFTER fog clears so destination-out
  // in section 4 does not erase glow pixels (Chrome composite bleed).
  function drawBeaconGlows(ctx, w, h, time) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    var nextId = getNextPathLocation();
    var locs = window.LOCATIONS || [];

    // ── Golden glow on next journey step ──
    if (nextId) {
      var glowLoc = locs.find(function(l) { return l.id === nextId; });
      var tutorialBlocked = (!isPostTutorial() && tutorialHintLoc &&
                             nextId !== tutorialHintLoc.id);
      if (glowLoc && !tutorialBlocked) {
        var gpt = map.latLngToContainerPoint([glowLoc.lat, glowLoc.lng]);
        if (gpt.x > -100 && gpt.x < w + 100 && gpt.y > -100 && gpt.y < h + 100) {
          var pulse = 0.2 + Math.sin(time * 2) * 0.1;
          var outerR = 50 + Math.sin(time * 1.5) * 10;

          ctx.globalCompositeOperation = 'destination-out';
          var holeGrad = ctx.createRadialGradient(gpt.x, gpt.y, 0, gpt.x, gpt.y, outerR);
          holeGrad.addColorStop(0,   'rgba(0,0,0,0.35)');
          holeGrad.addColorStop(0.4, 'rgba(0,0,0,0.15)');
          holeGrad.addColorStop(0.8, 'rgba(0,0,0,0.03)');
          holeGrad.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = holeGrad;
          ctx.beginPath();
          ctx.arc(gpt.x, gpt.y, outerR, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalCompositeOperation = 'source-over';
          var glow = ctx.createRadialGradient(gpt.x, gpt.y, 0, gpt.x, gpt.y, outerR);
          glow.addColorStop(0,    'rgba(255, 240, 180, ' + (pulse + 0.25) + ')');
          glow.addColorStop(0.3,  'rgba(212, 168, 67, '  + (pulse + 0.1)  + ')');
          glow.addColorStop(0.7,  'rgba(198, 141, 85, '  + (pulse * 0.5)  + ')');
          glow.addColorStop(1,    'rgba(198, 141, 85, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(gpt.x, gpt.y, outerR, 0, Math.PI * 2);
          ctx.fill();

          var coreR = 8 + Math.sin(time * 3) * 3;
          var core = ctx.createRadialGradient(gpt.x, gpt.y, 0, gpt.x, gpt.y, coreR);
          core.addColorStop(0, 'rgba(255, 252, 220, 0.85)');
          core.addColorStop(1, 'rgba(212, 168, 67, 0)');
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(gpt.x, gpt.y, coreR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (isVol2JourneyGateBlocking()) {
      var sealedId = getVol2FirstSealedStepId();
      var sealedLoc = sealedId ? locs.find(function(l) { return l.id === sealedId; }) : null;
      if (sealedLoc) {
        var spt = map.latLngToContainerPoint([sealedLoc.lat, sealedLoc.lng]);
        if (spt.x > -100 && spt.x < w + 100 && spt.y > -100 && spt.y < h + 100) {
          var sealPulse = 0.12 + Math.sin(time * 1.2) * 0.05;
          var sealR = 38 + Math.sin(time * 0.9) * 6;
          ctx.globalCompositeOperation = 'source-over';
          var sealGrad = ctx.createRadialGradient(spt.x, spt.y, 0, spt.x, spt.y, sealR);
          sealGrad.addColorStop(0, 'rgba(140, 170, 210, ' + (sealPulse + 0.08) + ')');
          sealGrad.addColorStop(0.5, 'rgba(90, 110, 150, ' + sealPulse + ')');
          sealGrad.addColorStop(1, 'rgba(70, 85, 120, 0)');
          ctx.fillStyle = sealGrad;
          ctx.beginPath();
          ctx.arc(spt.x, spt.y, sealR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(180, 200, 230, ' + (0.35 + sealPulse) + ')';
          ctx.font = 'bold 14px Cinzel, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2726', spt.x, spt.y);
        }
      }
    }

    // ── Orange territory + amber site beacons ──
    locs.forEach(function(loc) {
      if (discovered[loc.id]) return;
      if (!isPostTutorial()) return;
      if (isVol2LockedJourneyStep(loc.id)) return;

      if (loc.type === 'story' && loc.id !== nextId) {
        var storyNearDisc = false;
        Object.keys(discovered).forEach(function(dId) {
          if (storyNearDisc) return;
          var dLoc = locs.find(function(l) { return l.id === dId; });
          if (!dLoc) return;
          var dx = loc.lat - dLoc.lat, dy = loc.lng - dLoc.lng;
          if (Math.sqrt(dx * dx + dy * dy) < 400) storyNearDisc = true;
        });
        if (!storyNearDisc) return;
      }

      var pt = map.latLngToContainerPoint(getInteractionLatLng(loc));
      if (pt.x < -120 || pt.x > w + 120 || pt.y < -120 || pt.y > h + 120) return;

      var isRegion = isTerritory(loc);

      if (isRegion) {
        if (!territoryHasGlow(loc)) return;

        var shimmerAlpha = 0.30 + Math.sin(time * 0.9 + loc.lat * 0.01) * 0.08;
        var shimmerR = 88 + Math.sin(time * 0.4 + loc.lng * 0.008) * 14;

        ctx.globalCompositeOperation = 'destination-out';
        var territoryHole = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, shimmerR * 1.05);
        territoryHole.addColorStop(0,   'rgba(0,0,0,0.30)');
        territoryHole.addColorStop(0.45,'rgba(0,0,0,0.14)');
        territoryHole.addColorStop(0.8, 'rgba(0,0,0,0.04)');
        territoryHole.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = territoryHole;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, shimmerR * 1.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        var sg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, shimmerR);
        sg.addColorStop(0,   'rgba(255, 185, 70, ' + Math.min(0.62, shimmerAlpha * 1.55) + ')');
        sg.addColorStop(0.4, 'rgba(220, 120, 30, ' + shimmerAlpha + ')');
        sg.addColorStop(0.8, 'rgba(180, 90,  20, ' + shimmerAlpha * 0.45 + ')');
        sg.addColorStop(1,   'rgba(160, 70,  10, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, shimmerR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 220, 120, 0.55)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 + Math.sin(time * 2.2) * 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      var onPath = isOnPath(loc.id);
      if (!onPath) {
        var nearDiscovered = false;
        Object.keys(discovered).forEach(function(dId) {
          if (nearDiscovered) return;
          var dLoc = locs.find(function(l) { return l.id === dId; });
          if (!dLoc) return;
          var dx = loc.lat - dLoc.lat, dy = loc.lng - dLoc.lng;
          if (Math.sqrt(dx * dx + dy * dy) < 400) nearDiscovered = true;
        });

        if (!nearDiscovered) {
          if (!nearestTerritoryIsDiscovered(loc)) return;
        }
      }

      if (!onPath && !loc.cartographerSite && !clusterPeek[loc.id]) return;

      if (loc.cartographerSite) peekMarker(loc.id);

      var baseAlpha = 0.36;
      var pulseAmp  = 0.16;
      var beaconR   = 30;

      var p = baseAlpha + Math.sin(time * 1.8 + loc.lat * 0.02) * pulseAmp;
      var rGlow = beaconR + Math.sin(time * 0.8 + loc.lng * 0.01) * 6;

      ctx.globalCompositeOperation = 'destination-out';
      var siteHole = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rGlow * 1.25);
      siteHole.addColorStop(0,   'rgba(0,0,0,0.22)');
      siteHole.addColorStop(0.55,'rgba(0,0,0,0.08)');
      siteHole.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = siteHole;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rGlow * 1.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      var g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rGlow);
      g.addColorStop(0,    'rgba(255, 255, 180, ' + Math.min(1, p * 1.0) + ')');
      g.addColorStop(0.15, 'rgba(255, 230, 80, '  + Math.min(1, p + 0.15) + ')');
      g.addColorStop(0.4,  'rgba(240, 200, 50, '  + p + ')');
      g.addColorStop(1,    'rgba(220, 180, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rGlow, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function isGlowTargetOnScreen(loc, margin) {
    if (!map || !loc) return false;
    var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
    var rect = map.getContainer().getBoundingClientRect();
    margin = margin || 90;
    return pt.x >= margin && pt.x <= rect.width - margin &&
           pt.y >= margin && pt.y <= rect.height - margin;
  }

  function maybeFlyToPostTutorialBeacon() {
    if (!map || !isFullyDiscovered('sabellas-hut')) return;
    var flyId = getNextPathLocation();
    if (!flyId) return;
    var flyLoc = (window.LOCATIONS || []).find(function(l) { return l.id === flyId; });
    if (!flyLoc || isGlowTargetOnScreen(flyLoc)) return;
    try {
      if (sessionStorage.getItem('intrepid_post_tut_flew') === '1') return;
      sessionStorage.setItem('intrepid_post_tut_flew', '1');
    } catch (e) {}
    setTimeout(function() {
      if (!map) return;
      map.flyTo([flyLoc.lat, flyLoc.lng], map.getMinZoom() + 2, { duration: 1.6 });
    }, 1200);
  }

  /* ════════════════════════════════════════════════
     DRAW FOG
     ════════════════════════════════════════════════ */
  function draw() {
    if (!map || !fogCtx) return;

    var size = syncFogCanvasSize();
    var w = size.w;
    var h = size.h;
    if (!w || !h) return;

    var ctx = fogCtx;
    var zoom = map.getZoom();
    var time = Date.now() / 1000;

    // ── 1. Solid dark base (fully opaque) ──
    // Reset composite mode explicitly — Chrome persists context state across frames
    // when canvas dimensions haven't changed, causing destination-out bleed.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

    var locs = window.LOCATIONS || [];

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

      var baseR = (disc.phase === 'searching') ? 180 : (loc.revealRadius || 80);
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
      maybeChimeEscapeHint();
      var kpt2 = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
      var distToKey = Math.sqrt(Math.pow(spotlightPos.x - kpt2.x, 2) + Math.pow(spotlightPos.y - kpt2.y, 2));

      // Proximity: 0 = far, 1 = on top of key
      var maxDist = 300;
      var proximity = Math.max(0, 1 - distToKey / maxDist);

      // Audio: divining rod pings accelerate near key
      updateDiviningAudio(proximity);
      maybeShowChimeCluePopup(proximity);

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
      var findRadius = searchMode.escapeBoost ? KEY_FIND_RADIUS * 2.2 : KEY_FIND_RADIUS;

      // Always show a faint pulse so key is findable
      var basePulse = searchMode.escapeBoost ? 0.22 : 0.12;
      basePulse += (searchMode.escapeBoost ? 0.14 : 0.08) * Math.sin(time * 2.5);

      // After HINT_DELAY, pulse gets much stronger (immediate when escape boost active)
      var hintAlpha = basePulse;
      if (searchMode.escapeBoost || elapsed > HINT_DELAY) {
        var boostElapsed = searchMode.escapeBoost ? elapsed : (elapsed - HINT_DELAY);
        hintAlpha = Math.min(0.85, basePulse + boostElapsed / 6000) * (0.5 + 0.5 * Math.sin(time * 3));
      }

      var keyVisible = kDist < findRadius;
      var keyNear = kDist < findRadius * 2;
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

    // ── 4d-ii. Perimeter lightning — west & east edges ──
    (function() {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      var pw = w, ph = h;

      // Helper: draw one jagged bolt from (sx,sy) toward direction (dx,dy) with given length
      function drawBolt(sx, sy, angle, length, seed, bright, colorR, colorG, colorB) {
        var segments = 4 + (seed % 3);
        var alpha = bright ? 0.75 : 0.38;
        ctx.strokeStyle = 'rgba(' + colorR + ',' + colorG + ',' + colorB + ',' + alpha + ')';
        ctx.lineWidth   = bright ? 1.8 : 0.9;
        ctx.shadowColor = 'rgba(' + colorR + ',' + colorG + ',' + colorB + ', 0.95)';
        ctx.shadowBlur  = bright ? 22 : 11;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        var cx = sx, cy = sy;
        for (var si = 1; si <= segments; si++) {
          var frac = si / segments;
          var tx2 = sx + Math.cos(angle) * length * frac;
          var ty2 = sy + Math.sin(angle) * length * frac;
          // jag perpendicular to bolt direction
          var jag = ((seed * (si + 1) * 13 % 40) - 20);
          cx = tx2 + Math.cos(angle + Math.PI / 2) * jag;
          cy = ty2 + Math.sin(angle + Math.PI / 2) * jag;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        // branch off midpoint
        if (bright && segments > 4) {
          var branchFrac = 0.45 + (seed % 3) * 0.1;
          var brx = sx + Math.cos(angle) * length * branchFrac + ((seed * 7 % 30) - 15);
          var bry = sy + Math.sin(angle) * length * branchFrac + ((seed * 11 % 30) - 15);
          ctx.strokeStyle = 'rgba(' + colorR + ',' + colorG + ',' + colorB + ', 0.35)';
          ctx.lineWidth = 0.8;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(brx, bry);
          ctx.lineTo(brx + Math.cos(angle + 0.6) * length * 0.3, bry + Math.sin(angle + 0.6) * length * 0.3);
          ctx.stroke();
        }
      }

      function ambientFlash(cx2, cy2, radius, colorR, colorG, colorB) {
        var fg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, radius);
        fg.addColorStop(0, 'rgba(' + colorR + ',' + colorG + ',' + colorB + ', 0.10)');
        fg.addColorStop(1, 'rgba(' + colorR + ',' + colorG + ',' + colorB + ', 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(cx2, cy2, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Define 6 strike zones: 3 west (inward-right), 3 east (inward-left)
      // Each zone has its own time offset so they fire independently
      var zones = [
        // West edge — bolts angle inward (right-ish) with slight downward drift
        { side: 'W', yFrac: 0.15, timeScale: 0.28, offset: 0.00, angleBase:  0.25, cr: 200, cg: 210, cb: 255 },
        { side: 'W', yFrac: 0.48, timeScale: 0.19, offset: 0.33, angleBase:  0.08, cr: 190, cg: 200, cb: 255 },
        { side: 'W', yFrac: 0.75, timeScale: 0.23, offset: 0.67, angleBase: -0.20, cr: 210, cg: 200, cb: 255 },
        // East edge — bolts angle inward (left-ish)
        { side: 'E', yFrac: 0.20, timeScale: 0.22, offset: 0.17, angleBase: Math.PI - 0.30, cr: 200, cg: 215, cb: 255 },
        { side: 'E', yFrac: 0.50, timeScale: 0.31, offset: 0.50, angleBase: Math.PI - 0.05, cr: 195, cg: 210, cb: 255 },
        { side: 'E', yFrac: 0.78, timeScale: 0.18, offset: 0.82, angleBase: Math.PI + 0.25, cr: 205, cg: 205, cb: 255 },
      ];

      zones.forEach(function(z, zi) {
        var phase  = ((time * z.timeScale) + z.offset) % 1;
        var cycle  = Math.floor((time * z.timeScale) + z.offset);
        var seed   = (cycle * 17 + zi * 31 + 7) % 97;

        var active1 = phase < 0.035;                          // primary flash
        var active2 = phase > 0.06 && phase < 0.085;         // secondary double-strike

        if (!active1 && !active2) return;

        var oy = (seed * 7 % 60) - 30; // slight vertical randomness within zone
        var sy = ph * z.yFrac + oy;
        var sx = z.side === 'W' ? 0 : pw;
        var boltLen = 80 + (seed % 60);
        var angle = z.angleBase + ((seed % 9) - 4) * 0.06;

        drawBolt(sx, sy, angle, boltLen, seed, active1, z.cr, z.cg, z.cb);

        if (active1) {
          ambientFlash(sx, sy, boltLen * 1.4, z.cr, z.cg, z.cb);
        }
      });

      ctx.restore();
    })();


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

    // ── 3. Discovery beacons (on top of fog clears) ──
    drawBeaconGlows(ctx, w, h, time);

    // ── 5. Tutorial hint (drawn on canvas — only for canvas-type steps) ──
    if (tutorialHintLoc && tutorialStep < TUTORIAL_STEPS) {
      var def = TUTORIAL_DEFS[tutorialStep];
      var msg = def ? def.msg : '';
      var displayType = def ? (def.display || 'canvas') : 'canvas';
      if (displayType === 'canvas') {
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

      // For card-close step, point arrow at the panel close button
      var arrowAbove = true;
      if (def && def.action === 'close-card') {
        var panelEl = document.getElementById('panel');
        if (panelEl && panelEl.classList.contains('open')) {
          var closeBtn = panelEl.querySelector('.panel-close');
          if (closeBtn) {
            var cbr = closeBtn.getBoundingClientRect();
            var container = map.getContainer();
            var containerRect = container.getBoundingClientRect();
            hx = cbr.left - containerRect.left + cbr.width / 2;
            hy = cbr.top - containerRect.top + cbr.height / 2;
            arrowAbove = false;
          }
        } else {
          var card = document.getElementById('discovery-card');
          if (card && card.classList.contains('visible')) {
            var closeBtn = card.querySelector('.dc-close');
            if (closeBtn) {
              var cbr = closeBtn.getBoundingClientRect();
              var container = map.getContainer();
              var containerRect = container.getBoundingClientRect();
              hx = cbr.left - containerRect.left + cbr.width / 2;
              hy = cbr.top - containerRect.top + cbr.height / 2;
              arrowAbove = false;
            }
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
      ctx.font = '500 17px "Montserrat", "Segoe UI", sans-serif';
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
      } // end displayType === 'canvas'
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
  }

  /* ════════════════════════════════════════════════
     DISCOVER
     ════════════════════════════════════════════════ */
  function discoverLocation(loc) {
    if (!discovered[loc.id] && !isClickable(loc.id)) return;

    // Tutorial: instant reveal for steps 0-2, spotlight search for step 3+
    var isTutorial = tutorialStep < TUTORIAL_STEPS;
    var useInstant = isTutorial && TUTORIAL_INSTANT_STEPS.indexOf(tutorialStep) > -1;

    if (useInstant) {
      instantDiscover(loc);
      return;
    }

    // Most locations get mist (low fog) reveal. Journey path locations get the
    // full chime/search mechanic regardless of their nominal type (mish, sinn,
    // indras-na are type:'city' in data.js but behave as story stops).
    var isStory = (loc.type === 'story') || isOnPath(loc.id);
    if (!isStory) {
      discovered[loc.id] = { at: Date.now(), phase: 'mist' };
      localStorage.setItem(LS_KEY, JSON.stringify(discovered));
      revealMarker(loc.id);
      animateReveal(loc);
      showCelebration(loc);
      playDiscoveryChime();
      setTimeout(function() { openLocationDetails(loc); }, 600);
      updateProgress();
      maybeDismissPostTutorialOnDiscover(loc);
      return;
    }

    // Story locations: Phase 1 — pinhole + enter search mode
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
    maybeDismissPostTutorialOnDiscover(loc);

    // Special unlock celebration for Sham & Mash
    if (loc.id === 'mash' || loc.id === 'sham-territory') {
      setTimeout(function() { showTerritoryUnlock(loc); }, 800);
    }

    if (tutorialStep < TUTORIAL_STEPS) {
      // Restore hint loc so the next step has a position to anchor to
      tutorialHintLoc = loc;
      if (tutorialStep === TUTORIAL_CARD_STEP - 1) {
        // Step 0 done → advance to step 1 (card reading)
        advanceTutorial();
      } else if (tutorialStep !== TUTORIAL_CARD_STEP) {
        if (tutorialStep === 2) {
          // Step 2 (dawn-spear): wait for the card to close before advancing to
          // the search step. Without this, the 'search the fog' toast appears
          // while the discovery card is still open — very confusing.
          waitForCardClose();
        } else {
          advanceTutorial();
        }
      }
    }
  }

  // ─────────────────────────────────────────────────
  // Special territory unlock celebration (Sham & Mash)
  // ─────────────────────────────────────────────────
  function showTerritoryUnlock(loc) {
    // Screen-edge gold pulse
    var glow = document.createElement('div');
    glow.style.cssText =
      'position:fixed;inset:0;z-index:949;pointer-events:none;' +
      'box-shadow:inset 0 0 140px rgba(212,168,67,0.45), inset 0 0 60px rgba(212,168,67,0.2);' +
      'opacity:0;transition:opacity 1s ease;';
    document.body.appendChild(glow);
    requestAnimationFrame(function() {
      glow.style.opacity = '1';
      setTimeout(function() {
        glow.style.transition = 'opacity 2s ease';
        glow.style.opacity = '0';
        setTimeout(function() { glow.remove(); }, 2000);
      }, 2500);
    });

    // Congratulations toast — left side, larger than normal discovery toast
    var old = document.getElementById('territory-unlock-toast');
    if (old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'territory-unlock-toast';
    toast.style.cssText =
      'position:fixed;left:20px;top:50%;transform:translateY(-50%);z-index:950;cursor:pointer;' +
      'background:rgba(10,12,16,0.95);' +
      'border:1px solid rgba(212,168,67,0.5);border-left:4px solid rgba(212,168,67,0.9);' +
      'border-radius:0 10px 10px 0;padding:18px 22px;width:220px;' +
      'font-family:"Cinzel",serif;color:#efe7d2;' +
      'opacity:0;transition:opacity 0.6s ease;' +
      'box-shadow:0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(212,168,67,0.1);';
    toast.innerHTML =
      '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#d4a843;margin-bottom:8px;">Territory Unlocked</div>' +
      '<div style="font-size:11px;color:#8a7d6b;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Congratulations</div>' +
      '<div style="font-size:18px;font-weight:600;letter-spacing:1px;color:#efe7d2;margin-bottom:6px;">✦ ' + loc.name + '</div>' +
      (loc.sub ? '<div style="font-size:11px;color:#9a8f7e;font-family:EB Garamond,serif;font-style:italic;margin-bottom:12px;">' + loc.sub + '</div>' : '<div style="margin-bottom:12px;"></div>') +
      '<div style="font-size:10px;color:#c68d55;letter-spacing:1px;">This territory is now revealed.<br>Discover its cities &amp; sites.</div>' +
      '<div style="font-size:9px;color:#5a5045;margin-top:14px;font-style:italic;font-family:EB Garamond,serif;">tap to dismiss</div>';
    document.body.appendChild(toast);

    function dismissUnlock() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 600);
    }
    toast.addEventListener('click', dismissUnlock);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    setTimeout(dismissUnlock, 7000);
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
      startTime: Date.now(),
      mapClicks: 0,
      escapeBoost: false,
      escapeHintShown: false,
      clueBandsFired: {}
    };

    // Initialize spotlight at the pinhole center so it works immediately
    var pt = map.latLngToContainerPoint([loc.lat, loc.lng]);
    spotlightPos = { x: pt.x, y: pt.y };

    if (map) map.getContainer().classList.add('chime-search-active');

    console.log('[FOG] Search mode: find the key for', loc.name);
  }

  // After prolonged search, widen the key hit area and show explicit guidance
  function maybeChimeEscapeHint() {
    if (!searchMode || searchMode.escapeHintShown) return;
    var elapsed = Date.now() - searchMode.startTime;
    var clicks = searchMode.mapClicks || 0;
    if (elapsed < CHIME_ESCAPE_MS && clicks < CHIME_ESCAPE_CLICKS) return;

    searchMode.escapeHintShown = true;
    searchMode.escapeBoost = true;

    var old = document.getElementById('chime-escape-hint');
    if (old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'chime-escape-hint';
    toast.style.cssText =
      'position:fixed;left:20px;top:50%;transform:translateY(-50%);z-index:950;cursor:pointer;' +
      'background:rgba(10,12,16,0.95);border:1px solid rgba(212,168,67,0.45);' +
      'border-left:4px solid rgba(212,168,67,0.9);border-radius:0 10px 10px 0;' +
      'padding:16px 20px;width:240px;font-family:Cinzel,serif;color:#efe7d2;' +
      'opacity:0;transition:opacity 0.5s ease;' +
      'box-shadow:0 8px 40px rgba(0,0,0,0.7);';
    toast.innerHTML =
      '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#d4a843;margin-bottom:8px;">Still searching?</div>' +
      '<div style="font-size:13px;line-height:1.55;color:#efe7d2;">Move your lantern slowly. Faster chimes mean you are closer — look for the glowing sigil in the fog.</div>' +
      '<div style="font-size:9px;color:#5a5045;margin-top:12px;font-style:italic;font-family:EB Garamond,serif;">tap to dismiss</div>';
    document.body.appendChild(toast);
    toast.addEventListener('click', function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 500);
    });
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    setTimeout(function() {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        setTimeout(function() { toast.remove(); }, 500);
      }
    }, 12000);
  }

  /* ════════════════════════════════════════════════
     SABELLA / SCRIBE CHIME-HEAT CLUE POPUPS (flag-gated)
     ════════════════════════════════════════════════ */
  function isSabellaCluePopupsEnabled() {
    if (!ENABLE_SABELLA_CLUE_POPUPS) return false;
    try {
      if (localStorage.getItem(SABELLA_CLUES_LS) === '1') return true;
    } catch (e) {}
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has('sabellaclues')) return true;
    } catch (e2) {}
    return false;
  }

  function getChimeCluePayload(locId, bandId) {
    var locClues = CHIME_CLUE_CONTENT[locId] || CHIME_CLUE_CONTENT['_default'];
    var entry = locClues[bandId] || locClues.hot || CHIME_CLUE_CONTENT['_default'].hot;
    return {
      speaker: entry.speaker,
      text: entry.text,
      secretId: locId + ':' + bandId
    };
  }

  function recordSecret(payload, band) {
    try {
      var stored = [];
      var raw = localStorage.getItem(SECRETS_COLLECTED_LS);
      if (raw) stored = JSON.parse(raw);
      if (!Array.isArray(stored)) stored = [];
      var exists = stored.some(function(s) { return s && s.id === payload.secretId; });
      if (exists) return;
      stored.push({
        id: payload.secretId,
        locId: searchMode ? searchMode.locId : '',
        band: band.id,
        speaker: payload.speaker,
        text: payload.text,
        at: Date.now()
      });
      localStorage.setItem(SECRETS_COLLECTED_LS, JSON.stringify(stored));
    } catch (e) {}
  }

  function dismissSabellaCluePopup(saveDismiss) {
    var popup = document.getElementById('sabella-clue-popup');
    if (!popup) return;
    popup.style.opacity = '0';
    setTimeout(function() { popup.remove(); }, 500);
    if (saveDismiss && searchMode) searchMode.cluePopupOpen = false;
  }

  function showSabellaCluePopup(band, payload) {
    if (document.getElementById('sabella-clue-popup')) return;

    if (!document.getElementById('tut-toast-style')) {
      var s = document.createElement('style');
      s.id = 'tut-toast-style';
      s.textContent = '@keyframes tutBorderPulse { 0%,100%{border-color:rgba(198,141,85,0.4)} 50%{border-color:rgba(212,168,67,0.9)} }';
      document.head.appendChild(s);
    }

    var popup = document.createElement('div');
    popup.id = 'sabella-clue-popup';
    popup.style.cssText =
      'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:2000;cursor:pointer;' +
      'background:rgba(8,10,14,0.97);' +
      'border:2px solid rgba(198,141,85,0.6);border-radius:14px;' +
      'padding:22px 36px;text-align:center;max-width:520px;width:90%;' +
      'font-family:"Montserrat","Segoe UI",sans-serif;color:#efe7d2;' +
      'box-shadow:0 12px 60px rgba(0,0,0,0.85),0 0 40px rgba(198,168,67,0.12);' +
      'animation:tutBorderPulse 2s ease-in-out infinite;' +
      'opacity:0;transition:opacity 0.5s ease;';
    popup.innerHTML =
      '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#d4a843;' +
        'margin-bottom:12px;font-family:Cinzel,serif;">Secrets \u00b7 ' + band.eyebrow + '</div>' +
      '<div style="font-size:18px;letter-spacing:0.3px;line-height:1.6;margin-bottom:12px;font-family:EB Garamond,serif;">' +
        '\u201c' + payload.text + '\u201d</div>' +
      '<div style="font-size:12px;color:#9a8f7e;font-style:italic;margin-bottom:8px;">\u2014 ' + payload.speaker + '</div>' +
      '<div style="font-size:9px;color:#5a5045;margin-top:10px;font-style:italic;font-family:EB Garamond,serif;">tap to dismiss</div>';
    popup.addEventListener('click', function(e) {
      e.stopPropagation();
      dismissSabellaCluePopup(true);
    });
    document.body.appendChild(popup);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { popup.style.opacity = '1'; });
    });
    if (searchMode) searchMode.cluePopupOpen = true;
    recordSecret(payload, band);
    setTimeout(function() { dismissSabellaCluePopup(true); }, 9000);
  }

  function maybeShowChimeCluePopup(proximity) {
    if (!isSabellaCluePopupsEnabled() || !searchMode || searchMode.silenced) return;
    if (tutorialStep < TUTORIAL_STEPS) return;
    if (searchMode.cluePopupOpen || document.getElementById('sabella-clue-popup')) return;
    if (!searchMode.clueBandsFired) searchMode.clueBandsFired = {};

    for (var i = 0; i < CHIME_CLUE_BANDS.length; i++) {
      var band = CHIME_CLUE_BANDS[i];
      if (proximity < band.threshold || searchMode.clueBandsFired[band.id]) continue;
      searchMode.clueBandsFired[band.id] = true;
      var payload = getChimeCluePayload(searchMode.locId, band.id);
      showSabellaCluePopup(band, payload);
      break;
    }
  }

  // Tear down chime search immediately — reveal animation uses discovered phase, not searchMode.
  function exitSearchMode() {
    if (!searchMode) return;
    searchMode = null;
    spotlightPos = null;
    lastPingTime = Date.now();

    var escapeHint = document.getElementById('chime-escape-hint');
    if (escapeHint) escapeHint.remove();
    dismissSabellaCluePopup(false);

    if (map) {
      var container = map.getContainer();
      container.classList.remove('chime-search-active');
      container.style.cursor = '';
    }

    draw();
  }

  function completeDiscovery(loc) {
    console.log('[FOG] \u2713 Key found! Full reveal:', loc.name);

    // Silence divining-rod pings before success chime; exit search visuals immediately
    // so the directional arrow / lantern do not linger on the cursor during reveal.
    if (searchMode) searchMode.silenced = true;
    lastPingTime = Date.now();
    exitSearchMode();

    discovered[loc.id] = { at: discovered[loc.id].at, phase: 'complete' };
    localStorage.setItem(LS_KEY, JSON.stringify(discovered));

    revealMarker(loc.id);
    animateReveal(loc, PINHOLE_SCALE);
    showCelebration(loc);
    playDiscoveryChime();
    setTimeout(function() {
      if (loc.id === FINAL_ELENA_STOP && isPathComplete()) {
        if (window.closeLocationPanel) window.closeLocationPanel();
        return;
      }
      openLocationDetails(loc);
    }, 600);
    updateProgress();
    maybeDismissPostTutorialOnDiscover(loc);

    // Advance tutorial if in search steps
    if (tutorialStep < TUTORIAL_STEPS) {
      advanceTutorial();
    }

    // Tower cluster: reveal companion site (Maxim Stone)
    if (loc.id === 'tower-nine') {
      setTimeout(function() {
        peekClusterSites('tower-nine');
        showTowerClusterHint();
      }, 1800);
    }

    delete clusterPeek[loc.id];

    // Vol 2 gate toast fires from revealGod when Mish guardian medallion awakens.
  } // end completeDiscovery

  // Spotlight stays attached only while cursor/lantern is near the chime search zone.
  // Detaches on map pan when the search area slides away from the fixed screen point.
  function spotlightWithinSearchZone(x, y) {
    if (!searchMode || !map) return false;
    var locPt = map.latLngToContainerPoint(getInteractionLatLng(searchMode.loc));
    var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
    var distLoc = Math.sqrt(Math.pow(x - locPt.x, 2) + Math.pow(y - locPt.y, 2));
    var distKey = Math.sqrt(Math.pow(x - keyPt.x, 2) + Math.pow(y - keyPt.y, 2));
    return distLoc <= SPOTLIGHT_ATTACH_RADIUS || distKey <= SPOTLIGHT_ATTACH_RADIUS;
  }

  function syncSpotlightAttachment() {
    if (!searchMode || !spotlightPos) return;
    if (!spotlightWithinSearchZone(spotlightPos.x, spotlightPos.y)) {
      spotlightPos = null;
      draw();
    }
  }

  function updateSpotlightFromPointer(clientX, clientY) {
    if (!map || !searchMode) return;
    var container = map.getContainer();
    var rect = container.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    if (!spotlightWithinSearchZone(x, y)) {
      if (spotlightPos) {
        spotlightPos = null;
        draw();
      }
      return;
    }
    spotlightPos = { x: x, y: y };
  }

  // Mouse/touch tracking for spotlight (search mode only)
  function setupSpotlightTracking() {
    document.addEventListener('mousemove', function(e) {
      updateSpotlightFromPointer(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', function(e) {
      var touch = e.touches[0];
      if (!touch) return;
      updateSpotlightFromPointer(touch.clientX, touch.clientY);
    }, { passive: true });
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
      refs.dot._icon.classList.remove('fog-hidden', 'fog-peek');
      refs.dot._icon.classList.add('fog-revealed');
    }
    if (refs.label && refs.label._icon) {
      refs.label._icon.classList.remove('fog-hidden', 'fog-peek');
      refs.label._icon.classList.add('fog-revealed');
    }
  }

  function registerMarker(locId, type, marker) {
    if (!markerRefs[locId]) markerRefs[locId] = {};
    markerRefs[locId][type] = marker;
  }

  function setMarkerHighlight(locId, on) {
    var refs = markerRefs[locId];
    if (!refs) return;
    ['dot', 'label'].forEach(function(type) {
      var m = refs[type];
      if (m && m._icon) m._icon.classList.toggle('mk-marker-active', !!on);
    });
  }

  function peekMarker(locId) {
    if (discovered[locId]) return;
    clusterPeek[locId] = true;
    var refs = markerRefs[locId];
    if (!refs) return;
    ['dot', 'label'].forEach(function(type) {
      var m = refs[type];
      if (m && m._icon) {
        m._icon.classList.remove('fog-hidden');
        m._icon.classList.add('fog-peek');
      }
    });
  }

  function peekClusterSites(parentId) {
    var siblings = SITE_CLUSTERS[parentId];
    if (!siblings) return;
    siblings.forEach(function(id) { peekMarker(id); });
    draw();
  }

  function showTowerClusterHint() {
    var old = document.getElementById('tower-cluster-hint');
    if (old) old.remove();

    var hint = document.createElement('div');
    hint.id = 'tower-cluster-hint';
    hint.style.cssText =
      'position:fixed;left:20px;top:38%;z-index:900;pointer-events:none;' +
      'border-left:3px solid rgba(212,168,67,0.55);padding:10px 14px;max-width:240px;' +
      'font-family:"EB Garamond",serif;font-size:13px;font-style:italic;' +
      'color:#d4c4a0;opacity:0;transition:opacity 1s ease;line-height:1.6;';
    hint.innerHTML =
      '\u201cOne secret crowns this tower.\u201d<br>' +
      '<span style="font-size:11px;color:#a09070;">The Maxim Stone still waits — follow the glowing star.</span>';
    document.body.appendChild(hint);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { hint.style.opacity = '1'; });
    });
    setTimeout(function() {
      hint.style.opacity = '0';
      setTimeout(function() { hint.remove(); }, 1000);
    }, 7000);
  }

  function clickRadiusFor(loc) {
    if (loc.type === 'region' || loc.type === 'water') return CLICK_RADIUS * 2;
    if (loc.cartographerSite) return CLICK_RADIUS * 1.4;
    return CLICK_RADIUS;
  }

  function bindLocationPanel(fn) {
    locationPanelFn = fn;
  }

  function openLocationDetails(loc, marker) {
    if (locationPanelFn) {
      locationPanelFn(loc, marker || null);
      return;
    }
    if (window.openLocationPanel) {
      window.openLocationPanel(loc, marker || null);
    }
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
    openLocationDetails(loc);
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
    var journeyFound = journeyPath.filter(function(s) { return isFullyDiscovered(s.locationId); }).length;
    var journeyPct = journeyTotal > 0 ? journeyFound / journeyTotal : 0;

    // ── Territories track ── (major regions only, not water)
    var regionLocs = locs.filter(function(l) { return l.type === 'region'; });
    var regionTotal = regionLocs.length;
    var regionFound = regionLocs.filter(function(l) { return !!discovered[l.id]; }).length;
    var regionPct = regionTotal > 0 ? regionFound / regionTotal : 0;

    // ── Cities & Sites track ── (cartographer landmark sites)
    var cityLocs = locs.filter(function(l) { return !!l.cartographerSite; });
    var cityTotal = cityLocs.length;
    var cityFound = cityLocs.filter(function(l) { return !!discovered[l.id]; }).length;
    var cityPct = cityTotal > 0 ? cityFound / cityTotal : 0;

    // Combined pct for rank (weighted: journey counts most, then territories, then cities)
    var combined = (journeyFound * 3 + regionFound * 2 + cityFound) /
                   Math.max(1, journeyTotal * 3 + regionTotal * 2 + cityTotal);

    var fillJ   = document.getElementById('progress-fill');
    var countJ  = document.getElementById('progress-count');
    var fillR   = document.getElementById('progress-fill-regions');
    var countR  = document.getElementById('progress-count-regions');
    var fillC   = document.getElementById('progress-fill-cities');
    var countC  = document.getElementById('progress-count-cities');
    var title   = document.getElementById('progress-title');
    var label   = document.getElementById('progress-label');

    if (fillJ)  fillJ.style.width  = (journeyPct * 100) + '%';
    if (countJ) countJ.innerHTML   = journeyFound + ' <span>/ ' + journeyTotal + '</span>';
    if (fillR)  fillR.style.width  = (regionPct * 100) + '%';
    if (countR) countR.innerHTML   = regionFound + ' <span>/ ' + regionTotal + '</span>';
    if (fillC)  fillC.style.width  = (cityPct * 100) + '%';
    if (countC) countC.innerHTML   = cityFound + ' <span>/ ' + cityTotal + '</span>';
    if (label)  label.textContent  = '';

    var rank = 'Apprentice Scribe';
    if (combined > 0.10) rank = 'Cartographer';
    if (combined > 0.30) rank = 'Senior Cartographer';
    if (combined > 0.55) rank = 'Magus Scribe';
    if (combined > 0.80) rank = 'Master Cartographer';
    if (title) title.textContent = rank;

    // Check god reveals — count ALL discoveries (any phase)
    var totalDiscovered = Object.keys(discovered).length;
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
    pulseEl(countC, '#8cb88c');

    // ── Finale checks ──
    checkJourneyFinale(journeyFound, journeyTotal);
    checkVol1Finale();
  }

  // Track whether finales have already fired (persisted to prevent replay)
  var finaleState = (function() {
    try {
      var saved = JSON.parse(localStorage.getItem('intrepid_atlas_finales') || '{}');
      return { journey: !!saved.journey, vol1: !!saved.vol1, constellationLines: saved.constellationLines || [] };
    } catch(e) { return { journey: false, vol1: false, constellationLines: [] }; }
  })();

  function checkJourneyFinale(found, total) {
    if (finaleState.journey) return;
    if (found < total || total === 0) return;

    // Also require all territories (regions) to be discovered
    var locs = window.LOCATIONS || [];
    var regionLocs = locs.filter(function(l) { return l.type === 'region'; });
    var regionFound = regionLocs.filter(function(l) { return !!discovered[l.id]; }).length;
    if (regionFound < regionLocs.length || regionLocs.length === 0) return;

    finaleState.journey = true;
    try { localStorage.setItem('intrepid_atlas_finales', JSON.stringify(finaleState)); } catch(e) {}
    if (window.closeLocationPanel) window.closeLocationPanel();
    // Brief beat for the last chime, then constellation + congratulations
    buildConstellationLines();
    setTimeout(drawConstellationAnimation, 350);
    setTimeout(showJourneyToast, 1100);
  }

  function checkVol1Finale() {
    if (finaleState.vol1) return;
    var vol1Locs = (window.LOCATIONS || []).filter(function(l) {
      if (!l.volume1) return false;
      // Gated journey stops do not block Vol 1 cartographer finale
      if (isVol2LockedJourneyStep(l.id)) return false;
      return true;
    });
    var vol1Found = vol1Locs.filter(function(l) {
      return isFullyDiscovered(l.id);
    }).length;
    if (vol1Found < vol1Locs.length || vol1Locs.length === 0) return;
    finaleState.vol1 = true;
    try { localStorage.setItem('intrepid_atlas_finales', JSON.stringify(finaleState)); } catch(e) {}
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
    if (!overlay) return;
    overlay.classList.add('visible');

    // Wire up finale buttons
    var dismissBtn = document.getElementById('finale-dismiss');
    if (dismissBtn) dismissBtn.onclick = function() { overlay.classList.remove('visible'); };

    var resetBtn = document.getElementById('finale-reset');
    if (resetBtn) resetBtn.onclick = function() {
      if (!confirm('Reset all discoveries and start over? This clears your entire journey and Cartographer access.')) return;
      if (window.FogSystem && window.FogSystem.reset) window.FogSystem.reset();
    };
  }

  // Constellation lines are drawn in the main draw() loop — hook them in here
  // This flag tells draw() to render them
  window._finaleState = finaleState;
  window._fogWaveClearProgress = function() { return fogWaveClearProgress; };

  /* ════════════════════════════════════════════════
     GOD REVEALS — driven by MEDALLION_DEFS array
     ════════════════════════════════════════════════ */

  // Legacy spellings saved in revealedGods before build 66
  var MEDALLION_LEGACY_NAMES = { 'Irra': 'Erra', 'irra': 'Erra' };
  function resolveMedallionName(name) {
    return MEDALLION_LEGACY_NAMES[name] || name;
  }

  function migrateRevealedGods(saved) {
    var migrated = {};
    Object.keys(saved || {}).forEach(function(name) {
      if (!saved[name]) return;
      migrated[resolveMedallionName(name)] = true;
    });
    return migrated;
  }

  // Restore revealed gods immediately to prevent re-reveal race condition
  var revealedGods = migrateRevealedGods(JSON.parse(localStorage.getItem('revealedGods') || '{}'));
  var suppressAnimations = true; // suppress toasts/pulses during initial load restoration

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
    var wasAlreadyRevealed = !!revealedGods[m.name];
    revealedGods[m.name] = true;

    // During page load restoration, just save state silently — no ceremony
    if (!suppressAnimations) {
      // Play a deep chime — guardians get a higher, brighter tone
      if (audioCtx) {
        var freq = m.guardian ? 220 : 130;
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

        var osc2 = audioCtx.createOscillator();
        var gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = freq * 1.5;
        gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);
        osc2.start(audioCtx.currentTime + 0.1);
        osc2.stop(audioCtx.currentTime + 2.5);
      }

      // Open medallion discovery card (brief delay so pulse starts first)
      setTimeout(function() {
        if (window.showMedallionCard) {
          window.showMedallionCard(m);
        }
      }, 600);

      // Big pulsing announcement on the frame medallion
      spawnMedallionPulse(m);
      spawnGodRevealVignette(!!m.guardian);
      markMedallionRevealing(m.name);
    }

    // Keep the frame medallion lit once its guardian has awakened.
    if (window.addPermanentMedallionGlow) window.addPermanentMedallionGlow(m.name);
    if (window.syncMedallionHotspots) window.syncMedallionHotspots();

    // Vol 2 journey gate — congratulations modal only on first Mish guardian ceremony
    if (!suppressAnimations && !wasAlreadyRevealed && m.guardian && m.name === VOL2_GUARDIAN_TRIGGER) {
      maybeShowVol2GateToast();
    }

    // Save to localStorage
    try {
      var saved = migrateRevealedGods(JSON.parse(localStorage.getItem('revealedGods') || '{}'));
      saved[m.name] = true;
      localStorage.setItem('revealedGods', JSON.stringify(saved));
    } catch(e) {}
  }

  function getMedallionRevealGlowPx(m) {
    var base = m.r || 80;
    if (m.guardian) return Math.max(GUARDIAN_REVEAL_GLOW_MIN, Math.round(base * 2.2));
    return Math.max(GOD_REVEAL_GLOW_MIN, Math.round(base * 1.9));
  }

  function injectMedallionRevealStyles() {
    if (document.getElementById('medallion-pulse-style')) return;
    var style = document.createElement('style');
    style.id = 'medallion-pulse-style';
    style.textContent =
      '@keyframes med-reveal-burst {' +
      '  0%   { transform: translate(-50%,-50%) scale(0.35); opacity: 0.95; }' +
      '  35%  { transform: translate(-50%,-50%) scale(1.0);  opacity: 0.75; }' +
      '  65%  { transform: translate(-50%,-50%) scale(1.2);  opacity: 0.4; }' +
      '  100% { transform: translate(-50%,-50%) scale(1.55); opacity: 0; }' +
      '}' +
      '@keyframes med-reveal-ring {' +
      '  0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.85; }' +
      '  100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }' +
      '}' +
      '@keyframes med-reveal-sustain {' +
      '  0%, 100% { opacity: 0.2;  transform: translate(-50%,-50%) scale(1); }' +
      '  50%       { opacity: 0.65; transform: translate(-50%,-50%) scale(1.06); }' +
      '}';
    document.head.appendChild(style);
  }

  function getMedallionScreenPx(m) {
    if (window.getMedallionScreenPos) {
      var pos = window.getMedallionScreenPos(m.cx, m.cy);
      return { x: pos.x + 'px', y: pos.y + 'px' };
    }
    return { x: (m.cx * 100) + 'vw', y: (m.cy * 100) + 'vh' };
  }

  function spawnGodRevealVignette(isGuardian) {
    var rgb = isGuardian ? '212,168,67' : '120,100,220';
    var glow = document.createElement('div');
    glow.className = 'god-reveal-vignette';
    glow.style.cssText =
      'position:fixed;inset:0;z-index:938;pointer-events:none;' +
      'box-shadow:inset 0 0 180px rgba(' + rgb + ',0.55), inset 0 0 90px rgba(' + rgb + ',0.25);' +
      'opacity:0;transition:opacity 0.6s ease;';
    document.body.appendChild(glow);
    requestAnimationFrame(function() {
      glow.style.opacity = '1';
      setTimeout(function() {
        glow.style.transition = 'opacity 2.2s ease';
        glow.style.opacity = '0';
        setTimeout(function() { glow.remove(); }, 2300);
      }, 900);
    });
  }

  function markMedallionRevealing(name) {
    var hot = document.querySelector('.medallion-hot[data-name="' + name + '"]');
    if (!hot) return;
    hot.classList.remove('god-locked', 'god-unlocked');
    hot.classList.add('god-revealing');
    setTimeout(function() {
      hot.classList.remove('god-revealing');
      hot.classList.add('god-unlocked');
    }, MEDALLION_REVEAL_MS);
  }

  function spawnMedallionPulse(m) {
    injectMedallionRevealStyles();

    var screen = getMedallionScreenPx(m);
    var glowPx = getMedallionRevealGlowPx(m);
    var isGuardian = !!m.guardian;

    // Guardian = gold, The Eight = blue-violet
    var coreRgb = isGuardian ? '255,240,180' : '180,170,255';
    var midRgb  = isGuardian ? '212,168,67'  : '120,100,220';
    var outerRgb = isGuardian ? '198,141,85' : '90,70,180';
    var ringBorder = isGuardian
      ? 'rgba(212,168,67,0.75)'
      : 'rgba(140,120,230,0.75)';

    var burstGrad =
      'radial-gradient(circle, rgba(' + coreRgb + ',0.55) 0%, ' +
      'rgba(' + midRgb + ',0.38) 28%, rgba(' + outerRgb + ',0.18) 55%, transparent 72%)';

    // Sustained pulsing core — 3 beats over ~5s
    var sustain = document.createElement('div');
    sustain.style.cssText =
      'position:fixed;left:' + screen.x + ';top:' + screen.y + ';z-index:939;pointer-events:none;' +
      'width:' + glowPx + 'px;height:' + glowPx + 'px;' +
      'background:' + burstGrad + ';border-radius:50%;' +
      'transform:translate(-50%,-50%);' +
      'animation: med-reveal-sustain 1.7s ease-in-out 3 forwards;';
    document.body.appendChild(sustain);

    // Main expanding burst
    var burst = document.createElement('div');
    burst.style.cssText =
      'position:fixed;left:' + screen.x + ';top:' + screen.y + ';z-index:940;pointer-events:none;' +
      'width:' + glowPx + 'px;height:' + glowPx + 'px;' +
      'background:' + burstGrad + ';border-radius:50%;' +
      'transform:translate(-50%,-50%);' +
      'animation: med-reveal-burst 1.4s ease-out forwards;';
    document.body.appendChild(burst);

    // Two staggered shockwave rings
    [0, 280].forEach(function(delay) {
      setTimeout(function() {
        var ring = document.createElement('div');
        var ringSize = Math.round(glowPx * 0.55);
        ring.style.cssText =
          'position:fixed;left:' + screen.x + ';top:' + screen.y + ';z-index:941;pointer-events:none;' +
          'width:' + ringSize + 'px;height:' + ringSize + 'px;' +
          'border:3px solid ' + ringBorder + ';border-radius:50%;' +
          'box-shadow:0 0 24px ' + ringBorder + ', inset 0 0 16px ' + ringBorder + ';' +
          'transform:translate(-50%,-50%);' +
          'animation: med-reveal-ring 1.6s ease-out forwards;';
        document.body.appendChild(ring);
        setTimeout(function() { ring.remove(); }, 1700);
      }, delay);
    });

    setTimeout(function() { burst.remove(); sustain.remove(); }, MEDALLION_REVEAL_MS);
  }

  function initTetradCircles() {
    // Restore previously revealed gods — prune entries below current discovery threshold
    var currentCount = getMedallionDiscoveryCount();
    var defs = window.MEDALLION_DEFS || [];
    var cleaned = {};
    try {
      var saved = migrateRevealedGods(JSON.parse(localStorage.getItem('revealedGods') || '{}'));
      Object.keys(saved).forEach(function(name) {
        var canon = resolveMedallionName(name);
        var def = defs.find(function(m) { return m.name === canon; });
        if (def && def.unlock && currentCount >= def.unlock) {
          cleaned[canon] = true;
        }
      });
      localStorage.setItem('revealedGods', JSON.stringify(cleaned));
    } catch(e) {}
    // Replace in-memory set so stale early-unlock entries cannot linger
    Object.keys(revealedGods).forEach(function(name) { delete revealedGods[name]; });
    Object.keys(cleaned).forEach(function(name) {
      revealedGods[name] = true;
      if (window.addPermanentMedallionGlow) window.addPermanentMedallionGlow(name);
    });
    // Silent catch-up for gods that meet threshold but were missed on init
    var prevSuppress = suppressAnimations;
    suppressAnimations = true;
    checkGodReveals(currentCount);
    suppressAnimations = prevSuppress;
    if (window.syncMedallionHotspots) window.syncMedallionHotspots();
  }

  /* ════════════════════════════════════════════════
     PROGRESS RESET — shared by map button, finale, ?reset, future home link
     Clears map progress + cartographer auth; keeps reader backer keys.
     ════════════════════════════════════════════════ */
  var PROGRESS_LS_KEYS = [
    LS_KEY, LS_KEY + '_v', 'revealedGods',
    'intrepid_atlas_welcomed', 'intrepid_atlas_hinted',
    POST_TUTORIAL_HINT_LS,
    'intrepid_atlas_reveals', 'intrepid_coord_unlocks', 'intrepid_atlas_finales',
    'intrepid_cartographer_unlocked', 'intrepid_atlas_label',
    'intrepid_atlas_auth', 'intrepid_atlas_tier',
    VOL2_GATE_TOAST_LS, VOL2_GATE_LS_UNLOCK, VOL2_GATE_LS_LOCK
  ];

  function clearProgressStorage() {
    PROGRESS_LS_KEYS.forEach(function(k) { localStorage.removeItem(k); });
  }

  function stripArchiveParamsFromUrl() {
    try {
      var u = new URL(window.location.href);
      ['map', 'edit', 'scan', 'key', 'reset'].forEach(function(p) { u.searchParams.delete(p); });
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  /* ════════════════════════════════════════════════
     RESET BUTTON
     ════════════════════════════════════════════════ */
  function addResetButton() {
    if (document.getElementById('fog-reset-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'fog-reset-btn';
    btn.textContent = '↺ Reset';
    btn.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:800;' +
      'background:rgba(10,12,16,0.85);color:#d4a843;border:1px solid rgba(198,141,85,0.4);' +
      'border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;' +
      'letter-spacing:1px;text-transform:uppercase;font-family:inherit;';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!confirm('Reset all discoveries and start over? This clears your entire journey and Cartographer access.')) return;
      if (window.FogSystem && window.FogSystem.reset) window.FogSystem.reset();
    });
    document.body.appendChild(btn);
  }

  /* ════════════════════════════════════════════════
     GUIDE ME — finds next target and pans there
     ════════════════════════════════════════════════ */
  var guideTarget = null; // { lat, lng, endTime } for pulsing ring in draw()

  function addGuideButton() {
    var btn = document.createElement('button');
    btn.id = 'fog-guide-btn';
    btn.innerHTML = '&#9670; Guide Me';
    btn.style.cssText =
      'position:fixed;bottom:12px;left:calc(50% + 6px);transform:translateX(0);z-index:800;' +
      'background:rgba(10,12,16,0.90);color:#c68d55;' +
      'border:1px solid rgba(198,141,85,0.55);border-radius:6px;' +
      'min-height:44px;min-width:44px;padding:10px 16px;font-size:11px;cursor:pointer;' +
      'letter-spacing:2px;text-transform:uppercase;font-family:Cinzel,serif;' +
      'box-shadow:0 2px 12px rgba(0,0,0,0.5);transition:border-color 0.2s,color 0.2s;';
    btn.addEventListener('mouseenter', function() {
      btn.style.borderColor = 'rgba(212,168,67,0.9)'; btn.style.color = '#d4a843';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.borderColor = 'rgba(198,141,85,0.55)'; btn.style.color = '#c68d55';
    });
    btn.addEventListener('click', function(e) { e.stopPropagation(); runGuideMe(); });
    document.body.appendChild(btn);
  }

  function runGuideMe() {
    var locs = window.LOCATIONS || [];
    var target = null;
    var hintLine1 = '';
    var hintLine2 = '';

    // Priority 1: next unvisited journey step (finale excluded until map is complete)
    var nextId = getNextPathLocation();
    if (nextId) {
      target = locs.find(function(l) { return l.id === nextId; });
      if (target) {
        hintLine1 = '\u201cElena\u2019s path leads here next.\u201d';
        hintLine2 = target.type === 'story'
          ? 'Find the \u2605 amber glow and use the chime to locate it.'
          : 'Follow the golden glow to reveal this stop.';
      }
    }

    // Priority 2: nearest currently glowing territory to map center
    if (!target) {
      var ctr = map.getCenter();
      var best = Infinity;
      locs.forEach(function(l) {
        if (discovered[l.id] || !isTerritory(l) || !territoryHasGlow(l)) return;
        var d = Math.sqrt(Math.pow(l.lat - ctr.lat, 2) + Math.pow(l.lng - ctr.lng, 2));
        if (d < best) { best = d; target = l; }
      });
      if (target) {
        hintLine1 = 'An uncharted territory lies ahead.';
        hintLine2 = 'Click the orange shimmer in the fog to reveal it.';
      }
    }

    // Priority 3: nearest undiscovered territory if the frontier rule ever
    // leaves only far-flung map edges. This keeps late-game cleanup humane.
    if (!target) {
      var ctr2 = map.getCenter();
      var best2 = Infinity;
      locs.forEach(function(l) {
        if (discovered[l.id] || !isTerritory(l)) return;
        var d = Math.sqrt(Math.pow(l.lat - ctr2.lat, 2) + Math.pow(l.lng - ctr2.lng, 2));
        if (d < best2) { best2 = d; target = l; }
      });
      if (target) {
        hintLine1 = 'An uncharted territory remains at the edge of the archive.';
        hintLine2 = 'Follow the guide ring, then click the orange shimmer.';
      }
    }

    // Priority 4: nearest undiscovered cartographer site
    if (!target) {
      var ctr3 = map.getCenter();
      var best3 = Infinity;
      locs.forEach(function(l) {
        if (discovered[l.id] || !l.cartographerSite) return;
        var d = Math.sqrt(Math.pow(l.lat - ctr3.lat, 2) + Math.pow(l.lng - ctr3.lng, 2));
        if (d < best3) { best3 = d; target = l; }
      });
      if (target) {
        hintLine1 = 'A hidden site waits to be charted.';
        hintLine2 = 'Click the \u2605 amber star to search with the chime.';
      }
    }

    if (!target) {
      if (isVol2JourneyGateBlocking()) {
        showVol2LockedMessage(false);
        return;
      }
      showGuideHint('All Charted', 'Elena\u2019s journey is complete.', '');
      return;
    }

    if (!discovered[FINAL_ELENA_STOP] && discovered['sinn'] && !explorationComplete()) {
      hintLine1 = 'Indras Na stays sealed until the map is whole.';
      if (!hintLine2) {
        hintLine2 = 'Chart every territory and ancient site first.';
      } else {
        hintLine2 += ' Then Elena\u2019s final stop will appear.';
      }
    }

    // Pan to target smoothly
    map.panTo(getInteractionLatLng(target), { animate: true, duration: 1.4 });

    // Trigger canvas pulsing ring for 4s after pan lands
    setTimeout(function() {
      guideTarget = { lat: target.lat, lng: target.lng, endTime: Date.now() + 4000 };
    }, 900);

    // Show hint toast
    setTimeout(function() {
      showGuideHint(
        target.name + (target.sub ? ' \u2014 ' + target.sub : ''),
        hintLine1,
        hintLine2
      );
    }, 800);
  }

  function showGuideHint(title, line1, line2) {
    var old = document.getElementById('guide-hint-toast');
    if (old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'guide-hint-toast';
    toast.style.cssText =
      'position:fixed;left:20px;top:50%;transform:translateY(-50%);z-index:900;cursor:pointer;' +
      'background:rgba(10,12,16,0.94);' +
      'border:1px solid rgba(140,180,220,0.4);border-left:3px solid rgba(140,180,220,0.8);' +
      'border-radius:0 8px 8px 0;padding:16px 18px;width:218px;' +
      'font-family:"EB Garamond",serif;color:#efe7d2;' +
      'opacity:0;transition:opacity 0.5s ease;' +
      'box-shadow:0 6px 30px rgba(0,0,0,0.6);';
    toast.innerHTML =
      '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;' +
        'color:#8ab4d4;margin-bottom:8px;font-family:Cinzel,serif;">&#9670; Guide</div>' +
      '<div style="font-size:14px;font-weight:600;color:#d4c89a;margin-bottom:8px;line-height:1.3;">' + title + '</div>' +
      '<div style="font-size:12px;color:#9a8f7e;line-height:1.7;margin-bottom:4px;">' + line1 + '</div>' +
      (line2 ? '<div style="font-size:11px;color:#c68d55;line-height:1.6;">' + line2 + '</div>' : '') +
      '<div style="font-size:9px;color:#5a5045;margin-top:12px;font-style:italic;">tap to dismiss</div>';
    document.body.appendChild(toast);
    function dismiss() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 500);
    }
    toast.addEventListener('click', dismiss);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    setTimeout(dismiss, 8000);
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
  // Early gesture unlock — landing, gate, and map clicks (before FogSystem.init)
  loadAmbientPreference();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAmbientButton);
  } else {
    updateAmbientButton();
  }
  document.addEventListener('click', function() { unlockAmbientOnGesture(); }, true);
  document.addEventListener('keydown', function() { unlockAmbientOnGesture(); }, true);

  window.FogSystem = {
    init: init,
    draw: draw,
    registerMarker: registerMarker,
    setMarkerHighlight: setMarkerHighlight,
    isDiscovered: isDiscovered,
    discover: discoverLocation,
    bindLocationPanel: bindLocationPanel,
    openLocationDetails: openLocationDetails,
    closeCard: closeDiscoveryCard,
    updateProgress: updateProgress,
    startDrift: startDrift,
    stopDrift: stopDrift,
    toggleAmbient: toggleAmbient,
    getDiscovered: function() { return discovered; },
    getNextLocation: getNextPathLocation,
    isVol2JourneyGateBlocking: isVol2JourneyGateBlocking,
    isVol2JourneyUnlocked: isVol2JourneyUnlocked,
    initTetradCircles: initTetradCircles,
    _revealedGods: revealedGods,
    clearProgress: clearProgressStorage,
    reset: function() {
      clearProgressStorage();
      try {
        sessionStorage.removeItem('intrepid_archive_entered');
      } catch (e) {}
      stripArchiveParamsFromUrl();
      location.replace(location.pathname);
    }
  };
})();
