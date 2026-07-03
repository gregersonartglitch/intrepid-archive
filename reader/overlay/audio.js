(function () {
  var AMBIENT_LS_KEY = "intrepid_ambient_enabled";
  var SFX_LS_KEY = "intrepid_sfx_enabled";
  var AMBIENT_SRC = "./assets/audio/ambient.mp3";
  var FLIP_SRC = "./assets/page-flip.mp3";
  var AMBIENT_VOLUME = 0.2;
  var AMBIENT_FADE_MS = 2500;
  var FLIP_VOLUME = 0.8;

  var ambientAudio = null;
  var flipAudio = null;
  var ambientEnabled = true;
  var sfxEnabled = true;
  var ambientFadeRAF = null;

  function readStoredBoolean(key, fallback) {
    try {
      var stored = localStorage.getItem(key);
      if (stored === null) {
        return fallback;
      }
      return stored === "true";
    } catch (e) {
      return fallback;
    }
  }

  function loadPreferences() {
    ambientEnabled = readStoredBoolean(AMBIENT_LS_KEY, true);
    sfxEnabled = readStoredBoolean(SFX_LS_KEY, true);
  }

  function updateAmbientButton() {
    var btn = document.querySelector('[data-action="ambient"]');
    if (!btn) {
      return;
    }
    btn.setAttribute("aria-pressed", ambientEnabled ? "true" : "false");
    btn.classList.toggle("is-off", !ambientEnabled);
  }

  function updateSfxButton() {
    var btn = document.querySelector('[data-action="sfx"]');
    if (!btn) {
      return;
    }
    btn.setAttribute("aria-pressed", sfxEnabled ? "true" : "false");
    btn.classList.toggle("is-off", !sfxEnabled);
  }

  function updateToggleButtons() {
    updateAmbientButton();
    updateSfxButton();
  }

  function ensureAmbientAudio() {
    if (!ambientAudio) {
      ambientAudio = new Audio(AMBIENT_SRC);
      ambientAudio.loop = true;
      ambientAudio.volume = 0;
      ambientAudio.preload = "auto";
      ambientAudio.load();
    }
    return ambientAudio;
  }

  function ensureFlipAudio() {
    if (!flipAudio) {
      flipAudio = new Audio(FLIP_SRC);
      flipAudio.volume = FLIP_VOLUME;
      flipAudio.preload = "auto";
      flipAudio.load();
    }
    return flipAudio;
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
      playPromise.then(function () { fadeAmbientIn(); }).catch(function () {
        /* autoplay blocked until gesture */
      });
    } else {
      fadeAmbientIn();
    }
  }

  function playAmbient() {
    startAmbientPlayback();
  }

  function stopAmbient() {
    cancelAmbientFade();
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio.volume = 0;
    }
  }

  function toggleAmbient() {
    ambientEnabled = !ambientEnabled;
    try {
      localStorage.setItem(AMBIENT_LS_KEY, ambientEnabled ? "true" : "false");
    } catch (e) {
      /* private browsing */
    }
    updateAmbientButton();
    if (ambientEnabled) {
      playAmbient();
    } else {
      stopAmbient();
    }
  }

  function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    try {
      localStorage.setItem(SFX_LS_KEY, sfxEnabled ? "true" : "false");
    } catch (e) {
      /* private browsing */
    }
    updateSfxButton();
  }

  function playPageFlip() {
    if (!sfxEnabled) {
      return;
    }
    var audio = ensureFlipAudio();
    audio.currentTime = 0;
    var playPromise = audio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {
        /* gesture required */
      });
    }
  }

  function bindControls() {
    var ambientBtn = document.querySelector('[data-action="ambient"]');
    if (ambientBtn) {
      ambientBtn.addEventListener("click", toggleAmbient);
    }
    var sfxBtn = document.querySelector('[data-action="sfx"]');
    if (sfxBtn) {
      sfxBtn.addEventListener("click", toggleSfx);
    }
  }

  function unlock() {
    if (ambientEnabled) {
      playAmbient();
    }
  }

  loadPreferences();
  updateToggleButtons();
  bindControls();
  ensureAmbientAudio();
  ensureFlipAudio();

  document.addEventListener("click", unlock, true);
  document.addEventListener("keydown", unlock, true);

  window.ReaderAudio = {
    onPageFlip: playPageFlip,
    toggleAmbient: toggleAmbient,
    toggleSfx: toggleSfx,
    unlock: unlock,
  };
})();
