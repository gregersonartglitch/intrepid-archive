# Intrepid Map — Fable Audit Brief

**Product:** The Hollowlands interactive fog-of-war map + Intrepid Dusk reader archive  
**Build:** 62 (`window.INTREPID_BUILD = 62`; console: `[Intrepid Map] build 62`)  
**Repo:** `C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map`

| Environment | URL |
|-------------|-----|
| **Production** | https://archive.intrepidgraphicnovel.com |
| **Local dev** | http://localhost:8080 |

**Agent onboarding:** [`AGENT-HANDOFF.md`](AGENT-HANDOFF.md)  
**Executable workflow:** [`docs/FABLE-LOCAL-TEST.md`](docs/FABLE-LOCAL-TEST.md)  
**Automated smoke:** `node scripts/audit-checks.mjs`

---

## What this product is

A static-site archive for *Intrepid Dusk* / *The Hollowlands*:

1. **Landing** — three public entry paths (reader, dossier, cartographer map).
2. **Cartographer's Atlas** — Leaflet + canvas fog game (`fog.js`). Gated behind Hollowlands pledge (`hollowlands9`).
3. **Volume 1 reader** — portrait page-flip reader at `/reader/intrepid-dusk-volume-1/`. Issue 1 free; Issues 2–3 backer-gated (`scribe4`).
4. **Character dossier** — public gallery at `/dossier/`.

Stack: vanilla HTML/CSS/JS (ES5 in `fog.js`), Leaflet, no backend. Deployed via Netlify (`netlify deploy --prod --dir .`).

### Build 62 context

Build 59 fixed a **cartographer gate bypass** (legacy `intrepid_atlas_auth` + tier A). Build 61 fixed landing button stack layout (2-column grid). Build 62 tightens **CART- private links** and **journey progress counter**:

- **CART- links:** `?key=CART-XXXXXXXX` — prefix plus **8–24 uppercase letters/digits** (e.g. `?key=CART-HOLLOWLANDS`). Partial keys like `?key=CART-` or `?key=CART-abc` show the gate with an error; they do not unlock.
- **Journey counter:** Sidebar `Elena's Journey X/8` counts only `JOURNEY_PATH` stops with `phase:'complete'`. Chime-search (`phase:'searching'`, e.g. indras-na amber star) does not increment until the key is found.

See `.planning/debug/cartographer-gate-bypass.md` for build-59 gate history.

**Primary audit ask for build 59:** In a fresh session (incognito / cleared storage), clicking **Cartographer's Atlas** must always show the password gate until `hollowlands9` is entered. `scribe4` must never grant map access.

---

## Don't-break invariants

From `.cursor/rules/project.mdc` and `AGENT-HANDOFF.md`:

| # | Invariant | How to verify |
|---|-----------|---------------|
| 1 | **No glow = not clickable** | `isClickable()` in `fog.js` must match beacon draw logic |
| 2 | **Tutorial gate** | Before `sabellas-hut` discovered, only `tutorialHintLoc` is clickable |
| 3 | **Golden glow** | Next journey step; always visible post-tutorial |
| 4 | **Orange beacon** | Territory (region/water); unlocked by non-territory discovery within 500 units |
| 5 | **Yellow beacon** | `cartographerSite` or journey stop; visible within 400 units of cleared fog |
| 6 | **Auth key isolation** | `scribe4` → reader only; `hollowlands9` → map only; never cross-migrate |
| 7 | **No Pass 3 fog** | Region polygon fog reveal was reverted at build-50 — do not re-introduce |
| 8 | **Build sync** | `INTREPID_BUILD` and `fog.js?v=N` must match on deploy |

### Journey path (order)

`crossing-pool` → `dawn-spear` → `sabellas-hut` (tutorial ends) → `mish` → `monastery-wind` → `tower-nine` → `sinn` → `indras-na` (final; requires all territories + sites)

### Coordinates

- `lat` = horizontal (left-right). Higher lat = further right.
- `lng` = vertical (up-down).
- Proximity in map units (400 ≈ nearby cluster).

---

## Auth test matrix

**Always test in incognito or after clearing localStorage** (DevTools → Application → Local Storage → Clear).

| Code | Tier | Grants | localStorage keys set | Must NOT grant |
|------|------|--------|----------------------|----------------|
| *(none)* | Public | Issue 1 reader, dossier | — | Map, Issues 2–3 |
| `hollowlands9` | Cartographer ($60+ pledge) | Interactive map | `intrepid_cartographer_unlocked=granted` | Reader issues 2–3 |
| `scribe4` | Reader backer | Issues 2 & 3 | `intrepid_reader_backer=granted`, `intrepid_reader_issue_002/003` | Cartographer map |

### Keys to clear between tests

```
intrepid_cartographer_unlocked
intrepid_reader_backer
intrepid_reader_issue_002
intrepid_reader_issue_003
intrepid_atlas_auth          # legacy — must not bypass gate (build 59)
intrepid_atlas_tier          # legacy
intrepid_atlas_discovered
intrepid_atlas_discovered_v
intrepid_atlas_welcomed
intrepid_atlas_hinted
intrepid_post_tutorial_hinted
```

**Nuclear reset:** http://localhost:8080/?reset (clears fog-related keys on load).

### Test matrix (expected outcomes)

| # | Precondition | Action | Expected |
|---|--------------|--------|----------|
| A1 | Fresh storage | Click **Cartographer's Atlas** | Gate UI; `#app` hidden |
| A2 | Fresh storage | Enter `hollowlands9` | Map loads; welcome flow |
| A3 | Fresh storage | Enter wrong password | Error + shake; stay on gate |
| A4 | After A2 | Return home → Cartographer again | Map loads (key persisted) |
| A5 | Fresh storage | Click **Read Issue 1** | Reader at `/reader/intrepid-dusk-volume-1/` |
| A6 | Fresh storage | Open `/dossier/` | Character gallery loads |
| A7 | Fresh storage | Enter `scribe4` in reader (page 22+ gate) | Issues 2–3 unlock |
| A8 | After A7 | Home → Cartographer | **Still gated** (A7 did not unlock map) |
| A9 | Stale `intrepid_atlas_auth=granted` + `tier=A`, no cartographer key | Cartographer | **Must show gate** (build 59 regression test) |

---

## 15-minute play script

| Min | Step | Action | Expected outcome |
|-----|------|--------|------------------|
| 0–1 | Setup | Incognito → http://localhost:8080/ | Landing card; three paths + Main Website link |
| 1–2 | Dossier | Click **Character Dossier** | `/dossier/` loads; character cards clickable |
| 2–4 | Reader | Back → **Read Issue 1** | Volume 1 reader; page 1 visible; tap/click advances |
| 4–5 | Reader gate | Flip to page 22+ (or use devtools to jump) | Backer gate overlay for Issue 2 |
| 5–6 | Cartographer gate | Archive home → **Cartographer's Atlas** | Password gate; subtitle mentions access word |
| 6–7 | Unlock map | Enter `hollowlands9` → **Chart the Hollowlands** | Loader → map frame; fog visible |
| 7–8 | Welcome | Complete welcome if shown | Map interactive; zodiac frame visible |
| 8–10 | Tutorial 1 | Click golden glow (Crossing Pool area) | Discovery card; fog clears around location |
| 10–11 | Tutorial 2 | Advance to Dawn Spear (golden glow) | Second discovery; tutorial still active |
| 11–13 | Tutorial end | Reach Sabella's Hut | Tutorial completes; more beacons may appear |
| 13–14 | Post-tutorial | Pan map; observe beacons | Golden = next journey step; orange/yellow rules apply |
| 14–15 | Console | DevTools console | `[Intrepid Map] build 62` |

**Stretch (if time):** `?edit` mode shows marker editor; `Guide Me` button pans to nearest target.

---

## Prioritized review ask

1. **P0 — Cartographer gate (build 59):** Confirm incognito + stale legacy keys cannot bypass `hollowlands9`.
2. **P0 — Auth isolation:** `scribe4` never unlocks map; `hollowlands9` never unlocks reader issues 2–3.
3. **P1 — Tutorial lock:** Only golden-hint location clickable until Sabella's Hut found.
4. **P1 — Glow = clickable:** No interaction with locations that have no visible glow.
5. **P2 — Reader:** Issue 1 free; gate at Issue 2 boundary; page flip feels responsive on narrow viewport.
6. **P2 — Deploy stamps:** `INTREPID_BUILD`, `fog.js?v=`, console log aligned.

---

## Paste-ready Fable system prompt section

```
You are auditing intrepid-map (The Hollowlands / Intrepid Dusk archive), build 62.

REPO: C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map
LOCAL: http://localhost:8080 | PROD: https://archive.intrepidgraphicnovel.com

WORKFLOW:
1. cd to repo; node --check fog.js
2. npx -y http-server . -p 8080 --cors -c-1  (keep running)
3. node scripts/audit-checks.mjs  (must exit 0)
4. Incognito browser tests per AUDIT-BRIEF.md auth matrix
5. 15-minute play script in AUDIT-BRIEF.md

AUTH (test passwords — not secrets, dev/backer codes):
- hollowlands9 → cartographer map only (intrepid_cartographer_unlocked)
- scribe4 → reader issues 2–3 only (intrepid_reader_backer)
Clear localStorage between auth tests. scribe4 must NOT unlock map.

BUILD 62 FOCUS: CART- link format validation (8–24 suffix); journey counter excludes chime-search phase; landing button grid (build 61).

INVARIANTS (never break):
- No glow = not clickable (isClickable sync with draw)
- Tutorial: only tutorialHintLoc clickable until sabellas-hut
- Golden glow = next journey step; orange = territory; yellow = site/path stop
- Do not re-add Pass 3 region fog (reverted build-50)

KEY FILES: index.html (gate, landing), fog.js (game engine), data.js (locations), reader/backer-gate.js (reader auth)

Read AGENT-HANDOFF.md and docs/FABLE-LOCAL-TEST.md before manual testing.
Report: pass/fail per auth matrix row, play script blockers, invariant violations, build stamp mismatch.
```

---

## Open questions for auditor

1. **Gate bypass vectors:** Any path besides `intrepid_cartographer_unlocked`, valid `?key=CART-XXXXXXXX`, or `hollowlands9` that loads `#app` without password?
2. **Legacy storage:** Does production traffic still carry `intrepid_atlas_auth`? Should we add a one-time migration to clear it?
3. **Reader cache:** After overlay deploys, do browsers serve stale `styles.css` / `spike.js` (no cache buster on reader assets)?
4. **Issue boundary:** Is page 21→22 the correct Issue 2 gate trigger given current manifest page count (68)?
5. **Mobile/iPad:** Does tap-to-advance reader pass Sprint 0 bar ("page flip feels like a page") on iPad Safari?
6. **Pass 3 fog:** Any accidental reintroduction of region polygon clearing in `fog.js` draw loop?
7. **Coordinate unlock / sigil QR:** Do `?scan=` deep links behave correctly when user is gated vs unlocked?
8. **Accessibility:** Gate and reader backer overlays — keyboard trap, focus return, screen reader labels?

---

## Automated checks reference

```powershell
cd C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map
npx -y http-server . -p 8080 --cors -c-1   # terminal 1
node scripts/audit-checks.mjs               # terminal 2
# or
.\scripts\run-local-audit.ps1
```

Exit code `0` = structural smoke pass. Manual auth + play script still required.

---

## Fable follow-up prompt — easy upgrades

Paste this after build-62 audit if P0/P1 are clear and you want a second pass focused on polish only:

```
You finished the intrepid-map build-62 audit (cartographer gate, CART- link format, journey counter).

Request a prioritized list of UX/polish improvements that each take under 2 hours to implement.

Constraints:
- No Pass 3 region fog (reverted build-50 — do not propose re-adding)
- No payment/commerce system work
- No backend/Supabase
- Stay within vanilla HTML/CSS/JS + existing fog.js architecture

For each suggestion include:
1. Title (one line)
2. User-visible benefit
3. Rough effort (30m / 1hr / 2hr)
4. Files likely touched
5. Risk (low/medium) if it could break auth, tutorial, or glow=clickable invariants

Prioritize: mobile/iPad reader feel, gate/landing clarity, map discoverability hints, accessibility, copy consistency, performance wins, small visual polish.

Return top 8–12 items ranked by impact ÷ effort.
```
