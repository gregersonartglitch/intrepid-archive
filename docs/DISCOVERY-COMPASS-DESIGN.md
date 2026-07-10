# Discovery Compass — Design Brief

**Status:** Design only — no implementation in this pass  
**Branch:** `feature/cuneiform-buttons`  
**Audience:** Jon (approve MVP slice before any spike)  
**Date:** 2026-07-10  
**Related:** `docs/SABELLA-CLUE-POPUPS.md`, `docs/CARTOGRAPHER-STORY-FRUIT.md`, fog.js glow / chime / Guide Me

---

## 1. Problem statement

After the tutorial (Sabella’s hut), Cartographers can **zoom out** and see many beacons at once:

| Beacon | Meaning today | Click rule |
|--------|---------------|------------|
| **Golden** | Next Elena journey step | Always the single next path stop |
| **Orange shimmer** | Territory (region/water) | Visible when frontier rules unlock it (`territoryHasGlow`, ~500 / ~1800 unit radii) |
| **Amber ★** | Cartographer site / chime search | Visible within ~400 units of cleared fog (or territory-discovered neighbor) |

**Invariant today:** no glow = not clickable (`isClickable()` stays in sync with `drawBeaconGlows`).

**Failure mode:** At mid/late map, a zoomed-out view shows a **constellation of orange + amber targets**. Players learn to pan/zoom and **speed-click** every glow without reading cards, listening to chimes, or caring what they unlocked. Discovery becomes a checklist, not charting.

**What already slows some finds:** Amber-star / journey chime search (`enterSearchMode` + lantern + `updateDiviningAudio`) is a real “earn it” beat. Territories and many sites are still one-tap once the glow is on screen. **Guide Me** pans to the next priority target and drops a 4s ring — helpful, but it does not prevent mass-glow hunting.

**User lean:** Prefer a **compass / needle that slowly raises and isolates the next location** over seeing all glows at once. Build on the existing **divining-rod / hotspot chime** vocabulary (not a new metaphor).

---

## 2. Design principles

1. **Reward over friction** — Extra steps must feel like *finding*, not busywork. Same emotional register as the lantern getting warmer.
2. **One focus at a time (default)** — The atlas may hold many secrets; the UI should usually present **one primary hunt**.
3. **Still accessible** — John Haytus / older reviewers, mobile thumbs, muted audio, and “I’m stuck” must remain solvable. Guide Me (or compass + Guide Me) stays a humane escape hatch.
4. **Respect glow = clickable** — Do not casually break the invariant. Prefer: (a) **hide or dim** non-focus glows while keeping click rules tied to *effective* visibility, or (b) keep glows but make non-focus clicks soft-fail with a compass nudge. Any change to `isClickable` / draw parity needs an explicit decision in the spike.
5. **Reuse vocabulary** — Heat bands, pings, lantern warmth, Sabella/Scribe voice — extend; don’t invent a second tutorial language.
6. **Flag-gated, reversible** — `ENABLE_DISCOVERY_COMPASS` default **OFF**; kill switch + URL opt-in/out. No prod flip without Jon’s OK. (Project rule: new atmosphere / pacing layers default off.)
7. **Don’t punish the golden path** — Elena’s next stop should stay the clearest signal; optional exploration is where pacing tools earn their keep.
8. **Tutorial stays sacred** — Pre–Sabella’s hut remains single-target guided. Compass systems activate **post-tutorial** only.

---

## 3. Concept options (ranked)

### Rank 1 — **A) Compass / needle (one target at a time)** ★ Recommended

**Idea:** A small cartographer’s compass (corner or near Guide Me) whose needle slowly swings toward the **current focus target** only. Warmth / tick rate rises as the viewport center (or a “divining” cursor) nears that target — same mental model as chime heat, without requiring search mode for every find.

**Focus target priority (mirrors Guide Me):**
1. Next golden journey step (if any)
2. Else nearest glowing territory to view center
3. Else nearest glowing / eligible site
4. Else late-game cleanup targets

**What changes vs today:**
- Non-focus orange/amber glows are **suppressed or heavily dimmed** while the compass is “locked” on a focus (see §4).
- Player pans/zooms using the needle; when close enough, the focus glow **rises** (fade-in / pulse amplify) and becomes the clear click target.
- Completing that discovery advances focus to the next eligible target.

**Why #1:** Matches user lean; preserves golden-path clarity; slows zoom-out speed-click without turning every territory into a full chime minigame; builds on Guide Me’s priority list.

---

### Rank 2 — **D) Hybrid: golden = compass; territories = short mini-rite**

**Idea:** Journey stops use Option A’s compass. Territories (and maybe non-journey sites) require a **short rite** before the glow becomes clickable — e.g. 2–4 seconds of holding the lantern near a fog-edge whisper, or a single “chart this land” confirm gesture after the compass locks.

**Why #2:** Strongest anti-speed-click for the orange constellation (the main offender). Higher design/QA cost; more tutorial copy; risk of feeling like double tax if journey stops already use chime search.

**Defer full hybrid** until A proves the pacing win; keep mini-rite as a **phase-2 knob** on territories only.

---

### Rank 3 — **B) Divining rod for ALL discovery types**

**Idea:** Extend `searchMode` / lantern / `updateDiviningAudio` so territories and non-amber sites also enter a hot/cold search before reveal.

**Why not #1:** Excellent “earned” feel (already proven on amber stars), but **heavy** — every orange tap becomes a chime session. Fatigue risk on 17 territories + 13 sites; mobile lantern fatigue; longer sessions for Haytus reviewers. Better as optional “deep chart” mode than default.

---

### Rank 4 — **C) Fog-edge “whisper” / pulse only near viewport**

**Idea:** Only draw / strengthen beacons near the current viewport edge or center; distant glows stay silent until you approach. Soft directional pulse at fog edge.

**Why last:** Closest to “fix zoom-out” with least new UI, but:
- Prior **proximity whispers** were removed (build 94) for draw-loop jank — do not revive that pattern casually.
- Still allows speed-clicking everything *inside* a wide viewport.
- Weaker narrative hook than compass / rod.

Useful as a **supporting rule** under A (e.g. focus glow only fully paints when roughly on-screen), not as the sole solution.

---

## 4. Top recommendation — Option A in detail

### Player flow (post-tutorial)

```
Discover location
    → Compass locks next focus (Guide Me priority)
    → Needle drifts toward focus (slow settle, not snappy GPS)
    → Optional soft tick / warmth as map center nears focus
    → Focus glow rises (other glows dim/hidden)
    → Click focus → existing card / chime search / territory unlock
    → Celebration + compass retargets
```

**Stuck?** Guide Me still pans to focus and shows the existing toast; compass needle snaps/settles to confirm. Escape hint patterns from chime search can inspire a “needle restless after 60s” soft boost (widen glow / stronger tick) — design only for MVP.

### What disappears / changes (mass glows?)

| Element | Proposed behavior under flag ON |
|---------|----------------------------------|
| **Golden glow** | Still drawn for next journey step when it **is** the focus (usually yes). |
| **Orange / amber non-focus** | **Hidden or ≤15% opacity**; not presented as a clickable constellation. |
| **Focus glow** | Full current treatment (or slightly stronger “rising” intro). |
| **Clickability** | **Preferred:** `isClickable` only true for focus (+ tutorial rules + Indras/Vol2 gates). Non-focus clicks no-op or toast: “Follow the compass.” Keeps glow≈clickable if non-focus glows are hidden. |
| **Chime search** | Unchanged once an amber/journey search target is opened. |
| **Guide Me** | Retargets / confirms compass focus; does not list all glows. |

**Explicit non-goal for MVP:** Replacing chime search. Compass *leads you to* the star; the lantern still finds the sigil.

### Difficulty curve

| Phase | Behavior |
|-------|----------|
| Tutorial | Unchanged — no compass. |
| Early post-hut | Compass ON; needle generous (faster settle, wider “warm” band); focus = golden path. |
| Mid map | Warm band tightens slightly; non-focus glows fully suppressed. |
| Late cleanup | Same rules; Guide Me priority 3–4 keeps edge cases humane. |
| Indras Na sealed | Compass points at remaining territories/sites; copy can reuse Guide Me’s “map must be whole” line. |

Optional later: first N territory unlocks after hut keep **dim sibling glows** visible as training wheels, then full isolate.

### Mobile notes

- Compass control: **fixed corner**, ≥44×44px hit target; does not sit under Guide Me / progress chrome.
- Needle is **visual + optional haptics/tick**; never audio-only (mute / iOS silent).
- Prefer **map-center proximity** for warmth (thumb doesn’t need a hover lantern for compass heat). Lantern remains for chime search only.
- Avoid forcing pinch-zoom precision; “close enough” band should be forgiving in map units, not pixels-at-max-zoom.
- One-handed: compass is passive HUD; primary action remains tap-on-glow when raised.

### Flag gating

| Item | Value |
|------|-------|
| **Flag** | `ENABLE_DISCOVERY_COMPASS` — default **`false`** |
| **Opt-in** | `?discoverycompass` or `localStorage intrepid_discovery_compass_enabled=1` |
| **Kill switch** | `localStorage intrepid_discovery_compass_disabled=1` or `?nodiscoverycompass` |
| **Scope** | Post-tutorial only; no change when flag off (current mass-glow behavior) |
| **Docs** | This file; note in AGENT-HANDOFF only if spike lands |

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| **Tutorial / early friction** | Compass off until post-hut; generous early warm band; Guide Me unchanged. |
| **Accessibility** | Never audio-only; visible needle + rising glow; Guide Me pan; respect reduced-motion (snap needle, skip tick). |
| **John Haytus / older reviewers** | Isolation must not feel like a hidden-object tax. Soft “Follow the compass” on wrong-tap; escape boost after idle; keep Guide Me obvious. |
| **Glow ≠ clickable bugs** | Spike must update `isClickable` and `drawBeaconGlows` together; add smoke cases for focus vs non-focus. |
| **“Where is everything?” anxiety** | Progress panel counts still rise; optional long-press Guide Me or legend line: “The compass reveals one mark at a time.” |
| **Draw-loop jank** | Do **not** revive build-94 viewport whisper coupling. Compass HUD in DOM; needle angle updated on moveend / throttled draw — keep logic out of per-frame fog text. |
| **Double pacing with chime** | Journey amber stops: compass → existing chime. Don’t add a second search before search. |
| **Story fruit / letters** | Orthogonal — letters stay on chime-hot; compass only changes *how you arrive*. |

---

## 6. MVP slice (1–2 day local spike)

**Goal:** Prove that one-at-a-time focus + compass needle reduces zoom-out speed-click without angering Guide Me users.

**In scope**
1. `ENABLE_DISCOVERY_COMPASS` (default OFF) + opt-in / kill switch.
2. Focus target picker = Guide Me priority list (shared helper if cheap).
3. DOM compass HUD: needle angle toward focus from map center; slow lerp.
4. While flag on + post-tutorial: draw **only focus** orange/amber/golden (golden if it is focus); hide other discovery beacons.
5. `isClickable`: only focus (plus existing tutorial / Indras / Vol2 gates).
6. On discovery complete: retarget focus; brief needle settle.
7. Guide Me: pan to focus (already does); ensure compass agrees.
8. `node --check fog.js` + extend or add a small smoke script for “non-focus not clickable when flag on.”

**Out of scope for MVP**
- Full chime for territories (Option B)
- Territory mini-rite (Option D phase 2)
- Fog-edge whispers (Option C as primary)
- New Sabella copy walls / secrets
- Prod default ON
- Haptics, reduced-motion polish beyond a simple flag skip

**Success criteria (playtest)**
- Zoomed-out view no longer presents a clickable starfield.
- Player can still finish the map using compass + Guide Me without a walkthrough.
- Amber chime searches feel unchanged once entered.
- Flag OFF = bit-identical discovery UX to today.

---

## 7. Explicit non-goals (this pass)

- **No implementation** in the design pass that produced this doc.
- No build bump, no Netlify deploy, no prod flag flip.
- No reopening Pass 3 region fog.
- No replacement of Sabella letters / clue popup scaffolds.

---

## 8. Decision ask for Jon

1. Approve **Option A** as the spike direction?  
2. Confirm **hide non-focus glows + clickable=focus only** (strict) vs dim-but-still-clickable (weaker anti-speed-click)?  
3. After spike: keep compass for **all** post-tutorial finds, or golden-only + free orange cluster (hybrid lite)?

**Recommendation:** Strict A for the spike (hide + clickable=focus). Revisit hybrid territory rites only if speed-clicking returns via rapid Guide Me spam.
