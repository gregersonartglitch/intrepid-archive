# Sabella Clue Popups & Journey Letters

**Status:** Journey letters **implemented** (build 151+) · Chime-heat clues still scaffold (default OFF)  
**Branch:** `feature/cuneiform-buttons`  
**Related:** Guardians Sabella's Trail (`docs/guardians/GUARDIANS-ADDENDUM-v2.md`), Archer *Sabella's Ear* (`GUARDIANS-ADDENDUM-v5.md`), veil static (`docs/FABLE-MAP-REVIEW-2026-07-07.md` item 17)

---

## Sabella journey letters (Cartographer playtest)

Five parchment letters fire **once per location** on **discovery complete** (center-bottom, Cartographer's Charge band). Soft narrative only — **does not** hard-gate Indras Na.

| Stop | Location ID | Title (first line) |
|------|-------------|--------------------|
| 1 | `sabellas-hut` | **A Letter by the Hearth** — *My Elena…* |
| 2 | `tower-nine` | **From the Cage of Nine** — *My Elena…* |
| 3 | `monastery-wind` | **Wind Through the Oracle's Hall** — *My Elena…* |
| 4 | `sinn` | **Silver Ink at Sinn** — *My Elena…* |
| 5 | `indras-na` | **At the Western Gate** — *My Elena…* (then Vol 1 reward dialogue) |

| Item | Value |
|------|-------|
| **Flag** | `ENABLE_SABELLA_MESSAGES` — **`true` on this branch for local demo; set `false` before prod** |
| **Kill switch** | `localStorage intrepid_sabella_messages_disabled=1` or `?nosabellamessages` |
| **Seen store** | `intrepid_sabella_messages_seen` (JSON map of locId → timestamp) |
| **Secrets** | `recordSecret` → `intrepid_secrets_collected` with id `{locId}:letter` |
| **UI** | `#sabella-message-popup` — parchment gradient, tap to dismiss, in `FOG_UI_SKIP` |
| **Indras Na** | Letter shows first; Vol 2 reward toast runs on dismiss (or after skip delay) |
| **Locked Indras** | Soft copy only — chart legend notes letters along Elena's road; no collect-all gate |

---

## What exists today (chime-heat scaffold)

| System | Location | Behavior |
|--------|----------|----------|
| **Chime search** | `fog.js` `enterSearchMode`, `draw()` §4b | Amber-star locations enter `phase:'searching'`. Lantern spotlight follows cursor; `proximity` 0→1 from distance to hidden sigil (`maxDist` 300px). |
| **Getting hotter audio** | `updateDiviningAudio(proximity)` | Ping interval 800ms→100ms; pitch 300Hz→900Hz as proximity rises. No UI text for heat bands. |
| **Escape hint** | `maybeChimeEscapeHint()` | After 60s or 20 map clicks: left-side toast + `escapeBoost` widens key hit area. Not heat-driven. |
| **Cartographer's Charge** | `showPostTutorialHint()` | Center-bottom popup (`bottom:120px`, `tutBorderPulse`). Reference styling for celebration clues. |
| **Guide Me** | `showGuideHint()` | Left-side toast — different placement. |
| **Discovery celebration** | `showCelebration()` | Particle burst at map coords on complete — not a text popup. |
| **Tower cluster hint** | `showTowerClusterHint()` | Left-side italic quote after Sabella's hut → tower-nine foreshadow. |
| **Proximity whispers** | Removed build 94 | `WHISPERS` map in `.tmp/fog-prod66.js` — viewport-edge scribe notes. **Removed** for jank (draw-loop coupling). Do not revive that pattern. |
| **Sabella's Trail content** | `docs/guardians/GUARDIANS-ADDENDUM-v2.md` | 5-station quest copy — design target, not wired in core. |
| **Guardians plugin** | `plugins/guardians/` (branch `feature/guardians-plugin`) | Event bus + `.hlg-whisper` toasts. Tier B *chime-boost* not in core yet. |

**No glow/clickable changes** in this feature. Separate bug: no glows after Sabella's hut (`59daa303` area) — unrelated root cause; do not conflate.

---

## Chime-heat architecture (still default OFF)

```
searchMode active
    └── draw() computes proximity (existing)
            └── maybeShowChimeCluePopup(proximity)   [flag-gated]
                    ├── band crossed (warm / hot / burning) — once per band per search
                    ├── pick speaker: sabella | scribe (location map + band)
                    ├── showSabellaCluePopup() — center-bottom, tutBorderPulse
                    └── recordSecret() → localStorage intrepid_secrets_collected
```

### Heat bands (scaffold defaults)

| Band | Proximity | Eyebrow | Typical speaker |
|------|-----------|---------|-----------------|
| warm | ≥ 0.35 | Getting warmer | Scribe (mechanics hint) |
| hot | ≥ 0.65 | Getting hotter | Sabella or location clue |
| burning | ≥ 0.85 | Almost there | Short nudge before sigil click |

Bands fire **at most once per search session** per band (`searchMode.clueBandsFired`).

### Invariants (must not break)

- `isClickable()` / `draw()` glow parity — clue/letter popups are read-only UI; no discovery state changes.
- Chime popups: no fire during tutorial or outside `searchMode`.
- Letter popups: discovery-complete only; wait for panel/card chrome to clear.
- Popup elements in `FOG_UI_SKIP` so clicks don't steal map discovery.
- Chime clues default OFF; opt-in via `?sabellaclues` or `localStorage intrepid_sabella_clues_enabled=1`.

---

## Flag and files

| Item | Value |
|------|-------|
| **Letters flag** | `ENABLE_SABELLA_MESSAGES` (`true` local demo; **false before prod**) |
| **Chime flag** | `ENABLE_SABELLA_CLUE_POPUPS` (`false` default) |
| **Chime opt-in** | `?sabellaclues` or `localStorage intrepid_sabella_clues_enabled=1` |
| **Secrets storage** | `intrepid_secrets_collected` (JSON array) |
| **Core** | `fog.js` — flags, letter data, popup renderers, `completeDiscovery` hook |
| **Docs** | `docs/SABELLA-CLUE-POPUPS.md` (this file), `docs/CARTOGRAPHER-STORY-FRUIT.md` |

---

## QA checklist

### Journey letters (`ENABLE_SABELLA_MESSAGES = true`)

1. Discover `sabellas-hut` → after panel clears, parchment letter appears once; dismiss; does not reappear on revisit.
2. Same for `monastery-wind`, `tower-nine`, `sinn`.
3. Complete `indras-na` → farewell letter, then Vol 1 reward dialogue.
4. `localStorage intrepid_sabella_messages_disabled=1` → zero letters; Indras reward still fires.
5. Locked Indras click still shows chart legend (soft letter mention); unlock gates unchanged.
6. `node --check fog.js` + `node scripts/smoke-journey-flow.js`.

### Chime clues (when enabled)

1. `?sabellaclues` → enter amber-star search → warm/hot/burning popups once each.
2. Popups dismiss on tap; map clicks don't fire through popup.
3. Flag `false`, no opt-in → zero chime popups.
