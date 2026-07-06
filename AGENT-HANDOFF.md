# Agent Handoff — Hollowlands Map + Legendist Reader

Onboarding for any agent working on **intrepid-map** (deploy site) and its integration with **Legendist reader R&D** (Codex repo).

### Fable / external audit

| Doc | Purpose |
|-----|---------|
| [`AUDIT-BRIEF.md`](AUDIT-BRIEF.md) | Fable audit packet — invariants, auth matrix, 15-min play script, system prompt |
| [`docs/FABLE-LOCAL-TEST.md`](docs/FABLE-LOCAL-TEST.md) | Step-by-step local audit workflow for Claude Code |
| `scripts/audit-checks.mjs` | Automated smoke checks against `localhost:8080` |
| `scripts/run-local-audit.ps1` | Starts server (if needed) + runs audit checks |

```powershell
npx -y http-server . -p 8080 --cors -c-1   # terminal 1
node scripts/audit-checks.mjs               # terminal 2
```

---

## Two Repos, One Product

| Repo | Path | Role |
|------|------|------|
| **intrepid-map** (this repo) | `C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map` | Production deploy target — map, landing, reader bundle |
| **legendist** (Codex) | `C:\Users\tanja\Documents\Codex\legendist` | Reader R&D — page-curl spike, PDF→WebP scripts, handoff zips |

**Live site:** https://archive.intrepidgraphicnovel.com  
**Netlify site:** `aesthetic-salmiakki-cf6713` — deploy from repo root: `netlify deploy --prod --dir .`

---

## Build Checkpoints

| Tag | Status | Notes |
|-----|--------|-------|
| `build-50` | Stable beta baseline | Fog Pass 3 region reveal **reverted**. Return with `git checkout build-50`. |
| `build-57` | Beta go-live | Reader preload, labels, Pass 3 still shelved |
| `build-59` | Stable | Cartographer gate fix, Sharon reader page rebuilds, agent handoff |
| `build-95` | Current target | Reader magnify plugin (opt-in via localStorage `intrepid_reader_magnify_enabled=1`), hardcover cover spread assets |

### Version stamps (must stay in sync)

On every deploy-worthy change:

1. Bump `window.INTREPID_BUILD` in `index.html`
2. Match `fog.js?v=N` cache buster to the same number
3. Commit, tag `build-N`, deploy

Console on live: `[Intrepid Map] build 59`

---

## Auth Tiers

Three entry paths on the landing page. **Never cross-contaminate localStorage keys.**

| Tier | Password | Access | localStorage key |
|------|----------|--------|------------------|
| **Public** | *(none)* | Issue 1 reader, Character Dossier | — |
| **Reader backer** | `scribe4` | Issues 2 & 3 | `intrepid_reader_backer`, `intrepid_reader_issue_*` |
| **Cartographer** | `hollowlands9` | Interactive fog map ($60+ Hollowlands pledge) | `intrepid_cartographer_unlocked` |

### Critical gate rules

- **Cartographer gate** (`index.html`): Only `intrepid_cartographer_unlocked === 'granted'` grants map access. Set only by `hollowlands9` or `?key=CART-*` URL. **No legacy auto-migrate** from old `intrepid_atlas_auth` + tier A — that was a bypass bug fixed in build-59.
- **Reader gate** (`reader/backer-gate.js`): `scribe4` unlocks issues 2–3 only. Does **not** grant cartographer access.
- Issue 1 is always open — no password.

---

## Map Engine (`fog.js`)

Single IIFE (~2770 lines). ES5 style (`var`, not `let/const`).

### Never break these rules

1. **No glow = not clickable.** `isClickable()` must stay in sync with beacon draw logic.
2. **Tutorial gate** = `!discovered['sabellas-hut']`. During tutorial ONLY `tutorialHintLoc.id` is clickable.
3. **Golden glow** = next journey step. Always visible post-tutorial.
4. **Orange beacon** = territory. Unlocked by non-territory discovery within 500 units.
5. **Yellow beacon** = cartographerSite or journey path stop. Visible within 400 units of cleared fog.

### Fog Pass 3 — DO NOT RE-ADD

Region polygon fog reveal (Pass 3) was **reverted** at build-50 due to regression. Do not re-implement without per-territory design review. See `.planning/debug/fog-pass3-regression.md`.

### After editing fog.js

```bash
node --check fog.js
```

### Coordinates

- `lat` = horizontal (left-right). Higher lat = further right.
- `lng` = vertical (up-down).
- Proximity distances in map units (400 ≈ nearby cluster).

### Journey path (order)

crossing-pool → dawn-spear → sabellas-hut (tutorial ends) → mish → monastery-wind → tower-nine → sinn → indras-na (FINAL)

---

## Reader Integration

**Magnify (build 95):** eader/plugins/magnify/ loaded when ENABLE_READER_MAGNIFY is true in spike.js; default **off** until the user enables it (intrepid_reader_magnify_enabled = 1). Cache bust magnify-plugin.js?v=10.


Full workflow: `reader/README.md`

### Source of truth

| What | Where |
|------|-------|
| Site UI overlay | `reader/overlay/` — **source of truth** for index.html, styles.css, spike.js, audio |
| Deploy target | `reader/intrepid-dusk-volume-1/` — overwritten on integrate |
| Auth gate | `reader/index.html` — never overwritten by integrate |
| Backer gates | `reader/backer-gate.js` |

### Integrate from Codex zip

```powershell
# Place intrepid-dusk-volume-1-reader-upload.zip in repo root, then:
.\integrate-reader.ps1
# Re-apply overlay only:
.\apply-reader-patches.ps1
```

**Warning:** Codex handoff zip may be **older** than intrepid-map's reader for issues 1 & 3. intrepid-map often has Sharon-rebuilt pages that Codex hasn't received yet. Do not blindly overwrite with an old zip.

### PDF → WebP (without Codex desktop)

Source PDFs: `C:\Users\tanja\Dropbox\StudioDropbox\ForPrint\Sharon_Handoff_Volume1`

Legendist script (run from Codex repo):

```bash
cd C:\Users\tanja\Documents\Codex\legendist
python scripts/optimize-volume-reader-pages.py <raw-png-dir> <output-web-dir>
```

Raw PNGs are organized as `issue-001/page-001.png`, etc. Output goes to `assets/pages/page-NNN.webp` + `manifest.json`. Copy results into `reader/intrepid-dusk-volume-1/assets/` and update manifest.

### overlay/spike.js merge discipline

Overlay `spike.js` is the **full working file**, not a partial patch. When Codex updates spike.js:

1. Run `integrate-reader.ps1`
2. Diff Codex spike.js vs `reader/overlay/spike.js`
3. Merge Codex content changes (page counts, spacers, paths) into overlay
4. Run `apply-reader-patches.ps1`

Preserve our blocks: `fitBookToStage()`, `autoSize: false`, `ResizeObserver`, stage padding.

---

## Dev Server

```bash
npx http-server . -p 8080 --cors -c-1
# Map:     http://localhost:8080
# Reader:  http://localhost:8080/reader/
# Edit mode: http://localhost:8080?edit
```

---

## Deploy Checklist

1. Verify `INTREPID_BUILD` and `fog.js?v=` match
2. `node --check fog.js` if fog.js changed
3. Test gate: incognito → Cartographer → must prompt for `hollowlands9`
4. Test reader: Issue 1 open; issues 2–3 gated behind `scribe4`
5. Commit deploy-worthy files (not `.tmp/`, upload zips, or scratch scripts)
6. Tag: `git tag build-N`
7. Deploy: `netlify deploy --prod --dir .`
8. Verify live: console build stamp, gate behavior, reader pages

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Landing, cartographer gate, map shell, INTREPID_BUILD |
| `fog.js` | Entire map game engine |
| `data.js` | Location coordinates, lore, journey path |
| `reader/README.md` | Reader integration workflow |
| `integrate-reader.ps1` | Extract Codex zip → deploy reader |
| `apply-reader-patches.ps1` | Apply overlay onto deployed reader |
| `.cursor/rules/project.mdc` | Cursor always-on rules (summary + pointer here) |
| `.cursor/skills/intrepid-map/SKILL.md` | Cursor skill for this project |

---

## Do Not Commit

- `.tmp/` — scratch PDF conversion scripts
- `*-upload.zip` — handoff packages (regenerated)
- `.netlify/` — local Netlify state
- Large binary uploads unless they're the actual deploy assets (WebP pages are tracked)

---

## Cursor Context

- **Always-on rules:** `.cursor/rules/project.mdc`
- **Skill trigger:** intrepid map, hollowlands, reader integrate, deploy archive.intrepidgraphicnovel.com
