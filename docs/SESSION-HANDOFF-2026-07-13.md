# Session handoff — 2026-07-13

**Resume new chat with:** *Read `docs/SESSION-HANDOFF-2026-07-13.md` first — do not rely on prior chat memory.*

**Repo:** `C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map`  
**Live:** https://archive.intrepidgraphicnovel.com  
**Verified:** 2026-07-13 evening CT (local working tree + brief prod HTTP check)

---

## 1. Why this handoff

A long multitask thread (~days) mixed map polish, reader blank-page triage, beta go-live prep, dossier, and perf. Context length caused drift and missed intent. **Jon wants a clean cut** — next agent/session starts from this doc + the linked docs below, not from chat scrollback.

Screenshot that triggered the cut: after early journey / Grandma Bella (Sabella) letter, the map still **animates / flies over to Mish** (Mish label centered in fog with lantern). Treat that as an open UX complaint, not “working as intended.”

---

## 2. Live product state

| Knob | Local (working tree) | Prod (archive.intrepidgraphicnovel.com) |
|------|----------------------|-------------------------------------------|
| Map `INTREPID_BUILD` | **184** | **184** |
| `fog.js?v=` | **184** | **184** |
| Reader `spike.js?v=` | **180** | **180** |
| `PAGE_ASSET_VERSION` | **180** | **180** |
| `ENABLE_PAGE_LIFECYCLE` | **`false`** | **`false`** |
| `ENABLE_GUEST_ENTRY` | **`false`** | **`false`** |
| `ENABLE_CUNEIFORM_BUTTONS` | **`true`** | **`true`** |
| `ENABLE_SABELLA_MESSAGES` | **`true`** | (same fog as local) |
| `ENABLE_SABELLA_CLUE_POPUPS` | **`false`** | — |
| `ENABLE_VOL2_JOURNEY_GATE` | **`true`** | — |
| `ENABLE_READER_MAGNIFY` | **`true`** (opt-in via LS) | — |

**Access codes (unchanged):**

| Code | Grants |
|------|--------|
| `scribe4` | Reader Issues 2–3 |
| `hollowlands9` | Cartographer map + reader Issues 2–3 |

**Guest / Wanderer entry:** OFF. Do not invite with a naked URL alone.

**Caution on stamps:** latest *committed* map work in git log is build **183** (`37eb7d5`). Working-tree `index.html` shows an uncommitted **183 → 184** stamp-only bump that matches prod. Next agent: confirm whether 184 was deployed from a dirty tree before assuming HEAD == prod.

**Branch:** `feature/cuneiform-buttons`  
**Working tree:** dirty — many untracked `.tmp/` scratch files, assorted docs, `docs/MAP-PERF-AUDIT.md`, zips, dossier portraits dir, etc. **Commit carefully; never stage `.tmp/`.**

---

## 3. What shipped this arc (bullet log)

### Map (`fog.js` / lore)

- **Sabella / Secrets:** letters gated to **chime-only** search (build ~169); Hot / `KEY_CLICK` teaching; hut letter comic-copy align; tower letter grant without Guide Me (183); Sinn hosts last letter before Indras Na.
- **Maxim Stone:** amber glow synced with clickability (180).
- **Moon Queen:** label land + medallion decode (182); moon-stronghold folded into Sinn earlier (168).
- **The Nine:** Apkallu gods identified as The Nine in medallion lore (179).
- **Mish congrats / Vol2 gate:** sequencing around Mish / Indras (earlier builds); do not reopen without Jon.
- **Sinn territory gate:** journey soft-lock until territories charted (smoke path green).
- **Soft-lock free glow path:** `scripts/smoke-journey-flow.js` — keep green on fog edits.

### Reader

- **177:** prioritize Issue 2–3 paints on fast flips.
- **178:** nail blank Issue 2/3 paints under fast flip.
- **179:** honest paint gate (`complete && naturalWidth`) + immutable page-asset cache headers; stress scripts for issue boundaries.
- **180:** never soft-open white opening page; veil-hold until opening paints; Retry styling on legacy hard-fail path.
- Lifecycle plugin existed (173+) then **default OFF** (175+) after decode-hang regression — **do not turn default ON** for beta.

### Docs / triage artifacts

- `docs/READER-LOADING-TRIAGE-HANDOFF.md`, `docs/READER-BLANK-NAIL.md`, `docs/EMPTY-PAGES-TRIAGE.md`, `docs/READER-PAGE-LIFECYCLE-PROPOSAL.md`
- `docs/BETA-GO-LIVE-2026-07-13.md` — beta send checklist (Jon decisions still open)

### Dossier

- Portraits live under `dossier/portraits/*.webp` (11 characters). Confirm Elena / Atrus / Namin on a 60s pass before beta invite.

### Beta checklist path

- `docs/BETA-GO-LIVE-2026-07-13.md` + codes + guest-off messaging. Beta doc may still mention older build numbers (177/178) — prefer **this handoff’s verified table** for stamps.

---

## 4. OPEN / NEXT (Jon’s priorities)

### P0 — Map camera fly to Mish (Jon hate)

**Symptom:** After early journey / Sabella letter, map still wants to **animate/fly** so Mish is centered in fog.

**Code reality (do not hand-wave):** In `fog.js` post-init, a comment claims *“no auto-fly to distant Mish”* but the call remains:

```text
// Post-tutorial: golden glow guides the player — no auto-fly to distant Mish.
if (isFullyDiscovered('sabellas-hut') && shouldShowPostTutorialHint()) {
  maybeFlyToNextJourneyStep(2000);   // <-- still flies
  setTimeout(schedulePostTutorialHint, 2000);
}
```

`maybeFlyToNextJourneyStep` is also invoked after other journey stops (~1800 ms). Comment ≠ product.

**Decide with Jon (do not assume “intended” closes the complaint):**

1. Remove auto-fly after Sabella / post-tutorial (glow only), or  
2. Soften (longer delay / only if next step fully off-screen / no fly when letter UI open), or  
3. Remove fly entirely from journey completion.

**Acceptance:** Jon no longer sees the cam yank to Mish after the Bella letter unless he pans himself.

### P0 — Reader first-page / white pages

- Prod + local are on **spike / PAGE_ASSET_VERSION 180** with lifecycle **OFF**.
- Jon should confirm on **his** machine (cold open, hard refresh, Issue 1 opening, fast Issue 1→2→3 with `scribe4`).
- If residual half-white remains, reopen with evidence (build #, Issue, screenshot) — do not “fix” by enabling lifecycle default.

### P1 — Beta send

- Follow `docs/BETA-GO-LIVE-2026-07-13.md`.
- **Jon decisions still needed:** cuneiform ON/OFF (currently ON; kill switch `intrepid_cuneiform_buttons_disabled=1`); guest copy stays code-gated; codes in the email body.

### P2 — Map perf WIP (parked)

- `docs/MAP-PERF-AUDIT.md` untracked; no live `ENABLE_MAP_PERF` in current `fog.js` grep.
- Do not scramble into FPS/DPR work mid-beta unless Jon reopens.

### Parked

- Sabella letters 2–4 comic fidelity pass  
- Proposal A/B (economy / compass) — do not ship  
- Page-lifecycle default ON  
- Reader derivative / lighter WebPs  

---

## 5. Don’t-break rules

1. **No glow = not clickable** — `isClickable()` stays in sync with beacon draw.
2. **Tutorial gate** — `!discovered['sabellas-hut']`; only `tutorialHintLoc` clickable during tutorial.
3. **Golden glow** — next journey step, always visible post-tutorial.
4. **Password eyeballs** on every access-code field (entry, reader gate, cartographer gate).
5. **`fog.js`:** ES5 IIFE, `var` not `let/const`; `node --check fog.js` after edits; journey/gate/chime → also `node scripts/smoke-journey-flow.js`.
6. **`ENABLE_PAGE_LIFECYCLE` default OFF** until proven; opt-in LS only.
7. **Do not re-add Fog Pass 3** region reveal without design review.
8. **New fantasy/atmosphere** needs an `ENABLE_*` flag, default OFF until Jon approves.

---

## 6. Key docs to read first

| Order | Path |
|------|------|
| 1 | **`docs/SESSION-HANDOFF-2026-07-13.md`** (this file) |
| 2 | `AGENT-HANDOFF.md` |
| 3 | `docs/BETA-GO-LIVE-2026-07-13.md` |
| 4 | `docs/READER-LOADING-TRIAGE-HANDOFF.md` |
| 5 | `docs/READER-BLANK-NAIL.md` |
| 6 | `docs/READER-PAGE-LIFECYCLE-PROPOSAL.md` |
| 7 | `docs/EMPTY-PAGES-TRIAGE.md` |
| 8 | `.cursor/skills/intrepid-map/SKILL.md` |
| 9 | `.cursor/rules/project.mdc` |

---

## 7. Suggested first tasks for next session

1. **Soften/remove Mish auto-fly** after Sabella / post-tutorial — Jon’s explicit hate; verify with screenshot/repro (letter open → no cam yank).
2. **Confirm reader cold open never white on 180+** on Jon’s browser; capture residual if any.
3. **Beta flag lock + deploy readiness** — cuneiform decision, guest-off copy, codes in email, stamps committed (`INTREPID_BUILD` / `fog.js?v=` / reader `spike.js?v=`).

---

## 8. Working tree / branch notes

- **Branch:** `feature/cuneiform-buttons`
- **Dirty tree:** expect lots of noise (`.tmp/`, scratch scripts, upload zips, planning notes). Prefer surgical commits of intentional product files only.
- **Uncommitted examples seen at handoff time:** `index.html` stamp 184; `AGENT-HANDOFF.md`; many `docs/*`; `docs/MAP-PERF-AUDIT.md`; `dossier/portraits/`; zips — triage before bundling.
- **Do not commit:** `.tmp/`, `*-upload.zip`, `.netlify/` local state, secrets.
- **Dev server:** `npx http-server . -p 8080 --cors -c-1`
- **Deploy:** `netlify deploy --prod --dir .` (site `aesthetic-salmiakki-cf6713`); 403 workaround in `.planning/debug/ship-triage-build95.md`

### Recent commits (useful blame)

```
6db5117 fix(reader): style opening hard-fail Retry on legacy path (180)
edbfe02 fix(reader): never soft-open white opening page (build 180)
37eb7d5 fix(map): grant Sabella letter at tower beacon without Guide Me (build 183)
294beff fix(map): Moon Queen label land + medallion decode (build 182)
04ac390 fix(reader): honest paint gate + immutable page-asset cache (build 179)
6bc0972 fix(map): sync Maxim Stone amber glow with clickability (build 180)
83ef9b1 Identify Apkallu gods as The Nine in medallion lore (build 179)
2bf1ae6 fix(reader): nail blank Issue 2/3 paints under fast flip (build 178)
8338dbb fix(reader): prioritize Issue 2-3 paints on fast flips (build 177)
```

---

*End of handoff. Prefer this file over prior session chats.*
