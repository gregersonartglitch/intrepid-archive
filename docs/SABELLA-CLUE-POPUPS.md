# Sabella / Scribe Chime-Heat Clue Popups

**Status:** Scaffold only — `ENABLE_SABELLA_CLUE_POPUPS = false` (default OFF)  
**Branch:** `feature/cuneiform-buttons` (or dedicated `feature/sabella-clue-popups`)  
**Related:** Guardians Sabella's Trail (`docs/guardians/GUARDIANS-ADDENDUM-v2.md`), Archer *Sabella's Ear* (`GUARDIANS-ADDENDUM-v5.md`), veil static (`docs/FABLE-MAP-REVIEW-2026-07-07.md` item 17)

---

## What exists today

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

## User intent

When chime search feels "getting hotter," surface **Sabella clues** (trail apparitions) or **Scribe messages** (location-specific cartographer notes) as a **center-bottom celebration popup** — same visual band as Cartographer's Charge / above Guide Me.

Clues must be **proximity-driven during active search**, not random idle toasts (contrast veil static item 17).

Add a **Secrets** collection category so players can revisit clues.

---

## Proposed architecture

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

### UI mock (center-bottom)

```
┌─────────────────────────────────────────────┐
│  ✦ SECRETS · GETTING HOTTER                 │  ← Cinzel eyebrow, amber
│                                             │
│  "Larger inside than it looks from the      │  ← 18px body, bone
│   road. She warned me not to measure        │
│   the rooms."                               │
│                                             │
│  — Sabella                                  │  ← italic attribution
│                                             │
│            tap to dismiss                   │
└─────────────────────────────────────────────┘
     bottom: 120px · centered · z-index 2000
     (clears Guide Me at bottom:12px)
```

Reuse `tutBorderPulse` keyframes from Cartographer's Charge. Optional: light particle burst on first band only (reuse `celebration-particle` CSS if present).

### Secrets category — where?

| Option | Pros | Cons |
|--------|------|------|
| **A. Progress panel row** (`#progress-container`) | Visible alongside Journey / Territories / Sites | Needs HTML + `updateProgress()` hook |
| **B. Right panel tab** | Room for full clue text + location link | Larger UI change |
| **C. Scaffold: localStorage only** | Zero layout risk | No in-game review until A/B ships |

**Recommendation:** Ship **C** in scaffold; add **A** (4th row `Secrets · n collected`) when Jon approves copy. Guardians plugin can mirror secrets into `.hlg-ledger` later.

### Content sources (future)

1. **`CHIME_CLUE_CONTENT`** in `fog.js` — per-`locationId` `{ sabella, scribe }` strings (scaffold).
2. **`data.js`** — optional `chimeClues: { warm, hot, burning }` per location (content authoring).
3. **Guardians plugin** — `hl:chime:band` emit from core; plugin renders Sabella's Trail station copy (keeps core thin).

### Invariants (must not break)

- `isClickable()` / `draw()` glow parity — clue popups are read-only UI; no discovery state changes.
- No popups during tutorial (`tutorialStep < TUTORIAL_STEPS`) or outside `searchMode`.
- Popup element in `FOG_UI_SKIP` so clicks don't steal map discovery.
- Default OFF; opt-in via `?sabellaclues` or `localStorage intrepid_sabella_clues_enabled=1`.

### Interaction with other work

| Work | Relationship |
|------|----------------|
| Glow bug after Sabella's hut | **Separate** — `isClickable` / beacon draw; clue popups don't touch it |
| `59daa303` glow fix | Land independently |
| Veil static / signal bleed | Idle atmospheric — **must not** fire during `searchMode` |
| Guardians Archer *Sabella's Ear* | Future: widen `maxDist` or lower band thresholds when invocation active |
| Removed whispers | This is **chime-search-only**, not viewport-edge — avoids build-94 jank |

---

## Flag and files

| Item | Value |
|------|-------|
| **Flag** | `ENABLE_SABELLA_CLUE_POPUPS` (`false` default) |
| **Opt-in** | `?sabellaclues` or `localStorage intrepid_sabella_clues_enabled=1` |
| **Secrets storage** | `intrepid_secrets_collected` (JSON array) |
| **Core** | `fog.js` — flag, bands, popup renderer, draw hook |
| **Docs** | `docs/SABELLA-CLUE-POPUPS.md` (this file) |
| **Future** | `index.html` Secrets progress row; `data.js` clue fields; `plugins/guardians/` listener |

---

## QA checklist (when enabled)

1. `?sabellaclues` → enter amber-star search → move lantern toward sigil → warm/hot/burning popups appear center-bottom, once each.
2. Popups dismiss on tap; map clicks don't fire through popup.
3. Complete discovery → no more band popups for that session.
4. Flag `false`, no opt-in → zero popups, zero console noise.
5. `node --check fog.js` passes.
6. Post-tutorial glows still match clickability (regression spot-check).

---

## Example clue (scaffold)

**Location:** `sabellas-hut` · **band:** hot · **speaker:** Sabella

> Larger inside than it looks from the road. She warned me not to measure the rooms.
