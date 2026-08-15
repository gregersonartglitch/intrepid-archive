# Kickstarter Wave 1–2 Fulfillment SOP — Intrepid Dusk

**Status:** Locked workflow (2026-08-15)  
**Live doc (Drive):** [Kickstarter Wave 1–2 Fulfillment SOP](https://docs.google.com/document/d/1PNcP2AU1S6_tbAhWRMvx6pqCMyTBgJxjrJvPAt7dph0/edit)  
**Overrides:** Stage 0 “hand-edit a spreadsheet” language in the Sales & Marketing Plan

## Core rule

Kickstarter’s **Pledge Manager** and **Backer Report** are the live fulfillment system. Downloaded CSVs are **dated backups / reconciliation snapshots** — not the primary list you update by hand.

**No public digital or physical marketing** starts because Wave 1 emails are drafted. First send and track Wave 1 in Kickstarter; then follow the backer-access gate in the Sales Plan before opening public sales.

## Saved Backer Report views

Create once; reuse for every batch:

| Saved view | Filter (reward / item / SKU) | Access word |
|------------|------------------------------|-------------|
| **Wave 1 — Reader/PDF** | Digital, Early Bird, Explorer only | `scribe4` |
| **Wave 1 — Cartographer Atlas** | Cartographer and higher only | `hollowlands9` |
| **Wave 2 — Ready to Ship** | Physical rewards ready for address lock | — |

Filter by **reward/item or SKU**, not a manually typed email list. That prevents overlap and keeps fulfillment reporting reliable.

## Before any Wave 1 send

1. Confirm the corrected PDF is final enough to send.
2. Export the **full** Backer Report as a **dated CSV**.
3. Store that CSV **privately** (PII). Do **not** put the raw export in general project folders, shared studio dumps, Gmail/MailerLite imports, public Drive, or Slack.
4. Use approved copy templates (archive URL + tier access word). Do **not** post codes in a public Kickstarter update.

## Send Wave 1 — Kickstarter is primary

Send through **Kickstarter Backer Report bulk actions** for each saved view — **not** Gmail or MailerLite as the primary delivery method.

Why KS first:

- Native digital reward / code / URL delivery
- Reaches Kickstarter and Apple private-relay backers outside mail tools often miss
- Fulfillment status stays on the same record as the pledge

Send order:

1. **Wave 1 — Reader/PDF** → bulk-send with `scribe4` + https://archive.intrepidgraphicnovel.com
2. **Wave 1 — Cartographer Atlas** → bulk-send with `hollowlands9` + same URL
3. Mark **digital reward sent** in Kickstarter for each batch

Gmail / MailerLite: optional **copy staging** or one-off support replies only — never the system of record for who was fulfilled.

## Track completion in Kickstarter first

Use Backer Report / Pledge Manager — not a parallel hand-maintained name list:

- Pledge Manager finalized / not finalized
- Wave 1 digital reward sent
- Address confirmed
- Wave 2 physical shipment sent
- Tracking number
- Fulfillment date

## Wave 2 physical

1. When books arrive: count stock, reserve replacements, then use **Wave 2 — Ready to Ship**.
2. **Lock addresses only for that segment** when ready to ship (KS gives those backers 48 hours’ notice).
3. Export the final shipping list **after** the address-lock window — not before.
4. Ship; enter tracking + fulfillment date in Kickstarter.

## After each batch (reconciliation)

1. Download a new dated CSV snapshot.
2. Compare to the prior snapshot (counts, sent vs unsent, address issues).
3. Update **only summary figures** in the accounting ledger.
4. Do **not** duplicate names, addresses, or per-backer fulfillment details into the ledger.

## Corrections to earlier plan language

| Do not | Do |
|--------|-----|
| Maintain a hand-edited master email list as the send source | Filter by reward/SKU in saved KS views |
| Primary-send Wave 1 via Gmail or MailerLite | Bulk-send from Kickstarter Backer Report |
| Start public marketing because drafts exist | Send + track Wave 1 in KS first |
| Put raw Backer Report CSVs in general project folders | Private dated snapshots only |
| Duplicate PII into the royalty ledger | Ledger = summary figures only |

## Related

- Sales & Marketing Plan (public-sales gates)
- [Vol1 Gate Audit Verification](https://docs.google.com/document/d/1dsFtK30aKUY93HITnA3TuYyQFhXW1DnUes062I46EKk/edit) — assets are currently public static; real pay gate needs rehost before public checkout
- `docs/BACKER-EMAIL-PLAYBOOK-2026-07-21.md` — copy templates; delivery method corrected below
