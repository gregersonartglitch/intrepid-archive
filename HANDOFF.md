# Intrepid Map — Agent Handoff Document
*Generated: 2026-06-29 | Project: The Hollowlands Interactive Map*

---

## Project Location

```
C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\
```

### Key Files
| File | Role |
|---|---|
| `index.html` | Main app (~3895 lines) — all CSS, HTML structure, Leaflet setup, region overlay JS |
| `fog.js` | Core game engine (~2770 lines) — fog system, beacons, tutorial, discovery cards, Guide Me |
| `data.js` | All location data (~991 lines) — coordinates, lore, journey path, cartographer sites |
| `regions.json` | GeoJSON polygon data for territory overlays |
| `reveals.json` | Fog reveal shape data per discovered location |
| `map5.jpg` | The main map image |
| `fog_texture.png` | Animated fog texture |
| `frame_original_02.png` | Decorative outer frame (12 zodiac medallions) |

### To Run Locally
```powershell
cd C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map
npx -y http-server . -p 8080 --cors -c-1
# Open http://localhost:8080
# Editor mode: http://localhost:8080?edit
```

---

## Architecture Overview

### fog.js — IIFE Structure
Everything is inside one large IIFE `(function() { ... })()`. Key sections:

| Variable/Function | Purpose |
|---|---|
| `discovered` | Object keyed by location ID — tracks what's been found |
| `tutorialStep` / `TUTORIAL_STEPS` | Tutorial progress (0–7). TUTORIAL_DEFS array defines each step |
| `tutorialHintLoc` | Current location the tutorial is pointing at |
| `searchMode` | Active chime search state `{ loc, keyLat, keyLng }` |
| `journeyPath` | Array of `{ step, locationId, label }` from `data.js` |
| `getNextPathLocation()` | Returns first undiscovered journey step ID |
| `isClickable(locId)` | Gate — returns true only if location has a visible glow |
| `discoverLocation(loc)` | Dispatches: story → `startSearchMode()`, else → `instantDiscover()` |
| `completeDiscovery(loc)` | Called when chime key is found — clears searchMode, reveals location |
| `instantDiscover(loc)` | Non-story discovery, opens card, advances fog |
| `draw()` | RAF loop — draws fog, beacons (sections 3, 3b), clear holes (section 4) |
| `addGuideButton()` | Creates the "◆ Guide Me" button |
| `runGuideMe()` | Pans map to nearest unglow target |

### data.js — Location Structure
```js
{
  id: 'location-id',
  name: 'Display Name',
  sub: 'Subtitle',
  type: 'story' | 'region' | 'water' | 'city' | 'town' | 'sacred',
  lat: 4285,      // Y coordinate in Leaflet CRS.Simple
  lng: 4168,      // X coordinate in Leaflet CRS.Simple
  desc: 'Long description...',
  lore: '"Quote..."',
  cartographerSite: true,   // appears in Cities & Sites progress bar
  journeyStep: 3,           // 1-8, or null
  volume1: true,
  art: 'filename.jpg',      // optional discovery card image
  gatedBehind: 'loc-id',   // optional — locks until another location found
  revealRadius: 150         // optional fog reveal override
}
```

### Journey Path (7 steps — Mish off Elena’s Journey as of build 185)
```
1. crossing-pool    → Into the Hollowlands
2. dawn-spear       → Sabella's Clearing  
3. sabellas-hut     → Grandmother's Trail  ← tutorial ends here
4. monastery-wind   → The Oracle
5. tower-nine       → Tower of the Nine
6. sinn             → The Moon Court
7. indras-na        → FINAL STOP (locked until all territories + sites found)
```
(`mish` remains a cartographer site / guardian name — **not** a journey step.)
---

## Current Game Logic Rules

### Clickability Rule (CRITICAL)
**No glow = not clickable.** `isClickable()` enforces:
- **During tutorial** (before `discovered['sabellas-hut']`): ONLY `tutorialHintLoc.id` is clickable
- **After tutorial**: proximity-based
  - Story locations: clickable if `nextId` OR within 400 units of discovered location
  - Territories: clickable if within 400 units of discovered location  
  - CartographerSites: clickable if within 400 units of discovered location
  - Everything else: never clickable

### Beacon Color System (section 3b in draw())
| Color | Type | Unlock Condition |
|---|---|---|
| ✨ Gold pulse | Next journey step (section 3) | Always shown post-tutorial, 50px radius |
| 🟡 Yellow star | CartographerSite or journey path stop | Within 400 units of cleared fog |
| 🟠 Orange shimmer | Territory (region/water) | Non-territory location discovered within 500 units |

### Tutorial Flow
```
Step 0 (click):      Click crossing-pool golden glow
Step 1 (close-card): Close discovery card  
Step 2 (click):      Click dawn-spear golden glow
Step 3 (search):     tutorialHintLoc advances to sabellas-hut, player clicks it
Step 4 (find-key):   Chime search mode for sabellas-hut key
Step 5 (auto):       Toast — 2.5s delay
Step 6 (auto):       Toast — 2.5s delay → tutorial complete
```
After step 6: `discovered['sabellas-hut']` = true → full beacon system unlocks.

### The Gates (indras-na)
Locked behind ALL territories (17) AND ALL cartographer sites (13) being discovered. `isClickable('indras-na')` checks both conditions.

---

## Known Outstanding Issues / TODOs

### High Priority
- [ ] **Location positions** — many locations need repositioning. Use `?edit` URL param to drag-and-drop in the browser. Coordinates log to F12 Console. Update `data.js` with new `lat`/`lng` values.
- [ ] **Monastery of the Wind (step 4)** — post-Sabella golden glow / clickability. Next stop after tutorial (build 185+); Mish is **not** on Elena’s Journey.
- [ ] **Section 3b gate** — currently uses `!discovered['sabellas-hut']` as the gate. After tutorial, territories within 500 units of any discovered non-territory location show orange glows.

### Medium Priority
- [ ] **Newsletter / Mailerlite** — signup form in `index.html` needs wiring. There's a placeholder section in the discovery card HTML.
- [ ] **Character Dossier** — `/dossier/index.html` needs 11 character images wired up
- [ ] **9 additional map locations** to pin: City of a Thousand Bridges, etc. (user had a list)
- [ ] **Perimeter lightning effects** — requested on west and east edges of the map

### Low Priority  
- [ ] **Orphaned dead code** in `fog.js` around lines 732-736 — a stray `if (tutorialStep < TUTORIAL_STEPS...)` block outside any function (inside IIFE). Safe to remove.
- [ ] **favicon.ico** — 404 error on load, no favicon set

---

## UI Layout

### Bottom of Screen (fixed)
```
[ 📖 Elena's Journey ]  [ ◆ Guide Me ]
     left of center          right of center
```
- Elena's Journey: `left: calc(50% - 6px); transform: translateX(-100%)`  
- Guide Me: `left: calc(50% + 6px); transform: translateX(0)` (in fog.js `addGuideButton()`)

### Discovery Card
- Fixed left side of screen
- `.dc-close` button: top-right corner, reads "✕ Close", amber styled
- `.dc-dismiss-btn` bottom bar: second close option

### Left Panel
- Cartographer progress panel (bottom-left, fixed)
- Shows: Elena's Journey X/7, Territories X/17, Cities & Sites X/13

---

## Editor Mode

Navigate to `http://localhost:8080?edit`

- All locations get gold-bordered draggable dots
- Drag any dot to reposition
- Coordinates print to browser console (F12) as you drag
- Update `data.js` with the new `lat`/`lng` values

`Shift+M` toggles the medallion border position editor.

---

## Files NOT to touch (assets)
```
map5.jpg              — main map image
fog_texture.png       — fog animation texture  
frame_original_02.png — outer decorative frame
frame_original_02_on_state.png — frame hover state
assets/medallions/    — 12 zodiac medallion images
assets/gods/          — god/guardian sprites
*.jpg                 — location discovery card images
```

---

## Recent Changes Made (this session)

1. **Fixed black map** — corrupted `if (state === 'clear') return;` in Leaflet region renderer (index.html ~line 3161) was replaced with a close-button check; restored correctly.
2. **isClickable rewrite** — now enforces glow-visibility = clickable. No glow → not clickable, full stop.
3. **Tutorial lock** — during tutorial (before sabellas-hut found), ONLY the golden hint glow is clickable. No territories, no cities.
4. **tutorialBlocked fix** — golden glow for next journey stop (now monastery-wind) shows immediately when sabellas-hut is discovered (not waiting for auto-toast timers).
5. **Direct glow click bypass** — clicking within 130px of section-3 golden glow triggers next journey step directly.
6. **Orange/Yellow beacon rewrite** — territories = orange (unlocked by nearby discovery), locations = yellow.
7. **Removed auto-pan to distant next stop** — was jarring; user explores at own pace.
8. **Golden glow reduced** — from 90px outer radius to 50px, less sun-like.
9. **Button layout** — Elena's Journey and Guide Me now sit side-by-side, not stacked.
10. **Close button** — now reads "✕ Close" (text label), amber colored, clearly visible.
11. **Maxim Stone** — moved to Tower of Nine position (inside the tower), slight offset applied.
12. **Location spread** — crossing-pool, dawn-spear, sabellas-hut coordinates adjusted to reduce label overlap.
13. **The Gates gating** — `data.js` flags `the-gates` with `cartographerSite: true` and `gatedBehind: 'tower-nine'`.

---

## Syntax Validation Commands

```powershell
# Check fog.js and data.js for syntax errors
node --check "C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\fog.js"
node --check "C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\data.js"

# Search for a pattern in fog.js
Select-String -Path "fog.js" -Pattern "YOUR_PATTERN" | Select-Object LineNumber, Line
```

---

## Future: Freemium Reader (not built yet)

Planned commerce model for the Volume 1 reader at `/reader/`:

- **Issue 1** — free to start (onboarding hook)
- **Issues 2, 3, …** — paid unlock per issue (per-arc transactional, aligned with Legendist 85/15 split)
- **Map + full archive** — remain patron-gated (Tier A/B) as today

No payment integration in this repo yet. Landing and gate wiring are in place so Codex can drop the reader build into `/reader/` without reworking auth.

---

*All project files are at `C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\`*
