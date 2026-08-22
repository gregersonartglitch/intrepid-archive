# Regression Locks — Intrepid Map

Permanent record of player-facing bugs that shipped fixed. **Every deploy-worthy bug fix must add a row here** so we stop re-breaking the same flows.

## Ship protocol (no whack-a-mole)

1. **Fix** in `fog.js` / `index.html` (minimal diff).
2. **Lock** — add or extend an assertion in `scripts/smoke-journey-flow.js` (preferred) or `scripts/audit-checks.mjs`.
3. **Document** — add a row to the table below (build, symptom, lock, manual spot-check).
4. **Verify** — `node --check fog.js` + `node scripts/smoke-journey-flow.js` (must exit 0).
5. **Stamp** — bump `INTREPID_BUILD` + matching `fog.js?v=` in `index.html`.
6. **Backup** — commit, tag `build-N`, push branch + tag, `netlify deploy --prod --dir .`.
7. **Handoff** — update `AGENT-HANDOFF.md` current prod row.

Agents: do **not** mark a bug fix done without steps 2–4. Jon should never be the first person to re-hit a locked regression.

## Locked regressions

| Build | Bug | Symptom | Automated lock | Manual spot-check |
|-------|-----|---------|----------------|-------------------|
| **207–208** | Letter-stop chime / Maxim gate | Could skip Sabella letter or click Maxim before tower letter | Smoke: `ensureSabellaLetterBeforeChart`, Maxim gated until tower letter | Chart tower-nine; Maxim dark until letter read |
| **212** | Rim fog flash | Mish territory flash at frame edge | `MAP_CLIP_INSET` hard seal in `index.html` | Pan to Mish at min zoom — no rim bleed |
| **214** | Sabella letter soft-lock | Secrets 3/4; charted stop (e.g. Monastery) letter never opens | Smoke: `maybeRecoverSabellaLetter` → `forceShowSabellaLetter`; Guide Me force-show; `recoverMissingSabellaLetter` | `?reset` → play to 3/4 letters, skip one on first chart, tap marker → parchment opens |
| **215** | Double congratulations | Two modals at Indras Na (Vol2 + archive complete) | Smoke: `journeyFinaleToastQueued`, `flushJourneyFinaleToastAfterVol2` | Complete Indras Na with full map — one modal, dismiss, then archive overlay |
| **215** | West pan wall | Could not pan west when zoomed out (Moon Court / Kur) | *(manual)* `updateMapMaxBounds()` in `index.html` | Zoom out, pan west — Moon Queen / western edge reachable |
| **226** | Reader size on ultrawide | Size slider did not grow spread; heavy stage padding on wide monitors | *(manual)* `syncPageFlipDimensions` + layout refresh in `reader/overlay/spike.js` | Ultrawide (>=2.2 aspect) -> Size +/- -> spread visibly scales; padding tighter |
| **227** | Wave 1 backer login mix-up | Reader code opening map, or guest/deep-link skipping entry | `scripts/smoke-backer-login.js` (matrix ×2): `scribe4` reader-only; `hollowlands9` both; guest OFF; CART- format | Incognito: B1–B10 in `docs/WAVE1-LOGIN-TEST.md` |
| **228** | Reader deep-link bypass | Incognito paste of `/reader/intrepid-dusk-volume-1/` loads full volume without code (fail-open guard + `ENABLE_READER_GATE=false`) | `smoke-backer-login.js`: fail-closed `bootstrapPublicContentRoute`, reader gate ON, eye toggle; Playwright blocked `archive-access.js` → redirect home | Fresh incognito: paste reader URL → home entry screen; with `scribe4` → Issue 2+ readable |
| **230** | Wave 1 Option B+ server gate | Client-only bypass; public Issue 2–3 assets | `scripts/smoke-server-gate.js`, `scripts/test-access-auth-unit.js`, `smoke-backer-login.js` | Preview/prod: incognito reader URL blocked; scribe4 cookie opens shell; page-022 404 + protected 401 |
| **231** | Protected asset edge streaming + deploy exclude | Direct page-022.webp / map data.js public; PDF >6MB function cap | `smoke-server-gate.js` (build 231); edge `protected-media.js`; `.netlifyignore-protected.generated` | Incognito: legacy asset 404; logged-in protected media 200; PDF download after scribe4 |
| **232** | Letter-stop chime Hot auto-fire | Sabella hut search completed on first frame; no hot/cold audio; beacon retap skipped hunt | Smoke: `lanternMoved` guard, hut pin ~180px, letter-gate nudge before Hot | Fresh map: hut → search stays active; move lantern toward diamond → pings + Hot letter; beacon alone does not chart |
| **233** | Tutorial step race instant-skips hut chime | Golden-glow click on hut while tutorialStep still 2 → `instantDiscover` (no search/audio) | Smoke: `TUTORIAL_INSTANT_IDS` by loc id; discoverLocation not step-index gated | Fresh map: dawn-spear card still open → click hut glow → must enter search (console Search mode), not instant card |
| **234** | Chime diamond too far / not clickable | Sigil ~180px in deep fog; letter-gate only exact hitKey → nudge, pings never stop | Smoke: hut pin ~130px, `onSigil` + LETTER_SIGIL_CLICK_PAD | Hut search: diamond near pinhole; tap diamond → letter; dismiss → charts; pings stop |
| **235** | Restore build-226 chime distances + finish | 232–234 made diamonds too far; diamond unclickable while letter open | Smoke: hut/tower pins match build-226; force-chart on tap | Hut/Tower: diamond beside stop; tap diamond or letter area finishes hunt |
| **236** | Overlay stack + tiny dismiss | Letter sat on Cartographer’s Charge; tap-to-dismiss unreadable | Smoke: overlayCloseHtml + dismissTransientMapOverlays on letter | Letter/Charge: one window; ✕ Close top-right |
| **237** | Map drag snap / jank | Pan felt like it hitch-snapped in the oval | Smoke: fog pane-follow on movestart; maxBoundsViscosity 0.35; setMaxBounds not panInside on zoomend | Drag map: fog stays glued; no post-drag jump |
| **238** | Archive opt-in vs login | Email signup blocking unlock, or skip posting to Netlify | *(superseded by 239 split entrances)* | — |
| **239** | Split backer/public mailing | Password mixed with waitlist; Netlify claimed as MailerLite | `scripts/smoke-archive-optin.js`: `/backer/` choice vs `/` waitlist; No thanks no ML; fail closed | `/backer/` No thanks → password; `/` has no password; Join fails closed until ML URLs |
| **240** | Public waitlist official form | Public Join had no MailerLite action URL; waitlist copy drifted from Jon’s form | `smoke-archive-optin.js`: official `publicActionUrl` form `196516110968817063`; Guest Access Waitlist / Notify Me | `/` shows Guest Access Waitlist; do not live-test signup |
| **241** | Backer official form | Backer Join had no MailerLite action URL | `smoke-archive-optin.js`: official `backerActionUrl` form `196515214173144716`; URLs stay separate; Subscribe and Continue | `/backer/` Yes → Subscribe and Continue; do not live-test signup |

## Rollback

```powershell
git checkout build-226   # last known good (after this ship)
git checkout build-212   # prior prod baseline
```

## Related

- [`docs/QA-SMOKE-CHECKLIST.md`](QA-SMOKE-CHECKLIST.md) — human + agent pre-deploy checklist
- [`scripts/smoke-journey-flow.js`](../scripts/smoke-journey-flow.js) — primary regression harness
- [`AGENT-HANDOFF.md`](../AGENT-HANDOFF.md) — git remote, deploy, auth
