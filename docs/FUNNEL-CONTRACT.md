# Intrepid Dusk — Funnel Contract & Launch Acceptance Checklist

**Status:** CONTRACT (freeze implementation until Jon approves)  
**Date:** 2026-08-26  
**Owners:** Jon (product) · requirements/QA agent (funnel + acceptance) · Vector (implement + evidence)  
**North star:** A stranger can discover and purchase Intrepid Dusk Volume 1 within 30 seconds. A backer feels like their Archive Access gets them somewhere strangers can't go.

---

## 1. Site jobs (locked)

| Surface | Job | Must do | Must NOT do |
|---------|-----|---------|-------------|
| **Squarespace** — `intrepidgraphicnovel.com` | **PUBLIC** storefront | Pitch Volume 1 · Buy Print · Buy Digital · Free Issue #1 + email opt-in · link to Archive for members | Require a code · host Hollowlands exclusives · be the email CRM of record for archive unlocks |
| **Archive** — `archive.intrepidgraphicnovel.com` | **BACKSTAGE** pass | Access Code unlock · exclusive lore/map/reader/dossier · optional “Archive updates” opt-in | Capture identity from Access Code · be the primary commerce storefront · dump backers into marketing lists without explicit opt-in |

**Framing (reader-facing):** say **Archive Access Code**, not “password.”  
**Tagline:** *The Intrepid Dusk Archive — your backstage pass to the Hollowlands.*

---

## 2. Target funnel (arrows to prove)

### PUBLIC — Squarespace

```
Visitor → understand book
       → [BUY PRINT]     → payment succeeds → order in fulfillment
       → [BUY DIGITAL]   → payment succeeds → purchaser receives Volume 1 (PDF / download)
       → [READ ISSUE #1 FREE] → explicit email opt-in → MailerLite subscriber + group/tag
                              → welcome/automation email delivered (if enabled)
       → [ENTER ARCHIVE] → lands on Archive entry (Access Code)
Failed / cancelled payment → no fulfillment
```

### BACKSTAGE — Archive

```
Access Code (scribe4 / hollowlands9 / …) → localStorage unlock → exclusive experience
Archive visitor (no code / after unlock) → optional updates opt-in
  → destination system receives submission (Netlify Form today; MailerLite when wired)
  → if MailerLite path: subscriber + group/tag + confirmation/welcome email
```

**Hard rule:** Entering an Access Code does **not** identify the visitor and does **not** create a MailerLite subscriber. That is not a bug; it is architecture.

---

## 3. No-Unverified-Launch rules

1. **A green button is not evidence** that the system behind the button works.
2. For every conversion arrow, QA verifies the **destination system**, not only the browser response.
3. Evidence preferred: screenshot / log / record ID (MailerLite subscriber, Stripe payment, Netlify form submission, inbox email, fulfillment record).
4. If one arrow cannot be demonstrated, **that part is not finished** — do not point new traffic at it.
5. **Freeze:** no Squarespace rebuild and no new Archive commerce/email wiring until this contract is approved and each in-scope arrow is Proven or explicitly Deferred with owner + date.

---

## 4. Customer-facing arrow inventory (2026-08-26)

Statuses: **Proven** · **Unproven** · **Broken** · **Deferred**

| # | Arrow | Surface | Status | Evidence / notes |
|---|-------|---------|--------|------------------|
| A1 | Access Code → Archive unlock (reader / dossier / map by tier) | Archive | **Proven** | Beta/QA: code → `localStorage` → content. Intentionally no email. |
| A2 | Access Code → MailerLite identity / activation | Archive | **Deferred** (by design) | Never wired; do not expect. |
| A3 | Archive “Get notified / follow” UI success message | Archive | **Unproven** (UX may work) | Form posts to Netlify `hollowlands-follow`; MailerLite import deferred. |
| A4 | Archive follow → Netlify Form submission recorded | Archive | **Unproven** | Check Netlify → Forms → `hollowlands-follow`. |
| A5 | Archive follow → MailerLite subscriber + group | Archive | **Deferred** | Docs: CSV import later; not live auto-sync. |
| A6 | MailerLite welcome / “Welcome & Free Issue” email delivered | MailerLite | **Broken** | 2026-08-23: automation disabled — sender domain not authenticated. Re-auth Domains → re-enable automation. |
| A7 | Squarespace Website Inline → MailerLite signup | Squarespace | **Unproven** / stale | Form since 2024-03-18; ~18 subs look like long-tail captures, not password-send activations. |
| A8 | Squarespace Archive Opt-in / Public Waitlist forms | MailerLite | **Unproven** | Forms ~4 days old; Opt-in shows 18 with **0 visitors** → likely import/assign, not fresh embeds. |
| A9 | Password/access campaign → recipients / opens | MailerLite or KS | **Unproven** | Forms page ≠ send stats. Need Campaigns/Sent + KS message counts. |
| A10 | Reader Issue-2 paywall → Stripe Checkout | Archive | **Broken** | `ENABLE_STRIPE_CHECKOUT = true` (green UI) but live `/api/create-checkout` and `/api/verify-session` return **404**; `netlify/functions` absent from this repo. |
| A11 | Stripe pay → unlock Issues 2–3 | Archive | **Broken** / blocked by A10 | Spec exists (`docs/stripe-vol1-unlock.md`); backend not proven live. |
| A12 | Stripe pay → PDF emailed to buyer | Commerce | **Deferred** | Spec: manual from Stripe receipt until v1.1 webhook. |
| A13 | Squarespace Buy Digital → payment → file/receipt | Squarespace | **Unproven** | Inventory before homepage retrofit; do not drive new traffic until Proven. |
| A14 | Squarespace Buy Print → payment → fulfillment | Squarespace | **Unproven** | Same gate as A13. |
| A15 | Cancelled / failed payment → no fulfillment | Commerce | **Unproven** | Required acceptance test for any live Buy path. |
| A16 | Site analytics (unlock, signup, buy, PDF) | Both | **Deferred** / absent | No useful product analytics on Archive today. |

---

## 5. Squarespace retrofit (when unfrozen) — not a rebuild

Focus first viewport + CTAs only:

```
INTREPID DUSK — VOLUME ONE
[BUY PRINT]  [BUY DIGITAL]

New to Intrepid Dusk?
[READ ISSUE #1 FREE]

Cover · compelling art · 2–3 paragraph pitch · reviews/quotes

BACKER OR ARCHIVE MEMBER?
[ENTER THE INTREPID DUSK ARCHIVE]
```

**Gate before enabling Buy Digital on this page:** A13 Proven (and A10/A11 must not be the digital path unless repaired and Proven).

---

## 6. Launch acceptance checklist (test identities)

Use a dedicated test address, e.g. `intrepid-test-YYYYMMDD@…`.  
Checkboxes require **destination evidence**, not “button worked.”

### MailerLite / email (fix public free Issue path first)

- [ ] Form submitted (browser)
- [ ] Subscriber appears in MailerLite (Subscribers, not Forms-only)
- [ ] Correct group/tag
- [ ] Domain authenticated (Account → Domains)
- [ ] Welcome / Free Issue automation **enabled** and email **received**
- [ ] Free Issue #1 PDF / link works from that email

### Commerce — Digital

- [ ] Test purchase succeeds (Stripe/Squarespace record ID)
- [ ] Purchaser receives Volume 1 (download or email)
- [ ] Cancelled checkout → no fulfillment
- [ ] Failed payment → no fulfillment

### Commerce — Print

- [ ] Test purchase succeeds
- [ ] Order appears in fulfillment process
- [ ] Cancelled / failed → no fulfillment

### Archive Backstage

- [ ] Access Code unlocks correct tier (`scribe4` / `hollowlands9`)
- [ ] No MailerLite subscriber created by code alone (expected)
- [ ] Optional Archive updates opt-in → destination record (Netlify and/or MailerLite per current wiring)
- [ ] If MailerLite wired: confirmation/welcome received

### Analytics (when enabled)

- [ ] Key events recorded (signup, buy, archive entry, PDF) without relying on AI “should work”

---

## 7. Immediate Jon ops (before any build)

1. MailerLite → **Domains** → re-authenticate → re-enable **Welcome & Free Issue**.
2. MailerLite → **Subscribers** total + groups (not Forms).
3. MailerLite → last **campaign** recipients / opens (access-code send if any).
4. Kickstarter → how many backers were messaged the Access Code.
5. Netlify (archive) → Forms → `hollowlands-follow` submission count.
6. Squarespace → confirm where **Buy Print** / **Buy Digital** actually point today.
7. **Do not** advertise Archive Stripe paywall or Squarespace Buy Digital until A10–A13 classified Proven.

---

## 8. Role split (this contract)

| Role | Owns |
|------|------|
| **Jon** | Approves experience goals, prices, Buy destinations, go-live |
| **Requirements / QA agent** | Funnel arrows, acceptance tests, challenges incomplete “done” |
| **Vector** | Trace infra, implement against this contract, deploy, attach evidence per arrow |
| **Live systems** | Source of truth — MailerLite, Stripe/Squarespace commerce, Netlify Forms/logs, analytics |

---

## 9. Explicit non-goals (this freeze)

- Rebuilding Squarespace on new hosting
- Merging Archive + storefront into one app
- Making Access Code capture email
- Shipping homepage Buy Digital into unproven/broken Stripe
- Declaring funnel complete because a form showed a success toast

---

**Approval:** Jon signs off on this architecture + inventory. Then Vector implements only approved arrows; QA audits destination systems against §6 before launch.
