# Map Perf Audit — Playtest Hardening (build 177)

## Root cause (audit)

Sluggish map feel was **not** Sabella letters or cuneiform UI. Continuous work came from:

1. `startDrift()` calling full `draw()` every animation frame (~60fps)
2. Dual fog texture tile loops every frame
3. Uncapped `devicePixelRatio` fog canvas (HiDPI fill cost)
4. Leaflet `move` / `zoom` / `resize` each calling `draw` (often multiple per gesture)

## Shipped (build 177)

| Win | Behavior | Flag / key |
|-----|----------|------------|
| Cap idle drift | ~20 FPS when idle; pause while `document.hidden` | `ENABLE_MAP_PERF` (default **true**); kill: `localStorage intrepid_map_perf_disabled=1` |
| Full rate kept | Search lantern, reveal ceremony, fog-wave, guide pulse, constellation draw-in | (automatic via `needsFullRateDraw`) |
| Cap fog DPR | `min(devicePixelRatio, 1.5)` desktop; `1` on coarse/mobile | same `ENABLE_MAP_PERF` |
| Single texture idle | Dual counter-drift only during full-rate modes | same |
| Coalesce Leaflet redraws | One RAF per frame for move/zoom/resize | always on (no visual change) |
| Gate lightning | Tower bolts + perimeter lightning + their `shadowBlur` | `ENABLE_MAP_ATMOSPHERE` default **false**; enable `?mapatmo` or `localStorage intrepid_map_atmo_enabled=1`; disable `intrepid_map_atmo_disabled=1` |

## Skipped

- **Beacon eligibility cache** — high risk of desync with `isClickable()` / glow rules. Deferred until a safer invalidation design exists.

## Not touched

- Reader page-lifecycle stays **OFF** (`ENABLE_PAGE_LIFECYCLE = false`)
- Glow ↔ clickable invariants, tutorial gate, golden glow, password eyeballs

## Residual risks

- Idle fog breath is slightly less smooth at 20 FPS (intentional)
- Idle fog uses one texture layer (dual only at full-rate); hard tile seams softened via feathered soft-tile cache (build 189+) — dual still restores richer counter-drift in search/reveal
- Lightning/perimeter storms off until `?mapatmo` or LS opt-in — Tower wisps still draw
- Reveal/wave still drive their own RAF `draw()` (by design; drift skips those frames)
