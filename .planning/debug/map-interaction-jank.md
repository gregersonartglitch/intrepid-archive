---
status: awaiting_human_verify
trigger: "Sluggish/staggery map interactions — perceptual cursor-attached UI vs real perf"
created: 2026-07-01T12:00:00Z
updated: 2026-07-01T12:05:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Perceived sluggishness is cursor-linked UI: whisper panel opacity still recalculated every draw() frame from mouse distance, and frame-torch CSS mask rebuilds on every mousemove"
  confirming_evidence:
    - "Whisper panel is fixed left but updateWhisperPanel sets inline opacity from cursor-distance wAlpha inside draw() RAF loop"
    - "lastMousePos updated on every mousemove solely to drive whisper proximity in draw()"
    - "frame-torch-overlay rebuilds mask-image string on every mousemove with no throttle"
  falsification_test: "If decoupling whispers from cursor + throttling torch mask removes stutter feel, hypothesis confirmed"
  fix_rationale: "Viewport-center whispers updated on map moveend only; panel show/hide via CSS class; torch mask coalesced to one RAF per frame"
  blind_spots: "Search-mode spotlight still follows cursor by design; not browser-profiled"

next_action: Implement whisper decouple + torch RAF throttle

## Symptoms

expected: Smooth map pan/zoom/click; whispers readable without cursor-chase feel
actual: Sluggish, staggery interactions; may be perceptual from cursor-attached UI
errors: none
reproduction: Pan map, move mouse over frame/fog, approach whisper locations
started: After recent fog.js handler / overlay changes

## Eliminated

- hypothesis: Canvas still draws whisper text at cursor
  evidence: Section 7 only calls updateWhisperPanel; no fillText for whispers
  timestamp: 2026-07-01T12:02:00Z

## Evidence

- timestamp: 2026-07-01T12:01:00Z
  checked: fog.js draw() section 7, updateWhisperPanel
  found: Whisper opacity tied to lastMousePos distance, updated every RAF frame
  implication: Fixed-left panel still feels cursor-attached

- timestamp: 2026-07-01T12:02:00Z
  checked: index.html frame-torch mousemove
  found: buildMask + maskImage set on every mousemove event
  implication: Large visual overlay repaints with cursor = perceptual stutter

## Resolution

root_cause: Whisper panel decoupled from cursor position visually but not behaviorally (per-frame opacity from mouse proximity in draw loop); torch overlay mask follows pointer unthrottled
fix: Viewport-center whisper updates on map moveend/zoomend; CSS-only panel visibility; remove whisper work from draw(); RAF-throttle torch mask
verification: node --check fog.js passes; whispers decoupled from draw loop and cursor; torch mask RAF-throttled; canvas resize guarded
files_changed: [fog.js, index.html]
