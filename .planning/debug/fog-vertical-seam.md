---
status: awaiting_human_verify
trigger: "Harsh vertical fog boundary on right side of circular map — dark fog with straight edge through interior, labels like THE GATES at the line"
created: 2026-07-02T19:00:00Z
updated: 2026-07-02T19:05:00Z
symptoms_prefilled: true
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Pass 3 clearFogPolygon() uses hard destination-out fill with alpha=1, producing perfectly straight polygon edges; eastern-empire region has near-vertical east boundary at lng~4446 through lat 3430-4112, coinciding with The Gates (lat 4132, lng 4376)"
  confirming_evidence:
    - "clearFogPolygon fills with rgba(0,0,0,1) — no feathering"
    - "regions.json eastern-empire edge lng~4446 lat 3430-4112 is nearly vertical (dLng 20, dLat 682)"
    - "the-gates is in eastern-empire lore_ids; discovering any site in region triggers full polygon clear"
    - "Symptom matches hard polygon boundary: clear left (inside polygon), fog right (outside)"
    - "Radial clears in Pass 1/2 use gradient stops — never produce infinite straight vertical seam"
  falsification_test: "Feather polygon clear with ctx.filter blur; seam at eastern-empire boundary should soften to natural fade"
  fix_rationale: "Blur the polygon erase mask so region boundaries feather into surrounding fog instead of cutting a ruler-straight line"
  blind_spots: "Canvas clientWidth mismatch not fully browser-tested; clip-path on #map should inherit to fog canvas"

hypothesis: CONFIRMED — hard polygon clear from Pass 3 (stronghold-region-fog fix)
next_action: Feather clearFogPolygon + use getBoundingClientRect for canvas sizing

## Symptoms

expected: Fog fades naturally with soft radial boundaries; no straight vertical seam through map interior
actual: Harsh vertical boundary on RIGHT side — dark smoky fog with perfectly straight vertical edge; left clearer; THE GATES label sits at the line
errors: none
reproduction: Load map with eastern-empire region revealed (any lore site discovered); view area near The Gates
started: user screenshot report

## Eliminated

- hypothesis: CSS clip-path on #map creates straight vertical cut
  evidence: clip-path is ellipse(), not vertical line; seam is interior not at frame edge
  timestamp: 2026-07-02

- hypothesis: frame-torch-overlay mask causes fog seam
  evidence: torch overlay is z-index 511 on frame art, separate from fog canvas z-index 450
  timestamp: 2026-07-02

- hypothesis: Canvas not resized on zoom/pan leaves unfilled strip
  evidence: draw() fills fillRect(0,0,w,h) each frame; seam aligns with region polygon lng~4446 not canvas edge
  timestamp: 2026-07-02

## Evidence

- timestamp: 2026-07-02
  checked: fog.js clearFogPolygon + draw Pass 3
  found: Hard fillStyle rgba(0,0,0,1) polygon erase with no edge feather
  implication: Region boundaries render as razor-straight lines on fog canvas

- timestamp: 2026-07-02
  checked: regions.json polygon analysis near the-gates
  found: eastern-empire vertical edge at lng~4446, lat 3430-4112; the-gates at lat 4132 lng 4376 inside polygon
  implication: Revealed eastern-empire produces vertical fog seam exactly where user reports

- timestamp: 2026-07-02
  checked: .planning/debug/stronghold-region-fog.md
  found: Pass 3 polygon clear added recently to fix label occlusion
  implication: Regression side-effect — hard polygon mask replaces soft radial-only clears

## Resolution

root_cause: Pass 3 clearFogPolygon() erases fog with a hard-edged polygon fill (alpha=1, no feather). When a region like eastern-empire is revealed, the polygon boundary — including a near-vertical east edge at lng ~4446 — cuts a perfectly straight line through the fog canvas. The Gates sits at that boundary, matching the user screenshot.
fix: Feather polygon erase via zoom-scaled ctx.filter blur; size fog canvas from getBoundingClientRect; redraw fog after frame resize
verification: node --check fog.js passes; clearFogPolygon feathered; syncFogCanvasSize implemented with DPR; draw() already called after invalidateSize in updateFrameRect
files_changed: [fog.js, index.html]
