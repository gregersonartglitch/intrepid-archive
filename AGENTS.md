# AGENTS.md — rules for every coding agent in this repo

Read this before changing anything. It applies to every agent — Claude, Codex, Kimi, Qwen, Gemma,
Copilot, Cursor — whether a person is watching or an orchestrator is running you unattended.

Deeper context: [`AGENT-HANDOFF.md`](AGENT-HANDOFF.md) (repos, deploy, auth tiers),
[`docs/REGRESSION-LOCKS.md`](docs/REGRESSION-LOCKS.md) (ship protocol),
[`docs/QA-SMOKE-CHECKLIST.md`](docs/QA-SMOKE-CHECKLIST.md), and `lore/` for anything story-facing.

## What this is

The Intrepid Archive: the Hollowlands fog-of-war map, the Legendist page-flip reader and the backer
archive shell, deployed as a static site (Netlify) to archive.intrepidgraphicnovel.com.
Vanilla HTML/CSS/JS with Leaflet — no build step, no framework.

| File | Role |
|------|------|
| `fog.js` | The whole map engine — one ES5 IIFE, ~2,800 lines |
| `data.js` | Location data: coordinates, lore, journey path |
| `index.html` | Shell, archive entry/home, map UI, region overlay renderer |
| `archive-access.js` | Access tiers and gates |
| `reader/` | Page-flip reader (`reader/overlay/spike.js`, plugins in `reader/plugins/`) |
| `scripts/` | Smoke and audit checks |

## Hard rules for unattended runs

1. **One task, one branch.** Change only what the task asks. No drive-by refactors or reformatting.
2. **Never touch production, tags or the base branch.** No `netlify deploy --prod`, no
   `netlify api restoreSiteDeploy` or any other publish, lock, rollback or restore call, no Netlify
   site settings, environment variables, domains or DNS, no `git tag`, no pushes to
   `feature/cuneiform-buttons`. Work on your own branch and deliver a **draft PR**; a human ships.
3. **Preview deploys are welcome.** For any visual or interactive change, publish a draft deploy
   from your branch, e.g. `netlify deploy --dir . --alias <your-branch-name>` (never `--prod`), and
   put the preview URL in the PR with exactly what to click and look at. Previews never replace the
   live site.
4. **Don't touch the build stamp.** `INTREPID_BUILD` and the `fog.js?v=` cache-buster in `index.html`
   are bumped by a human at ship time.
5. **Don't edit** `netlify.toml`, `_redirects`, `.netlify/`, `netlify/functions/` or `AGENTS.md`
   unless the task explicitly says to.
6. **No large binaries.** Don't add or re-export images, PDFs or audio unless the task asks.
7. **Never write access codes, passwords or keys** into code comments, docs, PR text or logs.
8. **When in doubt, stop.** If the task is ambiguous or needs a visual, lore or product judgment,
   make no changes and ask. A clear question beats a wrong PR.

## Project rules (from `.cursor/rules/`)

### fog.js
- ES5 style — `var`, not `let`/`const`. All logic stays inside the existing IIFE; don't convert to modules.
- **No glow = not clickable.** `isClickable()` must stay in sync with the beacon draw logic.
- Tutorial gate is `!discovered['sabellas-hut']`; during the tutorial only `tutorialHintLoc.id` is clickable.
- Golden glow = next journey step. Orange beacon = territory. Yellow beacon = cartographer site / journey stop.
- **Do not re-add Fog Pass 3** (region polygon reveal) — see `.planning/debug/fog-pass3-regression.md`.
- Coordinates: `lat` is horizontal (higher = further right), `lng` is vertical.

### New behavior ships behind a flag
- New features, atmosphere, audio layers and UI overlays must be disableable without a rollback:
  an `ENABLE_*` const, URL param and/or `localStorage` key, **default OFF** until Jon approves.
- Bug fixes and parity with an existing designed flow don't need flags.
- Prefer isolated plugins (`reader/plugins/<name>/`, or a flag-guarded fog.js hook) over weaving
  optional behavior through core draw/discovery paths. Reference: reader magnify (`ENABLE_READER_MAGNIFY`).

### Access gates
- Every password / access-code input needs a show/hide eyeball toggle with `aria-label`s
  (pattern: `#entry-access-eye` + `#entry-access-pw` in `index.html`).
- Never cross tier keys; the cartographer gate only accepts `intrepid_cartographer_unlocked === 'granted'`.

### Lore
- Never change existing `desc` / `lore` text in `data.js` without an explicit instruction in the task.
- New lore follows `lore/writing-style.md`: archaeological-footnote voice, quiet melancholy,
  1–3 sentence quotes, raise questions rather than answer them.

### Bug fixes are locked against regressions
Per `docs/REGRESSION-LOCKS.md`: a player-facing bug fix adds an assertion to
`scripts/smoke-journey-flow.js` (preferred) or `scripts/audit-checks.mjs`, plus a row in the
regression table. Leave the "Build" cell as `next` — the human fills it in at ship time.

## Checks to run before you finish

```bash
node --check fog.js                    # after any fog.js edit
node scripts/smoke-journey-flow.js     # journey / gate / chime changes — must exit 0
```

`scripts/audit-checks.mjs` needs a local server (`npx http-server . -p 8080 --cors -c-1`); run it
when you touch loading, gates or the reader. You can't see the page, so for any visual change list
exactly what a human should check in the browser.
