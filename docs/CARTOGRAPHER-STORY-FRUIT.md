# Cartographer Story Fruit — Low-Hanging Design Brief

**Status:** Research / recommendations only — no prod deploy  
**Branch:** `feature/cuneiform-buttons`  
**Audience:** Jon (approve copy set before any flag flip)  
**Date:** 2026-07-10

---

## Purpose

Cartographers (`hollowlands9` / `CART-` links) already get a full fog atlas, Elena’s journey, and guardian reveals. This brief identifies **easy wins** that tie Issues 1–3 comic beats to map locations — more backstory, a few collectible secrets — without opening full Sabella’s Trail, Tablets of Magus, or guardians-plugin scope.

**Rule of thumb:** Copy and content authoring first. Enable existing scaffolds second. New UI or fog logic last (and only with flags default OFF).

---

## 1. What Cartographers Already Get

| System | Where | What the player experiences |
|--------|-------|------------------------------|
| **Journey path** | `data.js` `JOURNEY_PATH` (8 stops) | Golden glow = next Elena step; chime search on amber stars (Mish, Sinn, Indras Na, etc.) |
| **Territories** | 17 `region` beacons | Orange shimmer; unlock toast on first chart (`showTerritoryUnlock` in `fog.js`) |
| **Cities & Sites** | 13 `cartographerSite: true` | Amber stars; chime search; progress track |
| **Guardians / frame** | `index.html` `MEDALLIONS` | Tetrad + eight gods awaken at discovery thresholds; Vol II seals on Gu, Nin, Belu, Ae, Erra |
| **Vol 1 finale** | `checkVol1Finale` / `awakenAzu` | 20 `volume1: true` locations → fog wave + center Azu medallion |
| **Indras Na gate** | `explorationComplete()` | Final journey stop locked until all **17 territories + 13 sites** charted |
| **Story Tour** | `#journey-fab` + `#journey-toast` | Replay journey; toast shows `loc.desc` per stop |
| **Rank titles** | `updateProgress()` | Apprentice Scribe → Master Cartographer by discovery count |
| **Tower foreshadow** | `showTowerClusterHint()` | After Sabella’s hut: “One secret crowns this tower…” |
| **Sabella journey letters** | `fog.js` `ENABLE_SABELLA_MESSAGES` | **Build 151+** — five discovery letters (hut, monastery, tower, Sinn, Indras Na); local demo ON; kill `intrepid_sabella_messages_disabled=1` |
| **Sabella chime clues** | `fog.js` `ENABLE_SABELLA_CLUE_POPUPS` | **Scaffold only, default OFF** — warm/hot/burning popups + `intrepid_secrets_collected` |
| **Dossier** | `/dossier/` | 11 character cards (public); no map cross-links today |
| **Reader Issues 2–3** | Patron superset | Cartographers can read full Vol 1; map does not gate on reader progress |

**Content already strong:** P0 journey locations have art (`crossing-pool`, `sabellas-hut`, `monastery-wind`, `tower-nine`) and tightened copy from the Vance merge overlay (Sabella re-veiled — no DOD/Nick/Clockwork tells on map).

**Content thin for Cartographers:** Sites Elena never visits but patrons expect context for (Denegoth, Brea, Irridari Citadel); Issue 2–3 antagonist thread (Namin, Inquest); Melchior/Magus thread; territory toasts are generic UI, not lore.

---

## 2. Issue 1–3 Story Beats → Map Locations

Comic structure (reader): Issue 1 = pages 1–21, Issue 2 = 22–42, Issue 3 = 43–68 (26 pages). Mapping is **approximate** — align final copy with Jon’s page-level beat sheet when available.

| Location ID | Issue | Comic beat (Vol 1) | Current map state | Lore gap |
|-------------|-------|-------------------|-------------------|----------|
| `crossing-pool` | **1** | Elena surfaces in the Hollowlands; disorientation, warm water, wrong reflection | P0 journey; art; strong desc | No **Institute/remote-viewing** frame (intentionally veiled); could add “viewers report the pool remembers them” without naming CIA |
| `dawn-spear` | **1** | Elena finds the promised weapon; Utu territory; first combat capability | P0; good lore | Desc doesn’t name **Utu** as guide-figure; dossier link opportunity |
| `sabellas-hut` | **1** | Grandmother’s traces; unfinished letter; tutorial ends | P0; art; re-veiled Sabella copy | Letter **never finished** in panel copy; chime scaffold has one Sabella line only |
| `mish` | **2** | Last human kings; rebel crossroads; Melchior / Magus fugitive; Inquest pressure | P0 + cartographer site; trimmed desc | **Melchior, Namin, empty thrones** not in desc/lore; Issue 2 density under-served |
| `denegoth` | **2** | (Context) Lugal Esugar’s last stand; Atrus Nul breaks Mish kings | Cartographer site; strong lore | Not on journey path — patrons who chart it get history but no **Elena/Issue 2** hook |
| `monastery-wind` | **2** | Oracle Isin Ada; Book of Golden Tree; prophecy Elena rejects | P0; art; Book in lore | Prophecy text split across desc/lore; no **“Three will rise”** chime secret |
| `ashal` | **2** | Pilgrim strip before the climb; leave baggage | Cartographer site; art | No beat tie (“Elena left the Spear’s weight here” or similar) |
| `brea` | **2** | City of scribes; Elena seeks answers; Magus lore | Cartographer site | **Melchior** thread absent from desc |
| `erra` | **2–3** | War-city; Atrus Nul’s father; Elena passes through war-as-atmosphere | Cartographer site; dossier Atrus | City panel doesn’t connect **Erra → Atrus Nul → Irridari** chain |
| `tower-nine` | **3** | Nine gods caged; storm set-piece; Elena enters the cage | P0; art; tower hint | Maxim Stone cluster peek exists; **Nine facing inward** could be a secret |
| `maxim-stone` | **3** | World suture; prophecy proves; Sabella face in stone (comic) | Vol1 story site; cluster unlock | No **second inscription / Magus script** hook (reserved for future Trail) |
| `moon-stronghold` | **3** | Elena meets Sabella; rescue ≠ what rescued want | Vol1 story; not on journey | Not discoverable on golden path; easy **optional site** for Issue 3 patrons |
| `sinn` | **3** | Moon Court; Sabella’s design; judicial clarity | P0 journey; chime search | Silver ink / spiral design in desc but no **secret** collectible |
| `indras-na` | **3** | Western garrison; finale approach; mirrors / laughter | P0 finale; chime; gated | Locked-message UX aside, lore doesn’t say **Volume 1 ends here** |
| `irridari-citadel` | **3** | Atrus Nul’s seat; cosmic antagonist scope | Vol1 sacred; not cartographer site | Patrons chart nearby **Nin/Erra** but citadel is easy miss |
| `hope-rebellands` | **2** | OG border; resistance; Elena’s path through contested land | Vol1 region | Region lore generic; no Issue 2 **rebel** beat |
| `moon-queen-kingdom` | **3** | Sabella’s domain; silver dusk | Vol1 region | Territory toast generic; kingdom **origin** veiled correctly but thin |

---

## 3. Low-Hanging Fruit (ranked)

### Tier A — Copy only (`data.js`)

**Effort:** 30–90 min per batch · **Risk:** low · **Deploy:** bump build if shipping

1. **P0 journey desc/lore pass (8 IDs)** — Add one Issue-specific sentence per `desc` (what Elena did here), keep lore as single cartographer quote. Priority: `mish`, `monastery-wind`, `sinn`, `indras-na`.
2. **Issue 2 cartographer sites** — `brea`, `denegoth`, `ashal`, `erra`: one thread each (Magus, Lugal Esugar, pilgrimage, Atrus lineage). Already flagged P1 in `docs/location-descriptions-handoff.md`.
3. **Issue 3 optional story site** — `moon-stronghold`: ensure layer default visible; add one line to desc: “Elena’s reunion with her grandmother happened here — the map marks the fortress, not the conversation.”
4. **Region hooks (2–3 territories)** — `hope-rebellands`, `moon-queen-kingdom`, `atras-empire`: replace generic chronicler voice with one Sabella / Atrus / rebel hook each (handoff rubric § north-star).

### Tier B — Content into existing scaffolds (no new UI)

**Effort:** 1–2 hr · **Risk:** low · **Flag:** `ENABLE_SABELLA_CLUE_POPUPS` stays default OFF until Jon approves

5. **Sabella letters at five journey stops** — **Shipped build 151** via `ENABLE_SABELLA_MESSAGES` + `SABELLA_MESSAGES` in `fog.js`. Stops: `sabellas-hut`, `monastery-wind`, `tower-nine`, `sinn`, `indras-na` (journey order). Discovery-complete parchment popup; secrets ledger; **set flag false before prod**. Chime-heat `ENABLE_SABELLA_CLUE_POPUPS` remains separate / OFF.
6. **Secrets ledger entries** — `recordSecret()` writes `intrepid_secrets_collected` (chime bands + `{locId}:letter`). No progress-row UI needed for v1.
7. **Territory toast copy** — Today: generic “Territory Unlocked / Discover its cities & sites.” **Hook:** optional `territoryToast` string on region entries in `data.js`; `showTerritoryUnlock` reads it (small fog.js read — document only until approved). Example for `moon-queen-kingdom`: “Silver dusk settles on the chart. The Queen’s land does not share the Empire’s noon.”

### Tier C — Small UI (medium effort, high delight)

8. **“Elena passed here” ribbon** — Fable review item 14: journey cities (`mish`, `sinn`, `indras-na`) get italic subline on discovery card. `index.html` card renderer + `JOURNEY_PATH` step lookup.
9. **Dossier ↔ map cross-links** — Trivial if one-way: dossier character card footer “Charted on the atlas” links to `/?loc=crossing-pool` (URL param already used in edit mode — verify or add `?focus=` handler). Characters: Elena, Sabella, Utu, Melchior, Isin Ada, Atrus Nul (6 links).
10. **Guardian medallion flavor on first reveal** — `showMedallionCard` already fires; add 2-line **first-reveal** blurb separate from hover lore (Utu at 2 discoveries: “The Bull turns his head. You are counted among those who chart by dawn.”). Data-only in `MEDALLIONS` array.

### Tier D — Defer (not low-hanging)

- Full **Sabella’s Trail** 5-station quest (`docs/guardians/GUARDIANS-ADDENDUM-v2.md`)
- **Tablets of Magus** + glyph cipher
- **Guardians plugin** invocations / speak-lines (`GUARDIANS-ADDENDUM-v5.md`)
- **Secrets progress row** in `#progress-container` (needs HTML + design OK)
- **Veil static / signal bleed** (Fable item 17 — explicitly not approved)

---

## 4. Specific Secret Ideas (8)

Each: **trigger** + sample copy. Store via chime (`recordSecret`) or discovery toast; no new mechanics.

| # | Secret ID | Trigger | Sample copy |
|---|-----------|---------|-------------|
| 1 | `sabellas-hut:letter` | Chime **hot** at Sabella’s hut (or first discovery) | *“Dear — I started this letter three times. The fourth time the ink would not stay. If you find it, do not follow me yet. Follow the road the stone remembers.”* — Sabella |
| 2 | `mish:melchior` | Chime **hot** at Mish search | *“The last Magus still runs. He knew your grandmother’s weapon by name before you knew its weight.”* — Scribe |
| 3 | `monastery-wind:prophecy` | Chime **burning** at Monastery | *“One Dusk. One Dark. One Dawn. The Stone undone. She wept six days because the tree had already written your name.”* — Sabella |
| 4 | `denegoth:kneel` | Discover Denegoth (panel lore footnote or one-time toast) | *“Lugal Esugar begged on these heights. The Titan did not accept the plea — only the lesson.”* — Scribe |
| 5 | `tower-nine:inward` | Discover Tower of the Nine | *“The Nine do not face the world. They face the Stone. Whatever they guard, they guard together.”* — Scribe |
| 6 | `maxim-stone:glyphs` | Discover Maxim Stone **after** Tower | *“A second line is cut here in angular script. You cannot read it yet. Chart the old kings’ country — the letters will arrive.”* — Scribe (teases Vol II / Trail without implementing) |
| 7 | `sinn:silver-ink` | Chime **hot** at Sinn | *“Verdicts written in silver fade by dawn. Only witnesses remain bound. Sabella built a city that forgets nothing — and forgives by erasure.”* — Sabella |
| 8 | `indras-na:mirror-oath` | Complete Indras Na chime (finale discovery) | *“They swear to a queen they may never meet. The mirrors do not reflect soldiers — they reflect intention.”* — Scribe |

**Spoiler discipline:** No Clockwork, Nick’s fate, Sebastian, or Issue 4+ Institute detail. Magus/Inquest/Namin may be **named**, not plot-resolved.

---

## 5. What NOT to Do Yet (scope creep)

| Don't | Why |
|-------|-----|
| Implement Sabella’s Trail gates (`click`/`word`/`item`) | Full puzzle layer; needs playtest + encryption story |
| Wire `gatedBehind` or new invisible gates | Violates glow = clickable trust |
| Add Issue 4+ characters or Earth-side dialogue | Fable review: veil static / bleed must stay wordless |
| Merge reader progress into map unlocks | Auth isolation invariant |
| Build Secrets UI tab before copy approved | Scaffold storage is enough |
| Expand Mish desc back to 1,500 chars | Handoff explicitly trimmed; add beats in lore + secrets instead |
| Re-introduce viewport **whispers** | Removed build 94 for jank |
| Prod-enable chime clues without Jon sign-off | `ENABLE_SABELLA_CLUE_POPUPS = false` is intentional |

---

## 6. Suggested Vol 1 Ship Set (minimum Jon approval)

A **single local branch slice** Jon can review in ~30 minutes of play:

### Ship set A — “Copy + secrets” (recommended first)

| # | Item | Files | Player-visible |
|---|------|-------|----------------|
| 1 | Journey P0 copy pass (8 locations) | `data.js` | Richer location panels + Story Tour |
| 2 | Issue 2 site copy (5): `mish`, `denegoth`, `brea`, `ashal`, `erra` | `data.js` | Cartographer sites feel tied to comic |
| 3 | Chime clue strings for 4 stops: hut, mish, monastery, sinn | `fog.js` `CHIME_CLUE_CONTENT` | Only with `?sabellaclues=1` |
| 4 | Discovery one-shot for `tower-nine` + `denegoth` (toast or lore footnote) | `data.js` or tiny fog hook | Secrets in localStorage |
| 5 | Region lore touch: `moon-queen-kingdom`, `hope-rebellands` | `data.js` | Territory panel + toast if §3-B7 added later |

**Not in set A:** Elena ribbon, dossier links, guardian reveal blurbs, territory toast customization, flag default ON.

### Ship set B — “Polish layer” (after A playtest)

| # | Item | Notes |
|---|------|-------|
| 6 | Elena ribbon on `mish` / `sinn` / `indras-na` | Fable item 14 |
| 7 | Custom territory toast for 2 regions | Needs fog read of optional field |
| 8 | Dossier → map deep links (6 characters) | One-way links only |
| 9 | Utu + Rapha first-reveal card blurbs | When guardians fire at 2 / 8 discoveries |
| 10 | Flip `ENABLE_SABELLA_CLUE_POPUPS` default ON | Only after Jon reads all clue copy |

### Verification (local)

```bash
node --check fog.js
node scripts/smoke-journey-flow.js
# Browser: hollowlands9 → tutorial → chime at Mish with ?sabellaclues
# localStorage intrepid_secrets_collected after hot-band popup
```

---

## 7. Implementation Hooks (reference only — no changes in this doc)

| Hook | Location | Notes |
|------|----------|-------|
| Chime clue bands | `fog.js` `maybeShowChimeCluePopup`, `CHIME_CLUE_BANDS` | Fires in `searchMode` only |
| Secrets storage | `intrepid_secrets_collected` | JSON array `{id, locId, band, speaker, text, at}` |
| Content authoring target | `data.js` per-location `chimeClues: { warm, hot, burning }` | Preferred long-term; migrate from `CHIME_CLUE_CONTENT` |
| Event bus (future) | `docs/guardians/hollowlands-guardians-plugin-spec.md` | `hl:chime:band` emit → plugin renders Sabella copy |
| Re-veiling rules | `docs/vance-location-merge-overlay.md` | No DOD, Nick, Clockwork, “remote viewer” on map |
| Sabella popup spec | `docs/SABELLA-CLUE-POPUPS.md` | Center-bottom UI, default OFF |

---

## 8. Decision Ask for Jon

1. **Approve Ship set A** copy themes (Issue 2 Mish/Melchior, Issue 3 Moon Court, veiled Sabella letters)?
2. **Enable chime clues locally** with `?sabellaclues` for playtest, or keep scaffold invisible?
3. **Priority thread** for next copy pass: Sabella trail breadcrumbs vs Atrus Nul/Dominion vs Magus/Inquest?
4. **Secrets UI:** localStorage-only OK for Vol 1, or add 4th progress row “Secrets · n” in same pass?

---

*Research sources: `data.js`, `fog.js` (scaffold), `docs/SABELLA-CLUE-POPUPS.md`, `docs/FABLE-MAP-SPEC.md`, `docs/FABLE-MAP-REVIEW-2026-07-07.md`, `docs/guardians/GUARDIANS-BRIEF.md`, `GUARDIANS-ADDENDUM-v2.md`, `GUARDIANS-ADDENDUM-v5.md`, `docs/location-descriptions-handoff.md`, `docs/vance-location-merge-overlay.md`, `dossier/index.html`, reader issue boundaries in `spike.js`.*
