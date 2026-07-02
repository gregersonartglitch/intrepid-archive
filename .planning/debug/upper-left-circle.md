---
status: fixing
trigger: "Pulsing stroked circle visible between LAYERS panel and Erra (horn demon) medallion in upper-left"
created: 2026-06-30T00:00:00Z
updated: 2026-07-02T00:00:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Locked medallion hotspot ::after pseudo-element (seal-pulse CSS) draws a 1px gold/copper stroked circle on every god-locked hotspot; Irra (upper-left, unlock:38) shows this ring in the gap between #layers panel and frame art during normal play"
  confirming_evidence:
    - ".medallion-hot.god-locked::after has border:1px solid rgba(198,141,85) + animation:seal-pulse 3s infinite — matches thin gold/copper pulsing circle"
    - "Irra at cx:0.1350 cy:0.1780 is upper-left Apkallu, always god-locked until 38 discoveries"
    - "#layers at top:110px left:82px sits adjacent to Irra hotspot; ring visible in gap between panel and medallion art"
    - "frame-corner/frame-bar already display:none — not this artifact"
    - "search spotlight only renders when searchMode active (fog.js draw 4b)"
  falsification_test: "Remove god-locked::after seal-pulse; reload map — no pulsing circle in upper-left gap"
  fix_rationale: "Hotspots remain invisible click targets; seal ring was decorative UI leak not tied to search/reveal game states"
  blind_spots: "god-unlocked steady ring on revealed tetrad guardians — steady not pulsing, different symptom"

hypothesis: CONFIRMED — god-locked seal-pulse ::after on medallion hotspots
next_action: Remove seal-pulse CSS from index.html

## Symptoms

expected: Clean upper-left corner with no stray pulsing circle between LAYERS panel and Irra medallion
actual: Thin gold/copper circle outline pulses in gap between LAYERS panel and Erra/Irra medallion
errors: none reported
reproduction: Load map at default zoom in normal play (not search mode); visible upper-left near layers panel
started: reported 2026-07-01

## Eliminated

- hypothesis: Legacy frame-corner SVG circles
  evidence: .frame-corner already display:none in index.html
  timestamp: 2026-07-02

- hypothesis: Search spotlight ring persisting outside search mode
  evidence: fog.js draw section 4b gated on searchMode && spotlightPos
  timestamp: 2026-07-02

- hypothesis: Shift+M medallion editor leaves permanent handles
  evidence: destroyEditor() removes #medallion-editor on toggle off
  timestamp: 2026-06-30

## Evidence

- timestamp: 2026-07-02
  checked: index.html lines 554-566 .medallion-hot.god-locked::after
  found: seal-pulse animation with stroked border on all locked god hotspots
  implication: Irra (upper-left, always locked early game) shows pulsing ring artifact

- timestamp: 2026-07-02
  checked: syncMedallionHotspots — god-locked class applied when !isMedallionRevealed
  found: All 8 Apkallu get god-locked until threshold; Irra needs 38 discoveries
  implication: Artifact persists through entire early/mid game

## Resolution

root_cause: .medallion-hot.god-locked::after draws a pulsing 1px gold border (seal-pulse) on invisible hotspot divs. Irra's upper-left hotspot ring bleeds into the gap between the LAYERS panel and the frame medallion art during normal play.
fix: Remove god-locked ::after seal-pulse styling — hotspots stay invisible click targets; reveal pulse (spawnMedallionPulse) unchanged for active unlock moments.
verification: pending
files_changed: [index.html]
