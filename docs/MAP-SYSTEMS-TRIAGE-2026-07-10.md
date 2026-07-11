# Hollowlands Map Systems — Tactical Triage

**Date:** 2026-07-10  
**Branch:** `feature/cuneiform-buttons`  
**Sources:** `fog.js`, `data.js`, `index.html` (current code only — no future proposals)  
**Audience:** Jon — tactical triage of what the cartographer map *is* today

---

## Executive snapshot

The map is a fog-of-war charting game with four progress tracks, three glow languages, a chime-search minigame on journey stops, a frame medallion “clock,” and a Volume 2 gate that is armed but largely toast-only on the current 8-stop path. Collection tiers exist in the UI; the *economy* between them (why chart a territory vs a site vs a letter) is thin.

---

## 1. Collection tiers (as coded)

Progress panel (`#progress-container` in `index.html`, filled by `updateProgress()` in `fog.js`):

| Track | Count | What counts | Unlock / gate role |
|-------|------:|-------------|--------------------|
| **Elena’s Journey** | **8** | `JOURNEY_PATH` stops fully discovered (`phase === 'complete'`) | Drives golden glow; Indras Na is last |
| **Territories** | **17** | `type === 'region'` only (waters excluded from this bar) | Paces guardian clock; required for Indras Na + Mish |
| **Cities & Sites** | **13** | `cartographerSite: true` | Required for Indras Na (`explorationComplete`) |
| **Secrets** | **4** | Sabella letters seen (`intrepid_sabella_messages_seen`) | Row shown only when Sabella messages enabled; all 4 gate Indras Na |

### 1.1 Elena’s Journey (8)

Order in `data.js` → `window.JOURNEY_PATH`:

1. `crossing-pool` — Into the Hollowlands  
2. `dawn-spear` — Sabella’s Clearing  
3. `sabellas-hut` — Grandmother’s Trail (**tutorial ends** when this is discovered)  
4. `mish` — The Town  
5. `monastery-wind` — The Oracle  
6. `tower-nine` — The Tower of the Nine  
7. `sinn` — The Moon Court  
8. `indras-na` — The Western Garrison (**finale**)

**Unlock rules**

- Next incomplete step gets the **golden glow** (`getNextPathLocation` → `drawBeaconGlows`).
- Journey stops use **chime / hotspot search** (pinhole → find key), including city-typed stops on the path (`mish`, `sinn`, `indras-na`).
- Tutorial (`!discovered['sabellas-hut']`): only `tutorialHintLoc` is clickable.
- **Indras Na** stays sealed until:
  1. All prior journey steps complete, **and**
  2. All 17 regions + all 13 cartographer sites charted (`explorationComplete`), **and**
  3. When `ENABLE_SABELLA_MESSAGES` is on: all **4** road letters collected (`sabellas-hut`, `monastery-wind`, `tower-nine`, `sinn`). Last letter is at Sinn — Indras Na has no parchment.

**What completing a journey stop unlocks**

- Fog clear + marker + discovery panel  
- Advances golden glow to the next step  
- May fire a Sabella letter (Secrets) at five stops when messages are enabled  
- Completing all 8 + regions triggers journey finale constellation / toast (`checkJourneyFinale`)  
- Completing Indras Na can show the Vol 2 congratulations toast (`maybeShowVol2GateToast`)

### 1.2 Territories (17 regions)

IDs (`type: 'region'`):

`atras-empire`, `kur-north`, `kur-south`, `golden-wastes`, `moon-queen-kingdom`, `mash`, `northern-utu`, `southern-utu`, `sham-territory`, `western-azu`, `eastern-azu`, `og`, `matgul`, `elil`, `isle-of-dawn`, `hope-rebellands`, `dragons-tail`

**Also in glow/click as “territory” but not in the Territories bar:** waters `sea-niads`, `sea-frost` (`isTerritory` = region **or** water).

**Unlock rules (orange glow)**

- Post-tutorial only.  
- Glow if within **500** map units of a discovered *non-territory*, **or** within **1800** of a discovered territory, **or** selected as fallback nearest territory when no normal glow exists (`territoryHasGlow` / `getFallbackTerritoryId`).  
- Clickable iff that orange glow would show.

**What charting a territory unlocks**

- Mist reveal (no chime search)  
- Increments Territories bar → drives **guardian clock** thresholds  
- Helps unlock nearby amber sites via `nearestTerritoryIsDiscovered`  
- Required for Indras Na and for **Mish** guardian (Mish needs Indras Na complete **and** territory count ≥ 17)

### 1.3 Cities & Sites (13)

IDs (`cartographerSite: true`):

`nin`, `atras-lin`, `erra`, `mish`, `denegoth`, `belu`, `caeth-nul`, `caeti`, `brea`, `skull-city`, `port-sham`, `ashal`, `the-gates`

Note: `mish` is both a journey stop and a cartographer site.

**Unlock rules (amber beacon)**

- Post-tutorial; within **400** of cleared fog, **or** nearest territory discovered, **or** cluster peek (`tower-nine` → `maxim-stone`).  
- Clickable when that amber visibility rule holds.  
- Mist reveal (unless also on journey path — then chime search).

**What charting a site unlocks**

- Mist/chime as above; progress Cities & Sites bar  
- Narrative framing as “Sabella’s marks” in Indras Na lock copy  
- Required for Indras Na via `explorationComplete`

### 1.4 Secrets / Sabella letters (4)

Defined in `SABELLA_MESSAGES` (`fog.js`):

| Stop | Letter title |
|------|----------------|
| `sabellas-hut` | A Letter by the Hearth |
| `monastery-wind` | Wind Through the Oracle’s Hall |
| `tower-nine` | From the Cage of Nine |
| `sinn` | Silver Ink at Sinn (last — farewell toward western gate) |

**Unlock rules**

- Flag: `ENABLE_SABELLA_MESSAGES` (kill: `intrepid_sabella_messages_disabled=1` or `?nosabellamessages`).  
- Primary: during chime search, proximity crosses **hot** band (~0.65).  
- Fallback: on discovery-complete if still unseen.  
- Progress Secrets row only when messages enabled.  
- All 4 letters are Indras Na prerequisites when flag on.

**What collecting unlocks**

- Secrets bar fill; Indras Na unlock (all four); story beat only — no map power beyond that gate.

### 1.5 Locations that exist in data but are not collectible

Many `data.js` entries (towns, cities, sacred sites without `cartographerSite`, non-path story spots) never get a glow and fail `isClickable` (“Everything else: no glow drawn, not clickable”). They can appear as labels/lore in the atlas data but are outside the four progress tracks.

---

## 2. Glow types and clickability

Hard rule in code: **no glow = not clickable** (`isClickable` kept in sync with `drawBeaconGlows`).

| Glow | Color language | When drawn | Clickable when |
|------|----------------|------------|----------------|
| **Golden** | Bright gold pulse | Next incomplete journey step (`getNextPathLocation`) | That step is the next path target (finale also needs exploration + letters) |
| **Orange** | Wide orange shimmer | Undiscovered region/water with territory glow rules | `territoryHasGlow(loc)` |
| **Amber** | Smaller yellow/amber | Undiscovered cartographer sites (and some near story/cluster) | Near cleared fog (400), nearest territory discovered, or cluster peek |
| **Blue seal** | Cool blue + ✦ | Vol 2 sealed next stop when gate blocking | Not clickable as a journey advance (informational) |

**Tutorial override:** before `sabellas-hut` is discovered, only the current tutorial hint location is clickable.

**Vol 2 override:** `isVol2LockedJourneyStep` forces post-`sinn` journey stops dark — except `indras-na`, which is never sealed by this gate.

---

## 3. Chime / hotspot search

**Enters when:** player clicks a journey/story stop that is not a tutorial instant-reveal → `phase: 'searching'` + `enterSearchMode`.

**Mechanic**

- Pinhole fog clear at location; mouse/touch lantern (`SPOTLIGHT_RADIUS` 60px).  
- Hidden “key” placed randomly ~30–60 map units from center.  
- Audio pings speed up with proximity; visual sigil after hint delay / escape boost.  
- Find radius / click radius ~50px (boosted after 60s or 20 map clicks — `CHIME_ESCAPE_*`).  
- Completing the key → `phase: 'complete'`, celebration, panel.

**Related (flagged)**

- `ENABLE_SABELLA_CLUE_POPUPS` — warm/hot/burning Scribe/Sabella tip popups during search (**currently OFF**).  
- Sabella **letters** (Secrets) use the same proximity bands but are a separate flag (**ON** for local demo).

---

## 4. Guardian clock (Vol 1 sequence)

Frame medallions in `index.html` (`MEDALLION_DEFS` / `MEDALLIONS`). Unlock pacing in `fog.js` via `checkGodReveals()`:

**Vol 1 clock order** (`VOL1_REVEAL_ORDER`) — must unlock in order; no skipping:

| Order | Name | Threshold (`unlock`) | Notes |
|------:|------|---------------------:|-------|
| 1 | Utu | 2 territories | Tetrad North |
| 2 | Sham & Mash | 4 | Apkallu |
| 3 | Elil | 5 | Apkallu |
| 4 | Rapha | 8 | Tetrad East |
| 5 | Ningal | 11 | Apkallu |
| 6 | An | 14 | Apkallu |
| 7 | **Mish** | **17** | Tetrad South — **also** requires Indras Na fully complete |

**Vol 2 sealed** (unlock 99 / `vol2Sealed: true`): Gu, Nin, Belu, Ae, Erra — left semicircle; not awakenable in Vol 1 logic.

Reveal ceremony: permanent torch glow on frame, discovery card, deep chime; large announcing pulse (`GUARDIAN_REVEAL_GLOW_MIN` / `GOD_REVEAL_GLOW_MIN`).

---

## 5. Volume 2 gate

| Setting | Value |
|---------|--------|
| Flag | `ENABLE_VOL2_JOURNEY_GATE = true` |
| Cap stop | `sinn` (`VOL2_JOURNEY_CAP_ID`) |
| Trigger guardian | Mish awakened (`isMishGuardianRevealed`) |
| Unlock date | `VOL2_UNLOCK_AT = 2026-12-01T00:00:00Z` (or LS / `?vol2unlock`) |
| Indras Na | Never sealed by this gate |

**Current-path reality:** `JOURNEY_PATH` is sinn → indras-na only after the cap. There is **no** post-sinn sealed journey stop in data today, so `isVol2JourneyGateBlocking()` is effectively idle. The live Vol 2 UX is the **congratulations toast** after Indras Na discovery complete, pointing at Kickstarter / Dec 2026 and inviting continued territory/site charting.

---

## 6. Guide Me, Cartographer’s Charge, progress panel

### Guide Me (`#fog-guide-btn`)

Priority pan + 4s guide ring + toast:

1. Next journey step  
2. Nearest glowing territory  
3. Nearest any undiscovered territory (cleanup)  
4. Nearest undiscovered cartographer site  
5. Else Vol 2 locked message or “All Charted”

### Cartographer’s Charge

One-shot post-tutorial toast after Sabella’s Hut (`showPostTutorialHint`, LS `intrepid_post_tutorial_hinted`): explains Gold / Orange / Amber. Auto-dismiss ~15s or on first territory/site discover.

### Progress panel

- Title rank from weighted combined %: Apprentice Scribe → Cartographer → Senior Cartographer → Magus Scribe → Master Cartographer.  
- Four bars as in §1; Secrets row hidden when Sabella messages off.  
- Side FAB: “Elena’s Journey” (`#journey-fab`) — guided fly-through of the path (index.html).  
- Reset control clears discoveries (and warns about Cartographer access).

---

## 7. Flags currently ON for local demo (this branch)

| Flag | File | Value | Notes |
|------|------|-------|-------|
| `ENABLE_VOL2_JOURNEY_GATE` | `fog.js` | **true** | Prod-intended; kill switch available |
| `ENABLE_SABELLA_MESSAGES` | `fog.js` | **true** | Comment: local demo ON; set false before prod |
| `ENABLE_SABELLA_CLUE_POPUPS` | `fog.js` | **false** | Opt-in via `?sabellaclues` / LS |
| `ENABLE_CUNEIFORM_BUTTONS` | `index.html` | **true** | Comment: local demo only — revert before prod |
| `ENABLE_READER_MAGNIFY` | `reader/overlay/spike.js` | **true** | Reader plugin; separate from map fog |

---

## Current player loop (step by step)

1. Pass cartographer gate (`hollowlands9` → `intrepid_cartographer_unlocked`).  
2. Tutorial: click golden lights at crossing-pool → dawn-spear (instant); read/close card when prompted.  
3. Sabella’s Hut: first full chime search; letter may fire (Secrets). Tutorial ends; Cartographer’s Charge explains glow colors.  
4. Follow **golden** glow along Elena’s path (mish → … → sinn), using chime search at each stop; optional letters at monastery / tower / sinn.  
5. In parallel / between stops: click **orange** territories and **amber** sites as they appear near cleared fog; ranks and guardian clock advance with regions.  
6. Use **Guide Me** if lost; progress panel shows four tracks.  
7. When all regions + sites (+ 4 letters if messages on) are done and path is through sinn, **Indras Na** golden-glows; chime search then Vol 1 congrats (no letter at Indras).  
8. Journey/Vol1 finales may fire (constellation, fog wave, Azu); Mish guardian unlocks only after Indras Na + 17 territories.  
9. Vol 2 toast: celebrate V1 journey end; keep charting leftovers; wait for dated unlock / KS for more journey road.

---

## What works well (evidence-based)

- **Glow ↔ click contract** is explicit and centralized (`isClickable` + `drawBeaconGlows`) — reduces “dead click” confusion when followed.  
- **Tutorial → Charge → free explore** is a clear onboarding arc; post-tutorial hint names the three glow languages.  
- **Chime search** is a distinct skill beat for journey stops (audio + lantern + escape boost) vs mist-tap for territories/sites.  
- **Indras Na gate** correctly forces “finish the map” (regions + sites + optional letters) before the finale — real endgame structure.  
- **Guardian clock order** is strict (`VOL1_REVEAL_ORDER` break-on-ineligible) — paced reward tied to territory count, with Mish as true endcap.  
- **Guide Me** priority list matches the intended hierarchy (journey → territory → site).  
- **Feature flags** exist for Vol2 gate, Sabella letters, clue popups, cuneiform — reversible without rollback.

---

## What’s weak / cluttered / disconnected

- **“Random glowing dots”:** Post-tutorial, orange + amber beacons can litter the viewport whenever proximity rules fire. Charge explains colors once; afterward there is little *priority* besides Guide Me / golden path. Multiple amber sites can feel samey.  
- **Weak economy between tiers:** Territories buy clock unlocks; sites mostly buy Indras Na checklist progress; letters buy Indras Na (when flag on) + Secrets bar. Completing a site rarely *changes* what you can do next beyond the bar. Journey is the only track with a strong sequential fantasy.  
- **Reading lore is optional:** After tutorial close-card, discovery opens the side panel automatically but nothing gates progress on reading `desc`/`lore`. Skip-clicking is optimal for completionists.  
- **Data vs playable set:** Large `LOCATIONS` catalog vs 17+13+8(+5) collectibles — many named places never glow. Atlas richness without interaction.  
- **Dual identity of Mish:** City site + journey stop + guardian name — easy to conflate “found Mish on the map” with “Mish guardian awakened.”  
- **Vol 2 gate vs path length:** Gate code is live, but with only indras-na after sinn, sealing logic does little; toast carries the narrative. Risk of over-promising “sealed road” that isn’t on the map yet.  
- **Waters vs Territories bar:** Seas glow/click as territories but do not increment the Territories / clock counter — subtle inconsistency.  
- **Secrets row** appears only with a demo flag; prod-off would hide a whole track players may have seen in demos.

---

## Open design questions (short)

1. Should amber sites and orange territories feel like different *verbs* (not just different colors), or stay as parallel checklist fog-clears?  
2. Is the intended post-tutorial focus “always follow gold” with orange/amber as optional side content — and if so, should Guide Me / UI reinforce that harder?  
3. Should location lore ever be required, skim-gated, or rewarded — or stay fully optional?  
4. What should Secrets mean in prod: always on, always off, or opt-in — and is letter-gating Indras Na desired for all players?  
5. When Vol 2 journey stops exist, should they appear on the path *before* Mish awakens, or only after the dated unlock?  
6. Do non-`cartographerSite` cities/towns in `data.js` stay flavor-only, or is some subset meant to join Cities & Sites later?  
7. Should water bodies count toward the Territories / clock economy, or stay glow-only?

---

## File anchors (for triage follow-ups)

| Concern | Primary code |
|---------|----------------|
| Journey path | `data.js` `JOURNEY_PATH` |
| Click / glow | `fog.js` `isClickable`, `territoryHasGlow`, `drawBeaconGlows` |
| Progress tiers | `fog.js` `updateProgress`; `index.html` `#progress-container` |
| Chime search | `fog.js` `enterSearchMode`, search click handlers |
| Sabella letters | `fog.js` `SABELLA_MESSAGES`, `ENABLE_SABELLA_MESSAGES` |
| Guardian clock | `index.html` `MEDALLIONS`; `fog.js` `VOL1_REVEAL_ORDER`, `checkGodReveals` |
| Vol 2 gate | `fog.js` `ENABLE_VOL2_JOURNEY_GATE`, `maybeShowVol2GateToast` |
| Guide / Charge | `fog.js` `runGuideMe`, `showPostTutorialHint` |

---

*Triage only. Design proposals belong in sibling agent outputs, not this document.*
