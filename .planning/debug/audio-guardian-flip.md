---
status: awaiting_human_verify
trigger: "Fix no ambient audio, guardian popup leak, instant page-flip MP3"
created: 2026-07-01T00:00:00Z
updated: 2026-07-01T00:00:00Z
---

## Current Focus

hypothesis: confirmed — three independent root causes fixed
next_action: human verify on deploy

## Resolution

root_cause: |
  1) Reader ambient used absolute /assets/ path without bundling MP3 in reader package; autoplay blocked without gesture unlock.
  2) syncMedallionHotspots exempted Tetrad guardians from god-locked, so tooltips showed dataset role/lore at game start.
  3) Page flip SFX used procedural WebAudio on flip event (post-animation), not preloaded MP3 on pointerdown.
fix: |
  Self-contained reader audio assets + relative paths + preload; fog.js preload + gesture unlock; guardians use isMedallionRevealed for god-locked; page-flip.mp3 on pointerdown/click.
verification: node --check fog.js pass; apply-reader-patches.ps1 deployed 6 files including both MP3s
files_changed: [fog.js, index.html, reader/overlay/audio.js, reader/overlay/spike.js, reader/overlay/index.html, apply-reader-patches.ps1, reader/overlay/assets/audio/ambient.mp3, reader/overlay/assets/page-flip.mp3]
