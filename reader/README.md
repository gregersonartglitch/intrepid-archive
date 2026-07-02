# Reader integration workflow

The Intrepid Dusk Volume 1 reader ships from Codex as a self-contained package. This repo deploys it under `reader/intrepid-dusk-volume-1/` and applies **site-specific overlay** files so local UI fixes survive every re-integration.

## Quick start (after Codex sends a new zip)

1. Place the upload package in the repo root:
   - `intrepid-dusk-volume-1-reader-upload.zip`, or
   - `intrepid-dusk-volume-1-reader-upload/` folder
2. Run from repo root:
   ```powershell
   .\integrate-reader.ps1
   ```
3. Test: `npx http-server . -p 8080 --cors -c-1` → http://localhost:8080/reader/

`integrate-reader.ps1` extracts the Codex package, replaces `reader/intrepid-dusk-volume-1/`, then automatically runs `apply-reader-patches.ps1`.

To re-apply overlay only (no zip re-extract):

```powershell
.\apply-reader-patches.ps1
```

## What Codex owns vs what we own

| Location | Owner | Contents |
|----------|-------|----------|
| `reader/intrepid-dusk-volume-1/assets/` | **Codex** | WebP pages, `manifest.json` |
| `reader/intrepid-dusk-volume-1/vendor/` | **Codex** | `page-flip.browser.js` |
| `reader/index.html` | **This site** | Auth gate (password / localStorage) |
| `reader/overlay/index.html` | **This site** | Archive link, no Decision Gate / debug sidebar |
| `reader/overlay/styles.css` | **This site** | Flex header, viewport-fit layout |
| `reader/overlay/spike.js` | **Merged** | Codex spacer logic + our viewport/UI code |

### Codex should ship

- Page assets (`assets/pages/page-*.webp`, `manifest.json`)
- Vendor library (`vendor/page-flip.browser.js`)
- Base reader shell if structure changes (we overlay our copies anyway)
- `spike.js` changes to **content logic** (issue page counts, spacer slots, page paths)

### Tell Codex *not* to customize for this site

- No "← Archive" link or Hollowlands nav — we add that in overlay `index.html`
- No Decision Gate / debug sidebar — removed in overlay
- Viewport sizing (`fitBookToStage`, `autoSize: false`, `ResizeObserver`) — we maintain in overlay `spike.js`
- Header flex layout / mobile breakpoints — overlay `styles.css`

## Maintaining `overlay/spike.js`

Overlay `spike.js` is the **full working file**, not a partial patch. It must include:

1. **From Codex:** `issuePageCounts`, spacer entries in `pageEntries`, asset paths
2. **From us:** `fitBookToStage()`, `autoSize: false`, `ResizeObserver`, stage padding math

When Codex updates `spike.js` (new spacers, page counts, paths):

1. Run `integrate-reader.ps1` (deploys fresh Codex package)
2. Diff Codex `spike.js` against `reader/overlay/spike.js`
3. Merge Codex content changes into `reader/overlay/spike.js`
4. Run `.\apply-reader-patches.ps1` to deploy merged file

Our viewport/UI blocks to preserve when merging:

- `getStagePadding()`, `fitBookToStage()`
- `createPageFlip()` sizing: `autoSize: false`, spread logic, `fitBookToStage()` call
- `handleStageResize()` + `ResizeObserver` / resize fallback

## Directory layout

```
reader/
  index.html              ← auth gate (never overwritten by integrate)
  overlay/                ← our patches (source of truth for site UI)
    index.html
    styles.css
    spike.js
  intrepid-dusk-volume-1/ ← Codex package + overlay applied (deploy target)
    assets/
    vendor/
    index.html            ← overwritten from overlay
    styles.css            ← overwritten from overlay
    spike.js              ← overwritten from overlay
```
