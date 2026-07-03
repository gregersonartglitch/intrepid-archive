/* ═══════════════════════════════════════════════════════════════
   CARD SYSTEM — The Hollowlands Atlas
   Unified card for revealed and dormant locations.
   Uses the #discovery-card element from index.html.
   Merges logic from openPanel() and showDiscoveryCard().
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ════════════════════════════════════════════════
     LANDMARK ART — fallback images for locations
     that don't have a loc.art field.
     ════════════════════════════════════════════════ */
  var LANDMARK_ART = {
    'crossing-pool':   'crossing-pool.jpg',
    'tower-nine':      'tower-nine.jpg',
    'sabellas-hut':    'sabellas-hut.jpg',
    'monastery-wind':  'monastery-wind.jpg',
    'ashal':           'ashal.jpg',
    'maxim-stone':     'maxim-stone.jpg',
    'moon-stronghold': 'landmarks/moon_queen_stronghold.png',
    'hollowgate':      'landmarks/hollowgate.png',
    'belu':            'landmarks/belu_dragon_head.png'
  };

  /* ════════════════════════════════════════════════
     TYPE LABELS
     ════════════════════════════════════════════════ */
  var TYPE_LABELS = {
    region: 'Region',
    capital: 'Capital City',
    city: 'City',
    town: 'Settlement',
    story: 'Story Location',
    sacred: 'Sacred Site',
    water: 'Body of Water'
  };

  /* ════════════════════════════════════════════════
     INTERNAL HELPERS
     ════════════════════════════════════════════════ */

  function getCard() {
    return document.getElementById('discovery-card');
  }

  // Resolve art path: loc.art first, then LANDMARK_ART fallback
  function resolveArt(loc) {
    if (loc.art) return loc.art;
    if (LANDMARK_ART[loc.id]) return LANDMARK_ART[loc.id];
    return null;
  }

  // Get journey step info for this location (if any)
  function getJourneyStep(loc) {
    if (window.StateManager && window.StateManager.getJourneyStep) {
      return window.StateManager.getJourneyStep(loc.id);
    }
    // Fallback: scan JOURNEY_PATH directly
    var path = window.JOURNEY_PATH || [];
    for (var i = 0; i < path.length; i++) {
      if (path[i].locationId === loc.id) return path[i];
    }
    return null;
  }

  /* ════════════════════════════════════════════════
     SHOW REVEALED — full card for discovered locations
     Merges the best of openPanel() and showDiscoveryCard().
     ════════════════════════════════════════════════ */
  function showRevealed(loc) {
    var card = getCard();
    if (!card) return;

    var step = getJourneyStep(loc);
    var artPath = resolveArt(loc);
    var typeLabel = TYPE_LABELS[loc.type] || 'Location';

    // Art image
    var artEl = card.querySelector('.dc-art');
    if (artPath && artEl) {
      artEl.src = artPath;
      artEl.alt = loc.name || '';
      artEl.style.display = 'block';
    } else if (artEl) {
      artEl.style.display = 'none';
    }

    // Type eyebrow (with journey step prefix if applicable)
    var typeEl = card.querySelector('.dc-type');
    if (typeEl) {
      typeEl.textContent = step ? 'Step ' + step.step + ' · ' + typeLabel : typeLabel;
    }

    // Name
    var nameEl = card.querySelector('.dc-name');
    if (nameEl) nameEl.textContent = loc.name || '';

    // Subtitle
    var subEl = card.querySelector('.dc-sub');
    if (subEl) subEl.textContent = loc.sub || (step ? step.label : '');

    // Description
    var descEl = card.querySelector('.dc-desc');
    if (descEl) descEl.textContent = loc.desc || '';

    // Lore (hidden if empty)
    var loreEl = card.querySelector('.dc-lore');
    if (loc.lore && loreEl) {
      loreEl.textContent = loc.lore;
      loreEl.style.display = 'block';
    } else if (loreEl) {
      loreEl.style.display = 'none';
    }

    // Remove dormant class if present, add revealed
    card.classList.remove('dc-dormant');
    card.classList.add('visible');
  }

  /* ════════════════════════════════════════════════
     SHOW DORMANT — teaser card for dormant locations
     Uses StateManager.getDormantFlavor() for mystery text.
     ════════════════════════════════════════════════ */
  function showDormant(loc) {
    var card = getCard();
    if (!card) return;

    // Art — dormant locations may still have art
    var artPath = resolveArt(loc);
    var artEl = card.querySelector('.dc-art');
    if (artPath && artEl) {
      artEl.src = artPath;
      artEl.alt = loc.name || '';
      artEl.style.display = 'block';
    } else if (artEl) {
      artEl.style.display = 'none';
    }

    // Type eyebrow
    var typeEl = card.querySelector('.dc-type');
    if (typeEl) typeEl.textContent = 'Dormant';

    // Name
    var nameEl = card.querySelector('.dc-name');
    if (nameEl) nameEl.textContent = loc.name || '???';

    // Subtitle — empty for dormant
    var subEl = card.querySelector('.dc-sub');
    if (subEl) subEl.textContent = '';

    // Description — use dormant flavor text
    var descEl = card.querySelector('.dc-desc');
    if (descEl) {
      var flavor = '';
      if (window.StateManager && window.StateManager.getDormantFlavor) {
        flavor = window.StateManager.getDormantFlavor(loc);
      } else {
        flavor = 'This place holds its silence.';
      }
      descEl.textContent = flavor;
    }

    // Lore — hidden for dormant
    var loreEl = card.querySelector('.dc-lore');
    if (loreEl) loreEl.style.display = 'none';

    // Mark as dormant variant
    card.classList.add('dc-dormant');
    card.classList.add('visible');
  }

  /* ════════════════════════════════════════════════
     CLOSE
     ════════════════════════════════════════════════ */
  function close() {
    var card = getCard();
    if (card) {
      card.classList.remove('visible');
      card.classList.remove('dc-dormant');
    }
  }

  /* ════════════════════════════════════════════════
     INIT — bind close button
     ════════════════════════════════════════════════ */
  function init() {
    var card = getCard();
    if (!card) return;
    var closeBtn = card.querySelector('.dc-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        close();
      });
    }
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════ */
  window.CardSystem = {
    showRevealed: showRevealed,
    showDormant: showDormant,
    close: close,
    LANDMARK_ART: LANDMARK_ART
  };
})();
