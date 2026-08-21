# QA Smoke Checklist — Intrepid Map

Short human + agent checklist for every `fog.js` / journey / gate change. If LIVE players would complain, verify here before marking done.

## Automated (run first)

```bash
node --check fog.js
node scripts/smoke-journey-flow.js
```

Smoke script must exit **0**. It checks:

- Post-Sabella `getNextPathLocation()` → `monastery-wind` (not null; Mish is **off** Elena’s Journey)
- Journey ~5/7 (through monastery / tower) + Elil awakened → Vol2 gate **not** blocking, toast flag **not** set
- Stale `revealedGods.Mish` below discovery 13 → pruned, gate stays off
- First Mish **guardian** reveal → gate blocks, toast eligible (guardian ≠ map stop)
- Elil reveal after Mish guardian → no duplicate Vol2 toast
- Chime `exitSearchMode()` clears `searchMode` on key found

## Manual browser pass

Dev server: `npx http-server . -p 8080 --cors -c-1` → `http://localhost:8080`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Fresh `?reset` → enter `hollowlands9` | Tutorial starts at Crossing Pool |
| 2 | Complete tutorial through Sabella's Hut | Golden glow on **monastery-wind**; orange/yellow beacons appear |
| 3 | Advance journey to ~5/7 (through Monastery of the Wind / Tower Nine) | No "Congratulations" Vol2 modal |
| 4 | Awaken frame gods through Elil (2pm) without Mish guardian (6pm) | Elil ceremony only; **no** Vol2 modal |
| 5 | Reach discovery **13** — Mish guardian (6pm) awakens | Mish medallion ceremony **then** Vol2 congratulations modal |
| 6 | Complete a chime search (key found) | Directional arrow / lantern gone immediately; no lingering search UI |
| 7 | After Mish guardian, journey continues | Golden glow on **tower-nine** / **sinn** — not sealed until post-sinn |

## Vol2 gate invariants

- Toast + journey seal tied to **Mish guardian** (`revealGod`, unlock 13) — **not** Mish map location (Mish is cartographer site only, not a journey step), not discovery count alone, not Elil/other gods
- `VOL2_JOURNEY_CAP_ID` = `sinn` — player finishes sinn before `indras-na` seals
- Kill switch: `ENABLE_VOL2_JOURNEY_GATE = false` in `fog.js`
- Live path (build 185+): **7** stops — `crossing-pool` → `dawn-spear` → `sabellas-hut` → `monastery-wind` → `tower-nine` → `sinn` → `indras-na`

## When to run smoke script

- Any edit to `fog.js` touching journey path, `getNextPathLocation`, god reveals, chime/search, or Vol2 gate
- **Any player-facing bug fix** — add a regression assertion (see [`docs/REGRESSION-LOCKS.md`](REGRESSION-LOCKS.md))
- Before bumping `INTREPID_BUILD` for deploy
- After merging guardian/medallion threshold changes in `index.html` `MEDALLION_DEFS`

## Build 214–215 manual checks (locked)

| Step | Action | Expected |
|------|--------|----------|
| L1 | Chart a letter-stop but dismiss before reading; tap marker again | Parchment opens (no lantern hunt) |
| L2 | Secrets row at 3/4 — click row | Missing letter opens or Guide Me fires |
| L3 | Complete Indras Na with full map | Vol2 congrats first; archive overlay **after** Close |
| L4 | Zoom out, pan west toward Sinn / Kur | No hard wall at western edge |

## Archive opt-in (build 238)

```bash
node scripts/smoke-archive-optin.js
```

| Step | Action | Expected |
|------|--------|----------|
| O1 | Incognito, enter `scribe4` | Archive unlocks; same card becomes newsletter; hub is not showing yet |
| O2 | Incognito, enter `hollowlands9` | Same as O1 (atlas also granted) |
| O3 | Wrong word | Error on login card; no newsletter; no opt-in flags |
| O4 | Join with email (Netlify 200) | “Thanks — your signup was recorded…”; hub; no quiet link |
| O5 | Join with network fail | Error; Archive stays; Continue still works; not marked submitted |
| O6 | Continue / ✕ Close / Escape | Hub with **no** form POST; quiet **Get email updates** on hub |
| O7 | Guest “get notified” | Still nickname + checkbox; source `archive-entry-follow` |
| O8 | Phone-width (~375) and desktop | Card readable; Close tappable; Unlock Archive readable at rest |

Kill: `ENABLE_ARCHIVE_POST_UNLOCK_OPTIN = false`, `intrepid_follow_signup_disabled=1`, or `?optin=0`.

## Agent rule

After fog.js journey/gate/chime changes: run **both** commands above; browser-verify the manual table before claiming done.
