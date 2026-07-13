# Reader Loading Triage Handoff (Codex + Fable)

**Date:** 2026-07-13  
**Scope:** Volume 1 reader only — persistent blank / stuck-loading / half-white pages.  
**Audience:** External triage (Codex, Fable). Self-contained; you should not need the full repo chat.  
**Note:** Parallel map/fog agents may be active on this repo. **Do not touch `fog.js` or map surfaces** for this investigation.

---

## 1. Problem statement

### Symptoms over time (same product area, several faces)

| Symptom | What it looks like | When seen |
|---------|-------------------|-----------|
| Blank **dark** void | Chrome OK (counter advances); viewport is ink-black / empty | Mid-book flips (e.g. PAGE 9/68), esp. Firefox; proved for build ~172 |
| Paper **“Loading page…”** stuck | Cream paper underlay + overlay text; may never resolve to art | After Loading UI change; lifecycle decode-hang regression (builds 173–174); still possible if fetch/decode starve |
| Issue 1 OK / **Issue 2 stops** on fast flip | Late Issue 1 paints; crossing into Issue 2+ yields void / no src / starved paint | Backer unlock (`scribe4`); warm-queue cancel + pool flood (pre-177/178) |
| **Half-white page (Chapter 3)** — **today’s screenshot** | Top art OK; **bottom half solid white** (not dark void, not just “Loading page…”) | Chapter 3 splash / early Issue 3 |
| Veil **soft-open races** | Book chrome appears while opening spreads still empty / incomplete | Legacy `VEIL_HARD_DEADLINE_MS` soft-open path |

**Prod URL:** https://archive.intrepidgraphicnovel.com/reader/intrepid-dusk-volume-1/

### Current build / flags (verified 2026-07-13 — **build 179 shipped**)

| Knob | Prod (after deploy) | Local repo |
|------|---------------------|------------|
| `PAGE_ASSET_VERSION` | **179** | **179** |
| `ENABLE_PAGE_LIFECYCLE` | **`false`** (default OFF) | **`false`** |
| Reader script cache | `spike.js?v=179` | `spike.js?v=179` |
| Map shell `INTREPID_BUILD` | **181** | **181** |
| Page asset Cache-Control | `public, max-age=31536000, immutable` | via `netlify.toml` |

**Invariant for triage:** lifecycle stays **default OFF** as of build **178+**. Opt-in only via `localStorage intrepid_reader_page_lifecycle_enabled=1` (and not `…_disabled=1`). Do not “fix” loading by turning lifecycle on as default.

### Shipped this pass (tech-director triage → build 179)

1. **Immutable page-asset caching** — `netlify.toml` headers for `/reader/.../assets/pages/*`. Bust with `?v=PAGE_ASSET_VERSION`. HTML/JS stay short-cache / versioned.
2. **Honest painted gate (legacy)** — stop clearing Loading on `naturalWidth > 0` alone; require `complete && naturalWidth > 0`. Visible/near-visible: guarded `decode()` with 1.2s timeout; hang falls back to complete+width (no 173-style infinite Loading).
3. **Stress pixel sample** — `scripts/stress-reader-issue-boundaries.mjs` probes top vs bottom thirds for half-white.
4. **Deferred** — reader-sized derivative WebPs (lighter display res) are **not** generated this pass; keep full 2200×3348 until a dedicated pipeline.

**Residual risks:** StPageFlip can still curl DOM mid-transfer if something else clears Loading early; pixel probe samples DOM `<img>` not the curl canvas; very light/splash pages with intentional large white regions could false-positive half-white (thresholds tuned to Chapter 3 class). Cold first paint of ~1MB Chapter 3 WebPs over the network can still show Loading briefly until `complete` — immutable cache makes the second visit cheap; derivatives still deferred.


---

## 2. Architecture map

```
index.html
  → archive-access guard (guest entry OFF for beta)
  → backer-gate.js          (ReaderAccess / ReaderGate — Issues 2–3)
  → vendor/page-flip.browser.js   (StPageFlip)
  → audio.js
  → spike.js                (boot, warm, unveil, placeholders)
       optional: reader/plugins/page-lifecycle/page-loader.js  (opt-in only)
  → buildPageElements()     → DOM .reader-page > <img>
  → StPageFlip.loadFromHTML → curl rasterizes live DOM imgs
  → assets: ./assets/pages/*.webp?v=PAGE_ASSET_VERSION
```

**Boot (legacy, shipping path):**

1. `bootReader()` → `buildPageElements()`
2. Indices `≤ OPENING_READY_LAST_INDEX` (**7**) get `loading=eager` + `src`
3. Indices `> 7` get `loading=lazy` and **no `src`** until warm / neighborhood
4. `prepareOpeningPages()` waits (softly) for opening imgs
5. `VEIL_HARD_DEADLINE_MS` (**3500**) may **soft-open** anyway → toast
6. `openBook` → `createPageFlip` → `revealReader`
7. `startPostUnveilWarmQueue()` — append-only trickle: Issue 1 remainder → unlocked 2 → unlocked 3

**Manifest:** `assets/manifest.json` lists WebP + JPG `fallback` per page. **Legacy `spike.js` ignores it** (hardcoded `pageEntries` → `.webp` only). JPG fallbacks on disk are **incomplete** (~1 JPG present vs 69 WebPs / 69 manifest entries). Lifecycle plugin *can* use fallbacks; legacy path does not.

**Two paths:**

| Path | When | Behavior |
|------|------|----------|
| **Legacy** (shipping) | `ENABLE_PAGE_LIFECYCLE === false` and no LS opt-in | Deferred src + capped warm queue + paper Loading UI (build 178 nail) |
| **Lifecycle plugin** (R&D) | LS opt-in or flag true | `LegendistPageLifecycle` owns fetch/decode/state; veil **hard-fails** instead of soft-open; default OFF after decode-hang |

**Source of truth for reader patches:** `reader/overlay/` → applied into `reader/intrepid-dusk-volume-1/` (`apply-reader-patches.ps1`). Triage both if they diverge; shipping surface is `reader/intrepid-dusk-volume-1/`.

**Chapter 3 layout note:** content page **43** inserts an intentional blank (“Chapter 3 spacer”) before the art page. `ISSUE_003_START = 45`. Intentional blanks have **no `<img>`** — do not confuse with half-white art failure.

---

## 3. Relevant code inventory

| Path | Owns |
|------|------|
| `reader/intrepid-dusk-volume-1/index.html` | Shell markup, script order, `spike.js?v=` |
| `reader/intrepid-dusk-volume-1/spike.js` | Boot, pageEntries, warm queue, unveil, placeholders, legacy loader |
| `reader/overlay/spike.js` | Overlay source for same (keep in sync) |
| `reader/intrepid-dusk-volume-1/styles.css` | Veil, `.is-loading` / paper placeholder, StPageFlip page CSS |
| `reader/overlay/styles.css` | Overlay twin of styles |
| `reader/plugins/page-lifecycle/page-loader.js` | Opt-in readiness SM, concurrency, WebP→JPG fallback |
| `reader/plugins/page-lifecycle/page-lifecycle.css` | Lifecycle placeholder / veil hard-fail visuals |
| `reader/intrepid-dusk-volume-1/assets/manifest.json` | Intended asset index (mostly unused by legacy) |
| `reader/intrepid-dusk-volume-1/assets/pages/*.webp` | Page art (canonical) |
| `reader/intrepid-dusk-volume-1/vendor/page-flip.browser.js` | StPageFlip (keep `loadFromHTML`) |
| `reader/backer-gate.js` | Issue 2–3 unlock (`scribe4`), Stripe guest, gate UI |
| `scripts/stress-reader-issue-boundaries.mjs` | Adversarial fast-flip Issue 1→2→3 paint asserts |
| `scripts/smoke-page-lifecycle.js` | Node smoke for lifecycle plugin (no browser) |
| `scripts/verify-page-lifecycle.mjs` | Extra lifecycle verify |
| `docs/EMPTY-PAGES-TRIAGE.md` | Proved dark-void root cause (~172) |
| `docs/READER-PAGE-LIFECYCLE-PROPOSAL.md` | Target architecture (not shipping default) |
| `docs/READER-BLANK-NAIL.md` | Build 178 invariants / what not to revert |
| `docs/BETA-GO-LIVE-2026-07-13.md` | Beta Sev-0, flag lock table |
| **This file** | External triage handoff |

---

## 4. Fix history (why band-aids failed)

Full narrative: `EMPTY-PAGES-TRIAGE.md` + `READER-BLANK-NAIL.md`. Short version:

| Era / commit | Intent | Why it didn’t end the class of bugs |
|--------------|--------|-------------------------------------|
| Preload / decode (≈110–111, `72baef5`) | Veil until opening decode; kill black flash | Gated **chrome**, not mid-book paint; `decode()` hangs later burned lifecycle |
| `614af29` (165) | Defer `src` past opening window — stop ~70-way boot starvation | Fixed boot; **created** mid-book pages with no src until warm |
| `3ad783d` (166) | Larger opening window, trickle warm, neighborhood, **`.is-loading img { opacity: 0 }`** | Warm **re-flooded** pool; opacity 0 made healthy in-flight WebPs look like a dead reader |
| Soft unveil / deadline tweaks | Always open by ~3.5s | Irrelevant once user flips; soft-open into empty spreads |
| `7b862cf` (172) | July PDF WebP rebuild | Assets healthy; loader contract unchanged |
| `fd49749` (173) lifecycle P0 | State machine / ready contract | Decode hang → “Loading page…” stuck; **default OFF** in `195add3` (175) |
| `8338dbb` (177) | Prioritize Issue 2–3 on fast flip | Partial; cancel/flood still hurt |
| `2bf1ae6` (178) nail | Append-only warm, concurrency cap, no opacity-0, visible watchdog → Retry | Addresses Issue 2 void class; **does not explain today’s half-white Chapter 3 splash** |

**Pattern:** unveil timers answer “when may the shell appear?” Blank/half-white pages ask “may **this** spread show pixels?” Collapsing those into one timer or one opening window keeps failing.

---

## 5. Open hypotheses — half-white Chapter 3 (today)

Screenshot: **top art OK, bottom half solid white** — distinct from dark void and from full-page Loading paper.

Please **distinguish asset vs renderer vs loader** before proposing another warm-queue patch.

| # | Hypothesis | How to confirm / falsify |
|---|------------|---------------------------|
| A | **Truncated / corrupt WebP** (decode stops mid-frame) | Fetch `page-043.webp?v=178` (and neighbors). Check Content-Length vs local; open in fresh `<img>` / ffmpeg / `webpinfo`. Local files for 042–045 have valid `RIFF/WEBP` magic and non-trivial sizes (~0.9–1.4MB) — rules out “missing file,” not progressive corrupt decode |
| B | **CSS clip / transform / overflow** on `.stf__item` / facing page | Inspect computed clip, height, `transform`, `overflow` on visible left/right items while symptomatic |
| C | **StPageFlip canvas half-paint** | Curl/`loadFromHTML` samples DOM before full bitmap; temporarily compare static DOM `<img>` outside book vs in-flip canvas |
| D | **Progressive / incremental decode** showing upper bands first | Watch Network timing + `complete` / paint over 1–2s; does white fill in without navigation? |
| E | **Lazy / deferred `src` only on one side of spread** | DOM: both visible `.stf__item img` have `src`? one blank spacer + one art? `naturalHeight` vs displayed box? |
| F | **Wrong page / spacer confusion** | Content 43 has intentional blank **sibling** in `pageEntries` — confirm label/index; blank pages are cream/empty by design but should not half-paint art |

**Ask:** Is the white region the **same DOM `<img>`** as the top art (partial bitmap), or a **second page/slot** (blank, failed, or unpainted neighbor)?

---

## 6. Invariants Jon wants (readiness contract)

Quote / enforce:

> A **visible** page must show **decoded art**, or an **intentional blank**, or an **explicit loading / error placeholder** — never a silent white or dark void.

Additional locked constraints (`READER-BLANK-NAIL.md`):

1. **StPageFlip stays** (`loadFromHTML`). Do not replace the flip engine in this triage.
2. **Lifecycle default OFF** until separately proven (butter-level stress green).
3. Warm ranges **append** (Issue 1 → 2 → 3); never cancel earlier ranges when later unlock warm starts.
4. Concurrency cap + visible-priority lanes; background must not starve the neighborhood.
5. Do **not** restore `.is-loading img { opacity: 0 }`.
6. Soft background settle must not clear loading into a void; late `load` may still paint.
7. No orphan `<link rel=preload>` flood on the legacy path.

---

## 7. How to reproduce

### Auth (guest entry is OFF)

```js
localStorage.setItem("intrepid_reader_backer", "granted");
localStorage.setItem("intrepid_reader_issue_002", "granted");
localStorage.setItem("intrepid_reader_issue_003", "granted");
sessionStorage.setItem("intrepid_archive_entered", "1");
```

Or enter code **`scribe4`** at archive gate.

### Manual — Issue 2 blanks / Loading (known class)

1. Open prod reader (hard refresh). Confirm console / network uses `spike.js?v=178`, lifecycle off.
2. Flip quickly through late Issue 1 into Issue 2–3.
3. On blank: inspect visible `.stf__item` — `is-loading` / `is-failed`, `img.src`, `complete`, `naturalWidth`, computed opacity.
4. Prefer **Firefox** for mid-book starvation repros (historically sharper).

### Manual — Chapter 3 half-white (today’s class)

1. Same auth.
2. Navigate to Chapter 3 splash / early Issue 3 (~ content **43+**; watch for spacer).
3. Capture: screenshot, which spread slot is white, Network row for that page’s WebP, DOM dump of both visible items.

### Stress command

```bash
npx -y http-server . -p 8080 --cors -c-1
node scripts/stress-reader-issue-boundaries.mjs http://127.0.0.1:8080/reader/intrepid-dusk-volume-1/
node scripts/stress-reader-issue-boundaries.mjs https://archive.intrepidgraphicnovel.com/reader/intrepid-dusk-volume-1/
```

Expect `ok: true`, `hasLifecycle: false`, boundaries `pass: true` with visible `complete && naturalWidth > 0` and `pixelOk: true`.  
**Note:** stress now pixel-samples top/bottom thirds to catch half-white that `naturalWidth` alone misses.

### Lifecycle R&D only

```bash
node scripts/smoke-page-lifecycle.js
# browser: localStorage intrepid_reader_page_lifecycle_enabled=1
```

Do not enable for beta by default.

---

## 8. Suggested questions for Codex / Fable

Focused — not “rewrite the reader.”

1. For the Chapter 3 half-white shot: is white coming from **partial bitmap**, **CSS/layout**, or **StPageFlip sampling**, and what single experiment separates those three?
2. Does `page-043.webp` (and the exact URL with `?v=178`) decode fully in isolation outside StPageFlip?
3. On the symptomatic spread, do **both** visible nodes have `src` and `naturalWidth > 0` while the **viewport** still shows white?
4. Is there a remaining path that clears `is-loading` / placeholder while the img is still visually incomplete?
5. Should stress gain a **pixel / geometry** check for half-painted pages, or is DOM `naturalWidth` insufficient?
6. If asset is fine and loader assigned src: what’s the minimal StPageFlip-side mitigation that preserves curl (`loadFromHTML`)?
7. What evidence would justify revisiting lifecycle default — and what soak gates must pass first?
8. Confirm legacy still ignores manifest JPG fallbacks; would completing JPGs help this symptom at all, or only 404/WebP-fail paths?

---

## 9. Key code excerpts (current)

### Flags + opening window + asset version

```10:16:reader/intrepid-dusk-volume-1/spike.js
const ENABLE_PAGE_LIFECYCLE = false;
const PAGE_LIFECYCLE_DISABLE_KEY = "intrepid_reader_page_lifecycle_disabled";
const PAGE_LIFECYCLE_MANIFEST_URL = "./assets/manifest.json";
const PAGE_LIFECYCLE_MAX_IN_FLIGHT = 4;
const PAGE_LIFECYCLE_TIMEOUT_MS = 8000;
// Opening hard-fail deadline (must exceed per-image timeout; never soft-open empty book).
const VEIL_OPENING_DEADLINE_MS = 16000;
```

```66:93:reader/intrepid-dusk-volume-1/spike.js
// Issue 1 = cover spread (2) + 21 pages → indices 0–22
const ISSUE_001_LAST_INDEX = 22;
const ISSUE_002_START = 23;
const ISSUE_003_START = 45;
// ...
const OPENING_READY_LAST_INDEX = 7;
// ...
const VEIL_HARD_DEADLINE_MS = 3500;
const PAGE_ASSET_VERSION = 178;
// ...
const LEGACY_MAX_IN_FLIGHT = 4;
const LEGACY_NEIGHBOR_BURST = 2; // neighbors may briefly exceed MAX by this
```

### Chapter 3 spacer in pageEntries

```55:64:reader/intrepid-dusk-volume-1/spike.js
const pageEntries = [
  ...coverSpread,
  ...contentPages.flatMap((page) => {
    if (page.contentNumber === 43) {
      return [{ blank: true, label: "Chapter 3 spacer" }, page];
    }

    return [page];
  }),
];
```

### Assign src (eager before src) + Loading / Retry placeholder

```879:896:reader/intrepid-dusk-volume-1/spike.js
function assignPageImageSrc(pageIndex, attempt) {
  if (pageLifecycle) {
    pageLifecycle.enqueue(pageIndex, pageLifecycle.PRIORITY_NEIGHBOR);
    return lifecyclePrimaryUrl(pageIndex);
  }
  var entry = pageEntries[pageIndex];
  var image = pageImages[pageIndex];
  if (!entry || entry.blank || !image) {
    return "";
  }
  // Eager before src on all assign paths.
  image.loading = "eager";
  var href = pageAssetUrl(entry, attempt || 0);
  if (image.getAttribute("src") !== href) {
    image.src = href;
  }
  return href;
}
```

```252:281:reader/intrepid-dusk-volume-1/spike.js
function updatePagePlaceholder(pageIndex, state) {
  // ...
  if (state === "loading") {
    ph.innerHTML =
      '<p class="reader-page-placeholder__msg">Loading page&hellip;</p>';
    return;
  }
  // failed → Retry button...
}
```

### Warm queue (append-only) + post-unveil chain

```1068:1141:reader/intrepid-dusk-volume-1/spike.js
// CRITICAL: ranges APPEND — never cancel an in-flight Issue 1/2 warm when
// Issue 2/3 unlock scheduling fires (that left Issue 2 cold for backers).
function queueBackgroundWarm(startIndex, endIndexExclusive) {
  // ...
  backgroundWarmRanges.push({ next: next, end: end });
  // ...
}

function startPostUnveilWarmQueue() {
  queueBackgroundWarm(OPENING_READY_LAST_INDEX + 1, ISSUE_001_LAST_INDEX + 1);
  if (window.ReaderAccess) {
    if (window.ReaderAccess.isIssueUnlocked("002")) {
      queueBackgroundWarm(ISSUE_002_START, ISSUE_003_START);
    }
    if (window.ReaderAccess.isIssueUnlocked("003")) {
      queueBackgroundWarm(ISSUE_003_START, pageEntries.length);
    }
  }
}
```

### buildPageElements — deferred src past opening window

```1369:1381:reader/intrepid-dusk-volume-1/spike.js
    if (useLifecycle) {
      // Loader owns every request — no boot-time src flood.
      image.loading = "eager";
      page.setAttribute("data-page-state", "idle");
    } else if (index <= OPENING_READY_LAST_INDEX) {
      image.loading = "eager";
      if ("fetchPriority" in image) {
        image.fetchPriority = "high";
      }
      image.src = pageAssetUrl(entry, 0);
    } else {
      image.loading = "lazy";
    }
```

### Legacy soft-open vs lifecycle hard-fail

```1626:1655:reader/intrepid-dusk-volume-1/spike.js
function bootReaderLegacy(pageElements) {
  var openingFailed = false;

  veilDeadlineId = setTimeout(function () {
    openBook(pageElements, { softError: true });
  }, VEIL_HARD_DEADLINE_MS);

  prepareOpeningPages(pageElements)
    .then(function (ok) {
      openingFailed = !ok;
      openBook(pageElements, { softError: openingFailed });
    })
    // ...
}

function bootReaderLifecycle(pageElements) {
  // ...
  veilDeadlineId = setTimeout(function () {
    if (!bootOpened) {
      showOpeningHardFail("Page couldn't load — Retry.");
    }
  }, VEIL_OPENING_DEADLINE_MS);
```

### is-loading CSS (build 178 — opacity 1, paper underlay)

```469:481:reader/intrepid-dusk-volume-1/styles.css
/* Page-local placeholder when src is assigned but paint is incomplete.
   Build 178 nail: never hide in-flight art (opacity 0 made healthy WebPs look
   like a dead reader). Paper under + Loading/Retry overlay; img stays opacity 1
   so bytes paint the moment the browser has a bitmap. */
.reader-page.is-loading {
  background:
    linear-gradient(180deg, #f3ead6 0%, #e8dcc0 48%, #ddd0b0 100%);
  position: relative;
}

.reader-page.is-loading img {
  opacity: 1;
}
```

---

## 10. Success criteria for this triage pass

- Root cause of **Chapter 3 half-white** classified as **asset / renderer / loader** with evidence.
- **Shipped build 179:** immutable page-asset cache + honest `complete&&naturalWidth` gate + stress pixel probe (see §1 “Shipped this pass”). Lifecycle stays **default OFF**.
- Assets 043–045 validated as complete WebPs — half-white class attributed to **loader readiness / cache revalidation / StPageFlip early sample**, not corrupt files.
- **Deferred:** reader-sized derivative WebPs (no full pipeline this pass).
- No map/`fog.js` logic changes in this track (build stamp only).

---

*Handoff generated for Jon → Codex/Fable. Updated 2026-07-13 after build 179 ship. Reader-only; map work may proceed in parallel elsewhere.*
