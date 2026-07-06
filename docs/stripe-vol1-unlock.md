# Stripe Vol. 1 Unlock — Settled Spec (v1)

**Status:** SETTLED (Jon + user, 2026-07-06). Architecture locked before any Stripe coding.
**Scope:** Spec only — do not implement from this doc without a separate build task.

## What this is

A guest pay path at the Issue 2 boundary in the reader: non-backers pay a one-time fee to unlock Issues 2 & 3 of Volume 1 **and receive a PDF when available**. Backer codes keep working unchanged. The map is NOT included — Cartographer access stays `hollowlands9`.

**This is friction, not DRM.** Page images are statically served; a paywall cannot stop a determined scraper and should not try. The unlock uses the same trust level as existing backer codes. No accounts, no license server, no signed assets.

---

## Pricing rule (LOCK pending KS confirm)

**Goal:** Backers who pledged early must not feel like suckers.

| KS Wanderer / digital tier | Guest Stripe price | Rationale |
|---|---|---|
| **$15** | **$14** | Guest pays slightly less for less: no updates, extras, or credits |
| **$12** | **$15** | Guest pays more than early backers; backers keep the better deal |

- **Confirm actual KS Wanderer/digital tier price before locking.**
- Until confirmed, treat price as **TBD ($14 or $15)** in copy and Stripe catalog.
- **Backers unlock via backer code** (not a second Stripe charge). That code is the Wanderer KS benefit.

---

## Architecture v1 (NO webhook)

```
Flip to Issue 2 → paywall (backer-gate overlay, reused)
  → [Unlock Issues 2 & 3 — $X]
  → Netlify Function: create-checkout
      creates Stripe Checkout Session (secret key server-side only)
      success_url: /reader/intrepid-dusk-volume-1/?session_id={CHECKOUT_SESSION_ID}
      cancel_url:  /reader/intrepid-dusk-volume-1/  (back at boundary, no nag)
  → Stripe hosted Checkout (no card fields on our site)
  → on success, reader boot sees ?session_id → calls verify-session
  → Netlify Function: verify-session
      retrieves session from Stripe by id (server-side, secret key)
      requires payment_status === 'paid'
      returns { unlock: true }
  → reader sets intrepid_reader_issue_002 / intrepid_reader_issue_003 = 'granted'
      (SAME keys scribe4 sets — one unlock mechanism downstream)
  → strip session_id from URL (history.replaceState), land on Issue 2 page 1
```

### Why verify-session instead of webhook (decided, final)

- A webhook cannot inject a token into Stripe's static `success_url` redirect — webhook-only drafts had a wiring hole.
- `verify-session` gives the same security property: unlock is decided server-side against Stripe's API and cannot be faked from the URL alone.
- Half the code: no signature verification, no event handling, no queue.
- **Webhook deferred** until Sheets/MailerLite push is needed. When added, it must never become part of the unlock path.

### Storage & restore (v1)

- **localStorage unlock is OK for v1.**
- Lost-device restore: manual via Stripe receipts until volume justifies automation.

### Security invariants

1. Never unlock from `success_url` alone — `verify-session` must confirm `payment_status === 'paid'` server-side on every unlock.
2. `STRIPE_SECRET_KEY` lives in Netlify env vars only. Never in the repo, never in client JS. Publishable key is not needed (hosted Checkout).
3. `verify-session` returns only `{ unlock: true|false }` — no customer data to the client.
4. Guest unlock sets Issues 2–3 ONLY. No code path may set `intrepid_cartographer_unlocked`.
5. Session replay: `verify-session` rejects sessions older than 24h (`created` timestamp on the Checkout Session). A shared success-URL therefore goes stale within a day. Accepted residual risk for v1: within that window a replayed URL re-unlocks — same trust level as sharing a backer code. Server-side "mark consumed" needs a datastore and is deferred to v1.1.

---

## PDF delivery (guest paid unlock)

**User requirement:** Paid guest unlock ($14/$15) includes PDF delivery once the PDF is available.

### Bundle

| Component | When | How |
|---|---|---|
| **Reader Issues 2–3** | Immediate on successful payment | `verify-session` → localStorage unlock (same as today) |
| **PDF (Issues 2–3 or full volume TBD)** | When PDF is ready | Emailed to the address Stripe Checkout collects |

- **Reader unlock is NOT blocked on PDF readiness.** Payment unlocks the reader immediately; PDF fulfillment is a separate, async step.
- Guest pays once for both; no second charge when the PDF ships.

### Backers (KS codes) — separate path

- Backers with KS codes get PDF via **Kickstarter fulfillment** (KS update / backer portal).
- Do **not** duplicate PDF delivery through Stripe for code unlocks.
- Backer code path: reader unlock only in v1; PDF stays on the KS fulfillment track.

### v1 fulfillment (before automation)

1. **Stripe Checkout collects customer email** (default Checkout behavior).
2. Until automated email is wired:
   - **Manual:** Jon/ops sends PDF to Checkout email when file is ready (export from Stripe session/receipt).
   - **Interim UX:** Success landing or post-purchase copy may say PDF is **coming soon** and will arrive at that email — reader still unlocks immediately.
3. Automation (webhook → MailerLite or transactional email) is **v1.1+**; must not gate reader unlock.

### Stripe product copy

Product name and description must state that the purchase includes **digital reader access now** and **PDF delivery when available** (emailed to purchase email). Example description line:

> Digital reader access to Issues 2 & 3 now. PDF delivered to your email when available.

---

## Prerequisites (in order — everything gates on #1)

1. **Deploy unblocked.** Functions only exist after a real Netlify deploy. CLI currently throws Forbidden; dashboard drag-drop does not reliably deploy functions. Fix: re-auth (`netlify logout && netlify login`) or PAT (`NETLIFY_AUTH_TOKEN`). Durable fix: **git remote + Netlify CI** (recommended).
2. Jon: Stripe account in **test mode**, product created, keys in **Netlify env only** (not repo).
3. Jon: confirm KS Wanderer/digital tier price → lock $14 vs $15.

---

## Paywall UI

Reuse **backer-gate** overlay — no new visual language.

**Three actions (order matters):**

1. **Unlock Issues 2 & 3 — $X** (primary → `create-checkout` → Stripe)
2. *I have a backer code* (text link → reveals existing code input)
3. *Keep reading Issue 1* (existing dismiss — never trap the reader)

**Approved copy** (voice-checked; no em-dashes):

> **You've finished Issue 1.**
> Issues 2 and 3 are ready when you are. Backers already have a code from their Kickstarter update. Everyone else can unlock the rest of Volume 1 for $[14 or 15].

Paywall copy may optionally mention PDF included when available; primary CTA stays reader unlock. Full PDF promise lives in Stripe product description and post-purchase messaging.

**Success landing:** Issue 2, page 1 (no resume logic). If PDF not ready, interim line on success path: PDF coming to your purchase email.

---

## Stripe catalog

| Field | Value |
|---|---|
| **Product** | Intrepid Dusk Vol. 1 — Issues 2 & 3 (Digital) |
| **Description** | Reader access now + PDF emailed when available (see PDF delivery section) |
| **Price** | TBD per pricing rule above ($14 or $15) |
| **Metadata** | `sku=ID-V1-I23-GUEST`, `audience=guest`, `volume=intrepid-dusk-v1` |

One-time purchase, lifetime, this volume only. Receipt: Stripe default. Checkout must collect customer email for PDF fulfillment.

---

## Analytics (counts only)

| Event | When |
|---|---|
| `paywall_view` | Paywall shown at Issue 2 boundary |
| `checkout_started` | User clicks primary unlock → redirect to Stripe |
| `purchase_success` | `verify-session` returns unlock after paid session |

No PII in analytics payloads for v1.

---

## Files (when implemented)

| File | Purpose |
|---|---|
| `netlify/functions/create-checkout.js` | POST → Checkout Session, returns redirect URL |
| `netlify/functions/verify-session.js` | GET `?session_id=` → `{ unlock }` after server-side check |
| `netlify.toml` | Functions dir config |
| `reader/backer-gate.js` | Paywall UI + unlock wiring |

**Reader sync:** If overlay/volume-1 copies diverge, run `apply-reader-patches.ps1` from repo root (build-95 lesson: never `git checkout --` uncommitted reader files; stash first).

---

## Build sequence

1. Unblock deploy + ship **build 99** (entry→home, gate fixes)
2. `netlify/functions/create-checkout.js` + `verify-session.js` + `netlify.toml`
3. `reader/backer-gate.js` paywall + `apply-reader-patches.ps1` if needed
4. Test: card `4242 4242 4242 4242` → `verify-session` → unlock lands on Issue 2
5. Jon: one live test purchase at locked price ($12 or $14 tier per KS confirm) → flip live keys in Netlify env

---

## NOT in v1

- Webhook (Sheets/MailerLite push; includes automated PDF email)
- Automated PDF delivery email (manual send or "coming soon" copy until then)
- PDF delivery for backer-code unlocks (KS fulfillment only)
- DRM (static assets — friction + honesty only)
- `restore-by-email` function
- Guest email capture on landing (separate track)

---

## Test checklist (before live)

- [ ] Paywall appears at page-22 flip for a fresh guest; dismiss returns to Issue 1
- [ ] Backer code path unchanged (`scribe4` unlocks, no Stripe involved)
- [ ] Test card completes → lands on Issue 2 page 1, issues 2+3 unlocked
- [ ] Refresh after unlock: still unlocked (localStorage), `session_id` gone from URL
- [ ] Tampered/expired/unpaid `session_id` → no unlock, graceful fallback to paywall
- [ ] `hollowlands9` map gate untouched (auth isolation)
- [ ] Cancel from Stripe → back at boundary, paywall re-openable, no error
- [ ] Reader unlocks immediately even when PDF is not yet available
- [ ] Stripe product description mentions PDF when available
- [ ] Guest Checkout email captured; manual PDF send process documented for ops

---

## Decisions locked

| Question | Decision |
|---|---|
| Product | One-time, lifetime, Volume 1 Issues 2–3 reader + PDF when ready |
| Guest bundle | Reader immediate; PDF emailed to Checkout email when available |
| Backer PDF | KS fulfillment only — do not duplicate via Stripe |
| Backer path | Backer code only — no second Stripe charge |
| Guest path | Stripe Checkout + `verify-session` |
| PDF vs reader | Reader unlock never blocked on PDF readiness |
| Success landing | Issue 2, page 1 |
| Mode | Test mode first; live only after Jon's real purchase |
| Restore (lost device) | Manual via Stripe receipt; restore-by-email is v1.1 |
| PDF automation | Manual or "coming soon" in v1; automated email is v1.1+ |
