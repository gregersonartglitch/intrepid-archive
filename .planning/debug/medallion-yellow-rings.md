---
status: awaiting_human_verify
trigger: "Yellow circular stroke outlines on north/west/south/east frame medallions (Tetrad guardians) - regression from seal-pulse fix"
created: 2026-07-01T00:00:00Z
updated: 2026-07-01T00:00:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: ".medallion-hot.god-unlocked::after draws a steady 1.5px gold stroke ring on every revealed medallion hotspot; Tetrad guardians (Utu/Rapha/Mish/Gu) get god-unlocked once revealedGods/localStorage marks them revealed, leaving ambient yellow circles on cardinal frame art during normal play"
  confirming_evidence:
    - "Prior seal-pulse fix removed god-locked::after only; god-unlocked::after block (index.html 567-574) still has border:1.5px solid rgba(212,168,67,0.5)"
    - "syncMedallionHotspots adds god-unlocked when isMedallionRevealed(name) — Tetrad unlock thresholds 5/9/13/17, easy to hit in normal play"
    - "User symptom matches steady stroke ring not pulsing seal-pulse"
    - "spawnMedallionPulse uses radial gradient glow without border — separate transient unlock effect, unaffected"
  falsification_test: "Remove god-unlocked::after; reload with revealed tetrad guardians — no ambient gold stroke rings on frame medallions"
  fix_rationale: "Hotspots should stay invisible click targets in normal play; unlock feedback is spawnMedallionPulse + discovery card, not persistent CSS ring"
  blind_spots: "Hover background glow could still read as faint gold on mouseover — user said hover OK if subtle"

hypothesis: CONFIRMED — god-unlocked steady ::after ring
next_action: Remove god-unlocked::after CSS from index.html

## Symptoms

expected: No visible yellow stroke rings on medallions in normal play — question mark / sealed state only on interaction; no ambient gold circles on frame art
actual: Yellow circular stroke outlines on north/west/south/east Tetrad guardian medallions
errors: none
reproduction: Load map in normal play with Tetrad guardians revealed (or any revealed medallion); gold stroke rings visible on hotspot overlay
started: regression after seal-pulse removal

## Eliminated

- hypothesis: god-locked seal-pulse still present
  evidence: god-locked::after block already removed; comment at line 554 confirms invisible hit target only
  timestamp: 2026-07-01

- hypothesis: frame-corner SVG circles
  evidence: .frame-corner { display: none; }
  timestamp: 2026-07-01

- hypothesis: spawnMedallionPulse leaving permanent rings
  evidence: glow element removed after 2000ms; uses radial-gradient not stroke border
  timestamp: 2026-07-01

## Evidence

- timestamp: 2026-07-01
  checked: index.html medallion-hot CSS block
  found: god-unlocked::after with content:'', border 1.5px solid gold, box-shadow ring
  implication: Persistent ambient ring on all revealed medallions including Tetrad guardians

- timestamp: 2026-07-01
  checked: syncMedallionHotspots class logic
  found: god-unlocked applied when isMedallionRevealed returns true
  implication: Any saved reveal shows steady ring until CSS removed

## Resolution

root_cause: .medallion-hot.god-unlocked::after draws a persistent 1.5px gold stroke ring on revealed medallion hotspot divs. After the prior seal-pulse removal for god-locked, this remaining rule leaves ambient yellow circles on Tetrad guardians (and all revealed medallions) during normal play.
fix: Remove god-unlocked::after steady ring styling; keep invisible hotspots, hover feedback, and spawnMedallionPulse unlock animation.
verification: CSS removed; hotspots remain invisible in normal play; hover subtle glow retained; spawnMedallionPulse unchanged in fog.js
files_changed: [index.html]
