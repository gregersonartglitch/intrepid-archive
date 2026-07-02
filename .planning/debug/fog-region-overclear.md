---
status: awaiting_human_verify
trigger: "CRITICAL regression — one click clears huge western map area; early journey 2/8 should not wipe regions"
created: 2026-07-02T00:00:00Z
updated: 2026-07-02T00:00:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: isRegionFogRevealed() returns true for ANY lore_id with phase !== searching, including journey path stops (crossing-pool, dawn-spear) in hollowlands-south — Pass 3 clears entire western polygon on first tutorial click
test: Trace lore_ids for hollowlands-south vs journey path; verify fix excludes isOnPath sites
expecting: Only territory markers + non-path story sites (moon-stronghold) trigger polygon clear
next_action: Apply isRegionFogRevealed guard + reduce blur feather

## Symptoms

expected: Early journey clicks reveal only small radial fog holes (~80 units); full region polygon clear only for territory unlock or landmark story sites like moon-stronghold
actual: One click clears massive blob covering western map; chime search hint visible (sabella step 3+)
errors: none
reproduction: Fresh map, tutorial step 0-2 instant discover crossing-pool or dawn-spear; observe western hollowlands-south polygon cleared
started: after Pass 3 region polygon reveal added (stronghold-region-fog fix)

## Eliminated

- hypothesis: Blur feather alone clears half the map without polygon fill
  evidence: blur max 96px extends edges but cannot clear areas far from polygon bounds; primary mass is polygon extent
  timestamp: 2026-07-02

- hypothesis: syncFogCanvasSize DPR mismatch causes coordinate blow-up
  evidence: setTransform(dpr) matches latLngToContainerPoint CSS coords; same mapping as index.html veil polygons
  timestamp: 2026-07-02

## Evidence

- timestamp: 2026-07-02
  checked: isRegionFogRevealed in fog.js lines 287-298
  found: Returns true on first lore_id with discovered && phase !== 'searching' — no type or journey filter
  implication: crossing-pool/dawn-spear instant tutorial complete triggers hollowlands-south

- timestamp: 2026-07-02
  checked: regions.json hollowlands-south
  found: lore_ids [hollowgate, crossing-pool, dawn-spear, sabellas-hut]; polygon lat 1348-2766 (western map)
  implication: First tutorial discovery clears entire western polygon

- timestamp: 2026-07-02
  checked: discoverLocation tutorial instant steps 0-2
  found: instantDiscover sets phase 'complete' immediately for crossing-pool and dawn-spear
  implication: Pass 3 fires on first click, not after chime search

- timestamp: 2026-07-02
  checked: stronghold-region-fog debug session
  found: Prior fix intentionally added Pass 3 but used overly broad any-site-in-region trigger
  implication: Regression from correct intent, wrong condition

## Resolution

root_cause: Pass 3 isRegionFogRevealed() treated any discovered lore site (including journey path stops crossing-pool/dawn-spear and mist-phase cartographer sites) as sufficient to clear the entire parent region polygon. hollowlands-south spans the western map, so tutorial step 0-2 instant discoveries wiped it on first click.
fix: Restrict region polygon reveal to (1) territory markers (type region/water) fully discovered, or (2) story sites NOT on journey path (moon-stronghold case). Reduce blur feather cap.
verification: node --check fog.js passes; isRegionFogRevealed now excludes journey path + cartographer mist sites
files_changed: [fog.js, index.html]
