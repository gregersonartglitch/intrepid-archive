---
status: awaiting_human_verify
trigger: "Lunar Clock moved outside tower visually — cluster coords spread too far for click fix"
created: 2026-06-30T16:00:00Z
updated: 2026-06-30T16:05:00Z
---

## Current Focus

hypothesis: CONFIRMED — spread coords moved markers off tower art
next_action: Human verify visual cluster + clicks still work

## Symptoms

expected: Tower of the Nine, Maxim Stone, Lunar Clock stay visually associated with tower cluster
actual: Lunar Clock label floats in mountains — lunar-clock coords too far from tower
errors: none
reproduction: Discover tower-nine; peek reveals maxim-stone + lunar-clock; observe marker/label positions
started: After click-overlap fix spread cluster coords

## Resolution

root_cause: Click-fix spread maxim-stone to (4478,4168) and lunar-clock to (4640,4055) ~80+ units from tower-nine (4563,4113)
fix: Tight cluster — lunar-clock (4563,4088) above tower, maxim-stone (4590,4135) below-right; per-location labelStyleOverrides fan text
verification: fog.js not edited; coords verified in data.js
files_changed: [data.js, index.html]
