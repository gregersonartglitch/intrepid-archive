# Beta Go-Live Checklist — 2026-07-13 / 2026-07-14

**Surface:** Archive map + Volume 1 reader + dossier at https://archive.intrepidgraphicnovel.com  
**Stamps (prefer live handoff over mid-day freeze):** map **185** / reader spike + `PAGE_ASSET_VERSION` **180** / lifecycle **OFF** / guest **OFF** / Mish **off** Elena’s Journey.  
**Source of truth for current stamps:** `docs/SESSION-HANDOFF-2026-07-13.md` (refresh this checklist from that doc after any deploy).  
**Historical scan note (2026-07-13 ~10:50 CT):** earlier same-day pass recorded prod **177** / local **178** and smoke **146/146** — **stale**; do not treat those as live.

**Smoke (keep green on fog edits):** `node scripts/smoke-journey-flow.js` — overnight catalog **158/158** on the 7-stop Mish-off path.

---

## 1. What “beta LIVE” means (vs alpha)

| | Alpha (what we’ve been in) | Beta LIVE (declare today/tomorrow) |
|--|--|--|
| **Audience** | Jon + agents + ad-hoc local demos | **Trusted Kickstarter backers with access codes** — a named list Jon emails, not the open public |
| **Guest / Wanderer entry** | **OFF** (`ENABLE_GUEST_ENTRY = false`) | **Stay OFF** for this window — no naked public Issue 1 |
| **Stripe guest pay** | On for Ch.2–3 paywall | Keep on; not the beta invite path (codes first) |
| **Map** | Cartographer code required | Same — `hollowlands9` (or CART URL) |
| **Bar for “good enough”** | Broken paths OK if known | Sev-0 green; known polish on hold list; Jon can tick exit criteria |

**Not beta LIVE:** public guest window, mass KS announce, Legendist multi-title, Proposal A/B spikes.

**One-line definition:** *Code-gated archive that trusted backers can enter, read Volume 1 end-to-end, browse the dossier, and (Cartographers) play the map without Sev-0 breakage.*

---

## 2. Sev-0 blockers — must be green

| # | Blocker | Reality 2026-07-13 | Owner to green | Status |
|---|---------|-------------------|----------------|--------|
| S0-1 | **Reader Issue 2 blanks on fast flip** | Fix landed in **177–180**; prod/local on reader **180**. Local cold cover OK under lifecycle OFF; **Jon must confirm on prod** with `scribe4`, speed-flip Issue 1→2→3. | Jon verify | ⬜ Jon confirm |
| S0-2 | **Page-lifecycle OFF** | Prod + local: `ENABLE_PAGE_LIFECYCLE = false`. Do **not** re-enable for beta. | Agent: leave OFF | ✅ locked OFF |
| S0-3 | **Guest copy vs `ENABLE_GUEST_ENTRY`** | Guest OFF; entry/hub copy for paused Wanderer should match. Confirm on live **185**. | Jon spot-check entry | ⬜ Jon confirm |
| S0-4 | **Cuneiform buttons** | Live: `ENABLE_CUNEIFORM_BUTTONS = true`. Kill switch: `localStorage intrepid_cuneiform_buttons_disabled=1`. | Jon locked | ✅ **ON / by design** (Jon 2026-07-14) |
| S0-5 | **Ligature / credits / Atrus pages** | Issues **1 & 3** Sharon July WebPs; fi ligatures on pages **4 & 68**. **Jon’s full-res PNG re-export still pending** — not Sev-0 if July WebPs look OK. | Jon eyeball pages 4, 68, credits | ⬜ Jon OK / hold PNG |
| S0-6 | **Dossier portraits** | `dossier/portraits/*.webp` ×11, `CACHE_V = 3`. Confirm Elena + Atrus + Namin still load sharp. | Jon 60s pass | ⬜ Jon confirm |
| S0-7 | **Map soft-lock free glow path** | Smoke keep-green on **7-stop** path (Mish off journey). Overnight: **158/158**. | Agent: keep green on any fog change | ✅ smoke green |
| — | Map perf | `ENABLE_MAP_PERF` **absent** from current `fog.js` (parked / not in this tree). Optional polish, **not Sev-0**. Prefer handoff note over older “shipped at 177” claim. | — | n/a |

---

## 3. Flag lock table (beta values)

| Flag | File | Beta value | Rationale |
|------|------|------------|-----------|
| `ENABLE_GUEST_ENTRY` | `archive-access.js` | **`false`** | Backer-first beta; email must include codes, not naked URL alone |
| `ENABLE_PAGE_LIFECYCLE` | `reader/.../spike.js` | **`false`** | Decode-hang regression; legacy loader + Issue 2 warm fix is the beta path |
| `ENABLE_READER_MAGNIFY` | spike.js | **`true`** (plugin load) | Opt-in only via `intrepid_reader_magnify_enabled=1`; safe |
| `ENABLE_STRIPE_CHECKOUT` | reader `index.html` | **`true`** | Keep paywall for non-code guests who somehow reach Ch.2 |
| `ENABLE_CUNEIFORM_BUTTONS` | `index.html` | **`true`** (locked) | Jon 2026-07-14: ON / by design for beta; kill switch `intrepid_cuneiform_buttons_disabled=1` if needed |
| `ENABLE_SABELLA_MESSAGES` | `fog.js` | **`true`** | Jon 2026-07-10: ON for reviewer round; letters gate Indras Na — warn Cartographers |
| `ENABLE_SABELLA_CLUE_POPUPS` | `fog.js` | **`false`** | Separate chime popups; leave off |
| `ENABLE_VOL2_JOURNEY_GATE` | `fog.js` | **`true`** | Post-Sinn Vol2 soft-gate as designed |
| `ENABLE_MAP_PERF` | `fog.js` | **absent / parked** | Not in current tree; do not assume live caps from older audit |
| `ENABLE_MAP_ATMOSPHERE` | `fog.js` | **`false`** | Lightning/storm demo only (`?mapatmo`) |
| `ENABLE_BASIN_GATES` / `ENABLE_DISCOVERY_COMPASS` | (unshipped) | **do not add** | Proposal A/B on hold |

---

## 4. Access / comms kit

**URL (never alone while guest is off):**  
https://archive.intrepidgraphicnovel.com/

**Codes (send in the email body):**

| Code | Grants |
|------|--------|
| `scribe4` | Volume 1 Issues 2–3 (reader backer) |
| `hollowlands9` | Cartographer map **+** reader Issues 2–3 |

**Email must say (minimum):**

1. Link + **which code to use** (reader-only vs Cartographer).
2. “Guest / Wanderer preview is **paused** — you need your access word.”
3. Hard refresh / incognito if they saw an older build (`console`: `[Intrepid Map] build 185` after current map deploy).
4. Cartographers: follow the golden glow (post-Sabella → **Monastery of the Wind**, not Mish); Sabella letters (Secrets) are on and count toward the finale.
5. Magnify: optional — enable only if you want it (settings / known LS key); not required.
6. Report breakage to Jon with: browser, build number, Issue #, screenshot.

**Do not:** tweet/post naked URL as “open archive” while `ENABLE_GUEST_ENTRY = false`.

---

## 5. Today vs Tomorrow

### TODAY (2026-07-13) — unblock Sev-0 + decide flags

| Task | Owner |
|------|--------|
| Confirm Issue 2–3 **no blanks** on prod after fast flips (`scribe4`) | **Jon** |
| Decide cuneiform: keep **ON** or set `false` + redeploy | **Jon** — **done 2026-07-14: keep ON / by design** |
| Eyeball dossier portraits (Elena, Atrus Nul, Namin) | **Jon** |
| Eyeball reader pages **4** + **68** (ligature/credits) — OK for beta or need PNG? | **Jon** |
| Deploy **build 178** (guest copy / meta fix) after Jon’s Issue 2 OK | **Agent** (or Jon) |
| Leave page-lifecycle OFF; do not chase A/B or lifecycle | **Agent** |
| If Issue 2 still blanks after 177: reopen with agent (do not touch fog.js for this) | **Agent** |

### TOMORROW (2026-07-14) — invite + declare

| Task | Owner |
|------|--------|
| Send beta email to trusted list (codes + URL + guest-paused note) | **Jon** |
| Spot-check one Cartographer path: entry → map glow → one discovery → hub → reader | **Jon** |
| Spot-check `scribe4` reader Issues 1→2→3 cold load | **Jon** (or trusted backer) |
| Tick exit criteria below → declare **beta LIVE** | **Jon** |
| Tag deploy (`build-178` or live stamp) once declared | **Agent** if asked |
| Park anything on the Explicit Hold list | both |

---

## 6. Exit criteria — tick to declare beta LIVE

- [ ] Prod console shows intended build (**178+** after copy deploy; **177** minimum if Issue 2 already verified)
- [ ] Anonymous visit: entry asks for code; guest path locked / paused (no free Issue 1)
- [ ] `scribe4`: Issues 1–3 readable; **fast flip through Issue 2 paints pages** (no sustained blanks)
- [ ] `hollowlands9`: map opens; golden glow path playable; smoke 146 still green if fog changed
- [ ] Dossier: portraits load for main cast (not broken placeholders)
- [ ] Entry / hub copy does **not** claim “open to all” while guest is off
- [ ] Page-lifecycle still **OFF** on prod spike.js
- [ ] Jon’s beta email sent with URL **and** codes

When all eight are ticked → **beta LIVE**. Announce only to the trusted list.

---

## 7. Explicit hold (out of beta scope)

| Item | Why hold |
|------|----------|
| **Proposal A** (basin / collection economy) | Design memo: overprescribe for n≈3; soft-lock risk |
| **Proposal B** (discovery compass) | Same; incompatible with A; needs reviewer data first |
| **Sabella letters 2–4 comic-fidelity polish** | Letters ON for beta; copy polish is post-declare |
| **Full `ENABLE_PAGE_LIFECYCLE` re-enable** | Decode hang; needs dedicated fix + soak, not beta week |
| **Legendist multi-title / platform** | Separate product track |
| **Jon full-res PNG page re-export** | Nice-to-have after Sharon July WebPs accepted |
| **Public guest window / mass announce** | Flip `ENABLE_GUEST_ENTRY` only after beta feedback |
| **Map atmosphere lightning** | Keep `ENABLE_MAP_ATMOSPHERE = false` |

---

## Live snapshot

**Prefer:** `docs/SESSION-HANDOFF-2026-07-13.md` (map **185** / reader **180**). Mid-day Jul 13 scan below is **historical**.

| Item | Prod (archive.…) | Local repo (as of handoff) |
|------|------------------|----------------------------|
| `INTREPID_BUILD` | **185** | **185** |
| `fog.js?v=` | 185 | 185 |
| Reader spike / `PAGE_ASSET_VERSION` | **180** | **180** |
| `ENABLE_GUEST_ENTRY` | false | false |
| `ENABLE_PAGE_LIFECYCLE` | false | false |
| `ENABLE_CUNEIFORM_BUTTONS` | true (locked ON / by design, Jon 2026-07-14) | true |
| `ENABLE_SABELLA_MESSAGES` | true | true |
| `ENABLE_MAP_PERF` | absent / parked | absent / parked |
| Elena’s Journey | 7 stops (Mish off) | 7 stops (Mish off) |
| Reader Issue 2 warm fix | shipped in 177–180 | shipped — Jon confirm blanks |

---

## Sharpest next action for Jon

**Open prod reader with `scribe4`, speed-flip from late Issue 1 into Issue 2–3, and confirm pages paint.**  
Cuneiform locked **ON / by design** (Jon 2026-07-14). If Issue 2 OK → Jon sends the coded beta email (guest stays off — codes **in** the email).
