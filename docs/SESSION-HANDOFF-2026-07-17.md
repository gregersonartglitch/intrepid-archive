# Session handoff — 2026-07-17

## Open this first

**New chat opener (paste this):**  
`Open docs/SESSION-HANDOFF-2026-07-17.md first — PDF downloads just shipped on prod (build 191); confirm Download PDF + no white pages; do not pop deferred-spike stash.`

**Repo:** `C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map`  
**Branch:** `feature/cuneiform-buttons`  
**Handoff written:** 2026-07-17 ~12:50 CT (disk + prod HTTP re-verified after deploy landed mid-write)

---

## Live production stamps (verified)

| Knob | Local (HEAD `c37f516`) | Prod (live) |
|------|------------------------|-------------|
| Map `INTREPID_BUILD` | **191** | **191** |
| `fog.js?v=` | **191** | **191** |
| Reader `spike.js?v=` | **187** | **187** |
| `PAGE_ASSET_VERSION` | **186** | **186** |
| Reader `styles.css?v=` | **191** | **191** |
| `ENABLE_PAGE_LIFECYCLE` | **`false`** | **`false`** |
| Dossier `CACHE_V` | **5** | **5** |
| `ENABLE_CUNEIFORM_BUTTONS` | **`true`** (by design) | **`true`** |
| Download PDF UI | **yes** | **yes** |
| `…/downloads/*.pdf` | **yes** | **200** (all 4) |

**URLs**

- https://archive.intrepidgraphicnovel.com/
- https://archive.intrepidgraphicnovel.com/reader/intrepid-dusk-volume-1/
- https://archive.intrepidgraphicnovel.com/dossier/

**Codes:** `scribe4` (reader Issues 2–3) · `hollowlands9` (cartographer + reader)

---

## Currently running / in-flight (IMPORTANT)

| Process | Agent / task | Status | Evidence | What next chat should do |
|---------|--------------|--------|----------|--------------------------|
| **Reader PDF downloads + UI** | [`55e39c10…`](55e39c10-832a-456f-93f1-4541d3c05f06) — “Reader status + PDF downloads” | **DONE on prod** (agent transcript may still look thin) | Commit `c37f516 feat(reader): add gated Volume 1 digital PDF downloads`. Prod now serves build **191**, styles **191**, Download PDF menu, all 4 PDFs HTTP **200**. Agent `.jsonl` still showed only the user prompt at handoff time (no assistant lines) — treat as **work complete / report possibly unfinished**, not as “still encoding.” | Hard-refresh reader; click Download PDF; spot-check Ch1 (free) vs gated Ch2/full. Confirm sizes ~8.8 / 9.0 / 10.7 / 28.5 MB. Optional: tag `build-191` / `reader-187` (tags missing). |
| **Session handoff doc** | this task | **DONE** (this file) | `docs/SESSION-HANDOFF-2026-07-17.md` + `AGENT-HANDOFF.md` pointer | Start here every new chat today. |
| **Deferred-spike stash** | leftover WIP | **IDLE / DANGER** | `stash@{0}: wip: deferred-spike-185 + stripe backer-gate (do not redeploy)` | **Never pop blindly.** White-page regression came from deferred warm; live good path is **sync-warm** (asset **186** / spike **187**). |
| **Netlify Pro upgrade** | Jon (billing) | **DONE** | Credits exhausted earlier; Pro upgrade unblocked deploys; PDF bundle (~57 MB) deployed successfully after. | Auto-recharge on; **freeze deploys during beta invite**; still watch bandwidth. |
| **Map / reader / dossier polish (pre-PDF)** | prior commits | **DONE on prod** | Map perf / fog soft tiles / chime diamond / dossier WebP / sync-warm — see Completed | Sanity hard-refresh before invite. |

### In-flight count at handoff close

- **Actively encoding / blocked:** **0**
- **Needs Jon follow-up (not agent WIP):** Netlify invite freeze, beta email, optional tags, UX approve downloads
- **Dangerous idle state:** deferred-spike **stash** (do not pop)

### PDF paths (shipped)

```
reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-chapter-1.pdf   ~8.8 MB  (21p)
reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-chapter-2.pdf   ~9.0 MB  (21p)
reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-chapter-3.pdf   ~10.7 MB (26p)
reader/intrepid-dusk-volume-1/downloads/intrepid-dusk-volume-1.pdf    ~28.5 MB (68p)
reader/intrepid-dusk-volume-1/downloads/README.md
scripts/build-reader-download-pdfs.py
```

**Volume choice:** assembled from revised chapter OnPrint masters (**68p**). Press 72p spliced PDF **not** used (sketch trail). ~160 dpi / JPEG q80 screen downloads.

**UI:** header **Download PDF** menu — Ch1 free; Ch2 / Ch3 / full require backer unlock. Logic inline in reader `index.html` (+ overlay mirror). Spike cache still **187** (no spike logic change required for downloads).

---

## Completed this session (summary)

- **Print PDF → reader Volume 1** (reader-182+); **Ch3 spacer parity** (mural left, cover right) — `e764dd3`.
- **Page-turn volume** up; **jank** then **sync-warm restore** after deferred-warm white pages — spike **187**, `PAGE_ASSET_VERSION` **186**.
- **Map perf** (`0ace796` / tag `build-187`); **fog soft tiles** (`7dbbbda` / `build-189`); **chime diamond offset** sitewide (`1e800af`).
- **Dossier WebP** + medallion RGBA — `CACHE_V=5`.
- **Netlify Pro**; redeploy spike `?v=187` / map **190**, then **PDF feature → build 191**.
- **Cuneiform ON by design**; **Mish off journey** (path → Indras Na; **X/7**).
- **Digital PDFs + gated Download UI** — committed + **live on prod** (`c37f516`, build **191**).

---

## Do not break

1. **No glow = not clickable** — keep `isClickable()` synced with beacon draw.
2. **Tutorial gate** = `!discovered['sabellas-hut']`.
3. **Golden glow** = next journey step post-tutorial.
4. **`ENABLE_PAGE_LIFECYCLE` default OFF**.
5. **Password eyeball** on every access-code field.
6. **Mish ≠ journey stop** — next glow after Sabella = `monastery-wind`.
7. **Do not pop `stash@{0}` deferred-spike** onto prod.
8. New atmosphere/fantasy → flag, default off until Jon approves.

Journey: `crossing-pool → dawn-spear → sabellas-hut → monastery-wind → tower-nine → sinn → indras-na`.

---

## Codes & URLs

| Code | Grants |
|------|--------|
| `scribe4` | Reader Issues 2–3 |
| `hollowlands9` | Cartographer map + reader Issues 2–3 |

Guest / Wanderer entry: treat as **OFF** for invite messaging unless Jon reopens.

---

## Revert points / tags

| Ref | Notes |
|-----|--------|
| **HEAD / prod `c37f516`** | PDF downloads + UI; build **191** — **live** |
| **`c2491c7`** | Pre-PDF: build **190** + spike cache bust |
| **`build-189`** | Fog soft tiles (tag exists) |
| **`build-187`** | Map idle perf (tag exists) |
| **`reader-186`** | Sync-warm tag (exists). **`reader-187` tag missing** (spike `?v=187` is live) |
| **`build-190` / `build-191`** | **Tags missing** — stamps in files only |
| **`backup-2026-07-14-reader-181-good`** | Older reader lock |
| **`backup-2026-07-16-pre-map-perf`** | Pre map-perf backup |
| **`build-50` / `57` / `59`** | Older baselines |

---

## Dirty tree / stash

- **Branch:** `feature/cuneiform-buttons`
- Lots of **untracked** `docs/`, `.planning/`, and **`.tmp/`** — **never stage `.tmp/`**.
- **Stashes:**
  - `stash@{0}`: **`wip: deferred-spike-185 + stripe backer-gate (do not redeploy)`** ← hard warning
  - `stash@{1}`: `hdr-fix-temp`
  - `stash@{2}`: `haytus-live-fixes-122`
- Assorted dirty non-handoff files may remain (`AUDIT-BRIEF.md`, stripe notes, `.netlify/netlify.toml`) — commit carefully.

---

## Recommended first 15 minutes in new chat

1. Read **this file**.
2. Hard-refresh reader → confirm `spike.js?v=187`, **no white pages**, **Download PDF** works (Ch1 free; gated items need `scribe4` / cartographer).
3. Hard-refresh map → console `[Intrepid Map] build 191`.
4. Optional: `git tag build-191` / `reader-187` if Jon wants tagged revert points.
5. Jon: Netlify auto-recharge + **freeze deploys for invite**; beta email with codes when ready.
6. Do **not** resume PDF encode unless files regress; do **not** pop deferred-spike stash.

---

## Scratch / continuity

- Print ingest / probes under `.tmp/` (e.g. `print-ingest-2026-07-16-revised/`) — reference only.
- Prior handoffs: [`SESSION-HANDOFF-2026-07-13.md`](SESSION-HANDOFF-2026-07-13.md), [`BUG-HUNT-2026-07-14.md`](BUG-HUNT-2026-07-14.md), [`BETA-GO-LIVE-2026-07-13.md`](BETA-GO-LIVE-2026-07-13.md)
