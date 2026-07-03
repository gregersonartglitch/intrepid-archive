---
name: intrepid-map
description: >-
  Hollowlands interactive map and Legendist reader integration on intrepid-map.
  Use when working on intrepid map, hollowlands, fog.js, reader integrate,
  deploy archive.intrepidgraphicnovel.com, or build checkpoints.
---

# Intrepid Map + Reader

Read `AGENT-HANDOFF.md` at repo root for full context. This skill covers the essentials.

## Repos

- **Deploy:** this repo (`intrepid-map`) → https://archive.intrepidgraphicnovel.com
- **Reader R&D:** `C:\Users\tanja\Documents\Codex\legendist`

## Builds

Bump `INTREPID_BUILD` in `index.html` and sync `fog.js?v=N` on every deploy-worthy change. Tag `build-N`, then `netlify deploy --prod --dir .`

| Tag | Notes |
|-----|-------|
| build-50 | Stable baseline; Pass 3 fog reverted |
| build-57 | Beta go-live |
| build-59 | Gate fix + Sharon pages |
| build-62 | Landing grid, CART key, journey counter (current) |

## Auth (never cross keys)

| Code | Grants |
|------|--------|
| *(none)* | Issue 1 + dossier |
| `scribe4` | Reader issues 2–3 (`intrepid_reader_backer`) |
| `hollowlands9` | Cartographer map (`intrepid_cartographer_unlocked`) |

Cartographer gate: only `intrepid_cartographer_unlocked === 'granted'`. No legacy tier-A migrate.

## fog.js rules

- ES5 IIFE — `var` not `let/const`; `node --check fog.js` after edits
- No glow = not clickable (`isClickable()` sync with draw)
- **Do not re-add Pass 3 region fog** without per-territory design

## Reader integrate

```powershell
.\integrate-reader.ps1          # from Codex zip
.\apply-reader-patches.ps1       # overlay only
```

- **Source of truth:** `reader/overlay/` → applied to `reader/intrepid-dusk-volume-1/`
- Codex zip may be older than site for issues 1 & 3 — check before overwriting
- Sharon PDFs: `C:\Users\tanja\Dropbox\StudioDropbox\ForPrint\Sharon_Handoff_Volume1`
- PDF→WebP: `legendist/scripts/optimize-volume-reader-pages.py`

## Dev

```bash
npx http-server . -p 8080 --cors -c-1
```

## Fable audit

External audit (Fable / Claude Code) uses a dedicated packet — not deploy workflow.

| Resource | Path |
|----------|------|
| Audit brief | `AUDIT-BRIEF.md` |
| Local test steps | `docs/FABLE-LOCAL-TEST.md` |
| Smoke script | `scripts/audit-checks.mjs` |
| One-shot runner | `scripts/run-local-audit.ps1` |

```powershell
# Terminal 1
npx -y http-server . -p 8080 --cors -c-1

# Terminal 2
node scripts/audit-checks.mjs
```

Build 59 focus: cartographer gate must require `hollowlands9` in incognito; `scribe4` must not unlock map. Full auth matrix and 15-minute play script are in `AUDIT-BRIEF.md`.
