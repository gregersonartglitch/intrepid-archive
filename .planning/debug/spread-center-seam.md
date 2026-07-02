---
status: investigating
trigger: "User reports spread center seam still very noticeable after fix — verify patches deployed, identify pages, pixel-compare"
created: 2026-07-01T00:00:00Z
updated: 2026-07-01T12:00:00Z
---

## Current Focus

hypothesis: "Battle spread seam (flying ships) is page-009/page-010 panoramic top panel — asset export split without spine bleed; CSS patches ARE deployed but index.html has no cache-bust so stale browser cache may still serve pre-fix CSS"
test: "SHA256 overlay vs deployed; Pillow edge pixel diff; visual stitch previews"
expecting: "Deployed files match; 9-10 shows continuous art broken at seam with color mismatch"
next_action: "Recommend hard refresh + cache-bust; Codex re-export pages 9-10 as single spread"

## Symptoms

expected: Facing pages in spread view meet flush edge-to-edge with no visible seam
actual: Very noticeable vertical seam/gap runs down center where left and right pages meet (battle spread, flying ships, top panel)
errors: none
reproduction: Open reader in spread/landscape view on battle scene spread (flying ships)
started: user report after prior CSS fix

## Eliminated

- hypothesis: drawBookShadow canvas spine shadow causes seam in HTML reader
  evidence: loadFromHTML uses class w render; drawFrame calls drawLeftPage/drawRightPage only, never drawBookShadow
  timestamp: 2026-07-01

- hypothesis: Patches not deployed to reader/intrepid-dusk-volume-1
  evidence: SHA256 identical for overlay vs deployed styles.css, spike.js, index.html (2026-07-01)
  timestamp: 2026-07-01

- hypothesis: page-010/page-011 is the flying-ships continuous spread
  evidence: Visual inspection — 010/011 are different layouts (creature splash vs paneled page); ships panorama is page-010 right half continuing from page-009 left (wing)
  timestamp: 2026-07-01

## Evidence

- timestamp: 2026-07-01
  checked: certutil SHA256 overlay vs intrepid-dusk-volume-1 for styles.css, spike.js, index.html
  found: All three MATCH exactly
  implication: apply-reader-patches.ps1 not needed; repo has current fix

- timestamp: 2026-07-01
  checked: index.html script/link tags
  found: ./styles.css and ./spike.js with NO ?v= cache-bust query
  implication: Browser may serve stale pre-fix CSS/JS after deploy

- timestamp: 2026-07-01
  checked: Pixel compare top 35% seam (20px edge strips), all page pairs
  found: page-009/010 top seam 49.2; page-010/011 76.9; page-011/012 19.6. Worst tops: 067/068 221.9, 042/043 173.6, 008/009 127.8
  implication: Multiple asset mismatches; 9-10 moderate diff but visually severe (continuous panoramic art)

- timestamp: 2026-07-01
  checked: Visual stitch previews (.planning/debug/battle-seam-009-010.jpg)
  found: Horizontal light streak and sky gradient break at center; left muted orange vs right bright yellow battle/ships — continuous art clearly split wrong
  implication: Codex must export pages 9-10 as single spread with spine bleed for top panel

- timestamp: 2026-07-01
  checked: Deployed CSS values in styles.css
  found: object-fit cover, 1px --left/--right overlap, black backgrounds, no canvas border; spike.js maxShadowOpacity 0.25
  implication: Render-side fixes applied; remaining seam on 9-10 is not fixable with more overlap alone

## Resolution

root_cause: "CSS/render fixes ARE deployed in repo. User may see old styles via browser cache (no ?v= on assets). Battle spread with flying ships is page-009 + page-010 (issue 1 pp 9-10): panoramic top panel is continuous art split across two exports without matching spine bleed — visible color/gradient break at seam (not a CSS gap). page-010/011 is a different spread (not continuous)."
fix: "User: hard refresh (Ctrl+Shift+R) or add ?v=2 cache-bust to index.html. Codex: re-export issue-001 pages 9-10 as single spread with shared bleed. Optional: bump overlap 1px→2px for hairline only (won't fix 9-10 color break)."
verification: "SHA256 match + pixel analysis + visual stitch confirms asset root cause for battle spread"
files_changed: []
