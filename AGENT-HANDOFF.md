# Agent Handoff — Hollowlands Map + Legendist Reader

Onboarding for any agent working on **intrepid-map** (deploy site) and its integration with **Legendist reader R&D** (Codex repo).

### Recent session handoffs

| Doc | Purpose |
|-----|---------|
| [`docs/SESSION-HANDOFF-2026-07-17.md`](docs/SESSION-HANDOFF-2026-07-17.md) | **Jul 17 clean-cut** — live 191/187 + PDF downloads shipped, stash warning, beta next |
| [`docs/BACKER-EMAIL-PLAYBOOK-2026-07-21.md`](docs/BACKER-EMAIL-PLAYBOOK-2026-07-21.md) | **Jul 21** — backer reward email strategy + 4-email sequence drafts (Reader / Cartographer), pre-send checklist, 3-day prep |
| [`docs/BUG-HUNT-2026-07-14.md`](docs/BUG-HUNT-2026-07-14.md) | **Jul 14 morning** — overnight bug catalog (no fixes); triage first |
| [`docs/SESSION-HANDOFF-2026-07-13.md`](docs/SESSION-HANDOFF-2026-07-13.md) | **Jul 13 clean-cut** — live stamps, shipped arc, Mish fly P0, reader 180, beta next |

### Beta go-live (Jul 13–14, 2026)

| Doc | Purpose |
|-----|---------|
| [`docs/BETA-GO-LIVE-2026-07-13.md`](docs/BETA-GO-LIVE-2026-07-13.md) | **Today/tomorrow beta LIVE checklist** — definition, Sev-0, flag lock, codes/email, exit criteria, holds |

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
**Netlify site:** `aesthetic-salmiakki-cf6713` — deploy from repo root: `netlify deploy --prod --dir .` (if Forbidden: `netlify deploy --dir .` then `netlify api restoreSiteDeploy` — see `.planning/debug/ship-triage-build95.md`)

### Git remote (backup — Jon must auth push)

| Item | Value |
|------|--------|
| **Remote** | `origin` → https://github.com/gregersonartglitch/intrepid-archive.git |
| **Branch** | `feature/cuneiform-buttons` |
| **Latest ship** | `build-226` — reader padding trim, ultrawide spread resize on Size slider |
| **Status (Jul 31)** | **Prod:** `build-226` at https://archive.intrepidgraphicnovel.com — branch + tag pushed |

```powershell
cd C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map
git push -u origin feature/cuneiform-buttons
git push origin build-200 build-201 build-202 build-203 build-204 build-207 build-208 build-209 build-210
```

If `origin` is wrong: `git remote set-url origin <correct-url>`. Separate ops repo: `gregersonartglitch/intrepid-dusk-ops` (not this codebase).

---

## Build Checkpoints

| Tag | Status | Notes |
|-----|--------|-------|
| `build-50` | Stable beta baseline | Fog Pass 3 region reveal **reverted**. Return with `git checkout build-50`. |
| `build-57` | Beta go-live | Reader preload, labels, Pass 3 still shelved |
| `build-59` | Stable | Cartographer gate fix, Sharon reader page rebuilds, agent handoff |
| `build-95` | Stable | Reader magnify plugin (opt-in via localStorage `intrepid_reader_magnify_enabled=1`), hardcover cover spread assets |
| `build-210` | Stable | 72p digital PDF downloads (Claude master), download UX copy |
| `build-212` | Stable | Rim fog flash seal, Dragon's Tail label, reader flip SFX |
| `build-215` | Stable | Sabella letter recovery (Secrets 3/4), sequenced finale congrats, zoom-aware west pan |
| `build-216` | Stable | Reader display size +/− (85–125%), ultrawide default fit boost, persisted preference |
| `build-226` | **Current prod** | Tighter stage padding; Size slider resizes StPageFlip on ultrawide (`syncPageFlipDimensions`) |
| `build-238` | Branch only — superseded | Post-unlock Netlify opt-in (replaced by 239 split entrances) |
| `build-239` | Branch only — superseded | `/backer/` vs public waitlist; both MailerLite URLs empty |
| `build-240` | Branch only — superseded | Public waitlist official form URL + Guest Access Waitlist copy. Backer form URL empty. |
| `build-241` | Branch only — superseded | Both official MailerLite form URLs set |
| `build-242` | Branch only — superseded | Public “Already a backer?” 16px/15px restyle |
| `build-243` | Branch only — superseded | Public backer link uses the gold boxed treatment at rest |
| `build-244` | Branch only — **AWAITING REVIEW** | MailerLite JSONP callback is `mlWebformSubmitted`. Do not deploy. Do not live-test a real email. |

**Regression discipline:** every bug fix → smoke assertion + row in [`docs/REGRESSION-LOCKS.md`](docs/REGRESSION-LOCKS.md) before deploy. See ship protocol there.

### Version stamps (must stay in sync)

On every deploy-worthy change:

1. Bump `window.INTREPID_BUILD` in `index.html`
2. Match `fog.js?v=N` cache buster to the same number
3. Commit, tag `build-N`, deploy

Console on live: `[Intrepid Map] build 59`

---

## Auth Tiers

**Entry screen:** Kickstarter backers use **`/backer/`** (choice, then access word). The bare Archive URL is a public waitlist with no password. Guest entry stays OFF (`ENABLE_GUEST_ENTRY = false`). **Archive home** (`#archive-home`) shows the tile grid with no password field. Codes are entered once — map and reader gates read the server session and do not re-prompt.

| Tier | Password | Access | localStorage keys |
|------|----------|--------|-------------------|
| **Public / guest** | *(disabled until August — then Continue as guest)* | Issue 1 reader, Character Dossier | `intrepid_archive_entered` (session) |
| **Reader backer** | `scribe4` | Issues 2 & 3 (reader only) | `intrepid_reader_backer`, `intrepid_reader_issue_002`, `intrepid_reader_issue_003` |
| **Cartographer** | `hollowlands9` | Interactive map + reader Issues 2–3 | `intrepid_cartographer_unlocked`, plus reader keys above |

Router: `archive-access.js` (`IntrepidArchiveAccess.submitArchiveCode`, `shouldSkipArchiveEntry`). Loaded on home and in the reader.

### Critical gate rules

- **Entry** (`index.html`): Archive access code + guest path; sets tier keys once, then shows home.
- **Home** (`index.html`): Tile grid only — no second password field.
- **Cartographer gate** (`index.html`): Only `intrepid_cartographer_unlocked === 'granted'` grants map access. Skipped if already unlocked on entry. Set by `hollowlands9` or `?key=CART-*` URL.
- **Reader gate** (`reader/backer-gate.js`): Skips if reader or cartographer keys already granted. Issue boundaries account for cover spread (+2) and Ch.3 spacer.
- **Map reset** (`fog.js`): Clears cartographer auth and map progress; **keeps** reader backer keys.
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

crossing-pool → dawn-spear → sabellas-hut (tutorial ends) → monastery-wind → tower-nine → sinn → indras-na (FINAL)

---

## Reader Integration

**Magnify (build 95):** 
eader/plugins/magnify/ loaded when ENABLE_READER_MAGNIFY is true in spike.js; default **off** until the user enables it (intrepid_reader_magnify_enabled = 1). Cache bust magnify-plugin.js?v=10.


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
7. Deploy: `netlify deploy --prod --dir .` (Forbidden workaround: draft deploy + `netlify api restoreSiteDeploy`)
8. Verify live: console build stamp, gate behavior, reader pages

---

## Rapid redeploy

### Preflight

- Confirm repo root and linked Netlify site (`aesthetic-salmiakki-cf6713`)
- Confirm changed files only include intended deploy scope
- Run `node --check fog.js` when `fog.js` changed

### Build/version bump locations

- `index.html`: `window.INTREPID_BUILD = N`
- `index.html`: `<script src="archive-access.js?v=N"></script>`
- `index.html`: `<script src="fog.js?v=N"></script>`
- Reader script tags are separate cache tags (`reader/intrepid-dusk-volume-1/index.html` and `reader/overlay/index.html`): `backer-gate.js?v=...`, `spike.js?v=...` (bump only when those assets change)

### Exact deploy command

```powershell
netlify deploy --prod --dir .
```

### Production verification command

```powershell
(Invoke-WebRequest https://archive.intrepidgraphicnovel.com/ -UseBasicParsing).Content -match 'INTREPID_BUILD\s*=\s*(\d+)'
```

Expected: `True` and the captured build number equals the intended deploy.

### Common failures + quick fixes

- `403/Forbidden` on prod deploy: run `netlify deploy --dir .` then restore with `netlify api restoreSiteDeploy` (see `.planning/debug/ship-triage-build95.md`)
- Live page still old build: hard refresh/incognito and confirm script `?v=` tags match `INTREPID_BUILD`
- Map/reader gating mismatch after deploy: clear `localStorage` + `sessionStorage`, then retest guest/backer/cartographer flows

### Guest entry flag (build 114 shutdown)

- Location: `archive-access.js` (`var ENABLE_GUEST_ENTRY = false;`)
- Re-enable guest entry: set `ENABLE_GUEST_ENTRY` to `true`, then bump `INTREPID_BUILD` and script cache tags in `index.html` before deploy

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Archive entry, home tiles, cartographer gate, map shell, INTREPID_BUILD |
| `fog.js` | Entire map game engine |
| `data.js` | Location coordinates, lore, journey path |
| `reader/README.md` | Reader integration workflow |
| `docs/READER-CANONICAL-DECISION.md` | **Locked** — spike.js = Archive reader; Legendist backstage in Codex |
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
