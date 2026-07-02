---
status: awaiting_human_verify
trigger: "Click lag ~1s — reveal AND audio delayed together on map + UI button clicks"
created: 2026-06-30T16:00:00Z
updated: 2026-06-30T16:30:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Document capture click handler ran sync startAmbient (96k-sample noise buffer) + full isClickable proximity scans BEFORE UI early-return and discoverLocation, blocking main thread ~1s"
  confirming_evidence:
    - "ensureAudio/startAmbient were lines 343-344, UI skip at 360 — every click paid ambient init cost in capture phase before target handlers"
    - "startAmbient fills audioCtx.sampleRate*2 noise buffer synchronously on first click"
    - "getFallbackTerritoryId() recomputed inside territoryHasGlow for every territory on every isClickable call"
    - "gate submitPassword had setTimeout(completeAuth, 850) — UI-only ~1s delay"
  falsification_test: "If reorder/defer doesn't restore instant reveal, blocking work is elsewhere"
  fix_rationale: "UI bail first; defer startAmbient to next tick; cache fallback territory; remove gate delay; resume-then-play ping"
  blind_spots: "Not browser-profiled; landing clicks when map null already returned early"

next_action: Human verify in browser

## Symptoms

expected: Immediate reveal + chime on location click; immediate UI button response
actual: ~1 second jank before reveal and audio fire together
errors: none reported
reproduction: Click glowing location OR UI buttons (landing, gate, panels, welcome, ambient toggle)
started: After tower cluster / fog.js click handler changes

## Eliminated

- hypothesis: AudioContext resume alone caused perceived lag without blocking reveal
  evidence: User clarified reveal and audio delayed together — synchronous main-thread block before discoverLocation
  timestamp: 2026-06-30T16:05:00Z

## Evidence

- timestamp: 2026-06-30T16:10:00Z
  checked: fog.js setupClickHandler order
  found: ensureAudio + startAmbient before UI skip and before proximity/discoverLocation
  implication: Capture-phase handler blocked all click feedback including UI buttons after map init

- timestamp: 2026-06-30T16:12:00Z
  checked: startAmbient noise layer
  found: Loop over sampleRate*2 (~96000) samples synchronously
  implication: First map click pays heavy sync cost before any reveal

- timestamp: 2026-06-30T16:15:00Z
  checked: index.html submitPassword
  found: setTimeout(completeAuth, 850)
  implication: Gate button intentionally delayed ~1s independent of fog handler

## Resolution

root_cause: Document capture click handler initialized full ambient soundscape synchronously and ran proximity isClickable scans before UI early-return and discoverLocation; gate auth also delayed 850ms
fix: Reorder handler (UI skip first), defer startAmbient via setTimeout(0), cache getFallbackTerritoryId per discovery count, resume-then-play in playPing, remove gate 850ms delay
verification: node --check fog.js passes; tower cluster fix unchanged (interactive EDIT_MODE only, proximity resolver intact)
files_changed: [fog.js, index.html]
