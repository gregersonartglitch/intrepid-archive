---
status: awaiting_human_verify
trigger: "Tower location labels stacked on top of each other — regression from tower cluster work"
created: 2026-07-01T12:00:00Z
updated: 2026-07-01T12:05:00Z
---

## Current Focus

hypothesis: CONFIRMED — tight cluster coords + weak labelStyleOverrides stack three labels at same screen pixel
next_action: Human verify fanned labels at tower cluster

## Symptoms

expected: Tower of the Nine, Lunar Clock, Maxim Stone labels readable and fanned near tower cluster
actual: THE MAXIM STONE, LUNAR CLOCK, TOWER OF THE NINE overlapping vertically at tower
errors: none
reproduction: Discover tower-nine; peek reveals maxim-stone + lunar-clock; observe label stack
started: After tower cluster coord tightening (tower-cluster-visual fix)

## Resolution

root_cause: All three labels share ~same Leaflet anchor with transforms differing only ~20% horizontally and all positioned above (calc(-100% - Npx)); ~25 map-unit coord spread is smaller than label height
fix: Fan labels with distinct directions — lunar-clock above-left (translate -100% -24px, -44px), tower-nine centered above, maxim-stone below-right (+22px,+30px); split tower-nine and maxim-stone names to two lines
verification: Code review; fog.js unchanged; markers/coords untouched
files_changed: [index.html]
