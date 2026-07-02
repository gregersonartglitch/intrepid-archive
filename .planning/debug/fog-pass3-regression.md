---
status: awaiting_human_verify
trigger: "Fog regressions: territories missing, clicking territory clears huge eastern area; revert Pass 3?"
created: 2026-07-02T12:00:00Z
updated: 2026-07-02T12:00:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED — Pass 3 region polygon reveal (uncommitted) clears entire GeoJSON polygons on territory discovery; polygons span 1000–2000 map units
test: git diff + trace isRegionFogRevealed on western-azu / eastern-empire
expecting: Territory click clears only radial hole (~80 units) after revert
next_action: Human verify map at build 50

## Symptoms

expected: Orange territory beacons appear when within 500 units of discoveries; clicking clears small radial fog hole
actual: Some territories not showing; clicking territory clears massive eastern/western areas
errors: none
reproduction: Post-tutorial, discover territory beacon (e.g. western-azu); observe huge polygon cleared
started: after uncommitted Pass 3 region polygon reveal added locally

## Eliminated

- hypothesis: fce0da6b tightening commit caused regression
  evidence: commit fce0da6b not in repo history; Pass 3 never committed
  timestamp: 2026-07-02

- hypothesis: syncFogCanvasSize DPR mismatch causes over-clear
  evidence: DPR transform matches latLngToContainerPoint; over-clear correlates with polygon bounds not canvas size
  timestamp: 2026-07-02

## Evidence

- timestamp: 2026-07-02
  checked: git log -S isRegionFogRevealed
  found: No commits — Pass 3 only in uncommitted working tree
  implication: Safest revert = remove Pass 3 from working tree; HEAD d755501 never had it

- timestamp: 2026-07-02
  checked: isRegionFogRevealed (pre-revert)
  found: isTerritory(loc) return true → clear entire parent polygon on territory marker discovery
  implication: western-azu click clears polygon lat 2056–4134, lng 4592–5648 (~2M sq units)

- timestamp: 2026-07-02
  checked: regions.json eastern-empire polygon
  found: lat 3200–4822, lng 3228–4456 (~2M sq units); lore_ids are cities/sites not territory markers
  implication: eastern clear happens via territory markers in overlapping regions (atras-empire in atras-heartland) or child site rules

- timestamp: 2026-07-02
  checked: fog-region-overclear.md prior fix
  found: Tightened trigger to territory + non-path story only; still clears whole polygon — symptom reduced for tutorial but not territory clicks
  implication: Surgical tighten insufficient for Beta; feature should be shelved

## Resolution

root_cause: Uncommitted Pass 3 added full-region polygon fog erase when isRegionFogRevealed() matched. Territory discovery intentionally triggered whole-polygon clear. Region polygons in regions.json are 1000–2000 unit spans — far larger than radial clears (~80). This made one territory click look like "half the map" cleared and masked orange beacon visibility in already-cleared areas.
fix: Reverted Pass 3 entirely — removed loadRegionsGeo, isRegionFogRevealed, clearFogPolygon, and Pass 3 draw loop. Kept syncFogCanvasSize (DPR fix, separate concern). Added INTREPID_BUILD = 50.
verification: node --check fog.js passes; Pass 3 symbols absent from fog.js
files_changed: [fog.js, index.html]
