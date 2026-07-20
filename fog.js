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
  var KEY_FIND_RADIUS = 80;  // px — how close to key to reveal it (was 50; too tight vs Hot band)
  var KEY_CLICK_RADIUS = 80; // px — how close to key to click it (was 50; escape boost felt like a 30–60s wait)
  // Tower letter: crown sits in storm/cluster clutter — larger lantern + click forgiveness.
  var TOWER_LETTER_FIND_MULT = 2.0;
  var TOWER_LETTER_CLICK_MULT = 2.0;
  var TOWER_LETTER_CROWN_PX = 96; // screen-px above tower peak (matches storm "above" bias)
  // Hot/cold sigil offset from beacon center (map units). Must clear the golden/amber
  // orb so the player can move the lantern toward a distinct hot spot — never stack
  // the diamond on the glow they just clicked.
  var KEY_OFFSET_MIN = 70;
  var KEY_OFFSET_MAX = 110;
  var PINHOLE_SCALE = 0.2;   // fraction of full reveal radius for pinhole
  var HINT_DELAY = 2500;     // ms before key pulse strengthens (was 5000)
  var CHIME_ESCAPE_MS = 20000;    // after 20s in search, boost hitbox (was 60s — felt like “stuck”)
  var CHIME_ESCAPE_CLICKS = 8;    // or after N map clicks during search (was 20)
  var POST_TUTORIAL_HINT_LS = 'intrepid_post_tutorial_hinted';
  var POST_TUTORIAL_HINT_TIMEOUT = 15000;
  var BREATH_SPEED = 0.15;   // how fast the fog edges breathe (cycles/sec)
  var BREATH_AMP = 0.06;     // how much the edges expand/contract (fraction)
  // Medallion reveal announcement — much larger than normal site reveal (80 map units)
  var GUARDIAN_REVEAL_GLOW_MIN = 360;  // px — Tetrad guardians (Utu, Rapha, Mish, Gu)
  var GOD_REVEAL_GLOW_MIN = 300;       // px — The Eight Apkallu sigils
  var MEDALLION_REVEAL_MS = 5200;      // how long the announcing pulse runs
  // Volume 2 journey gate — fires when Mish guardian medallion awakens (6:00 · last Vol 1 unlock).
  // NOT on Mish map location discovery — player continues through sinn first.
  // Kill switch: ENABLE_VOL2_JOURNEY_GATE = false removes the gate entirely.
  // Manual unlock: localStorage.setItem('intrepid_vol2_journey_unlocked','1')
  // Force lock:   localStorage.setItem('intrepid_vol2_journey_locked','1')
  // URL override: ?vol2unlock on the map URL (local QA only)
  var ENABLE_VOL2_JOURNEY_GATE = true;
  var VOL2_UNLOCK_AT = '2026-12-01T00:00:00Z'; // set to Vol 2 launch UTC when known
  var VOL2_GUARDIAN_TRIGGER = 'Mish'; // Tetrad South · winged archer · last in VOL1_REVEAL_ORDER
  // Vol 1 clock sequence — clockwise 12→6 on the frame (7 sigils); Mish is final Vol 1 unlock.
  // Left semicircle (Gu, Nin, Belu, Ae, Erra) stays sealed until Volume II.
  var VOL1_REVEAL_ORDER = ['Utu', 'Sham & Mash', 'Elil', 'Rapha', 'Ningal', 'An', 'Mish'];
  var VOL2_SEALED_MEDALLIONS = ['Gu', 'Nin', 'Belu', 'Ae', 'Erra'];
  var VOL2_JOURNEY_CAP_ID = 'sinn'; // last pre-finale journey stop; indras-na is the V1 finale (never sealed)
  var VOL2_GATE_LS_UNLOCK = 'intrepid_vol2_journey_unlocked';
  var VOL2_GATE_LS_LOCK = 'intrepid_vol2_journey_locked';
  var VOL2_GATE_TOAST_LS = 'intrepid_vol2_gate_toast_shown';
  var VOL2_FEEDBACK_EMAIL = 'info@intrepidgraphicnovel.com';
  // Sinn city journey gate — pace Elena's road until enough territories are charted.
  // Journey pacing economy (not Sabella-only): applies even when ENABLE_SABELLA_MESSAGES is false.
  // Threshold 10 = past half of 17 lands; blocks early Secrets 4/4 at ~7 territories.
  var SINN_CITY_ID = 'sinn';
  var SINN_TERRITORY_GATE = 10;
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
      warm: { speaker: 'Scribe', text: 'Your lantern warms as you draw closer to the hidden sigil.' },
      hot: { speaker: 'Sabella', text: 'Larger inside than it looks from the road. She warned me not to measure the rooms.' },
      burning: { speaker: 'Scribe', text: 'The sigil glows beneath your lantern — tap it.' }
    },
    '_default': {
      warm: { speaker: 'Scribe', text: 'Watch the lantern — it glows warmer when you near the mark.' },
      hot: { speaker: 'Sabella', text: 'She left this trace in the fog. The lantern is your compass now.' },
      burning: { speaker: 'Scribe', text: 'You are almost upon it. Look for the amber sigil — then click.' }
    }
  };
  // ── Map perf (playtest hardening) ──
  // Caps idle drift FPS, fog canvas DPR, dual texture when idle; coalesces Leaflet redraws;
  // pauses when document.hidden. Full rate kept for search / reveal / fog-wave / guide pulse.
  // Kill switch: localStorage intrepid_map_perf_disabled=1 (or ENABLE_MAP_PERF = false)
  // Docs: docs/MAP-PERF-AUDIT.md
  var ENABLE_MAP_PERF = true;
  var MAP_PERF_DISABLED_LS = 'intrepid_map_perf_disabled';
  var DRIFT_FPS_IDLE = 20;
  var FOG_DPR_CAP_DESKTOP = 1.5;
  var FOG_DPR_CAP_MOBILE = 1;
  // Expensive atmosphere (tower lightning + perimeter bolts + heavy shadowBlur there).
  // Default OFF for playtest GPU safety. Enable: ?mapatmo or localStorage intrepid_map_atmo_enabled=1
  // Kill switch: ENABLE_MAP_ATMOSPHERE = false (const already false); disable LS: intrepid_map_atmo_disabled=1
  var ENABLE_MAP_ATMOSPHERE = false;
  var MAP_ATMO_ENABLED_LS = 'intrepid_map_atmo_enabled';
  var MAP_ATMO_DISABLED_LS = 'intrepid_map_atmo_disabled';

  // Sabella journey letters — intentionally ON (Jon 2026-07-10 / beta lock). Do NOT flip false for prod.
  // Per-player kill: localStorage intrepid_sabella_messages_disabled=1 (or ?nosabellamessages)
  // Docs: docs/SABELLA-CLUE-POPUPS.md
  var ENABLE_SABELLA_MESSAGES = true;
  var SABELLA_MESSAGES_DISABLED_LS = 'intrepid_sabella_messages_disabled';
  var SABELLA_MESSAGES_SEEN_LS = 'intrepid_sabella_messages_seen';
  var sabellaMessagePending = false;
  var sabellaMessageOnDismiss = null;
  // Two-beat letter gate (Jon 2026-07-19): at letter stops, Hot→parchment must clear before chart.
  // Kill: ENABLE_SABELLA_LETTER_GATE=false, LS intrepid_sabella_letter_gate_disabled=1, or ?nolettergate
  var ENABLE_SABELLA_LETTER_GATE = true;
  var SABELLA_LETTER_GATE_DISABLED_LS = 'intrepid_sabella_letter_gate_disabled';
  // Object key order follows Elena's journey path (hut → monastery → tower → sinn).
  // Last letter is at Sinn (road before Indras Na) — no parchment on the finale stop.
  var SABELLA_MESSAGES = {
    'sabellas-hut': {
      title: 'A Letter from Grandma Bella',
      greeting: 'My Elena\u2026',
      body: 'If you should ever be so unlucky as to come here\u2026 I have faith Asim will guide you to this place. Take this\u2026 It will serve you well in your time of need. I love you, sweet one.',
      signoff: 'Grandma Bella'
    },
    'monastery-wind': {
      title: 'Wind Through the Oracle\u2019s Hall',
      greeting: 'My Elena\u2026',
      body: 'Isin Ada will speak of dust and names already written. You may refuse the prophecy; I did, once. Still \u2014 listen for the part that sounds like your own heartbeat. That part is true, even when the rest is wind.',
      signoff: 'Grandma Bella'
    },
    'tower-nine': {
      title: 'From the Cage of Nine',
      greeting: 'My Elena\u2026',
      body: 'The Nine face inward, not out. Whatever they guard, they guard together \u2014 and the Stone listens. Climb carefully. I climbed once and came down changed. Trust the companions who wait in the fog beside the tower.',
      signoff: 'Sabella'
    },
    'sinn': {
      title: 'Silver Ink at Sinn',
      greeting: 'My Elena\u2026',
      body: 'The Moon Court judges with silver ink and spiral law. If they ask who sent you, say your grandmother still charts by dusk. I left a mark for you in the silver dusk \u2014 when the lantern grows warm, trust the chime. Beyond this court the western gate waits; you have come farther than I dared hope.',
      signoff: 'Sabella'
    }
  };
  // All 4 road letters must be found before Indras Na unlocks (last letter is at Sinn).
  // Order matches journey path: hut → monastery → tower → sinn (monastery before tower).
  // Only enforced when isSabellaMessagesEnabled(); flag off → legacy journey/explore gates only.
  var SABELLA_LETTER_PREREQ_IDS = ['sabellas-hut', 'monastery-wind', 'tower-nine', 'sinn'];
  // Canonical display names for locked modal / Guide Me — never depend on LOCATIONS mutation
  // or font misreads (e.g. Monastery ≠ Mercury). Keep in sync with data.js ids above.
  var SABELLA_LETTER_DISPLAY_NAMES = {
    'sabellas-hut': 'Sabella\u2019s Hut',
    'monastery-wind': 'Monastery of the Wind',
    'tower-nine': 'Tower of the Nine',
    'sinn': 'Sinn'
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
  // Soft-edged tile cache — feathers fog_texture.png edges so 512px repeats
  // don't show hard rectangular seams (worse when MAP_PERF idle drops dual layer).
  var softFogTile = null;
  var SOFT_FOG_TILE_SIZE = 512;
  var SOFT_FOG_FEATHER = 40; // edge fade px; tile step = size - feather
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

  // Map perf runtime state (see ENABLE_MAP_PERF block above)
  var driftRAF = null;
  var lastDriftDrawMs = 0;
  var fogDrawScheduled = false;
  var mapPerfVisBound = false;
  var fogWaveClearProgress = 0; // also set by finale wave; declared early for needsFullRateDraw
  var guideTarget = null; // { lat, lng, endTime } — also assigned in GUIDE ME section

  function isMapPerfEnabled() {
    if (!ENABLE_MAP_PERF) return false;
    try {
      if (localStorage.getItem(MAP_PERF_DISABLED_LS) === '1') return false;
    } catch (e) {}
    return true;
  }

  function isMapAtmosphereEnabled() {
    try {
      if (localStorage.getItem(MAP_ATMO_DISABLED_LS) === '1') return false;
      if (typeof location !== 'undefined') {
        var params = new URLSearchParams(window.location.search);
        if (params.has('mapatmo')) return true;
      }
      if (localStorage.getItem(MAP_ATMO_ENABLED_LS) === '1') return true;
    } catch (e) {}
    return !!ENABLE_MAP_ATMOSPHERE;
  }

  function getFogDprCap() {
    var mobile = false;
    try {
      mobile = !!(window.matchMedia &&
        window.matchMedia('(max-width: 768px), (pointer: coarse)').matches);
    } catch (e) {}
    return mobile ? FOG_DPR_CAP_MOBILE : FOG_DPR_CAP_DESKTOP;
  }

  // Full-rate paths: search lantern, reveal ceremony, fog-wave, guide pulse, constellation draw-in
  function needsFullRateDraw() {
    if (searchMode) return true;
    if (animatingReveal) return true;
    if (fogWaveClearProgress > 0 && fogWaveClearProgress < 1) return true;
    if (guideTarget && Date.now() < guideTarget.endTime) return true;
    var fs = window._finaleState;
    if (fs && fs.constellationLines && fs.constellationLines.length &&
        typeof fs.constellationDrawProgress === 'number' &&
        fs.constellationDrawProgress < fs.constellationLines.length) {
      return true;
    }
    return false;
  }

  // Coalesce Leaflet move/zoom/resize into one RAF draw (always on — no visual change)
  function scheduleFogDraw() {
    if (fogDrawScheduled) return;
    fogDrawScheduled = true;
    requestAnimationFrame(function() {
      fogDrawScheduled = false;
      draw();
    });
  }

  function bindMapPerfVisibility() {
    if (mapPerfVisBound) return;
    mapPerfVisBound = true;
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) return;
      lastDriftDrawMs = 0;
      scheduleFogDraw();
    });
  }

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

    // Retired hotspot (build 168): moon-stronghold folded into sinn — drop orphan key so
    // proximity / Object.keys(discovered) loops never treat a missing LOCATIONS id as live.
    // Does not affect Cities & Sites (never cartographerSite) or journey counts.
    if (discovered['moon-stronghold']) {
      delete discovered['moon-stronghold'];
      try { localStorage.setItem(LS_KEY, JSON.stringify(discovered)); } catch (eMig) {}
    }

    loadAmbientPreference();
    updateAmbientButton();
    ensureAmbientAudio();

    // Load fog texture (solid #141820 fill still renders if missing)
    fogTexture = new Image();
    fogTexture.onload = function() {
      softFogTile = null;
      textureReady = true;
      draw();
    };
    fogTexture.onerror = function() {
      softFogTile = null;
      textureReady = false;
      draw();
    };
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
    map.on('move zoom viewreset resize zoomend', scheduleFogDraw);
    window.addEventListener('resize', scheduleFogDraw);
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
    // Post-tutorial: golden glow → next journey stop (monastery-wind). Fly only if off-screen.

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
      '#sabella-clue-popup, #sabella-message-popup, #post-tutorial-hint, #chime-escape-hint, #chime-search-teach, #chime-warmth-hud, #guide-hint-toast, ' +
      '#tutorial-canvas-tip, #letter-gate-nudge, ' +
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
            var gnpt = map.latLngToContainerPoint(getInteractionLatLng(glowNextLoc));
            var gnDist = Math.sqrt(Math.pow(x - gnpt.x, 2) + Math.pow(y - gnpt.y, 2));
            if (gnDist < 130) {
              e.stopPropagation(); e.preventDefault();
              discoverLocation(glowNextLoc);
              return;
            }
          }
        }
      }

      // Locked Sinn — getNextPathLocation() returns null while territory-gated (no glow),
      // so hit-test the city directly and explain the charting prerequisite.
      if (!searchMode && getSinnLockedReason()) {
        var sinnLoc = (window.LOCATIONS || []).find(function(l) { return l.id === SINN_CITY_ID; });
        if (sinnLoc) {
          var sinnPt = map.latLngToContainerPoint(getInteractionLatLng(sinnLoc));
          var sinnDist = Math.sqrt(Math.pow(x - sinnPt.x, 2) + Math.pow(y - sinnPt.y, 2));
          if (sinnDist < 130) {
            e.stopPropagation(); e.preventDefault();
            showSinnLockedMessage();
            return;
          }
        }
      }

      // Locked Indras Na — getNextPathLocation() returns null while sealed (no glow),
      // so hit-test the finale stop directly and explain the real prerequisites.
      if (!searchMode && getIndrasNaLockedReason()) {
        var indrasLoc = (window.LOCATIONS || []).find(function(l) { return l.id === FINAL_ELENA_STOP; });
        if (indrasLoc) {
          var ipt = map.latLngToContainerPoint(getInteractionLatLng(indrasLoc));
          var iDist = Math.sqrt(Math.pow(x - ipt.x, 2) + Math.pow(y - ipt.y, 2));
          if (iDist < 130) {
            e.stopPropagation(); e.preventDefault();
            showLockedMessage();
            return;
          }
        }
      }

      // Sabella letter recovery is marker-only (discLoc path below) or Guide Me
      // chime search — never a wide fog hit-test (160px caught random NE mist taps).

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

      // During search mode: key (offset diamond) OR beacon (main location) can finish
      if (searchMode) {
        searchMode.mapClicks = (searchMode.mapClicks || 0) + 1;
        maybeChimeEscapeHint();
        if (tryFinishChimeSearchAt(x, y, e)) return;
        // If the click hit a non-story location (region, city, etc), allow it through
        if (closest && closest.type !== 'story') {
          discoverLocation(closest);
        }
        return; // still block other story location clicks during search
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
          // Recover skipped Sabella letter before reopening lore card
          if (maybeRecoverSabellaLetter(discLoc)) return;
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

      // Letter recovery on touch: marker hit only (discLoc below) — not wide fog taps.

      var locs = window.LOCATIONS || [];
      var closest = null, closestDist = Infinity;
      locs.forEach(function(loc) {
        if (!isClickable(loc.id)) return;
        var pt = map.latLngToContainerPoint(getInteractionLatLng(loc));
        var d = Math.sqrt(Math.pow(x-pt.x,2)+Math.pow(y-pt.y,2));
        if (d < clickRadiusFor(loc) && d < closestDist) { closest = loc; closestDist = d; }
      });
      // During search mode: key (offset diamond) OR beacon (main location) can finish
      if (searchMode) {
        searchMode.mapClicks = (searchMode.mapClicks || 0) + 1;
        maybeChimeEscapeHint();
        if (tryFinishChimeSearchAt(x, y, e)) return;
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
          if (maybeRecoverSabellaLetter(discLoc)) return;
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
    { msg: 'The mark is hidden nearby. Move your lantern — it glows warmer as you near the mark. Click again when closest.', action: 'find-key', display: 'canvas' },
    { msg: 'When the lantern glows warmest, tap that spot to chart what lies beneath.', action: 'auto', display: 'toast' },
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

  // Pan to the next journey glow (or sealed Indras Na) when off-screen / near the edge.
  // Viewport check matters at high zoom — Sinn→Indras is only ~374 map units but can sit off-frame.
  function maybeFlyToNextJourneyStep(delayMs) {
    if (!map) return;
    var nextId = getNextPathLocation();
    var flyId = nextId || (isIndrasNaSealed() ? FINAL_ELENA_STOP : null);
    if (!flyId) return;
    var nextLoc = (window.LOCATIONS || []).find(function(l) { return l.id === flyId; });
    if (!nextLoc) return;
    var pt = map.latLngToContainerPoint([nextLoc.lat, nextLoc.lng]);
    var size = map.getSize();
    var margin = 90;
    var onScreen = pt.x > margin && pt.x < size.x - margin &&
      pt.y > margin && pt.y < size.y - margin;
    if (onScreen) return;
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
    dismissTutorialCanvasTipDom();
  }

  // Canvas tutorial copy sits under #frame (z-index 500) and clips on medallions —
  // keep the arrow on canvas, put the sentence in a DOM tip above the frame.
  function ensureTutorialCanvasTipDom(msg) {
    if (!msg) {
      dismissTutorialCanvasTipDom();
      return;
    }
    var tip = document.getElementById('tutorial-canvas-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'tutorial-canvas-tip';
      tip.setAttribute('role', 'status');
      tip.style.cssText =
        'position:fixed;top:14%;left:50%;transform:translateX(-50%);z-index:600;' +
        'pointer-events:none;max-width:min(420px,72vw);width:auto;' +
        'padding:12px 18px;border-radius:10px;text-align:center;' +
        'background:rgba(10,12,16,0.95);border:1.5px solid rgba(255,255,255,0.55);' +
        'font-family:"Montserrat","Segoe UI",sans-serif;font-size:15px;font-weight:500;' +
        'line-height:1.45;letter-spacing:0.2px;color:#efe7d2;' +
        'box-shadow:0 8px 28px rgba(0,0,0,0.55);';
      document.body.appendChild(tip);
    }
    if (tip.textContent !== msg) tip.textContent = msg;
  }

  function dismissTutorialCanvasTipDom() {
    var tip = document.getElementById('tutorial-canvas-tip');
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
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

  // force=true → reopen legend even after first dismiss (Guide Me Marks helper).
  function showPostTutorialHint(force) {
    if (!force && !shouldShowPostTutorialHint()) return;
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
        '<span style="color:#e8c840;">\u25cf</span> Amber \u2014 cartographer sites: click once to search, again when closest</div>' +
      '<div style="font-size:12px;color:#c4a882;line-height:1.55;margin-top:12px;">' +
        'On amber stars the mark hides in the fog \u2014 your lantern grows warmer as you near it. Click a second time to chart it.</div>' +
      '<div style="font-size:12px;color:#c4a882;line-height:1.55;margin-top:10px;">' +
        'Sabella left letters along Elena\u2019s road (hut, monastery, tower, Sinn). When the lantern is hottest, the parchment appears \u2014 you will need them before Indras Na.</div>' +
      '<div style="font-size:9px;color:#5a5045;margin-top:14px;font-style:italic;' +
        'font-family:EB Garamond,serif;">tap to dismiss</div>';
    toast.addEventListener('click', function() { dismissPostTutorialHint(true); });
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { toast.style.opacity = '1'; });
    });
    if (postTutorialHintTimer) clearTimeout(postTutorialHintTimer);
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

      var sabellaMsg = document.getElementById('sabella-message-popup');
      if (panelOpen || cardOpen || tutToast || sabellaMsg || sabellaMessagePending) {
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

  // Territories = major regions only (matches progress UI — not water bodies)
  function getTerritoryDiscoveryCount() {
    var allLocs = window.LOCATIONS || [];
    var n = 0;
    for (var ti = 0; ti < allLocs.length; ti++) {
      var loc = allLocs[ti];
      if (loc.type === 'region' && discovered[loc.id]) n++;
    }
    return n;
  }

  function getJourneyCompleteCount() {
    var n = 0;
    for (var jci = 0; jci < journeyPath.length; jci++) {
      if (isFullyDiscovered(journeyPath[jci].locationId)) n++;
    }
    return n;
  }

  // Mish: requires Indras Na fully complete + all 17 territories charted (unlock threshold)
  function meetsMishUnlockCriteria(territoryCount) {
    if (!isFullyDiscovered(FINAL_ELENA_STOP)) return false;
    var mishDef = getMishGuardianDef();
    var threshold = mishDef && mishDef.unlock ? mishDef.unlock : 17;
    return territoryCount >= threshold;
  }

  function isGuardianUnlockEligible(name, threshold, territoryCount) {
    if (!threshold) return false;
    if (name === 'Mish') return meetsMishUnlockCriteria(territoryCount);
    return territoryCount >= threshold;
  }

  function getMishGuardianDef() {
    var defs = window.MEDALLION_DEFS || [];
    for (var mi = 0; mi < defs.length; mi++) {
      if (defs[mi].name === VOL2_GUARDIAN_TRIGGER) return defs[mi];
    }
    return null;
  }

  // Mish guardian only counts as awakened when reveal state matches territory threshold.
  function isMishGuardianRevealed() {
    if (!revealedGods[VOL2_GUARDIAN_TRIGGER]) return false;
    return meetsMishUnlockCriteria(getTerritoryDiscoveryCount());
  }

  function getVol2CapStepIndex() {
    return getJourneyStepIndex(VOL2_JOURNEY_CAP_ID);
  }

  function getVol2FirstSealedStepId() {
    var capIdx = getVol2CapStepIndex();
    if (capIdx < 0 || capIdx + 1 >= journeyPath.length) return null;
    var nextId = journeyPath[capIdx + 1].locationId;
    if (nextId === FINAL_ELENA_STOP) return null;
    return nextId;
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
    // Indras Na is the V1 finale click — never dimmed/sealed by the Vol 2 gate
    if (locId === FINAL_ELENA_STOP) return false;
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
      var stepId = journeyPath[vi].locationId;
      if (stepId === FINAL_ELENA_STOP) continue;
      if (!isFullyDiscovered(stepId)) return true;
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

  function meetsSinnTerritoryGate() {
    return getTerritoryDiscoveryCount() >= SINN_TERRITORY_GATE;
  }

  // True when Elena's road is ready for Sinn but territories are still under the gate.
  // Drives sealed beacon + Guide Me territory hints (no golden glow on Sinn).
  function isSinnTerritoryGated() {
    if (isFullyDiscovered(SINN_CITY_ID)) return false;
    if (meetsSinnTerritoryGate()) return false;
    var ji;
    for (ji = 0; ji < journeyPath.length; ji++) {
      var stepId = journeyPath[ji].locationId;
      if (stepId === SINN_CITY_ID) break;
      if (!isFullyDiscovered(stepId)) return false;
    }
    return true;
  }

  // Why Sinn is sealed (null when unlockable or already discovered).
  // Territory gate is journey pacing — always on, independent of Sabella letters.
  function getSinnLockedReason() {
    if (isFullyDiscovered(SINN_CITY_ID)) return null;

    var ji;
    for (ji = 0; ji < journeyPath.length; ji++) {
      var stepId = journeyPath[ji].locationId;
      if (stepId === SINN_CITY_ID) break;
      if (!isFullyDiscovered(stepId)) {
        return 'Sinn waits further along Elena\u2019s road. Follow the golden glow.';
      }
    }

    if (!meetsSinnTerritoryGate()) {
      var named = getTerritoryDiscoveryCount();
      return 'Sinn waits until more of the Hollowlands are charted. (' +
        named + ' of ' + SINN_TERRITORY_GATE + ' lands named)';
    }

    return null;
  }

  // Why Indras Na is sealed (null when unlockable or already discovered).
  // Real gates: prior Elena path through Sinn, all territories + cartographer sites,
  // then (when Sabella messages enabled) all 4 road letters (last at Sinn).
  // "Sabella's marks" = cartographer sites (narrative framing for charting work).
  function getIndrasNaLockedReason() {
    if (isFullyDiscovered(FINAL_ELENA_STOP)) return null;

    var ji;
    for (ji = 0; ji < journeyPath.length; ji++) {
      var stepId = journeyPath[ji].locationId;
      if (stepId === FINAL_ELENA_STOP) break;
      if (!isFullyDiscovered(stepId)) {
        return 'Indras Na waits at the end of Elena\u2019s road. Follow the golden glow through Sinn before this gate will open.';
      }
    }

    if (!explorationComplete()) {
      var locs = window.LOCATIONS || [];
      var undiscRegions = locs.filter(function(l) { return l.type === 'region' && !discovered[l.id]; }).length;
      var undiscSites = locs.filter(function(l) { return !!l.cartographerSite && !discovered[l.id]; }).length;
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
      var missingNames = getMissingSabellaLetterNames();
      var stillNeeded = missingNames.length
        ? missingNames.join(', ')
        : 'an unread letter along Elena\u2019s road';
      return 'Sabella\u2019s letters: ' + found + ' of ' + need +
        ' found. Still needed: ' + stillNeeded +
        '. Click the letter-stop marker, or use Guide Me and search with the lantern.';
    }

    return null;
  }

  // True when Elena's road through Sinn is done but Indras Na is still gated
  // (territories/sites/letters). Drives sealed finale beacon — never leave 6/7 dark.
  function isIndrasNaSealed() {
    if (isFullyDiscovered(FINAL_ELENA_STOP)) return false;
    var ji;
    for (ji = 0; ji < journeyPath.length; ji++) {
      var stepId = journeyPath[ji].locationId;
      if (stepId === FINAL_ELENA_STOP) break;
      if (!isFullyDiscovered(stepId)) return false;
    }
    return !!getIndrasNaLockedReason();
  }

  function getNextPathLocation() {
    for (var i = 0; i < journeyPath.length; i++) {
      var stepId = journeyPath[i].locationId;
      // Must match updateProgress / isFullyDiscovered — searching phase is not complete
      if (!isFullyDiscovered(stepId)) {
        // Sinn stays sealed until enough territories are charted (journey pacing)
        if (stepId === SINN_CITY_ID) {
          if (!meetsSinnTerritoryGate()) return null;
        }
        // Final Elena beat stays sealed until map charted (+ road letters when flag on)
        if (stepId === FINAL_ELENA_STOP) {
          if (!explorationComplete()) return null;
          if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) return null;
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
    if (isFullyDiscovered(locId)) return false;

    var allLocs = window.LOCATIONS || [];
    var loc = allLocs.find(function(l) { return l.id === locId; });
    if (!loc) return false;

    // Gate Sinn city: enough territories charted, then only as the golden-glow target
    if (locId === SINN_CITY_ID) {
      if (!meetsSinnTerritoryGate()) return false;
      return locId === getNextPathLocation();
    }

    // Gate the final Elena stop: territories + sites (+ road letters when Sabella flag on)
    if (locId === FINAL_ELENA_STOP) {
      if (!explorationComplete()) return false;
      if (isSabellaMessagesEnabled() && !sabellaPrereqLettersComplete()) return false;
      // Finale is only clickable when it is the sole golden-glow journey target
      return locId === getNextPathLocation();
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

    // Story locations — must match drawBeaconGlows amber/golden rules:
    //   golden = next journey step; amber = near cleared fog AND (on-path OR cluster peek).
    // Cluster companions (e.g. maxim-stone) stay dark until peekClusterSites runs —
    // nearCleared alone must NOT unlock them (Sabella/tutorial are within 400 of the Stone).
    if (loc.type === 'story') {
      if (locId === getNextPathLocation()) return true;
      if (!nearCleared) return false;
      return isOnPath(locId) || !!clusterPeek[locId];
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
  // Shared Close control for center locked modals (Sinn / Indras Na sealed + Vol2 gate)
  function lockedMsgCloseHtml() {
    return '<button type="button" class="locked-msg-close" aria-label="Close">' +
      '\u2715 Close</button>';
  }

  function wireLockedMsgDismiss(el, autoMs) {
    function dismiss() {
      if (!el.parentNode) return;
      el.style.opacity = '0';
      setTimeout(function() { if (el.parentNode) el.remove(); }, 600);
    }
    // Whole card remains tappable; Close button is the primary control
    el.addEventListener('click', dismiss);
    var btn = el.querySelector('.locked-msg-close');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        dismiss();
      });
    }
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { el.style.opacity = '1'; });
    });
    if (autoMs) setTimeout(dismiss, autoMs);
  }

  function showSinnLockedMessage() {
    var reason = getSinnLockedReason();
    if (!reason) return;

    var old = document.getElementById('locked-msg');
    if (old) old.remove();

    var showChartHint = isSinnTerritoryGated();

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
      '<div style="font-size:12px;color:#c87060;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;font-family:Cinzel,serif;">Sinn Is Sealed</div>' +
      '<div style="margin-bottom:14px;">' + reason + '</div>' +
      (showChartHint
        ? '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;">' +
            '<span style="color:#d99040;">\u25C8 Orange shimmer in the fog</span> \u2014 chart more territories. Use Guide Me if you need a heading.' +
          '</div>'
        : '') +
      lockedMsgCloseHtml();
    document.body.appendChild(el);
    wireLockedMsgDismiss(el, 7000);
  }

  function showLockedMessage() {
    var reason = getIndrasNaLockedReason();
    if (!reason) return;

    var old = document.getElementById('locked-msg');
    if (old) old.remove();

    var priorPathReady = true;
    var pji;
    for (pji = 0; pji < journeyPath.length; pji++) {
      var pStep = journeyPath[pji].locationId;
      if (pStep === FINAL_ELENA_STOP) break;
      if (!isFullyDiscovered(pStep)) { priorPathReady = false; break; }
    }
    var showChartLegend = priorPathReady && !explorationComplete();

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
      '<div style="font-size:12px;color:#c87060;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;font-family:Cinzel,serif;">Indras Na Is Sealed</div>' +
      '<div style="margin-bottom:14px;">' + reason + '</div>' +
      (showChartLegend
        ? '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;">' +
            '<span style="color:#d99040;">\u25C8 Orange shimmer in the fog</span> \u2014 an undiscovered territory. Click it to reveal.<br>' +
            '<span style="color:#d4a843;">\u2605 Amber star</span> \u2014 click once to search; move your lantern until it warms, then click again to chart.<br>' +
            '<span style="color:#c4a882;">\u2709 Letters</span> \u2014 Sabella left notes along Elena\u2019s road (hut, monastery, tower, Sinn). Find them with the lantern.' +
          '</div>'
        : '') +
      lockedMsgCloseHtml();
    document.body.appendChild(el);
    wireLockedMsgDismiss(el, 7000);
  }

  // Brief modal when Elena cannot continue past Mish until Volume 2 Kickstarter
  function showVol2LockedMessage(isWelcome) {
    var old = document.getElementById('locked-msg');
    if (old) old.remove();

    var sealedId = getVol2FirstSealedStepId();
    var sealedLoc = sealedId ? (window.LOCATIONS || []).find(function(l) { return l.id === sealedId; }) : null;
    var nextName = sealedLoc ? sealedLoc.name : 'Volume 2';
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
      '<div style="margin-bottom:14px;">You\u2019ve reached <strong style="color:#d4a843;">Indras Na</strong> and completed Elena\u2019s journey through Volume 1. More journey locations will open with the <strong style="color:#b8d4f0;">kickstarter launch of Volume 2</strong>.' +
        (sealedLoc ? ' <strong style="color:#d4a843;">' + nextName + '</strong> and the stops beyond await that launch.' : '') +
      '</div>' +
      '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;margin-bottom:10px;">You can still chart territories and hidden sites across the Hollowlands.</div>' +
      '<div style="font-size:13px;color:#9a8f7e;line-height:1.8;">Spotted a bug or have feedback? Write us at ' + emailLink + '.</div>' +
      countdownLine +
      lockedMsgCloseHtml();
    document.body.appendChild(el);
    wireLockedMsgDismiss(el, isWelcome ? 9000 : 7000);
  }

  // Ceremony queue — never auto-cover guardian medallion lore / Sabella parchment / locked-msg.
  // Used by archive-complete toast + Vol2 Indras congrats. Sequencing only — no feature flag.
  function isBlockingCeremonyOpen() {
    var card = document.getElementById('discovery-card');
    if (card && card.classList.contains('visible')) return true;
    if (document.getElementById('sabella-message-popup')) return true;
    if (document.getElementById('locked-msg')) return true;
    return false;
  }

  // Queue a congrats modal until open lore UI is dismissed. graceForOpen waits for a
  // ceremony that is about to open (e.g. revealGod → showMedallionCard at ~600ms).
  function runAfterCeremonyClear(fn, opts) {
    opts = opts || {};
    var minDelay = opts.minDelay != null ? opts.minDelay : 0;
    var graceForOpen = opts.graceForOpen != null ? opts.graceForOpen : 1600;
    var pollMs = 400;
    var started = Date.now();
    var sawCeremony = false;

    function tick() {
      var elapsed = Date.now() - started;
      var open = isBlockingCeremonyOpen();
      if (open) sawCeremony = true;

      if (elapsed < minDelay) {
        setTimeout(tick, Math.min(pollMs, minDelay - elapsed));
        return;
      }
      if (open) {
        setTimeout(tick, pollMs);
        return;
      }
      // Still in grace and nothing opened yet — give Mish/guardian card time to appear
      if (!sawCeremony && elapsed < minDelay + graceForOpen) {
        setTimeout(tick, Math.min(200, (minDelay + graceForOpen) - elapsed));
        return;
      }
      fn();
    }
    setTimeout(tick, 0);
  }

  // Vol 1 finale reward — fires once when Indras Na is fully discovered (not on Mish reveal).
  // No Sabella letter at Indras Na; congrats runs on discovery complete (letters end at Sinn).
  // Deferred if Mish guardian card (or other lore ceremony) is open / about to open.
  function maybeShowVol2GateToast() {
    if (!ENABLE_VOL2_JOURNEY_GATE || isVol2JourneyUnlocked()) return;
    if (!isFullyDiscovered(FINAL_ELENA_STOP)) return;
    try {
      if (localStorage.getItem(VOL2_GATE_TOAST_LS) === '1') return;
      localStorage.setItem(VOL2_GATE_TOAST_LS, '1');
    } catch (e) {}
    runAfterCeremonyClear(function() { showVol2LockedMessage(true); }, {
      minDelay: 1400,
      graceForOpen: 1600
    });
  }


  /* ════════════════════════════════════════════════
     CANVAS SIZE — match container rect + devicePixelRatio
     ════════════════════════════════════════════════ */
  function syncFogCanvasSize() {
    var container = map.getContainer();
    var rect = container.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(rect.width));
    var cssH = Math.max(1, Math.round(rect.height));
    var dprRaw = window.devicePixelRatio || 1;
    var dpr = isMapPerfEnabled() ? Math.min(dprRaw, getFogDprCap()) : dprRaw;
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
    // Skip while that stop is in chime search — otherwise the orb sits under the
    // hot/cold diamond and the player cannot "approach" a distinct hot spot.
    if (nextId) {
      var glowLoc = locs.find(function(l) { return l.id === nextId; });
      var tutorialBlocked = (!isPostTutorial() && tutorialHintLoc &&
                             nextId !== tutorialHintLoc.id);
      var glowSearching = glowLoc && discovered[glowLoc.id] &&
                          discovered[glowLoc.id].phase === 'searching';
      if (glowLoc && !tutorialBlocked && !glowSearching) {
        var gpt = map.latLngToContainerPoint(getInteractionLatLng(glowLoc));
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
    } else if (isSinnTerritoryGated()) {
      // Dim sealed beacon on Sinn while territory gate holds (no golden glow = not clickable)
      var gatedSinn = locs.find(function(l) { return l.id === SINN_CITY_ID; });
      if (gatedSinn) {
        var gspt = map.latLngToContainerPoint(getInteractionLatLng(gatedSinn));
        if (gspt.x > -100 && gspt.x < w + 100 && gspt.y > -100 && gspt.y < h + 100) {
          var gSealPulse = 0.12 + Math.sin(time * 1.2) * 0.05;
          var gSealR = 38 + Math.sin(time * 0.9) * 6;
          ctx.globalCompositeOperation = 'source-over';
          var gSealGrad = ctx.createRadialGradient(gspt.x, gspt.y, 0, gspt.x, gspt.y, gSealR);
          gSealGrad.addColorStop(0, 'rgba(180, 120, 90, ' + (gSealPulse + 0.08) + ')');
          gSealGrad.addColorStop(0.5, 'rgba(120, 80, 60, ' + gSealPulse + ')');
          gSealGrad.addColorStop(1, 'rgba(90, 60, 45, 0)');
          ctx.fillStyle = gSealGrad;
          ctx.beginPath();
          ctx.arc(gspt.x, gspt.y, gSealR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(210, 170, 140, ' + (0.35 + gSealPulse) + ')';
          ctx.font = 'bold 14px Cinzel, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2726', gspt.x, gspt.y);
        }
      }
    } else if (isIndrasNaSealed()) {
      // Dim sealed finale beacon while territories/sites/letters gate Indras Na
      var gatedIndras = locs.find(function(l) { return l.id === FINAL_ELENA_STOP; });
      if (gatedIndras) {
        peekMarker(FINAL_ELENA_STOP);
        var gipt = map.latLngToContainerPoint(getInteractionLatLng(gatedIndras));
        if (gipt.x > -100 && gipt.x < w + 100 && gipt.y > -100 && gipt.y < h + 100) {
          var iSealPulse = 0.14 + Math.sin(time * 1.15) * 0.06;
          var iSealR = 42 + Math.sin(time * 0.85) * 7;
          ctx.globalCompositeOperation = 'source-over';
          var iSealGrad = ctx.createRadialGradient(gipt.x, gipt.y, 0, gipt.x, gipt.y, iSealR);
          iSealGrad.addColorStop(0, 'rgba(200, 110, 80, ' + (iSealPulse + 0.1) + ')');
          iSealGrad.addColorStop(0.45, 'rgba(140, 70, 55, ' + (iSealPulse + 0.04) + ')');
          iSealGrad.addColorStop(1, 'rgba(90, 45, 40, 0)');
          ctx.fillStyle = iSealGrad;
          ctx.beginPath();
          ctx.arc(gipt.x, gipt.y, iSealR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(230, 180, 150, ' + (0.4 + iSealPulse) + ')';
          ctx.font = 'bold 15px Cinzel, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2726', gipt.x, gipt.y);
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
      // Sealed journey stops: dim sealed beacon only (above) — no amber star
      if (loc.id === SINN_CITY_ID && isSinnTerritoryGated()) return;
      if (loc.id === FINAL_ELENA_STOP && getIndrasNaLockedReason()) return;

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
     SOFT FOG TILE — feather texture edges for seamless-ish repeats
     Built once when fog_texture.png is ready. Does not touch glow/click rules.
     ════════════════════════════════════════════════ */
  function ensureSoftFogTile() {
    if (softFogTile) return softFogTile;
    if (!textureReady || !fogTexture) return null;
    var S = SOFT_FOG_TILE_SIZE;
    var F = SOFT_FOG_FEATHER;
    if (F < 1) F = 1;
    if (F > (S / 2) - 1) F = (S / 2) - 1;

    var tile = document.createElement('canvas');
    tile.width = S;
    tile.height = S;
    var tctx = tile.getContext('2d');
    if (!tctx) return null;

    tctx.drawImage(fogTexture, 0, 0, S, S);

    // Alpha mask: opaque center, linear fade on all four edges (corners = product).
    var mask = document.createElement('canvas');
    mask.width = S;
    mask.height = S;
    var mctx = mask.getContext('2d');
    if (!mctx) return null;

    mctx.fillStyle = '#ffffff';
    mctx.fillRect(0, 0, S, S);

    mctx.globalCompositeOperation = 'destination-in';
    var gh = mctx.createLinearGradient(0, 0, S, 0);
    gh.addColorStop(0, 'rgba(0,0,0,0)');
    gh.addColorStop(F / S, 'rgba(0,0,0,1)');
    gh.addColorStop(1 - F / S, 'rgba(0,0,0,1)');
    gh.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = gh;
    mctx.fillRect(0, 0, S, S);

    var gv = mctx.createLinearGradient(0, 0, 0, S);
    gv.addColorStop(0, 'rgba(0,0,0,0)');
    gv.addColorStop(F / S, 'rgba(0,0,0,1)');
    gv.addColorStop(1 - F / S, 'rgba(0,0,0,1)');
    gv.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = gv;
    mctx.fillRect(0, 0, S, S);

    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(mask, 0, 0);

    softFogTile = tile;
    return softFogTile;
  }

  // Stamp soft fog tiles with edge overlap so feathered borders blend.
  function stampSoftFogTiles(ctx, tile, tSize, ox, oy, w, h) {
    var feather = Math.round(tSize * (SOFT_FOG_FEATHER / SOFT_FOG_TILE_SIZE));
    if (feather < 1) feather = 1;
    var step = tSize - feather;
    if (step < 1) step = 1;
    var startX = -tSize + ox;
    var startY = -tSize + oy;
    // Align ox/oy into first step so drift still scrolls smoothly
    while (startX > -step) startX -= step;
    while (startY > -step) startY -= step;
    for (var tx = startX; tx < w + tSize; tx += step) {
      for (var ty = startY; ty < h + tSize; ty += step) {
        ctx.drawImage(tile, tx, ty, tSize, tSize);
      }
    }
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
    var fullRate = needsFullRateDraw();
    // Idle: single texture layer. Search/reveal/wave: dual counter-drift (richer look).
    var useDualTexture = !isMapPerfEnabled() || fullRate;

    // ── 1. Solid dark base (fully opaque) ──
    // Reset composite mode explicitly — Chrome persists context state across frames
    // when canvas dimensions haven't changed, causing destination-out bleed.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#141820';
    ctx.fillRect(0, 0, w, h);

    // ── 2. Fog texture overlay (soft-edged tiles; dual only when full-rate) ──
    if (textureReady && fogTexture) {
      var softTile = ensureSoftFogTile();
      var tileSrc = softTile || fogTexture;
      var originPt = map.latLngToContainerPoint([0, 0]);

      // Layer 1 — primary drift
      ctx.save();
      ctx.globalAlpha = useDualTexture ? 0.55 : 0.70;
      var tSize = 512;
      var ox = (originPt.x + time * 8) % tSize;
      var oy = (originPt.y + time * 3) % tSize;
      if (ox < 0) ox += tSize;
      if (oy < 0) oy += tSize;
      stampSoftFogTiles(ctx, tileSrc, tSize, ox, oy, w, h);
      ctx.restore();

      // Layer 2 — slower counter-drift (skipped when idle + MAP_PERF)
      if (useDualTexture) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        var tSize2 = 768;
        var ox2 = (originPt.x + time * -5) % tSize2;
        var oy2 = (originPt.y + time * 6) % tSize2;
        if (ox2 < 0) ox2 += tSize2;
        if (oy2 < 0) oy2 += tSize2;
        stampSoftFogTiles(ctx, tileSrc, tSize2, ox2, oy2, w, h);
        ctx.restore();
      }
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
      // Mute-friendly warmth label (Cold → Warmer → Click to chart)
      updateChimeWarmthHud(proximity);
      // Sabella parchment letter on "hot" band (Secret find) — primary letter path
      maybeShowSabellaLetterOnChime(proximity);
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
      if (distToKey > getKeyFindRadiusPx() && distToKey < maxDist) {
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
    } else if (searchMode) {
      ensureChimeWarmthHud();
      var idleHud = document.getElementById('chime-warmth-hud');
      if (idleHud) {
        if (searchMode.letterGateActive && !searchMode.letterGateCleared) {
          idleHud.textContent = searchMode.sabellaLetterFired ? 'Read letter' : 'Find letter';
          idleHud.style.color = '#c4a882';
          idleHud.style.borderColor = 'rgba(212,168,67,0.4)';
        } else {
          idleHud.textContent = 'Move lantern';
          idleHud.style.color = '#9a8f7e';
          idleHud.style.borderColor = 'rgba(154,143,126,0.35)';
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // ── 4c. Draw key glyph ──
    if (searchMode) {
      var kpt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
      var kDist = spotlightPos ?
        Math.sqrt(Math.pow(spotlightPos.x - kpt.x, 2) + Math.pow(spotlightPos.y - kpt.y, 2)) : 9999;
      var elapsed = Date.now() - searchMode.startTime;
      var findRadius = getKeyFindRadiusPx();

      // Always show a readable pulse so the diamond is findable immediately
      var basePulse = searchMode.escapeBoost ? 0.28 : 0.18;
      if (isTowerLetterSearch()) basePulse = Math.max(basePulse, 0.24);
      if (searchMode.letterGateActive || SABELLA_MESSAGES[searchMode.locId]) {
        basePulse = Math.max(basePulse, 0.22);
      }
      basePulse += (searchMode.escapeBoost ? 0.14 : 0.1) * Math.sin(time * 2.5);

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
      if (isTowerLetterSearch()) kSize += 3;

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

      // ── Occasional lightning (ENABLE_MAP_ATMOSPHERE / ?mapatmo) ──
      if (isMapAtmosphereEnabled()) {
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
      }

      ctx.restore();
    }

    // ── 4d-ii. Perimeter lightning — west & east edges (atmo flag) ──
    if (isMapAtmosphereEnabled()) (function() {
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

      // Tip text as DOM above #frame (z-index 500) — canvas tips clipped by medallions.
      ensureTutorialCanvasTipDom(msg);
      } else {
        dismissTutorialCanvasTipDom();
      } // end displayType === 'canvas'
    } else {
      dismissTutorialCanvasTipDom();
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
    if (!isFullyDiscovered(loc.id) && !isClickable(loc.id)) return;

    // Resume chime search when a journey stop was left mid-search (searching phase)
    if (discovered[loc.id] && discovered[loc.id].phase === 'searching' && isOnPath(loc.id)) {
      if (!searchMode) enterSearchMode(loc);
      return;
    }

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

  // During chime search, only the target label stays readable — dense clusters
  // (Crossing Pool / Dawn Spear / Sabella's Hut) otherwise stack illegibly.
  function setChimeSearchLabelFocus(locId) {
    Object.keys(markerRefs).forEach(function(id) {
      var refs = markerRefs[id];
      if (!refs || !refs.label || !refs.label._icon) return;
      var icon = refs.label._icon;
      if (locId && id === locId) {
        icon.classList.add('chime-search-target');
        // Show target name during search even if not yet fog-revealed
        icon.classList.remove('fog-hidden');
      } else {
        icon.classList.remove('chime-search-target');
      }
    });
  }

  function clearChimeSearchLabelFocus() {
    Object.keys(markerRefs).forEach(function(id) {
      var refs = markerRefs[id];
      if (!refs || !refs.label || !refs.label._icon) return;
      var icon = refs.label._icon;
      icon.classList.remove('chime-search-target');
      // Restore fog-hidden for undiscovered, non-peeked labels we temporarily showed
      if (!discovered[id] && !clusterPeek[id] &&
          !icon.classList.contains('fog-revealed') &&
          !icon.classList.contains('fog-peek')) {
        icon.classList.add('fog-hidden');
      }
    });
  }

  // Place the hot/cold key away from the beacon / interaction point so the diamond
  // never stacks on the golden/amber orb the player just clicked. Shared for all
  // chime searches (journey letter stops, cartographer sites, letter recovery).
  function placeSearchKeyOffset(loc) {
    var ll = getInteractionLatLng(loc);
    // Tower of the Nine letter: pin to the crown (above peak). Random 360° offsets
    // often hide the diamond in storm bolts / Maxim cluster — last secret too easy to miss.
    if (loc && loc.id === 'tower-nine' && map) {
      var peakPt = map.latLngToContainerPoint(ll);
      var crownPt = L.point(peakPt.x, peakPt.y - TOWER_LETTER_CROWN_PX);
      var crownLl = map.containerPointToLatLng(crownPt);
      return { keyLat: crownLl.lat, keyLng: crownLl.lng };
    }
    var angle = Math.random() * Math.PI * 2;
    var dist = KEY_OFFSET_MIN + Math.random() * (KEY_OFFSET_MAX - KEY_OFFSET_MIN);
    return {
      keyLat: ll[0] + Math.sin(angle) * dist,
      keyLng: ll[1] + Math.cos(angle) * dist
    };
  }

  function isTowerLetterSearch() {
    return !!(searchMode && searchMode.locId === 'tower-nine');
  }

  function getKeyFindRadiusPx() {
    var r = KEY_FIND_RADIUS;
    if (isTowerLetterSearch()) r *= TOWER_LETTER_FIND_MULT;
    if (searchMode && searchMode.escapeBoost) r *= 2.2;
    return r;
  }

  function getKeyClickRadiusPx() {
    var r = KEY_CLICK_RADIUS;
    if (isTowerLetterSearch()) r *= TOWER_LETTER_CLICK_MULT;
    if (searchMode && searchMode.escapeBoost) r *= 1.6;
    return r;
  }

  // Finish chime search on key diamond OR main beacon (hut/monastery/etc).
  // Letter gate: while parchment unread, open/dismiss letter — do not soft-lock the mark.
  function tryFinishChimeSearchAt(x, y, e) {
    if (!searchMode || !map) return false;
    var clickRadius = getKeyClickRadiusPx();
    var touchPad = (e && e.type && String(e.type).indexOf('touch') === 0) ? 12 : 0;
    clickRadius += touchPad;
    var keyPt = map.latLngToContainerPoint([searchMode.keyLat, searchMode.keyLng]);
    var keyDist = Math.sqrt(Math.pow(x - keyPt.x, 2) + Math.pow(y - keyPt.y, 2));
    var hitKey = keyDist < clickRadius;

    var beaconPt = map.latLngToContainerPoint(getInteractionLatLng(searchMode.loc));
    var beaconR = Math.max(clickRadius + 10, clickRadiusFor(searchMode.loc) || 48);
    var beaconDist = Math.sqrt(Math.pow(x - beaconPt.x, 2) + Math.pow(y - beaconPt.y, 2));
    var hitBeacon = beaconDist < beaconR;

    if (!hitKey && !hitBeacon) return false;

    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }

    // Soft path (gate off): KEY/beacon grants parchment then charts.
    ensureSabellaLetterBeforeChart(searchMode.loc);

    if (isLetterGateBlockingChart(searchMode.loc)) {
      // Mark click while letter is up → dismiss (dismiss = GO → charts).
      if (document.getElementById('sabella-message-popup')) {
        dismissSabellaMessagePopup();
        return true;
      }
      // On the mark but parchment never opened — force Hot letter now.
      maybeShowSabellaLetterOnChime(1);
      if (isLetterGateBlockingChart(searchMode.loc)) {
        nudgeLetterGateFirst();
      }
      return true;
    }
    if (searchMode.letterRecovery) {
      finishLetterRecoverySearch(searchMode.loc);
    } else {
      completeDiscovery(searchMode.loc);
    }
    return true;
  }

  // Enter search mode — place a hidden key in the fog ring (offset from beacon).
  function enterSearchMode(loc, opts) {
    opts = opts || {};
    var letterStop = !!(SABELLA_MESSAGES[loc.id]);
    var letterRecovery = !!opts.letterRecovery;
    var keyPos = placeSearchKeyOffset(loc);
    var keyLat = keyPos.keyLat;
    var keyLng = keyPos.keyLng;

    searchMode = {
      locId: loc.id,
      loc: loc,
      keyLat: keyLat,
      keyLng: keyLng,
      startTime: Date.now(),
      mapClicks: 0,
      escapeBoost: false,
      escapeHintShown: false,
      clueBandsFired: {},
      letterRecovery: letterRecovery,
      // Two-beat gate: Hot→parchment dismiss before chart (first visit only).
      letterGateActive: !!(!letterRecovery && isSabellaLetterGateEnabled() &&
        SABELLA_MESSAGES[loc.id] && hasUnseenSabellaMessage(loc.id)),
      letterGateCleared: false
    };

    // Start lantern at the beacon/pinhole (cool–warm), not on the key — player
    // must move toward the offset diamond to hear chime intensity rise.
    var beaconLl = getInteractionLatLng(loc);
    var pt = map.latLngToContainerPoint(beaconLl);
    spotlightPos = { x: pt.x, y: pt.y };

    if (map) map.getContainer().classList.add('chime-search-active');
    setChimeSearchLabelFocus(loc.id);
    showChimeSearchTeachTip(loc);
    ensureChimeWarmthHud();

    // Letters fire when lantern crosses Hot near the offset sigil (or on KEY_CLICK
    // via ensureSabellaLetterBeforeChart) — do not auto-grant Hot at beacon center.
    console.log('[FOG] Search mode: find the key for', loc.name,
      letterRecovery ? '(letter recovery)' : '',
      letterStop ? '(letter stop)' : '');
  }

  // Re-enter chime search at a completed letter-stop so the parchment is found
  // via lantern warmth — not a random fog click.
  function enterLetterSearchMode(loc) {
    if (!loc || !isSabellaMessagesEnabled()) return false;
    if (!SABELLA_MESSAGES[loc.id] || !hasUnseenSabellaMessage(loc.id)) return false;
    if (!isFullyDiscovered(loc.id)) return false;
    if (searchMode) exitSearchMode();
    enterSearchMode(loc, { letterRecovery: true });
    return true;
  }

  // Key found (or chime-hot) during letter-recovery search — show parchment, leave map as-is.
  function finishLetterRecoverySearch(loc) {
    if (searchMode) searchMode.silenced = true;
    exitSearchMode();
    if (loc) forceShowSabellaLetter(loc);
  }

  // Mute-safe teach tip on every search enter — does not rely on beeps.
  // First visit gets a longer sentence; later visits a shorter reminder.
  var CHIME_TEACH_SEEN_LS = 'intrepid_chime_teach_seen';
  var chimeTeachTimer = null;

  function dismissChimeSearchTeachTip() {
    if (chimeTeachTimer) {
      clearTimeout(chimeTeachTimer);
      chimeTeachTimer = null;
    }
    var tip = document.getElementById('chime-search-teach');
    if (!tip) return;
    tip.style.opacity = '0';
    setTimeout(function() { if (tip.parentNode) tip.remove(); }, 400);
  }

  function showChimeSearchTeachTip(loc) {
    dismissChimeSearchTeachTip();
    var firstTime = true;
    try { firstTime = localStorage.getItem(CHIME_TEACH_SEEN_LS) !== '1'; } catch (e) {}

    var tip = document.createElement('div');
    tip.id = 'chime-search-teach';
    tip.setAttribute('role', 'status');
    tip.style.cssText =
      'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:940;cursor:pointer;' +
      'background:rgba(8,10,14,0.94);border:1px solid rgba(212,168,67,0.5);' +
      'border-radius:12px;padding:14px 22px;max-width:440px;width:90%;text-align:center;' +
      'font-family:"EB Garamond",Georgia,serif;color:#efe7d2;' +
      'box-shadow:0 8px 36px rgba(0,0,0,0.65),0 0 24px rgba(212,168,67,0.1);' +
      'opacity:0;transition:opacity 0.45s ease;';
    var hasLetter = loc && SABELLA_MESSAGES[loc.id] && isSabellaMessagesEnabled();
    var letterRecovery = !!(searchMode && searchMode.letterRecovery);
    var letterGate = !!(searchMode && searchMode.letterGateActive);
    var teachBody;
    if (letterRecovery) {
      teachBody = 'Search with the lantern for Sabella\u2019s letter \u2014 move until it reads <strong style="color:#d4a843;font-weight:600;">Hot</strong>, then click the mark.';
    } else if (letterGate) {
      teachBody = firstTime
        ? '<strong style="color:#d4a843;">First:</strong> lantern until <strong style="color:#d4a843;font-weight:600;">Hot</strong> for Sabella\u2019s letter. <strong style="color:#d4a843;">Then:</strong> tap the letter to close — that charts this place.'
        : 'Letter at <strong style="color:#d4a843;font-weight:600;">Hot</strong>, then tap the parchment to chart.';
    } else if (hasLetter) {
      teachBody = firstTime
        ? 'Sabella left a letter at this mark \u2014 keep the lantern on the glow until it reads <strong style="color:#d4a843;font-weight:600;">Hot</strong> (the parchment appears), then click again to chart the place.'
        : 'Lantern on the mark until <strong style="color:#d4a843;font-weight:600;">Hot</strong> for Sabella\u2019s letter, then click to chart.';
    } else {
      teachBody = firstTime
        ? 'The mark is hidden nearby \u2014 move your lantern until it glows warmer, then <strong style="color:#d4a843;font-weight:600;">click again</strong> to chart it.'
        : 'Move your lantern closer until it warms, then click again to chart the mark.';
    }
    tip.innerHTML =
      '<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#d4a843;' +
        'margin-bottom:8px;font-family:Cinzel,serif;">' +
        (letterRecovery || letterGate ? 'Sabella\u2019s letter' : 'Search the fog') + '</div>' +
      '<div style="font-size:15px;line-height:1.55;color:#efe7d2;">' + teachBody + '</div>' +
      (loc && loc.name
        ? '<div style="font-size:11px;color:#9a8f7e;margin-top:8px;">' +
          (letterRecovery ? 'At ' : (letterGate ? 'Letter then chart \u00b7 ' : 'Charting ')) + loc.name + '</div>'
        : '') +
      '<div style="font-size:9px;color:#5a5045;margin-top:10px;font-style:italic;">tap to dismiss</div>';
    tip.addEventListener('click', function() {
      try { localStorage.setItem(CHIME_TEACH_SEEN_LS, '1'); } catch (e2) {}
      dismissChimeSearchTeachTip();
    });
    document.body.appendChild(tip);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { tip.style.opacity = '1'; });
    });
    try { localStorage.setItem(CHIME_TEACH_SEEN_LS, '1'); } catch (e3) {}
    chimeTeachTimer = setTimeout(function() {
      dismissChimeSearchTeachTip();
    }, letterRecovery ? 9000 : (firstTime ? 10000 : 6500));
  }

  // On-screen cold/warm label — works with sound off (audio remains optional feedback)
  function ensureChimeWarmthHud() {
    if (document.getElementById('chime-warmth-hud')) return;
    var hud = document.createElement('div');
    hud.id = 'chime-warmth-hud';
    hud.setAttribute('aria-live', 'polite');
    hud.style.cssText =
      'position:fixed;bottom:96px;left:50%;transform:translateX(-50%);z-index:930;' +
      'pointer-events:none;padding:8px 18px;border-radius:999px;' +
      'background:rgba(8,10,14,0.82);border:1px solid rgba(212,168,67,0.35);' +
      'font-family:Cinzel,serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;' +
      'color:#c4a882;opacity:0;transition:opacity 0.35s ease,color 0.25s ease,border-color 0.25s ease;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.45);';
    hud.textContent = 'Searching';
    document.body.appendChild(hud);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { hud.style.opacity = '1'; });
    });
  }

  function dismissChimeWarmthHud() {
    var hud = document.getElementById('chime-warmth-hud');
    if (!hud) return;
    hud.style.opacity = '0';
    setTimeout(function() { if (hud.parentNode) hud.remove(); }, 350);
  }

  function updateChimeWarmthHud(proximity) {
    ensureChimeWarmthHud();
    var hud = document.getElementById('chime-warmth-hud');
    if (!hud) return;
    var gateBlocks = !!(searchMode && searchMode.letterGateActive && !searchMode.letterGateCleared);
    var label = 'Searching';
    var color = '#9a8f7e';
    var border = 'rgba(154,143,126,0.35)';
    if (gateBlocks && searchMode.sabellaLetterFired) {
      label = 'Read letter';
      color = '#f0d878';
      border = 'rgba(240,216,120,0.7)';
    } else if (proximity >= 0.85) {
      label = gateBlocks ? 'Hot — letter' : 'Click to chart';
      color = '#f0d878';
      border = 'rgba(240,216,120,0.7)';
    } else if (proximity >= 0.65) {
      label = gateBlocks ? 'Hot — letter' : 'Hot';
      color = '#e8c840';
      border = 'rgba(232,200,64,0.55)';
    } else if (proximity >= 0.35) {
      label = 'Warmer';
      color = '#d4a843';
      border = 'rgba(212,168,67,0.5)';
    } else if (proximity >= 0.15) {
      label = 'Cool';
      color = '#8ab4d4';
      border = 'rgba(138,180,212,0.4)';
    } else {
      label = gateBlocks ? 'Find letter' : 'Cold';
      color = gateBlocks ? '#9a8f7e' : '#7a8a9a';
      border = 'rgba(122,138,154,0.35)';
    }
    if (hud.textContent !== label) hud.textContent = label;
    hud.style.color = color;
    hud.style.borderColor = border;
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
      '<div style="font-size:13px;line-height:1.55;color:#efe7d2;">Move your lantern slowly. As it glows warmer you are closer \u2014 look for the glowing sigil, then click again to chart it.</div>' +
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

  function recordSecret(payload, band, locIdOverride) {
    try {
      var stored = [];
      var raw = localStorage.getItem(SECRETS_COLLECTED_LS);
      if (raw) stored = JSON.parse(raw);
      if (!Array.isArray(stored)) stored = [];
      var exists = stored.some(function(s) { return s && s.id === payload.secretId; });
      if (exists) return;
      stored.push({
        id: payload.secretId,
        locId: locIdOverride || (searchMode ? searchMode.locId : '') || '',
        band: band && band.id ? band.id : (band || 'letter'),
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
    if (document.getElementById('sabella-message-popup')) return;

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
    if (document.getElementById('sabella-message-popup')) return;
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

  /* ════════════════════════════════════════════════
     SABELLA JOURNEY LETTERS (chime-hot Secret finds, 4 stops)
     Last letter at Sinn; Indras Na has no parchment (congrats on complete).
     Primary: proximity crosses "hot" band near the offset sigil during searchMode
       (KEY_CLICK soft-grants letter only when ENABLE_SABELLA_LETTER_GATE is off)
     Gate ON: Hot→parchment dismiss required before chart (GO/NO-GO)
     Recovery: click the completed letter-stop marker, or Guide Me → lantern search
     Never: random fog clicks away from the marker / search key; never stack sigil on beacon
     Flag: ENABLE_SABELLA_MESSAGES — intentionally ON for beta (do not flip false for prod)
     Gate: ENABLE_SABELLA_LETTER_GATE (kill LS intrepid_sabella_letter_gate_disabled / ?nolettergate)
     Per-player kill: localStorage intrepid_sabella_messages_disabled=1
  ════════════════════════════════════════════════ */
  function isSabellaMessagesEnabled() {
    if (!ENABLE_SABELLA_MESSAGES) return false;
    try {
      if (localStorage.getItem(SABELLA_MESSAGES_DISABLED_LS) === '1') return false;
    } catch (e) {}
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has('nosabellamessages')) return false;
    } catch (e2) {}
    return true;
  }

  function isSabellaLetterGateEnabled() {
    if (!ENABLE_SABELLA_LETTER_GATE || !isSabellaMessagesEnabled()) return false;
    try {
      if (localStorage.getItem(SABELLA_LETTER_GATE_DISABLED_LS) === '1') return false;
    } catch (e) {}
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has('nolettergate')) return false;
    } catch (e2) {}
    return true;
  }

  // Hard GO/NO-GO: letter stops cannot chart until Hot parchment is dismissed.
  function isLetterGateBlockingChart(loc) {
    if (!isSabellaLetterGateEnabled()) return false;
    if (!loc || !searchMode || searchMode.letterRecovery) return false;
    if (!SABELLA_MESSAGES[loc.id]) return false;
    if (searchMode.letterGateCleared) return false;
    if (hasUnseenSabellaMessage(loc.id)) return true;
    if (searchMode.sabellaLetterFired) return true;
    return false;
  }

  function nudgeLetterGateFirst() {
    if (!searchMode) return;
    ensureChimeWarmthHud();
    var hud = document.getElementById('chime-warmth-hud');
    if (hud) {
      hud.textContent = searchMode.sabellaLetterFired
        ? 'Read the letter first'
        : 'Find letter — Hot';
      hud.style.color = '#f0d878';
      hud.style.borderColor = 'rgba(240,216,120,0.75)';
    }
    var old = document.getElementById('letter-gate-nudge');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var tip = document.createElement('div');
    tip.id = 'letter-gate-nudge';
    tip.setAttribute('role', 'status');
    tip.style.cssText =
      'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:945;cursor:pointer;' +
      'background:rgba(8,10,14,0.94);border:1px solid rgba(212,168,67,0.55);' +
      'border-radius:10px;padding:12px 18px;max-width:400px;width:90%;text-align:center;' +
      'font-family:"EB Garamond",Georgia,serif;color:#efe7d2;' +
      'box-shadow:0 8px 28px rgba(0,0,0,0.6);opacity:0;transition:opacity 0.3s ease;';
    tip.innerHTML = searchMode.sabellaLetterFired
      ? '<div style="font-size:14px;line-height:1.5;">Tap the letter to close — that charts this place.</div>'
      : '<div style="font-size:14px;line-height:1.5;">Sabella left a letter here first \u2014 move the lantern until it reads <strong style="color:#d4a843;">Hot</strong>.</div>';
    tip.addEventListener('click', function() {
      if (tip.parentNode) tip.parentNode.removeChild(tip);
    });
    document.body.appendChild(tip);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { tip.style.opacity = '1'; });
    });
    setTimeout(function() {
      if (!tip.parentNode) return;
      tip.style.opacity = '0';
      setTimeout(function() { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 300);
    }, 4200);
  }

  function clearLetterGateAfterParchment() {
    if (!searchMode || !searchMode.letterGateActive) return;
    searchMode.letterGateCleared = true;
    if (searchMode.letterRecovery || searchMode.silenced) return;
    // Dismissing Sabella's letter is the GO — chart immediately (no second diamond hunt).
    // Lantern often leaves Hot while the player taps the parchment to close it.
    completeDiscovery(searchMode.loc);
  }

  function getSabellaLetterHotThreshold() {
    for (var i = 0; i < CHIME_CLUE_BANDS.length; i++) {
      if (CHIME_CLUE_BANDS[i].id === 'hot') return CHIME_CLUE_BANDS[i].threshold;
    }
    return 0.65;
  }

  function getSabellaMessagesSeen() {
    try {
      var raw = localStorage.getItem(SABELLA_MESSAGES_SEEN_LS);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function markSabellaMessageSeen(locId) {
    try {
      var seen = getSabellaMessagesSeen();
      seen[locId] = Date.now();
      localStorage.setItem(SABELLA_MESSAGES_SEEN_LS, JSON.stringify(seen));
    } catch (e) {}
  }

  function hasUnseenSabellaMessage(locId) {
    if (!SABELLA_MESSAGES[locId]) return false;
    var seen = getSabellaMessagesSeen();
    return !seen[locId];
  }

  function countSabellaLettersCollected() {
    var ids = Object.keys(SABELLA_MESSAGES);
    var seen = getSabellaMessagesSeen();
    var n = 0;
    for (var i = 0; i < ids.length; i++) {
      if (seen[ids[i]]) n++;
    }
    return n;
  }

  function sabellaLettersTotal() {
    return Object.keys(SABELLA_MESSAGES).length;
  }

  function countSabellaPrereqLettersCollected() {
    var seen = getSabellaMessagesSeen();
    var n = 0;
    for (var i = 0; i < SABELLA_LETTER_PREREQ_IDS.length; i++) {
      if (seen[SABELLA_LETTER_PREREQ_IDS[i]]) n++;
    }
    return n;
  }

  function sabellaPrereqLettersComplete() {
    return countSabellaPrereqLettersCollected() >= SABELLA_LETTER_PREREQ_IDS.length;
  }

  // Ordered missing road-letter stops (hut → monastery → tower → sinn).
  function getMissingSabellaLetterIds() {
    var seen = getSabellaMessagesSeen();
    var missing = [];
    var i;
    for (i = 0; i < SABELLA_LETTER_PREREQ_IDS.length; i++) {
      var id = SABELLA_LETTER_PREREQ_IDS[i];
      if (!seen[id]) missing.push(id);
    }
    return missing;
  }

  function getMissingSabellaLetterNames() {
    var ids = getMissingSabellaLetterIds();
    var names = [];
    var i;
    for (i = 0; i < ids.length; i++) {
      names.push(sabellaLetterDisplayName(ids[i]));
    }
    return names;
  }

  function sabellaLetterDisplayName(locId) {
    if (SABELLA_LETTER_DISPLAY_NAMES[locId]) return SABELLA_LETTER_DISPLAY_NAMES[locId];
    var loc = (window.LOCATIONS || []).find(function(l) { return l.id === locId; });
    return loc ? loc.name : locId;
  }

  function getFirstMissingSabellaLetterId() {
    var missing = getMissingSabellaLetterIds();
    return missing.length ? missing[0] : null;
  }

  // Soft-lock recovery: fully charted letter-stop with unseen parchment → show letter NOW.
  // Must not defer behind #locked-msg / scheduleSabellaMessage (that soft-locks at Secrets 3/4).
  function forceShowSabellaLetter(loc) {
    if (!loc || !isSabellaMessagesEnabled()) return false;
    if (!SABELLA_MESSAGES[loc.id] || !hasUnseenSabellaMessage(loc.id)) return false;
    if (!isFullyDiscovered(loc.id)) return false;

    // Clear overlays that block scheduleSabellaMessage forever
    var locked = document.getElementById('locked-msg');
    if (locked && locked.parentNode) locked.parentNode.removeChild(locked);
    dismissSabellaCluePopup(true);
    sabellaMessagePending = false;

    if (document.getElementById('sabella-message-popup')) return true;
    showSabellaMessagePopup(loc.id, SABELLA_MESSAGES[loc.id]);
    return true;
  }

  // Marker tap on a completed letter-stop: start lantern hunt (same as Guide Me).
  // Falls back to force-show if search cannot start (e.g. already in searchMode edge cases).
  function maybeRecoverSabellaLetter(loc) {
    if (!loc || !isSabellaMessagesEnabled()) return false;
    if (!SABELLA_MESSAGES[loc.id] || !hasUnseenSabellaMessage(loc.id)) return false;
    if (!isFullyDiscovered(loc.id)) return false;
    if (enterLetterSearchMode(loc)) return true;
    return forceShowSabellaLetter(loc);
  }

  // Primary letter path: fire once when chime search crosses "hot" (Secret find).
  // Never from random fog clicks — only searchMode lantern proximity (or marker/Guide Me recovery).
  function maybeShowSabellaLetterOnChime(proximity) {
    if (!isSabellaMessagesEnabled() || !searchMode || searchMode.silenced) return;
    if (document.getElementById('sabella-message-popup')) return;
    // Note: do not bail on sabellaMessagePending — scheduled chart-fallback must not
    // block Hot / beacon grant while the player is still in searchMode.

    var locId = searchMode.locId;
    if (!SABELLA_MESSAGES[locId] || !hasUnseenSabellaMessage(locId)) return;
    if (searchMode.sabellaLetterFired) return;
    if (proximity < getSabellaLetterHotThreshold()) return;

    searchMode.sabellaLetterFired = true;
    if (!searchMode.clueBandsFired) searchMode.clueBandsFired = {};
    searchMode.clueBandsFired.hot = true;
    sabellaMessagePending = false;

    var wasRecovery = !!searchMode.letterRecovery;
    var gateArmed = !!searchMode.letterGateActive && !wasRecovery;
    if (gateArmed) {
      var prevDismiss = sabellaMessageOnDismiss;
      sabellaMessageOnDismiss = function() {
        clearLetterGateAfterParchment();
        if (prevDismiss) prevDismiss();
      };
    }
    showSabellaMessagePopup(locId, SABELLA_MESSAGES[locId]);
    // Letter-recovery hunt ends when parchment appears (location already charted).
    if (wasRecovery) {
      if (searchMode) searchMode.silenced = true;
      exitSearchMode();
    }
  }

  // KEY_CLICK can chart without ever reading Hot in the HUD — soft path grants letter.
  // With letter gate ON, KEY_CLICK must not skip the Hot hunt (nudge instead).
  function ensureSabellaLetterBeforeChart(loc) {
    if (!loc || !searchMode) return;
    if (!isSabellaMessagesEnabled()) return;
    if (!SABELLA_MESSAGES[loc.id] || !hasUnseenSabellaMessage(loc.id)) return;
    if (searchMode.sabellaLetterFired) return;
    if (isSabellaLetterGateEnabled() && !searchMode.letterRecovery) return;
    maybeShowSabellaLetterOnChime(1);
  }

  // Overlays that should delay parchment (visible only — faded tut toasts must not soft-lock).
  function isSabellaLetterUiBlocked() {
    var panelEl = document.getElementById('panel');
    var cardEl = document.getElementById('discovery-card');
    if (panelEl && panelEl.classList.contains('open')) return true;
    if (cardEl && cardEl.classList.contains('visible')) return true;
    function overlayVisible(id) {
      var el = document.getElementById(id);
      if (!el) return false;
      try {
        var op = parseFloat(window.getComputedStyle(el).opacity);
        if (!isNaN(op) && op < 0.05) return false;
      } catch (e) {}
      return true;
    }
    return overlayVisible('tutorial-persistent-toast') ||
      overlayVisible('post-tutorial-hint');
  }

  function dismissSabellaMessagePopup() {
    var popup = document.getElementById('sabella-message-popup');
    if (!popup) {
      var cbEarly = sabellaMessageOnDismiss;
      sabellaMessageOnDismiss = null;
      if (cbEarly) cbEarly();
      return;
    }
    popup.style.opacity = '0';
    setTimeout(function() {
      if (popup.parentNode) popup.remove();
      var cb = sabellaMessageOnDismiss;
      sabellaMessageOnDismiss = null;
      if (cb) cb();
    }, 500);
  }

  function showSabellaMessagePopup(locId, letter) {
    if (document.getElementById('sabella-message-popup')) return;
    dismissSabellaCluePopup(true);

    if (!document.getElementById('tut-toast-style')) {
      var s = document.createElement('style');
      s.id = 'tut-toast-style';
      s.textContent = '@keyframes tutBorderPulse { 0%,100%{border-color:rgba(198,141,85,0.4)} 50%{border-color:rgba(212,168,67,0.9)} }';
      document.head.appendChild(s);
    }

    var popup = document.createElement('div');
    popup.id = 'sabella-message-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', letter.title || 'Letter from Sabella');
    popup.style.cssText =
      'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:2000;' +
      'cursor:pointer;' +
      'background:linear-gradient(165deg,rgba(42,32,22,0.98) 0%,rgba(18,14,10,0.98) 55%,rgba(12,10,8,0.99) 100%);' +
      'border:2px solid rgba(198,141,85,0.65);border-radius:14px;' +
      'padding:24px 36px;text-align:center;max-width:540px;width:90%;' +
      'font-family:"EB Garamond",Georgia,serif;color:#efe7d2;' +
      'box-shadow:0 12px 60px rgba(0,0,0,0.85),0 0 40px rgba(198,168,67,0.14),inset 0 1px 0 rgba(232,210,170,0.08);' +
      'animation:tutBorderPulse 2s ease-in-out infinite;' +
      'opacity:0;transition:opacity 0.5s ease;';
    popup.innerHTML =
      '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#d4a843;' +
        'margin-bottom:10px;font-family:Cinzel,serif;">Sabella\u2019s Letter</div>' +
      '<div style="font-size:15px;letter-spacing:1px;color:#c4a882;margin-bottom:14px;font-family:Cinzel,serif;">' +
        letter.title + '</div>' +
      '<div style="font-size:17px;font-style:italic;color:#e8dcc4;margin-bottom:10px;text-align:left;">' +
        letter.greeting + '</div>' +
      '<div style="font-size:16px;letter-spacing:0.2px;line-height:1.65;margin-bottom:16px;text-align:left;color:#efe7d2;">' +
        letter.body + '</div>' +
      '<div style="font-size:13px;color:#9a8f7e;font-style:italic;text-align:right;margin-bottom:8px;">\u2014 ' +
        letter.signoff + '</div>' +
      '<div style="font-size:9px;color:#5a5045;margin-top:10px;font-style:italic;">tap to dismiss</div>';

    function onLetterDismiss(e) {
      if (e) e.stopPropagation();
      dismissSabellaMessagePopup();
    }
    popup.addEventListener('click', onLetterDismiss);
    document.body.appendChild(popup);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { popup.style.opacity = '1'; });
    });

    markSabellaMessageSeen(locId);
    recordSecret({
      secretId: locId + ':letter',
      speaker: letter.signoff,
      text: letter.greeting + ' ' + letter.body
    }, 'letter', locId);
    updateProgress();

    setTimeout(function() { dismissSabellaMessagePopup(); }, 14000);
  }

  // Fallback: discovery-complete if letter still unseen (e.g. skipped hot band).
  // Primary path is maybeShowSabellaLetterOnChime — seen LS dedupes both.
  // Optional onDismiss runs after Close (road letters only; Indras uses maybeShowVol2GateToast directly).
  // Never wait forever on #locked-msg / invisible tut toasts (that soft-locked Secrets).
  function scheduleSabellaMessage(loc, onDismiss) {
    function finishSkip() {
      if (onDismiss) setTimeout(onDismiss, 1400);
    }
    if (!loc || !isSabellaMessagesEnabled()) {
      finishSkip();
      return;
    }
    // Chime-hot already showing (or pending) — wait for Close before congrats/callback
    if (document.getElementById('sabella-message-popup') || sabellaMessagePending) {
      if (onDismiss) sabellaMessageOnDismiss = onDismiss;
      return;
    }
    if (!hasUnseenSabellaMessage(loc.id)) {
      finishSkip();
      return;
    }

    sabellaMessagePending = true;
    sabellaMessageOnDismiss = onDismiss || null;
    var startedAt = Date.now();
    var maxWaitMs = 12000;

    function tryShow() {
      // Dismiss locked modal — letter reveal must not soft-lock behind it
      var lockedMsg = document.getElementById('locked-msg');
      if (lockedMsg && lockedMsg.parentNode) lockedMsg.parentNode.removeChild(lockedMsg);

      var waitedLong = (Date.now() - startedAt) >= maxWaitMs;
      if (!waitedLong && isSabellaLetterUiBlocked()) {
        setTimeout(tryShow, 400);
        return;
      }

      sabellaMessagePending = false;
      var letter = SABELLA_MESSAGES[loc.id];
      if (!letter || !hasUnseenSabellaMessage(loc.id)) {
        var cb = sabellaMessageOnDismiss;
        sabellaMessageOnDismiss = null;
        if (cb) setTimeout(cb, 400);
        return;
      }
      showSabellaMessagePopup(loc.id, letter);
    }

    setTimeout(tryShow, 900);
  }

  // Tear down chime search immediately — reveal animation uses discovered phase, not searchMode.
  function exitSearchMode() {
    if (!searchMode) return;
    searchMode = null;
    spotlightPos = null;
    lastPingTime = Date.now();

    var escapeHint = document.getElementById('chime-escape-hint');
    if (escapeHint) escapeHint.remove();
    dismissChimeSearchTeachTip();
    dismissChimeWarmthHud();
    dismissSabellaCluePopup(false);
    clearChimeSearchLabelFocus();

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

    // Sabella letter fallback (primary is chime-hot). Indras Na has no letter — fire Vol2 toast.
    if (loc.id === FINAL_ELENA_STOP) {
      maybeShowVol2GateToast();
    } else {
      scheduleSabellaMessage(loc);
    }

    // Tower cluster: peek Maxim Stone immediately so amber glow ↔ clickable stay in sync.
    // Hint toast stays delayed so it doesn't fight the tower celebration.
    if (loc.id === 'tower-nine') {
      peekClusterSites('tower-nine');
      setTimeout(function() {
        showTowerClusterHint();
      }, 1800);
    }

    // After a journey stop completes, fly toward next glow or sealed Indras Na if off-screen
    if (isOnPath(loc.id) && loc.id !== FINAL_ELENA_STOP) {
      maybeFlyToNextJourneyStep(1800);
    }

    // Advance tutorial if in search steps
    if (tutorialStep < TUTORIAL_STEPS) {
      advanceTutorial();
    }

    delete clusterPeek[loc.id];

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
      '<span style="font-size:11px;color:#a09070;">Sweep the lantern across the peak — the letter waits at the crown.</span>';
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

    // ── Secrets track ── (Sabella letters — flag-gated row)
    var secretsEnabled = isSabellaMessagesEnabled();
    var secretTotal = sabellaLettersTotal();
    var secretFound = secretsEnabled ? countSabellaLettersCollected() : 0;
    var secretPct = secretTotal > 0 ? secretFound / secretTotal : 0;

    // Combined pct for rank (weighted: journey counts most, then territories, then cities)
    var combined = (journeyFound * 3 + regionFound * 2 + cityFound) /
                   Math.max(1, journeyTotal * 3 + regionTotal * 2 + cityTotal);

    var fillJ   = document.getElementById('progress-fill');
    var countJ  = document.getElementById('progress-count');
    var fillR   = document.getElementById('progress-fill-regions');
    var countR  = document.getElementById('progress-count-regions');
    var fillC   = document.getElementById('progress-fill-cities');
    var countC  = document.getElementById('progress-count-cities');
    var fillS   = document.getElementById('progress-fill-secrets');
    var countS  = document.getElementById('progress-count-secrets');
    var rowS    = document.getElementById('progress-row-secrets');
    var title   = document.getElementById('progress-title');
    var label   = document.getElementById('progress-label');

    if (fillJ)  fillJ.style.width  = (journeyPct * 100) + '%';
    if (countJ) countJ.innerHTML   = journeyFound + ' <span>/ ' + journeyTotal + '</span>';
    if (fillR)  fillR.style.width  = (regionPct * 100) + '%';
    if (countR) countR.innerHTML   = regionFound + ' <span>/ ' + regionTotal + '</span>';
    if (fillC)  fillC.style.width  = (cityPct * 100) + '%';
    if (countC) countC.innerHTML   = cityFound + ' <span>/ ' + cityTotal + '</span>';
    if (rowS) rowS.style.display = secretsEnabled ? '' : 'none';
    if (secretsEnabled) {
      if (fillS) fillS.style.width = (secretPct * 100) + '%';
      if (countS) countS.innerHTML = secretFound + ' <span>/ ' + secretTotal + '</span>';
    }
    if (label)  label.textContent  = '';

    var rank = 'Apprentice Scribe';
    if (combined > 0.10) rank = 'Cartographer';
    if (combined > 0.30) rank = 'Senior Cartographer';
    if (combined > 0.55) rank = 'Magus Scribe';
    if (combined > 0.80) rank = 'Master Cartographer';
    if (title) title.textContent = rank;

    // Check god reveals — paced by territories charted (not total discovery count)
    checkGodReveals();

    // Milestone sparks at 5, 10, 15 (total combined discoveries)
    var totalDiscovered = Object.keys(discovered).length;
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
    if (secretsEnabled) pulseEl(countS, '#c49a6c');

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
    // Brief beat for the last chime, then constellation. Archive-complete overlay
    // waits until Mish (or any) guardian/lore card is dismissed — same progress tick
    // often reveals Mish (Indras Na + 17 territories) while journey finale also fires.
    buildConstellationLines();
    setTimeout(drawConstellationAnimation, 350);
    runAfterCeremonyClear(showJourneyToast, { minDelay: 1100, graceForOpen: 1600 });
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
  // fogWaveClearProgress declared early with map-perf state
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

  function findMedallionDef(defs, name) {
    for (var di = 0; di < defs.length; di++) {
      if (defs[di].name === name) return defs[di];
    }
    return null;
  }

  // Only guardians in VOL1_REVEAL_ORDER may unlock, strictly in clock order — no skipping ahead.
  // territoryCount = charted regions (type === 'region'), not total discoveries.
  function getValidRevealedGodsForCount(territoryCount, defs) {
    var cleaned = {};
    for (var vi = 0; vi < VOL1_REVEAL_ORDER.length; vi++) {
      var vname = VOL1_REVEAL_ORDER[vi];
      var vdef = findMedallionDef(defs, vname);
      if (!vdef || !vdef.unlock) break;
      if (!isGuardianUnlockEligible(vname, vdef.unlock, territoryCount)) break;
      cleaned[vname] = true;
    }
    return cleaned;
  }

  function checkGodReveals() {
    var defs = window.MEDALLION_DEFS;
    if (!defs) return;
    var territoryCount = getTerritoryDiscoveryCount();
    for (var i = 0; i < VOL1_REVEAL_ORDER.length; i++) {
      var name = VOL1_REVEAL_ORDER[i];
      if (revealedGods[name]) continue;
      var m = findMedallionDef(defs, name);
      if (!m || !m.unlock) break;
      if (isGuardianUnlockEligible(name, m.unlock, territoryCount)) {
        revealGod(m);
      } else {
        break; // next in clock order not yet eligible — do not skip ahead
      }
    }
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
    // Restore previously revealed gods — prune to clock-order chain at current territory count
    var currentCount = getTerritoryDiscoveryCount();
    var defs = window.MEDALLION_DEFS || [];
    var cleaned = getValidRevealedGodsForCount(currentCount, defs);
    try {
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
    VOL2_GATE_TOAST_LS, VOL2_GATE_LS_UNLOCK, VOL2_GATE_LS_LOCK,
    SECRETS_COLLECTED_LS, SABELLA_MESSAGES_SEEN_LS,
    CHIME_TEACH_SEEN_LS
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
  // guideTarget declared early with map-perf state

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

    // Re-open glow / letter legend (Cartographer's Charge) anytime after tutorial.
    var legendBtn = document.createElement('button');
    legendBtn.id = 'fog-legend-btn';
    legendBtn.type = 'button';
    legendBtn.setAttribute('aria-label', 'Show cartographer marks legend');
    legendBtn.textContent = 'Marks';
    legendBtn.title = 'Glow colors and Sabella letters';
    legendBtn.style.cssText =
      'position:fixed;bottom:12px;left:calc(50% - 118px);transform:translateX(0);z-index:800;' +
      'background:rgba(10,12,16,0.90);color:#9a8f7e;' +
      'border:1px solid rgba(198,141,85,0.35);border-radius:6px;' +
      'min-height:44px;padding:10px 12px;font-size:10px;cursor:pointer;' +
      'letter-spacing:2px;text-transform:uppercase;font-family:Cinzel,serif;' +
      'box-shadow:0 2px 12px rgba(0,0,0,0.5);';
    legendBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dismissPostTutorialHint(false);
      showPostTutorialHint(true);
    });
    document.body.appendChild(legendBtn);
  }

  function runGuideMe() {
    var locs = window.LOCATIONS || [];
    var target = null;
    var hintLine1 = '';
    var hintLine2 = '';
    var promptLetterSearch = false;

    // Priority 1: next unvisited journey step (golden glow — includes unlockable Indras Na)
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

    // Priority 1b: Indras sealed on missing Sabella letters — steer to first unread stop
    // (ordered: hut → monastery → tower → sinn). Do this BEFORE territory hunt.
    if (!target && isIndrasNaSealed() && isSabellaMessagesEnabled() &&
        !sabellaPrereqLettersComplete()) {
      var missId = getFirstMissingSabellaLetterId();
      if (missId) {
        target = locs.find(function(l) { return l.id === missId; });
        if (target) {
          var missName = sabellaLetterDisplayName(missId);
          var missCount = getMissingSabellaLetterIds().length;
          if (missCount === 1) {
            hintLine1 = 'Sabella left one more letter at ' + missName + '.';
          } else {
            hintLine1 = 'Sabella left more letters along Elena\u2019s road \u2014 next: ' +
              missName + '.';
          }
          if (isFullyDiscovered(missId)) {
            // Charted but parchment skipped — start lantern search; do NOT auto-open letter.
            hintLine2 = 'Search with the lantern for Sabella\u2019s letter';
            promptLetterSearch = true;
          } else {
            hintLine2 = 'Follow the glow and find the letter with the chime.';
          }
        }
      }
    }

    // Priority 1c: Indras sealed for charting (not letters) — show sealed finale mark
    if (!target && isIndrasNaSealed()) {
      target = locs.find(function(l) { return l.id === FINAL_ELENA_STOP; });
      if (target) {
        hintLine1 = 'Indras Na stays sealed until the map is whole.';
        hintLine2 = 'Chart every territory and ancient site first, then return here.';
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
      if (isSinnTerritoryGated()) {
        showSinnLockedMessage();
        return;
      }
      if (isIndrasNaSealed()) {
        showLockedMessage();
        return;
      }
      if (isVol2JourneyGateBlocking()) {
        showVol2LockedMessage(false);
        return;
      }
      showGuideHint('All Charted', 'Elena\u2019s journey is complete.', '');
      return;
    }

    if (isSinnTerritoryGated() && target.id !== SINN_CITY_ID) {
      var sinnNamed = getTerritoryDiscoveryCount();
      hintLine1 = 'Sinn waits until more of the Hollowlands are charted.';
      hintLine2 = '(' + sinnNamed + ' of ' + SINN_TERRITORY_GATE +
        ' lands named) \u2014 chart the orange shimmer first.';
    }

    // Pan/fly to target — fly when farther so letter stops aren't a tiny nudge
    var guideCenter = map.getCenter();
    var guideDx = guideCenter.lat - target.lat;
    var guideDy = guideCenter.lng - target.lng;
    var guideDist = Math.sqrt(guideDx * guideDx + guideDy * guideDy);
    if (guideDist > 450) {
      map.flyTo(getInteractionLatLng(target), Math.max(map.getZoom(), map.getMinZoom() + 2), {
        duration: 1.6
      });
    } else {
      map.panTo(getInteractionLatLng(target), { animate: true, duration: 1.4 });
    }

    // Trigger canvas pulsing ring for 4s after pan lands
    setTimeout(function() {
      guideTarget = { lat: target.lat, lng: target.lng, endTime: Date.now() + 4500 };
    }, 900);

    // Start lantern chime at the letter-stop — parchment fires on hot (or marker click).
    if (promptLetterSearch) {
      setTimeout(function() {
        enterLetterSearchMode(target);
      }, 1100);
    }

    // Show hint toast
    setTimeout(function() {
      showGuideHint(
        (promptLetterSearch ? sabellaLetterDisplayName(target.id) : target.name) +
          (target.sub && !promptLetterSearch ? ' \u2014 ' + target.sub : ''),
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
     Cap idle FPS when ENABLE_MAP_PERF; pause while document.hidden;
     skip duplicate draws when reveal/wave/constellation already drive RAF;
     full rate for search + guide pulse.
     ════════════════════════════════════════════════ */
  function startDrift() {
    if (driftRAF) cancelAnimationFrame(driftRAF);
    bindMapPerfVisibility();
    function tick(now) {
      driftRAF = requestAnimationFrame(tick);
      if (document.hidden) return;
      // Specialized animations call draw() themselves — avoid double paint
      if (animatingReveal) return;
      if (fogWaveClearProgress > 0 && fogWaveClearProgress < 1) return;
      var fs = window._finaleState;
      if (fs && fs.constellationLines && fs.constellationLines.length &&
          typeof fs.constellationDrawProgress === 'number' &&
          fs.constellationDrawProgress < fs.constellationLines.length) {
        return;
      }
      if (isMapPerfEnabled() && !needsFullRateDraw()) {
        var minInterval = 1000 / DRIFT_FPS_IDLE;
        if (now - lastDriftDrawMs < minInterval) return;
      }
      lastDriftDrawMs = now;
      draw();
    }
    driftRAF = requestAnimationFrame(tick);
  }
  function stopDrift() {
    if (driftRAF) {
      cancelAnimationFrame(driftRAF);
      driftRAF = null;
    }
  }

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
    getIndrasNaLockedReason: getIndrasNaLockedReason,
    isIndrasNaSealed: isIndrasNaSealed,
    getMissingSabellaLetterIds: getMissingSabellaLetterIds,
    getFirstMissingSabellaLetterId: getFirstMissingSabellaLetterId,
    maybeRecoverSabellaLetter: maybeRecoverSabellaLetter,
    forceShowSabellaLetter: forceShowSabellaLetter,
    sabellaLetterDisplayName: sabellaLetterDisplayName,
    showGlowLegend: function() {
      dismissPostTutorialHint(false);
      showPostTutorialHint(true);
    },
    getSinnLockedReason: getSinnLockedReason,
    isSinnTerritoryGated: isSinnTerritoryGated,
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
