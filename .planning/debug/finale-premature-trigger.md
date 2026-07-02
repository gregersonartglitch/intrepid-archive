---
status: verifying
trigger: "Finale overlay appeared before indras-na chime discovery completed"
created: 2026-07-01T00:00:00Z
updated: 2026-07-01T00:00:00Z
---

## Current Focus

hypothesis: updateProgress counts phase:'searching' as journey complete, firing checkJourneyFinale on amber-star click
test: isFullyDiscovered helper excludes searching phase from journey/vol1 counts
expecting: finale only after completeDiscovery sets phase:'complete'
next_action: human verify in browser

## Symptoms

expected: Finale only after user clicks and completes discovery of indras-na (chime key found)
actual: "THE ARCHIVE IS COMPLETE" overlay appeared when chime hotspot started (phase searching)
errors: none
reproduction: Complete all territories/sites, click indras-na amber star, observe finale before finding key
started: reported by user

## Eliminated

## Evidence

- timestamp: 2026-07-01
  checked: discoverLocation for journey path cities (indras-na)
  found: Sets discovered[id] = { phase: 'searching' } then calls updateProgress()
  implication: Journey step counted as found before chime complete

- timestamp: 2026-07-01
  checked: updateProgress journeyFound line 2548
  found: `!!discovered[s.locationId]` counts any phase including searching
  implication: checkJourneyFinale(8,8) fires on first click of final stop

- timestamp: 2026-07-01
  checked: completeDiscovery
  found: Sets phase:'complete' — correct finale trigger point
  implication: Fix should gate finale on complete phase only

## Resolution

root_cause: journeyFound and vol1Found in updateProgress treated phase:'searching' as a completed discovery. Clicking indras-na (amber star) enters chime search mode and immediately satisfied journeyFound === journeyTotal, triggering checkJourneyFinale before completeDiscovery.
fix: Added isFullyDiscovered(locId) helper; journeyFound, vol1Found, and isPathComplete now require phase !== 'searching'
verification: node --check fog.js passes
files_changed: [fog.js]
