# Map Design Proposal B — Compass, Ritual, Earned Discovery

**Role:** Game Designer B (spatial / ritual / compass focus)  
**Status:** Design proposal for Jon + 3 trusted reviewers  
**Branch:** `feature/cuneiform-buttons`  
**Date:** 2026-07-10  
**Audience:** Cartographer playtest (hollowlands9 / trusted reviewers), not mass market  
**Companion briefs:** `docs/DISCOVERY-COMPASS-DESIGN.md` (engineering options), `docs/SABELLA-CLUE-POPUPS.md`, `docs/CARTOGRAPHER-STORY-FRUIT.md`

This is **not** an economy or checklist redesign. It is about **attention, spatial ritual, and paced revelation** — so finding a place feels like charting, not vacuuming dots.

---

## 1. Diagnosis — Speed-click and glow saturation

### What the map teaches today

After Sabella’s hut, the atlas becomes generous:

| Signal | Role | Failure mode at mid/late map |
|--------|------|------------------------------|
| **Golden glow** | Next Elena journey stop | Still clear — the one signal that *earns* its keep |
| **Orange shimmer** | Territory frontier (~500 / ~1800 unit rules) | Zoom out → orange constellation → tap-tap-tap |
| **Amber ★** | Cartographer site / chime search | Visible near cleared fog; often one-tap into search, then skip lore |
| **Guide Me** | Pan + 4s ring to priority target | Humane escape hatch that also *accelerates* checklist play |

**Invariant:** no glow = not clickable (`isClickable` ↔ `drawBeaconGlows`). That rule is sound. The problem is **too many simultaneous glows** once the frontier opens.

### The emotional failure

Discovery stops feeling like *finding* and starts feeling like *harvesting*. Players learn:

1. Zoom out until the starfield appears  
2. Click every warm light  
3. Dismiss the card / skim the toast  
4. Repeat  

Chime search (lantern + `updateDiviningAudio`) already proves an “earned” beat for amber/journey stops. Territories and many sites never get that ritual — they are **GPS pins with flavor text**.

### Why the four collection tiers feel disconnected

The Magus Scribe panel tracks four rows that **do not share a verb**:

| Tier | Verb today | Spatial feel |
|------|------------|--------------|
| **Elena’s Journey** | Follow the golden road | Strong — one needle of story |
| **Territories** | Tap orange when frontier allows | Weak — landmass checklist |
| **Cities & Sites** | Tap amber / chime | Medium — search exists, lore optional |
| **Secrets** | Collect letters on chime-hot | Strong *when* it fires — but reads as a 4th bar bolted on |

Nothing in the **body** of play says these are four faces of one craft (charting). They read as four progress meters. Secrets especially feel like a side ledger rather than the **bearing** that aims the next hunt.

**Root cause:** revelation is **spatial-greedy** (show all eligible glows) while story is **sequential**. The UI rewards greed; the fiction wants sequence.

---

## 2. Design north star — Divining, not vacuuming

**Primary fantasy for Vol 1:**  
You are a cartographer with a **compass that listens**. The atlas holds many secrets, but the instrument only **settles on one mark at a time**. Lore is not flavor — it is the **bearing**. Sabella’s letters are not collectibles first; they are **course corrections** written in her hand.

Emotional register to protect (already in the product):

- Lantern warmth / chime heat  
- Golden path as Elena’s road  
- Parchment letters at chime-hot  
- Guide Me as a patient mentor, not a skip button  

Emotional register to **add**:

- Needle drift (slow settle, not snappy GPS)  
- One rising glow (others sleep)  
- Reading a card **unlocks or sharpens** the next bearing  

---

## 3. Concrete proposals (5)

### Proposal 1 — Compass needle (one focus at a time)

**Mechanic:** Post-tutorial, a small cartographer’s compass (corner HUD, near Guide Me) locks onto a **single focus target**. Needle lerps toward that mark from map center. Non-focus orange/amber glows are **hidden** (or ≤15% opacity). Focus glow **rises** when the viewport is near enough. Click only the focus (glow ≈ clickable preserved by hiding the rest).

**Focus priority** (align with Guide Me):

1. Next golden journey step  
2. Else nearest eligible territory to view center  
3. Else nearest eligible site  
4. Else late cleanup  

**Why it earns discovery:** Zoom-out no longer presents a clickable starfield. You must **orient, pan, and approach** — the same body language as following a real compass.

**Reading matters:** Optional but recommended pairing with Proposal 4 — the card’s closing line names the *kind* of next mark (“a land,” “a star,” “Elena’s next step”) so the needle’s purpose is narrated, not mysterious chrome.

**Flag:** `ENABLE_DISCOVERY_COMPASS` default OFF (see companion engineering brief).

---

### Proposal 2 — One-glow-at-a-time as the default law of the atlas

**Mechanic:** Independent of fancy needle art: **at most one discovery beacon is “live.”** Completing it advances the focus. Golden path always wins when it is the focus. This is the **rule**; the compass is the **fantasy skin**.

**Why separate from Proposal 1:** Even without a needle widget, suppressing the constellation fixes speed-click. The needle makes the rule *legible* and beautiful; the rule alone is the anti-checklist lever.

**Reading matters:** When the player taps a dim/non-focus region of fog, soft toast: *“The compass holds one mark. Read what you found — then follow the needle.”* Wrong-taps become invitations to attend, not punishment.

---

### Proposal 3 — Territory divining (short land-rite, not full chime)

**Mechanic:** Territories keep orange identity but **do not become clickable on sight**. When the compass locks a territory:

1. Needle settles on the landmass  
2. Player holds attention at the fog edge / map center near the mark for **2–4 seconds** (warm tick / soft pulse) — a **mini-rite**, not a full lantern search  
3. Only then does the orange glow **rise** and accept the click  

Sites that already use chime search **skip** this rite (compass leads you to the star; lantern still finds the sigil). Journey golden stops: compass only — no double tax.

**Why it earns discovery:** Orange was the main speed-click offender. A brief rite restores “I charted this land” without turning 17 territories into 17 chime sessions (full divining-for-all is fatigue — see Risks).

**Reading matters:** On territory unlock, the toast is **lore-first** (territory-specific line from `data.js`), and the **next** compass bearing is whispered in the same breath: *“Silver dusk is charted. The needle turns toward a star Sabella marked.”* The card is the hinge between rite and next hunt.

---

### Proposal 4 — Lore riddles that aim the compass (reading = bearing)

**Mechanic:** After discovering a location, the location card includes a **Bearing** — one short line drawn from `desc` / `lore` / Sabella voice that **names or hints the next focus** without giving map coordinates.

Examples (illustrative):

| Just charted | Bearing line (card footer) |
|--------------|----------------------------|
| Sabella’s hut | *“Follow the road the stone remembers — east of the hut, the kings’ crossroads still smoke.”* → aims Mish |
| Mish | *“Pilgrims shed their weight before the climb; the wind-monastery keeps the Book.”* → aims Monastery |
| A territory | *“Where this land meets cleared fog, a star waits within a day’s chart.”* → nearest site |
| Letter stop | Letter itself *is* the bearing (Proposal 5) |

**Hard rule for Vol 1 MVP:** Bearings never soft-lock the game. If the player ignores the card, the compass still points correctly. Reading **accelerates understanding and emotional payoff**; it does not become a cipher wall for Haytus reviewers.

**Soft rule that makes reading feel necessary:** Without reading, the needle still works, but **Guide Me copy and escape boosts stay quieter** for ~30–60s after a discovery — the atlas “expects” you to attend. After idle, Guide Me speaks plainly again. Reading is rewarded with clarity, not punished with gates.

**Why it earns discovery:** The card stops being a dismissible modal. It is the **moment the instrument is recalibrated**.

---

### Proposal 5 — Sabella letters as bearings (Secrets as course corrections)

**Mechanic:** The five journey letters (`ENABLE_SABELLA_MESSAGES`) already fire on chime-hot. Reframe them in UX and copy:

- **Not:** “Secret 2/5 collected” as the emotional beat  
- **Yes:** Letter closes with an explicit **bearing** toward the next letter-stop or the next land that matters to Elena’s road  

Secrets row stays (no 5th bar) but is labeled in spirit as **Letters along the road** — evidence of listening, not a separate collectathon. Completing a letter **retargets** the compass with a brief needle flourish (parchment → needle settle).

Optional later: non-letter secrets (Melchior at Mish, prophecy at Monastery) also emit a one-line bearing when found — same ritual grammar, still one Secrets ledger.

**Why it earns discovery:** The best story fruit in the build becomes the **compass’s voice**. Collection tiers reconnect: Journey = road, Secrets = grandmother’s corrections along that road, Territories/Sites = lands the corrections send you into.

---

## 4. How each proposal makes READING matter

| Proposal | What reading does | What skipping costs (soft) |
|----------|-------------------|----------------------------|
| **1 Compass** | Card explains *why* the needle moved | Needle still works; less narrative satisfaction |
| **2 One-glow** | Toast after wrong-tap points you back to the card | Mild friction until you attend |
| **3 Territory rite** | Unlock toast + card are the “charted” ceremony | Rite still required; lore-skim feels hollow |
| **4 Lore bearings** | Card footer aims attention / sharpens next hunt | Compass works; Guide Me stays quieter briefly |
| **5 Letters as bearings** | Letter *is* the recalibration moment | Fallback still shows letter; Secrets count rises either way |

**Non-negotiable:** Never require perfect reading comprehension to finish the map. Earnedness comes from **spatial attention + ritual timing**, with lore as the **meaning layer** that trusted reviewers will actually savor.

---

## 5. Relating Journey / Territories / Sites / Secrets — without a 5th bar

### One craft, four faces

```
                    COMPASS (instrument)
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      JOURNEY           LANDS            MARKS
   (golden focus)   (territory rite)  (amber + chime)
           │               │               │
           └───────────────┴───────┬───────┘
                                   ▼
                         LETTERS / SECRETS
                    (bearings that retarget the needle)
```

| Tier | Role under Proposal B | UI change |
|------|----------------------|-----------|
| **Journey** | Primary focus whenever Elena has a next step | Unchanged row; golden = compass’s first loyalty |
| **Territories** | Lands you **rite** into when journey is quiet | Same row; verb becomes “charted,” not “tapped” |
| **Sites** | Stars the compass leads you to; chime unchanged | Same row |
| **Secrets** | Letters/clues that **speak the next bearing** | Same row; copy/eyebrow: “Letters” or “Along the road” — **no new meter** |

**Explicit non-goal:** A fifth progress bar, streak counter, XP, or “divining rank” spreadsheet. Rank titles already exist; do not multiply meters. If anything is added to chrome, prefer **compass state** (needle + “Seeking: …”) over another fraction.

### How tiers talk to each other in play

1. Journey focus active → compass ignores orange/amber constellation  
2. Journey quiet → compass offers a land-rite or a star  
3. Chime-hot letter → Secrets +1 **and** needle flourish toward next story-relevant mark  
4. Indras sealed → compass points at remaining lands/marks; Guide Me keeps the “map must be whole” line  

The panel still shows four counts. The **fantasy** is one instrument cycling through road → land → star → letter.

---

## 6. Recommended primary fantasy for Vol 1

**Ship the story as:** *The Compass That Listens.*

- **Core loop:** Discover → read bearing (card/letter) → needle settles → approach → (rite or chime) → glow rises → discover  
- **Hero signal:** Golden path never fights the compass; Elena’s road is what the needle loves most  
- **Grandmother signal:** Letters are bearings, not loot  
- **Land signal:** Territories are charted by a short rite, not vacuumed  

Defer full “divining rod for every orange pin” and defer cipher-locked bearings. Vol 1 should feel like **patient charting**, not a puzzle hunt or an idle clicker.

**Differentiation from a pure economy pitch:** We are not balancing drop rates or optimizing four bars. We are changing **what the eye is allowed to want** at any moment, and making the **card the recalibration ritual**.

---

## 7. MVP spike vs later

### MVP spike (1–2 days, flag OFF by default) — prove the fantasy

Aligned with `docs/DISCOVERY-COMPASS-DESIGN.md` Option A, plus the minimum lore hinge:

1. `ENABLE_DISCOVERY_COMPASS` + opt-in / kill switch  
2. Shared focus picker with Guide Me priority  
3. DOM compass: slow needle lerp from map center  
4. Post-tutorial: draw **only** focus glow; `isClickable` = focus only (+ existing gates)  
5. On discovery complete: retarget + brief settle  
6. **Thin lore hinge:** one bearing line on the discovery card footer for journey stops (static copy table, 5–8 lines) — enough that reviewers *feel* reading aims the needle  
7. Smoke: non-focus not clickable when flag on; flag off = current UX  

**Success for 3 reviewers:** Zoomed-out view is no longer a starfield; they can finish with compass + Guide Me; at least one person mentions the bearing line unprompted.

### Later (phase 2 — only if MVP pacing wins)

| Item | Depends on |
|------|------------|
| Territory mini-rite (Proposal 3) | MVP isolation feels good, not tedious |
| Letters retarget needle with flourish (Proposal 5 UX) | Sabella messages stable in prod intent |
| Soft “Guide Me quieter until card dismissed” | Accessibility pass with Haytus-style play |
| Dim sibling glows as early training wheels | If isolation feels too stark post-hut |
| More secret-bearings beyond five letters | Story fruit approval |

### Explicitly later / not Vol 1 default

- Full chime search for all territories  
- Fog-edge whisper revival (removed build 94 — do not couple to draw loop)  
- Cipher puzzles that hard-gate Indras  
- New progress rows  

---

## 8. Risks

| Risk | Who feels it | Mitigation |
|------|--------------|------------|
| **Accessibility / reduced motion** | Anyone with vestibular sensitivity; muted devices | Needle never audio-only; reduced-motion → snap settle, no tick; warmth from map-center proximity |
| **Tutorial breakage** | New Cartographers | Compass **off** until post–Sabella’s hut; tutorial single-target rules untouched |
| **John Haytus / older reviewers** | Trusted audience Jon cares about | Isolation must not feel like hidden-object tax; Guide Me always obvious; idle soft-boost (widen warm band / stronger tick after ~60s); wrong-tap toast in plain language; bearings are hints, never required ciphers |
| **Mobile thumb fatigue** | Phone playtesters | Compass passive HUD; no hover-lantern for compass heat; forgiving “close enough” in map units; rite hold 2–4s max |
| **Double tax with chime** | Journey amber stops | Compass → existing search only; no rite before search |
| **Glow ≠ clickable bugs** | Everyone | Update `isClickable` and `drawBeaconGlows` together; smoke cases |
| **“Where did all the marks go?” anxiety** | Completionists | Progress counts still rise; legend line: “The compass reveals one mark at a time”; Guide Me confirms focus |
| **Four tiers still feel like spreadsheet** | Design-literate reviewers | MVP must ship **bearing copy** + letter-as-bearing framing — chrome alone won’t reconnect the tiers |
| **Guide Me spam as new speed-click** | Power users | Accept for MVP; if abused, add short settle cooldown or require card dismiss before Guide Me re-pans (phase 2, flag) |

---

## 9. Decision ask for Jon

1. Approve **Compass That Listens** (Proposals 1+2 + thin Proposal 4 bearings) as the Vol 1 primary fantasy?  
2. Strict hide non-focus glows for the spike, or dim-but-clickable (weaker)? **Recommendation: strict.**  
3. Territory mini-rite (Proposal 3) in spike or phase 2? **Recommendation: phase 2.**  
4. Reframe Secrets eyebrow to “Letters” / bearing language when Sabella messages are on? **Recommendation: yes, copy-only.**  

---

## 10. Executive recommendation

Ship Vol 1 discovery as **one listening compass**, not four meters and a starfield: hide non-focus glows, aim a slow needle at Guide Me’s priority target, keep chime search as the deep rite for stars, and make Sabella letters plus a short card **bearing** the emotional recalibration — so reading aims attention while Guide Me and idle soft-boosts keep Haytus-friendly reviewers unblocked. Spike Proposals 1+2+thin-4 behind `ENABLE_DISCOVERY_COMPASS` (default off); hold territory mini-rites and full divining-for-all until the isolation fantasy proves it slows speed-click without feeling like a tax.
