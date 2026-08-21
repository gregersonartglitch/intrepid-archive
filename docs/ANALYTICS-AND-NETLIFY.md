# Low-friction analytics + Netlify note

**Date:** 2026-07-18  
**Status:** Recommendation — pick one analytics path before coding  

## Do we track guests today?

**No useful product analytics.** Archive entry and reader are mostly static JS + `localStorage`. We do **not** know:

- how many people open the archive  
- code vs guest path (guest is off anyway)  
- Issue 1 → Issue 2 paywall drop-off  
- PDF download clicks  

Stripe Checkout is the only path that already captures email (paid unlock). MailerLite tracks email campaigns, not the site.

---

## Notify list (name + email when public)

**Shipped (build 196):** Netlify Form `hollowlands-follow` on the archive entry screen.

- Fields: **preferred nickname** + **email** + **explicit marketing opt-in** (unchecked by default, required to submit)
- Stored with submission: `marketing_opt_in=yes`, `opt_in_at` (ISO), `opt_in_source` (`archive-entry-follow` on guest notify; `archive-post-unlock` on the backer newsletter card)
- Copy: guest “No access word? Get notified…”; post-unlock “Stay connected with Intrepid Dusk” / Join the email list
- Submissions: Netlify dashboard → **Forms** → `hollowlands-follow`
- MailerLite path: export CSV → import only rows with `marketing_opt_in=yes`; put `archive-post-unlock` into group **Intrepid Dusk — Archive Opt-ins** (no API keys in the browser). See [`docs/archive-optin-implementation.md`](archive-optin-implementation.md).
- Kill switch: `ENABLE_FOLLOW_SIGNUP = false` in `index.html`, or `localStorage.setItem('intrepid_follow_signup_disabled','1')`
- Not a hard gate — codes stay primary; guest remains separate

### Later upgrade

Point the same UI at a **MailerLite** embed/API if you want campaigns from that list (export CSV from Netlify Forms → import, or swap the fetch target).

### Avoid for v1 waitlist

- Building a custom Netlify Function + DB unless Forms spam becomes a problem  
- Requiring email to *read* Issue 1 (conflicts with soft v1.1 framing in `email-gate-proposal.md`)  
- Collecting email only at Stripe (misses free readers who never pay)

### Best guess (historical)

~~MailerLite embedded form~~ — deferred; Netlify Forms is live first.
Optional encourage-at-paywall: “Get Hollowlands updates” checkbox — still not required for `scribe4`.

---

## Low-friction analytics options (recommended order)

### A. Netlify Analytics (check Pro dashboard first)
- **Friction:** Lowest if already included or one-click on the site  
- **Gets you:** page views, unique visitors, top pages, client errors  
- **Misses:** custom events (PDF click, code unlock, letter found) unless you add something else  
- **Action:** Netlify → site → Analytics — confirm whether Pro $19–20/mo includes it or it’s an add-on  

### B. Plausible / Fathom / Umami (privacy-first, one script)
- **Friction:** ~30 min — one script tag + dashboard  
- **Gets you:** uniques, referrers, pages; custom events with tiny JS helpers  
- **Fit:** Best for “how many people came from the beta email?” without Google cookie banners  
- **Recommendation if Netlify Analytics is weak:** **Plausible** (or Fathom) on `archive.intrepidgraphicnovel.com` only  

### C. Tiny first-party beacon (Netlify Function)
- **Friction:** half day  
- **Gets you:** events you define (`entry_code`, `entry_guest`, `pdf_download`, `letter_found`) with **no PII**  
- **Fit:** Pair with A or B later; don’t start here unless you need custom funnels this week  

### D. MailerLite only
- **Friction:** zero new site code  
- **Gets you:** email open/click only — **not** guest map/reader behavior  
- **Use for:** invite campaign + waitlist sends; not a substitute for site analytics  

### Not recommended now
- Google Analytics / full ad pixels (consent overhead, overkill for beta)  
- Requiring email at entry before Stripe v1.1 framing is ready (`docs/email-gate-proposal.md`)

**Suggested call:** Enable **Netlify Analytics if free/included**; otherwise add **Plausible**. For notify: **Netlify Form `hollowlands-follow` is live** (build 196); MailerLite import later if you want campaigns.

---

## Netlify Pro + auto-recharge

- **Pro ~$20/mo** covers a fixed bandwidth/build allotment — enough for this archive if you’re not hotlinking huge assets repeatedly.  
- **Auto-recharge** only matters when you **exceed** the plan (overage). On Pro you can usually **turn auto-recharge off** and rely on the monthly quota; watch the bandwidth graph during invite week.  
- Earlier “turn auto-recharge on” advice was from the **credits-exhausted / blocked deploy** incident before Pro. With Pro active, **freeze deploys during invite** matters more than auto-recharge.  
- **Jon:** confirm in Netlify Billing that Pro is active and toggle auto-recharge to match comfort (off is fine if you’ll notice overage emails).

---

## Guest countdown

- **Removed (build 195+):** `WANDERER_UNLOCK_AT = ""` — no timer on the entry screen.  
- Guest stays paused via `ENABLE_GUEST_ENTRY = false` until you flip it.  
- To restore a countdown later, set e.g. `"2026-08-16T00:00:00Z"` again.
