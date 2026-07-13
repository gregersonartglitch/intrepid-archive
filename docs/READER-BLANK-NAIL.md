# Reader Blank Pages — Nail in the Coffin

**Build:** 179 (reader `PAGE_ASSET_VERSION` / `spike.js?v=`; map shell `INTREPID_BUILD` 181)  
**Default path:** `ENABLE_PAGE_LIFECYCLE = false` (legacy loader). Do **not** re-enable lifecycle as default without a separate proven fix.  
**Prod:** https://archive.intrepidgraphicnovel.com/reader/intrepid-dusk-volume-1/  
**Stress:** `node scripts/stress-reader-issue-boundaries.mjs [url]`

---

## Root cause (proved)

Issue 1 speed-clicks looked fine; Issue 2+ went blank. Not missing assets (Issue 2/3 WebPs are 200). Stacked failures on the **legacy** path:

1. **Warm-queue cancel** — `queueBackgroundWarm` cleared its timer and restarted. With Issues 2+3 unlocked, Issue 3 warm aborted Issue 2 mid-trickle → Issue 2 pages stayed `src`-less until flip time.
2. **Uncapped flood** — every flip called neighborhood + `preloadAround` + optional `<link rel=preload>`, while background also warmed later issues → browser connection pool starved the page you’re looking at.
3. **`.is-loading img { opacity: 0 }`** — healthy in-flight WebPs rendered as a dark/paper **void**, indistinguishable from a dead reader (especially Firefox).
4. **Soft timeout cleared loading without fail UI** — late/starved loads could leave a transparent empty `<img>` with no Retry.
5. **Build 179 add-on:** `naturalWidth > 0` without `complete` cleared Loading / settled soft-true — StPageFlip could sample an incomplete bitmap → half-white. Plus Netlify `max-age=0,must-revalidate` on ~1MB page WebPs forced constant revalidation jank.

Lifecycle P0 (decode hang / Loading stuck) made this worse and stays **default OFF**.

---

## Invariants (do not regress)

| # | Invariant |
|---|-----------|
| 1 | Lifecycle stays **default OFF** until separately proven. |
| 2 | Warm ranges **append** (Issue 1 → 2 → 3). Never cancel an earlier range when a later issue unlock warm starts. |
| 3 | **Concurrency cap** (`LEGACY_MAX_IN_FLIGHT`, neighbors may use `+ LEGACY_NEIGHBOR_BURST`). Background never assigns `src` while the visible neighborhood needs bandwidth. |
| 4 | **Visible spread (±1) always gets eager + src + high fetchPriority**; watchdog retries then **failed + Retry** if still blank. |
| 5 | Never leave a visible page as a permanent void: paint art (`complete && naturalWidth > 0`) **or** explicit `is-failed` + Retry. Do **not** use `opacity: 0` on loading imgs. Do **not** clear Loading on `naturalWidth` alone. |
| 6 | No orphan `<link rel=preload>` flood on the legacy path (does not guarantee StPageFlip DOM paint; re-starves the pool). |
| 7 | Soft background settle must **not** clear `is-loading` into a void; late `load` may still paint. |
| 8 | Keep **StPageFlip** `loadFromHTML`. |
| 9 | Page WebPs under `/reader/.../assets/pages/*` use long-lived immutable `Cache-Control`; bust via `?v=PAGE_ASSET_VERSION`. |

---

## What build 178 does

- Append-only background warm chain through unlocked issues  
- Priority lanes: visible > neighbor (burst-capped) > background  
- Visible watchdog (`VISIBLE_WATCHDOG_MS`) → cache-bust retry → fail+Retry  
- Loading UI: paper underlay + overlay text; **img opacity 1** so bytes paint immediately  
- Stress script asserts painted visible pages across Issue 1→2→3 boundaries  

## What build 179 adds

- Immutable caching headers for page assets (`netlify.toml`)  
- Honest ready gate: `complete && naturalWidth > 0`; guarded `decode()` with 1.2s timeout for visible/near-visible (timeout falls back to complete+width — no infinite Loading)  
- Stress pixel-sample (top vs bottom thirds) to catch half-white  
- **Deferred (not this pass):** reader-sized derivative WebPs for lighter flip payloads — do not build a full derivative pipeline yet  

---

## What NOT to do again

- Unveil / `VEIL_HARD_DEADLINE_MS` band-aids for mid-book blanks  
- Setting `OPENING_READY_LAST_INDEX` to the whole book  
- Re-enabling page-lifecycle as default without butter-level stress green  
- Restoring `opacity: 0` on `.is-loading img`  
- Restoring cancel-and-replace warm queues or uncapped link preloads  
- Declaring painted / clearing Loading on `naturalWidth > 0` without `complete`  

---

## Verify before claiming fixed

```bash
npx -y http-server . -p 8080 --cors -c-1
node scripts/stress-reader-issue-boundaries.mjs http://127.0.0.1:8080/reader/intrepid-dusk-volume-1/
node scripts/stress-reader-issue-boundaries.mjs https://archive.intrepidgraphicnovel.com/reader/intrepid-dusk-volume-1/
```

Expect `ok: true`, `hasLifecycle: false`, each boundary `pass: true` with `complete`, `naturalWidth > 0`, and `pixelOk: true` (no half-white).
