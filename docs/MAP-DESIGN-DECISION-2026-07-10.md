# Map Design Decision — 2026-07-10

**Status:** Tactical verdict (Aurora / Hermes + Jon)  
**Branch:** `feature/cuneiform-buttons`  
**Audience:** Agents and humans shipping map work

---

## Context

Shared source of truth for *what the map is today:*

- **Triage:** `docs/MAP-SYSTEMS-TRIAGE-2026-07-10.md`
- **Proposal A (economy / soft-gates):** `docs/MAP-DESIGN-PROPOSAL-A-ECONOMY.md`
- **Proposal B (compass / attention):** `docs/MAP-DESIGN-PROPOSAL-B-COMPASS.md`
- **Fable build-112 review:** `docs/FABLE-MAP-REVIEW-2026-07-07.md`

**Product job:** A 20–40 minute wonder artifact. Feel the Hollowlands. Want to read the book. Not a retention economy, not a live-ops loop.

**Audience:** Small (≈3 reviewers), includes older players (John Haytas). Accessible beats friction. Delight beats “earned scarcity” when the session is one sitting.

---

## Verdict

Both proposals correctly diagnose **vacuuming** (too many simultaneous glows, weak priority after the Cartographer’s Charge). Both **overprescribe** for this audience and session length.

- Vacuuming *with delight* is acceptable for a one-session wonder piece.
- Friction is not accessibility. Soft-gates, hold-rites, and hide-the-beacons patterns raise soft-lock and motor-access risk for a tiny reviewer set.
- **Do not run both spikes.** A and B are incompatible philosophies; n=3 cannot A/B them.
- Hold `ENABLE_BASIN_GATES` / `ENABLE_DISCOVERY_COMPASS` (and sibling spike work) until real reviewer data says aimlessness is a problem.

---

## Ship now — copy layer (<1 day, additive)

No new economy. No glow redesign. Copy and labels only:

1. **Bearing lines** — Static footer on discovery cards, in Sabella’s voice, aiming the next thing (cover the 5–8 journey stops that need it).
2. **Letters-as-bearings reframe** — Relabel Secrets → **“Letters along the road”** (or equivalent) so the track reads as path guidance, not a loot bar.
3. **Locked-reason copy** — Adopt Proposal A’s pattern: when something is locked, the map always shows *why* (reuse / extend Indras Na–style locked reasons).
4. **Demote water beacons note** — Per Fable review item 9 in `docs/FABLE-MAP-REVIEW-2026-07-07.md` (waters glow as territories but feed no counter), a short clarifying note or distinct identity so seas don’t read as clock progress.

---

## Hold

| Idea | Why hold |
|------|----------|
| Full basin soft-gates (read-gated unlocks) | Unverifiable in playtest; dark amber; High soft-lock risk |
| One-glow-at-a-time / hide beacons | Rail anxiety; fights free exploration |
| Territory hold-rite | Motor accessibility (Haytas demographic) |
| Ink currency, rank capabilities, sketch pins | Retention-economy scope; wrong product job |

---

## If reviewers report aimlessness later

Prefer **B-thin first:** dim non-focus beacons — **do not hide** — before Proposal A’s basin gate. Soften attention; don’t invent a new unlock economy.

---

## Decide first (blocking)

**Secrets / Sabella letters:** ship **ON**, **OFF**, or **opt-in**?

Today the flag is demo-ON, and letters 1–4 gate Indras Na when ON. Collection economy sits on sand until this is decided for reviewers and prod.

---

## Deploy pre-flight

| Flag | Risk |
|------|------|
| `ENABLE_CUNEIFORM_BUTTONS` | Demo-only ON — confirm before prod / before reviewers ≠ local demo |
| `ENABLE_SABELLA_MESSAGES` | Demo-only ON — same; ties to Indras Na letter gate |
| `ENABLE_VOL2_JOURNEY_GATE` | Armed; after Sinn the map is mostly toast-only today |

Map’s next real product job is the **bridge to Vol 2 KS (Dec)**. Copy polish serves that better than new gate systems.

---

## Agent instruction

1. Prefer **triage + this memo** over implementing A/B spikes without Jon’s approval.
2. Next additive work = the **copy layer** above — not basin gates, not compass spikes.
3. If a spike flag is tempting, stop and re-read Hold + Decide first.
