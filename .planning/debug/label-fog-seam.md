---
status: fixing
trigger: "Label pile-up, label gap from dot, fog vertical seam on map"
created: 2026-07-02T00:00:00Z
updated: 2026-07-02T00:00:00Z
---

## Current Focus

hypothesis: "Labels stack because iconSize [0,0] divIcons fail Leaflet position updates at some zoom levels; maxim-stone gap from mismatched dot center vs label anchor; fog seam from Pass 3 clearFogPolygon hard polygon edges (region reveal)"
test: "Fix pin wrapper + iconSize [1,1]; soften polygon clear; DPR canvas sizing; verify draw after resize"
expecting: "Labels stay at own lat/lng; 6px gap from dots; no vertical fog cut line"
next_action: Apply fixes to index.html and fog.js

## Symptoms

expected: Labels anchored ~4-8px from own dot; no vertical fog seam
actual: Labels stack in one column at some zoom; maxim-stone label far from dot; harsh vertical fog boundary on right
errors: none
reproduction: Load map, zoom journey area / tower cluster
started: user report with screenshots

## Resolution

root_cause: "Labels: iconSize [0,0] divIcons collapse Leaflet positioning at some zoom levels — markers stop tracking lat/lng and stack; inner label CSS used position:relative on zero-size parent. Maxim-stone gap: lbl-dir-below-right from dot center is correct but prior 0×0 anchor made offset unreliable. Fog seam: Pass 3 clearFogPolygon used hard polygon fill (destination-out) leaving straight vertical edges at region boundaries (e.g. eastern-empire); canvas sizing lacked DPR sync."
fix: "mk-label-pin wrapper + iconSize [1,1] + absolute label offsets from pin; 6px --label-gap default; maxim-stone keeps lbl-dir-below-right only; clearFogPolygon feathered with zoom-scaled blur; syncFogCanvasSize with devicePixelRatio; FogSystem.draw() after invalidateSize"
verification: "node --check fog.js; code review of anchor chain dot center → pin → label transform"
files_changed: [index.html, fog.js]
