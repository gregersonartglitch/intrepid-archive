---
status: awaiting_human_verify
trigger: "Queen's Stronghold fog visibility - reveal parent region when site discovered"
created: 2026-07-01T00:00:00Z
updated: 2026-07-01T00:00:00Z
symptoms_prefilled: true
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Discovered sites only get small radial fog holes (revealRadius ~80); parent region polygon fog is never cleared when child sites like moon-stronghold are discovered"
  confirming_evidence:
    - "draw() section 4 Pass 2 uses loc.revealRadius || 80 for complete-phase story sites"
    - "moon-stronghold is type story inside moon-queen-realm polygon (regions.json lore_ids)"
    - "No polygon fog clear existed in fog.js — only radial gradients"
    - "Label pane z-index 680 already above fog canvas 450 — issue is fog coverage not stacking"
  falsification_test: "If labels still obscured after polygon clear, z-index or truncation is the cause"
  fix_rationale: "When any lore site in a region is fully discovered, erase fog across the entire region polygon from regions.json"
  blind_spots: "regions.json load is async — first frame may lack polygons; searching phase intentionally excluded"

hypothesis: CONFIRMED — radial-only clear too small for territory sites; region polygon never cleared
next_action: Human verify moon-stronghold label readable after full discovery

## Symptoms

expected: When Queen's Stronghold (moon-stronghold) is discovered, fog clears for the parent Moon Queen kingdom region so label is fully readable
actual: Label mostly hidden by deep fog - only small fog hole at marker point; "QUEEN'S STRO..." truncated/clipped
errors: none
reproduction: Discover moon-stronghold on map; observe label obscured by fog outside tiny clear radius
started: reported in UAT

## Eliminated

- hypothesis: Label z-index below fog canvas
  evidence: index.html sets labelPane z-index 680 vs fog-canvas 450
  timestamp: 2026-07-01

- hypothesis: fog-hidden class stuck on discovered label
  evidence: revealMarker removes fog-hidden on discovery; issue is fog canvas not marker opacity
  timestamp: 2026-07-01

## Evidence

- timestamp: 2026-07-01
  checked: fog.js draw() section 4
  found: Pass 2 clears radial holes only — baseR = revealRadius || 80 for complete phase
  implication: moon-stronghold gets ~80 map-unit radius, not full territory

- timestamp: 2026-07-01
  checked: regions.json moon-queen-realm
  found: lore_ids includes moon-queen-kingdom, moon-stronghold, sinn, indras-na; polygon spans ~600-1000 units
  implication: radial clear cannot cover territory; polygon clear needed

- timestamp: 2026-07-01
  checked: index.html label CSS
  found: labelPane z-index 680, overflow visible on map-label-icon
  implication: "QUEEN'S STRO..." appearance is fog occlusion not CSS ellipsis

## Resolution

root_cause: Fog canvas only erased small radial holes per discovered location. Territory sites like moon-stronghold (story type, complete phase, default revealRadius 80) never cleared fog across their parent region polygon in regions.json, so labels remained visually clipped by deep fog despite rendering above the canvas.
fix: Added regions.json load in fog.js; Pass 3 in draw() clears fog for entire region polygon when any lore_id in that region is fully discovered (phase !== searching). Added moon-stronghold label split for readability.
verification: node --check fog.js passes
files_changed: [fog.js, index.html]
