# Ship triage — build 95 (reader magnify + cover)

**Date:** 2026-07-06  
**Target:** https://archive.intrepidgraphicnovel.com  
**Parent HEAD before attempt:** `2135ccf` Release build 94

## Outcome (recovery agent — 2026-07-06)

**COMMIT OK — DEPLOY FAILED**

| Step | Result |
|------|--------|
| Recover `reader/overlay/spike.js` + magnify integration | **OK** — reconstructed from agent transcripts + magnify-plugin API (~670 lines) |
| `apply-reader-patches.ps1` sync | **OK** |
| `node --check` (spike.js ×2, magnify-plugin.js, backer-gate.js) | **OK** |
| Git commit | **OK** — `e140c9d` on `master` |
| `netlify deploy --prod --dir .` | **FAILED** — `JSONHTTPError: Forbidden` (CLI logged in as gregersonart@gmail.com, site `aesthetic-salmiakki-cf6713`) |
| Git remote / push | **Skipped** — no `git remote` configured |

## What was recovered in spike.js

Both `reader/overlay/spike.js` and `reader/intrepid-dusk-volume-1/spike.js` (via patches):

- `ENABLE_READER_MAGNIFY = true` — plugin loads when runtime kill-switch off
- `coverSpread` — blank left + `cover-hardcover.webp` right (indices 0–1)
- `loadReaderMagnifyPlugin` / `initReaderMagnify` — mount with `root`, `getCurrentPageImage`, `getPageImageAtPoint`, `getVisibleSpreadImages`, `onDismissInTurnZone`
- `resolvePageImageAtPoint`, `getReaderReferencePageImage`, `isReaderSpreadMode`, `zoneFromBookRect`
- `isBookPageTurnZone` — per-page + book-geometry fallback for blank pages
- `blockMagnifyCenterPageFlip` on `mousedown` / `click`
- `IntrepidReaderMagnify.unmount()` on page turn + control buttons
- Cache bust: `spike.js?v=17`, `magnify-plugin.js?v=9` / `magnify-plugin.css?v=9`
- Magnify user pref: plugin `isUserEnabled()` default **off** (`null`/`"0"` → false; only `"1"` enables)

## Commit contents (`e140c9d`)

- `index.html` — `INTREPID_BUILD = 95`
- `reader/plugins/magnify/` — full V3 lens plugin (default off)
- Cover assets + manifest + backer-gate index +2
- Recovered spike.js (overlay + volume-1)
- `AGENT-HANDOFF.md` build-95 note

## Manual deploy handoff

From repo root (after verifying Netlify token/team permissions):

```powershell
cd C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map
netlify deploy --prod --dir .
```

If Forbidden persists: re-auth (`netlify login`) or deploy from Netlify dashboard drag-drop / CI linked to a remote once configured.

**Verify after deploy:**

1. Console: `[Intrepid Map] build 95`
2. Reader Issue 1 opens with **cover spread** (blank left, cover right)
3. Magnify **off** until `localStorage.intrepid_reader_magnify_enabled = "1"` or in-reader toggle

## Prior attempt notes (for context)

- First ship attempt aborted when `git checkout -- reader/overlay/spike.js` wiped uncommitted magnify + cover logic.
- Never `git checkout` on uncommitted feature files — stash instead.
