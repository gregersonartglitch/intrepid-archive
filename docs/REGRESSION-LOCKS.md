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
| **247** | Isolated Archive/MailerLite (217+) | Public/backer doors + official JSONP (`mlWebformSubmitted`); generated callbacks ORB-block | `scripts/smoke-archive-optin.js`; empty-email `scripts/smoke-mailerlite-jsonp.js` | `/` waitlist, `/backer/` choice→password; no real email |
| **248** | Split mailing state + returning-backer prompt | Shared `intrepid_archive_ml_choice_v1` crossed doors; unlocked `/backer/` skipped the required choice; `?entry=` leaked | Smoke: separate public key; `shouldPromptBackerMailing` before skip-entry; no `params.has('entry')`; CRLF-normalized boot extract | `/backer/` with existing session still asks choice; `/` waitlist stays independent |

## Rollback

```powershell
git checkout build-215   # last known good (after this ship)
git checkout build-212   # prior prod baseline
```

## Related

- [`docs/QA-SMOKE-CHECKLIST.md`](QA-SMOKE-CHECKLIST.md) — human + agent pre-deploy checklist
- [`scripts/smoke-journey-flow.js`](../scripts/smoke-journey-flow.js) — primary regression harness
- [`AGENT-HANDOFF.md`](../AGENT-HANDOFF.md) — git remote, deploy, auth
