# Ship triage — build 95 (reader magnify + cover)

**Date:** 2026-07-06  
**Target:** https://archive.intrepidgraphicnovel.com  
**Parent HEAD before attempt:** `2135ccf` Release build 94

## Outcome

**SHIP ABORTED** — do not deploy current tree. Staged changes are **incomplete** without `reader/overlay/spike.js` and `reader/intrepid-dusk-volume-1/spike.js` magnify + cover integration.

## What succeeded

| Step | Result |
|------|--------|
| Environment diagnostics | Repo `C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map`, branch `master`, no `git remote` configured |
| `node --check reader/plugins/magnify/magnify-plugin.js` | OK (after fixing a bad PowerShell replace) |
| `node --check reader/overlay/spike.js` | OK (reverted file — **no magnify code**) |
| Magnify default off | `reader/plugins/magnify/magnify-plugin.js` — `isUserEnabled()` treats `null`/`"0"` as off; only `"1"` enables |
| `INTREPID_BUILD` | `index.html` → **95** (staged) |
| Staging (partial) | Plugin, cover assets, manifest, backer-gate index shift, handoff note, index cache bumps |

## What failed

### 1. CRITICAL — spike.js integration lost

At start of ship, `git status` showed **modified** (uncommitted):

- `reader/intrepid-dusk-volume-1/spike.js`
- `reader/overlay/spike.js`

During magnify default-off edits, `git checkout -- reader/intrepid-dusk-volume-1/spike.js reader/overlay/spike.js` was run to recover from a corrupted replace. That **discarded uncommitted magnify + cover spread logic** (never in git history; `git log -S ENABLE_READER_MAGNIFY` is empty).

**Current spike.js:** ~308 lines, no `ENABLE_READER_MAGNIFY`, no `cover-hardcover` in `pageEntries`, no `loadReaderMagnifyPlugin`.  
**index.html** still references `spike.js?v=17` (staged) — cache bust without matching code.

### 2. No git remote

`git remote -v` returns nothing. `AGENT-HANDOFF.md` has no GitHub URL. Push skipped.

### 3. Netlify deploy

Not run (blocked on incomplete reader).

### 4. Shell quirk (documented)

Initial `pwd && git status` invocations returned **"no exit status"** without output. Retrying with PowerShell `Set-Location` and `required_permissions: ["all"]` worked.

## Current git state (end of attempt)

```
git log -1 --oneline  → 2135ccf (commit NOT created)
```

**Staged for commit (incomplete):**

- `AGENT-HANDOFF.md` — audit section + build-95 / magnify notes
- `index.html` — `INTREPID_BUILD = 95`
- `reader/backer-gate.js` — issue page index boundaries +2 for cover pages
- `reader/intrepid-dusk-volume-1/assets/manifest.json` — `cover-hardcover` entry
- `reader/intrepid-dusk-volume-1/assets/pages/cover-hardcover.{webp,jpg}`
- `reader/intrepid-dusk-volume-1/index.html`, `styles.css` — minor
- `reader/overlay/index.html` — cache bust only
- `reader/plugins/magnify/magnify-plugin.{js,css}`

**NOT staged / missing for build 95:**

- `reader/overlay/spike.js` — **must restore magnify + cover**
- `reader/intrepid-dusk-volume-1/spike.js` — copy from overlay via `apply-reader-patches.ps1`

**Uncommitted spike state:** matches `2135ccf` (no magnify).

## Files that SHOULD be in build 95

1. `reader/plugins/magnify/` (full plugin, default off in `isUserEnabled`)
2. `reader/overlay/spike.js` — source of truth: cover spread + `ENABLE_READER_MAGNIFY`, `loadReaderMagnifyPlugin` (`?v=10`), `initReaderMagnify`, `elements.readerRoot`, page-turn coordination with `IntrepidReaderMagnify.getPageZone`
3. `reader/intrepid-dusk-volume-1/spike.js` — same as overlay after patches
4. Cover assets + manifest (staged)
5. `reader/backer-gate.js` boundaries (staged) — depends on cover adding 2 flip indices
6. `index.html` build 95; `fog.js?v=94` unchanged OK
7. `AGENT-HANDOFF.md` brief magnify note (staged)

## Manual recovery for Claude Code

1. **Recover spike.js first** (highest priority):
   - Check Cursor/VS Code **Local History** / unsaved buffers for `reader/overlay/spike.js` from this session.
   - If parent chat or another agent still has the file, paste back — expect ~400+ lines with magnify hooks (grep: `ENABLE_READER_MAGNIFY`, `loadReaderMagnifyPlugin`, `readerRoot`, `cover-hardcover`).
   - Do **not** run `git checkout` on spike until committed.

2. **Re-apply magnify default off** (if rebuilding spike):
   - Plugin: `stored === null || stored === "0"` → false; only `"1"` enables.
   - Spike: `isReaderMagnifyEnabled()` — user wanted feature **loaded** (`ENABLE_READER_MAGNIFY = true`) but preference default off; ensure `loadReaderMagnifyPlugin` still runs when flag true, and `mount({ enabled: true, root: document.querySelector(".reader"), ... })`.

3. **Cover spread in `pageEntries`:** prepend 2 flip pages using `./assets/pages/cover-hardcover.webp` (2200×3348 spread); align with backer `startIndex`/`endIndex` already staged (+2 for issue 001).

4. **Sync deploy target:**
   ```powershell
   .\apply-reader-patches.ps1
   node --check reader/overlay/spike.js
   node --check reader/intrepid-dusk-volume-1/spike.js
   ```

5. **Commit** (only ship-worthy paths; exclude `.tmp/`, zips):
   ```
   Release build 95 — reader magnify plugin, cover spread, magnify default off
   ```

6. **Remote (optional):** add `origin` if John provides URL; else deploy from local only.

7. **Deploy:**
   ```powershell
   netlify deploy --prod --dir .
   ```
   Site: `aesthetic-salmiakki-cf6713` → archive.intrepidgraphicnovel.com

8. **Verify:** console `[Intrepid Map] build 95`; reader Issue 1 opens with **cover spread**; magnify **off** until user sets `localStorage.intrepid_reader_magnify_enabled = "1"` or uses in-reader toggle if present.

## Top blockers

1. **Lost uncommitted `spike.js`** (magnify + cover) — ship cannot proceed.
2. **No git remote** — no push; deploy-only path.
3. **Staged partial commit** — committing now would ship cover assets + backer indices **without** reader logic (broken page indices / no cover UI).

## Agent mistake to avoid

Never `git checkout --` on files with uncommitted feature work. Use targeted edit or stash (`git stash push -m "spike magnify" -- reader/overlay/spike.js`) before recovery attempts.

