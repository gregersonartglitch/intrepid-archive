# Sabella Clue Popups & Journey Letters

**Status:** Journey letters **wired to chime-hot Secret finds** (build 152+) · Chime-heat scribe clues still scaffold (default OFF)  
**Branch:** `feature/cuneiform-buttons`  
**Related:** Guardians Sabella's Trail (`docs/guardians/GUARDIANS-ADDENDUM-v2.md`), Archer *Sabella's Ear* (`GUARDIANS-ADDENDUM-v5.md`), veil static (`docs/FABLE-MAP-REVIEW-2026-07-07.md` item 17)

---

## Sabella journey letters (Cartographer playtest)

Four parchment letters fire **once per location** when chime search proximity crosses the **hot** band (≥ 0.65) — feels like finding the letter while searching. Recorded as a **Secret** (`{locId}:letter` in `intrepid_secrets_collected`). When `ENABLE_SABELLA_MESSAGES` is on, all **4** road letters gate Indras Na (`SABELLA_LETTER_PREREQ_IDS`). Last letter is at **Sinn**; Indras Na has no parchment — Vol 1 congrats fires on discovery complete.

| Stop | Location ID | Title (first line) |
|------|-------------|--------------------|
| 1 | `sabellas-hut` | **A Letter by the Hearth** — *My Elena…* |
| 2 | `monastery-wind` | **Wind Through the Oracle's Hall** — *My Elena…* |
| 3 | `tower-nine` | **From the Cage of Nine** — *My Elena…* |
| 4 | `sinn` | **Silver Ink at Sinn** — *My Elena…* (farewell beat toward the western gate) |

| Item | Value |
|------|-------|
| **Flag** | `ENABLE_SABELLA_MESSAGES` — **`true` on this branch for local demo; set `false` before prod** |
| **Kill switch** | `localStorage intrepid_sabella_messages_disabled=1` or `?nosabellamessages` |
| **Seen store** | `intrepid_sabella_messages_seen` (JSON map of locId → timestamp) |
| **Secrets** | `recordSecret` → `intrepid_secrets_collected` with id `{locId}:letter` |
| **UI** | `#sabella-message-popup` — parchment gradient, tap to dismiss, in `FOG_UI_SKIP` |
| **Primary trigger** | `maybeShowSabellaLetterOnChime(proximity)` during `searchMode` when proximity ≥ hot band |
| **Fallback** | `scheduleSabellaMessage` on discovery complete if still unseen (dedupe via seen LS) |
| **Indras Na** | No letter. Vol 2 reward toast fires on discovery complete (`maybeShowVol2GateToast`) |
| **Progress panel** | **Secrets** row (N / 4) in lower-left Magus Scribe panel — visible only when messages flag enabled |
| **Locked Indras** | When messages on: requires all 4 road letters + charted map; locked copy reports letter count |

---

## What exists today (chime-heat scaffold)

| System | Location | Behavior |
|--------|----------|----------|
| **Chime search** | `fog.js` `enterSearchMode`, `draw()` §4b | Amber-star locations enter `phase:'searching'`. Lantern spotlight follows cursor; `proximity` 0→1 from distance to hidden sigil (`maxDist` 300px). |
| **Getting hotter audio** | `updateDiviningAudio(proximity)` | Ping interval 800ms→100ms; pitch 300Hz→900Hz as proximity rises. No UI text for heat bands. |
| **Sabella letters** | `maybeShowSabellaLetterOnChime` | On hot band for the four letter stops — parchment + Secret ledger + Secrets progress row. |
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

## Chime-heat architecture

```
searchMode active
    └── draw() computes proximity (existing)
            ├── maybeShowSabellaLetterOnChime(proximity)   [ENABLE_SABELLA_MESSAGES]
            │       ├── hot band crossed once per search (Secret find)
            │       ├── showSabellaMessagePopup() — parchment letter
            │       ├── recordSecret() → intrepid_secrets_collected
            │       └── updateProgress() — Secrets N/4 row
            └── maybeShowChimeCluePopup(proximity)   [ENABLE_SABELLA_CLUE_POPUPS, default OFF]
                    ├── band crossed (warm / hot / burning) — once per band per search
                    ├── pick speaker: sabella | scribe (location map + band)
                    ├── showSabellaCluePopup() — center-bottom, tutBorderPulse
                    └── recordSecret() → localStorage intrepid_secrets_collected
```

### Heat bands (scaffold defaults)

| Band | Proximity | Eyebrow | Typical speaker |
|------|-----------|---------|-----------------|
| warm | ≥ 0.35 | Getting warmer | Scribe (mechanics hint) |
| hot | ≥ 0.65 | Getting hotter | **Sabella letter** (five stops) / optional clue popup |
| burning | ≥ 0.85 | Almost there | Short nudge before sigil click |

Letter fires **at most once per location** (seen LS). Hot band also marks `clueBandsFired.hot` so optional chime clues do not double-fire on the same band.

### Invariants (must not break)

- `isClickable()` / `draw()` glow parity — clue/letter popups are read-only UI; no discovery state changes.
- Letter primary path requires `searchMode`; fallback on discovery complete if unseen.
- Popup elements in `FOG_UI_SKIP` so clicks don't steal map discovery.
- Chime scribe clues default OFF; opt-in via `?sabellaclues` or `localStorage intrepid_sabella_clues_enabled=1`.
- Secrets progress row hidden when `ENABLE_SABELLA_MESSAGES` is off / kill switch on.

---

## Flag and files

| Item | Value |
|------|-------|
| **Letters flag** | `ENABLE_SABELLA_MESSAGES` (`true` local demo; **false before prod**) |
| **Chime flag** | `ENABLE_SABELLA_CLUE_POPUPS` (`false` default) |
| **Chime opt-in** | `?sabellaclues` or `localStorage intrepid_sabella_clues_enabled=1` |
| **Secrets storage** | `intrepid_secrets_collected` (JSON array) |
| **Seen storage** | `intrepid_sabella_messages_seen` |
| **Core** | `fog.js` — flags, letter data, chime-hot trigger, progress Secrets row |
| **UI** | `index.html` — `#progress-row-secrets` |
| **Docs** | `docs/SABELLA-CLUE-POPUPS.md` (this file), `docs/CARTOGRAPHER-STORY-FRUIT.md` |

---

## QA checklist

### Journey letters (`ENABLE_SABELLA_MESSAGES = true`)

1. Enter chime search at `sabellas-hut` → move lantern until pings are “hot” → parchment letter once; Secrets panel shows 1 / 4; dismiss; does not reappear.
2. Same for `monastery-wind`, `tower-nine`, `sinn` (last letter; farewell toward western gate).
3. `indras-na` search → no letter; complete discovery → Vol 1 reward dialogue fires immediately.
4. If a road letter is skipped somehow, discovery complete still shows it once (fallback).
5. `localStorage intrepid_sabella_messages_disabled=1` → zero letters; Secrets row hidden; Indras reward still fires.
6. Locked Indras click shows letter count when messages on and road letters incomplete.
7. `node --check fog.js` + `node scripts/smoke-journey-flow.js`.

### Chime clues (when enabled)

1. `?sabellaclues` → enter amber-star search → warm/hot/burning popups once each (hot skipped if letter already claimed that band).
2. Popups dismiss on tap; map clicks don't fire through popup.
3. Flag `false`, no opt-in → zero chime popups.
