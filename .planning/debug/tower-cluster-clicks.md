---
status: awaiting_human_verify
trigger: "Tower cluster hotspots overlap — middle point (tower-nine) blocked by lunar-clock / maxim-stone"
created: 2026-06-30T14:00:00Z
updated: 2026-06-30T14:10:00Z
---

## Current Focus

hypothesis: CONFIRMED — overlapping Leaflet dots stole clicks via z-order
next_action: Human verify tower cluster clicks in browser

## Symptoms

expected: All three glowing tower cluster sites clickable at their visible glow positions
actual: Clicking middle hotspot (Tower of the Nine) often blocked or wrong site selected
reproduction: Discover tower-nine, peek reveals maxim-stone + lunar-clock; click each yellow glow

## Resolution

root_cause: Dual click paths — 48×48 Leaflet dot markers captured clicks before fog.js closest-distance resolver
fix: Fog mode markers non-interactive; dot CSS pointer-events none except edit mode; spread cluster coords
files_changed: [index.html, fog.js, data.js]
