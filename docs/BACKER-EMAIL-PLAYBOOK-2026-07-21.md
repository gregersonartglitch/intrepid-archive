# Backer Email Playbook — Intrepid Dusk Digital Archive

**Prepared:** 2026-07-21  
**For:** Jon Gregerson  
**Ship window:** ~3 days  
**Live surface:** https://archive.intrepidgraphicnovel.com  
**Current prod build:** 210 (verify before send)

---

## A. Strategy

### Email philosophy — what makes digital rewards feel premium

Digital delivery has no box, no weight, no ribbon. The email *is* the unboxing. Backers who waited months do not want a receipt. They want a threshold crossed.

Patterns from successful creator fulfillment (Kickstarter updates, BackerKit distribution, Gumroad reward sends, onboarding sequences):

| Pattern | Why it works | Intrepid application |
|---------|--------------|---------------------|
| **Ceremony before credentials** | A line or two of story before the code feels like opening a lid, not reading a receipt | Lead with *what they are entering*, not *what tier they bought |
| **Layered reveal** | Physical unboxing works because items appear in sequence, not all at once | Day 0 = access. Day 3 = one hidden feature. Day 7 = one deeper cut |
| **Personal sender** | "Jon" outperforms "Intrepid Dusk Team" on open and reply | Send from Jon's name; sign as Jon |
| **One job per email** | Follow-ups with one CTA keep opens high through the sequence | Access email ≠ PDF tutorial ≠ map guide |
| **Instructions as invitation** | "Enter the archive" beats "Redeem your digital reward" | Match the gate copy already on the site |
| **Honest boundaries** | Creators who over-promise in the access email pay in support tickets later | Physical separate, guest paused, no login/account |
| **Support with dignity** | Ask for browser + build number; reply personally | You are small enough that this is a feature |

**What to avoid**

- Subject lines that sound like password resets ("Your download link")
- Leading with the URL and burying the code (guest entry is OFF — the code is the key)
- Promising features not live yet (public guest window, accounts, push notifications)
- Adding all backers to a marketing list without opt-in (Kickstarter terms; use KS messaging or explicit opt-in on the archive follow form)
- Generic "thank you for your support" with no sense of place

**Tone anchor:** Literary but clear. You are opening a door into a world, not fulfilling an SKU.

---

### Single launch email vs mini-sequence

**Recommendation: mini-sequence (4 emails over 10 days).**

A single "here's your link" email satisfies logistics but not the "keeps giving" goal. A short sequence costs almost nothing in MailerLite/Kickstarter and extends the reward across two weeks — long enough that backers discover the archive at different depths.

| Email | Timing | Audience | Single purpose |
|-------|--------|----------|----------------|
| **1 — The Opening** | Day 0 (send day) | All digital backers | Access + ceremony + step-by-step |
| **2 — First discovery** | Day 3 | Split by tier | Reader: PDF tip · Cartographer: map tip |
| **3 — Second room** | Day 7 | Split by tier | Reader: dossier · Cartographer: Sabella letters + PDF |
| **4 — Still ahead** | Day 10–14 | All | Tease future drops; invite reply/KS comment |

Day 0 must stand alone. If Jon only has bandwidth for one email, send Email 1 and schedule Email 2 manually when ready. Do not delay access waiting for the full sequence.

**Why not longer?** After Day 14, switch to normal KS project updates. The sequence is onboarding, not a newsletter rebrand.

---

### Tier-specific variants

Same URL for everyone. Different **access word** and **second-room content**.

| Tier | Code | Day 0 includes | Day 3 focus | Day 7 focus |
|------|------|----------------|-------------|-------------|
| **Reader backer** | `scribe4` | Volume 1 (Issues 1–3), Character Dossier, PDF | Download PDF walkthrough | Character Dossier — who to meet first |
| **Cartographer** | `hollowlands9` | Everything above + Cartographer's Atlas (fog-of-war map) | Golden glow / journey path | Sabella's letters + PDF for offline reading |

Cartographer is a superset — they get one code (`hollowlands9`), not two. Do not send Cartographers `scribe4` unless troubleshooting.

**List segmentation:** Use Kickstarter Backer Report **saved views** filtered by reward/SKU (not a hand-built email list). Day 0 = two KS bulk sends (Reader view → `scribe4`; Cartographer view → `hollowlands9`). Day 3/7 follow-ups may use KS messaging or a private mail tool for copy only — fulfillment status stays in Kickstarter.

---

### Subject line options

Pick one for Day 0; keep the others for follow-ups or A/B on a small test batch.

1. **Your archive is open — Intrepid Dusk Volume 1**
2. **The Hollowlands await** *(body carries the code)*
3. **You backed the story. Here is the archive.**
4. **Three issues. One archive. Begin.**
5. **Access word enclosed — Intrepid Dusk digital delivery**
6. **Volume 1 is yours** *(Cartographer variant subhead in preview text)*
7. **The Cartographer's Atlas is ready** *(Cartographer-only send)*
8. **What you waited for** *(preview: "The digital archive is live for backers.")*

Preview text (MailerLite): *Your access word is inside. Guest preview stays closed until August.*

---

### Pre-send checklist

**Access & prod (do in incognito)**

- [ ] https://archive.intrepidgraphicnovel.com loads; console shows `[Intrepid Map] build 210` (or current intended build)
- [ ] Guest entry is OFF — entry screen asks for access word; no "Continue as guest"
- [ ] `scribe4` at entry → hub unlocks reader + dossier; Issues 2–3 readable; Issue 1 always open
- [ ] `hollowlands9` at entry → hub unlocks map + reader + dossier; map loads; cartographer gate skipped if entered at entry
- [ ] `scribe4` does **not** unlock map (critical invariant)
- [ ] Reader: fast-flip Issue 1 → 2 → 3 — no sustained white pages
- [ ] Reader: **Download PDF** (top left) → Volume 1 full (72p) + chapters 1–3 download for backer
- [ ] Dossier portraits load (spot-check Elena, Atrus, Namin)
- [ ] Mobile pass on one phone: entry → reader → one PDF download

**Fulfillment ops (Kickstarter is primary — see `docs/WAVE1-KS-FULFILLMENT.md`)**

- [ ] Saved Backer Report views: **Wave 1 — Reader/PDF** (Digital / Early Bird / Explorer) and **Wave 1 — Cartographer Atlas** (Cartographer+)
- [ ] Filter by reward/item/SKU — not a typed email list
- [ ] Full Backer Report exported as a **dated CSV** and stored privately (PII — not in general project folders)
- [ ] Wave 1 sent via **Kickstarter bulk actions** per saved view (not Gmail/MailerLite as primary)
- [ ] Correct access word per view only: `scribe4` vs `hollowlands9`
- [ ] Digital reward marked sent in Kickstarter; Apple/private-relay backers covered by KS delivery
- [ ] Plain-text copy ready (below) for paste into KS digital-reward message
- [ ] Support macro ready: "Send browser, device, build number from console, screenshot"
- [ ] **No public marketing** until Wave 1 is sent and tracked in KS (drafts alone do not open the gate)

**Copy & promises**

- [ ] Email includes URL **and** access word (URL alone is useless while guest is off)
- [ ] Physical rewards mentioned as separate shipment — this email is digital only
- [ ] No promise of public/guest access before August
- [ ] No promise of login accounts or "we'll email you the PDF" — PDF is self-serve in reader
- [ ] Cartographer email mentions golden glow; does not promise features on hold (basin gates, map atmosphere, etc.)

**After send**

- [ ] Monitor replies 48 hours — first-day friction shows up fast
- [ ] KS comment or update pointing to "check your email" (do not post codes publicly)
- [ ] Do not tweet/post naked archive URL as "open to all"

---

## B. Draft email copy

### Email 1 — Day 0 · Primary (Reader tier)

**Subject:** Your archive is open — Intrepid Dusk Volume 1  
**Preview:** Your access word is inside. The full Volume 1 reader, dossier, and PDF await.

---

*Plain-text structure below. In HTML, keep the same order: story → code → steps → boundaries → support → P.S.*

---

You backed Intrepid Dusk when it was still a promise. The archive is open now — not a file attachment, a place.

**Your access word:** `scribe4`

**The archive:** https://archive.intrepidgraphicnovel.com

This is a backer-first window. Guest preview on the site stays closed until mid to late August, so you will need your access word to enter. That is intentional. You get the first walk through the door.

---

**What is inside**

- **Volume 1 Reader** — Issues 1, 2, and 3 in a page-flip reader built for this story
- **Character Dossier** — the cast, in depth
- **Digital PDF** — 72 pages (68 story + 4 bonus sketch pages), yours to keep. Download from inside the reader — full volume or by chapter

Issue 1 is always open once you enter. Your access word unlocks Issues 2 and 3 and the dossier.

---

**How to enter (about two minutes)**

1. Open https://archive.intrepidgraphicnovel.com
2. On the entry screen, type your access word: **scribe4**
   - Use the eye icon if you want to see what you typed
   - Tap **Unlock Archive**
3. On the archive home, choose:
   - **Read Issue 1** — starts the Volume 1 reader (Issues 1–3)
   - **Character Dossier** — browse the cast
4. **To download the PDF:** open Volume 1 → **Download PDF** (top left) → choose full volume or a chapter

The access word is entered once on this device. If anything looks stuck, try a hard refresh or an incognito/private window.

---

**A note on physical rewards**

If your pledge included printed books or other physical items, those ship on their own timeline. This email is only about your **digital archive access**, which is live now.

---

**If something breaks**

Reply to this email. Tell me:

- Browser (Chrome, Safari, Firefox, etc.) and phone or computer
- What you clicked and what you expected
- Screenshot if you can

If you are comfortable checking one technical detail: open the browser console and look for `[Intrepid Map] build 210` — that confirms you are on the current archive.

---

**P.S.** This is the first room, not the only one. I will send a short note in a few days with one thing most readers miss on their first pass. There is more ahead — including material that has not dropped yet.

Thank you for backing this when it was still ink and nerve.

— Jon

---

### Cartographer tier — Day 0 addendum

*Use as a separate send, or replace the Reader blocks above with this version for Cartographer backers.*

**Subject option:** The Cartographer's Atlas is ready  
**Preview:** Your Cartographer access word unlocks the map and the full Volume 1 archive.

---

Everything in the Reader email applies — with one difference.

**Your access word:** `hollowlands9`

Same archive URL: https://archive.intrepidgraphicnovel.com

Your word unlocks **everything** Reader backers receive, plus:

**The Cartographer's Atlas** — an interactive fog-of-war map of the Hollowlands. Discover locations to clear the fog. Follow the **golden glow** — it marks the next step on the journey path.

After you unlock at the entry screen, the archive home shows three doors: **Read Issue 1**, **Character Dossier**, and **Cartographer's Atlas**. You do not need a second code.

**Cartographer tips for your first session**

- The map rewards exploration — click glowing beacons when you find them
- After the tutorial at Sabella's Hut, follow the golden glow toward **Monastery of the Wind** (not every named place on the map is the next journey step)
- **Sabella's letters** live in the map's Secrets — they are part of the path toward the finale
- Volume 1 reader and PDF work the same as Reader tier: open Volume 1 → **Download PDF** (top left)

Use **hollowlands9** only. The Reader code (`scribe4`) does not open the map — by design.

---

### Email 2 — Day 3 · Reader variant

**Subject:** One thing people miss — your PDF is already inside  
**Preview:** No waiting on a separate email. Download from the reader.

---

You have had a few days with the archive. Here is the move most people skip on the first visit:

**Download the PDF from inside the reader.**

1. https://archive.intrepidgraphicnovel.com → enter with **scribe4**
2. Open **Volume 1**
3. Top left: **Download PDF**
4. Choose **Volume 1 (full, 72p)** or a single chapter

The file is yours to keep — offline reading, tablet markup, printing a favorite page. No separate delivery email. It is already there.

If the menu does not appear, confirm you entered your access word at the archive entry (not only at the Issue 2 paywall inside the reader).

Reply if the download fails — tell me browser and device.

— Jon

---

### Email 2 — Day 3 · Cartographer variant

**Subject:** Charting tip — follow the glow  
**Preview:** The map opens in fog. The golden glow is your compass.

---

By now you may have walked the reader. The Atlas plays by different rules.

**First session on the map**

1. Enter with **hollowlands9** → open **Cartographer's Atlas**
2. Early on, only one location will call to you — follow that pull through the tutorial
3. After Sabella's Hut, watch for the **golden glow**. That is the next step on the journey — not every labeled place is ready yet
4. Orange beacons mark territories. Yellow beacons mark sites on the path. Both appear as you clear fog nearby

The map remembers your progress on this device. If the fog looks wrong after an update, hard refresh once.

I will send one more note about Sabella's letters and the PDF — two different ways to live in the same story.

— Jon

---

### Email 3 — Day 7 · Reader variant

**Subject:** Meet the dossier  
**Preview:** The reader gives you the story. The dossier gives you the people.

---

Volume 1 moves fast. The **Character Dossier** is where the people slow down.

From the archive home: **Character Dossier**

Start wherever curiosity pulls you. If you want a nudge: the dossier is built to reward returning after you have read a few issues — names land differently once you have seen them on the page.

Your access word is the same: **scribe4**

— Jon

---

### Email 3 — Day 7 · Cartographer variant

**Subject:** Two archives — page and path  
**Preview:** The PDF for the train. The map for the slow uncovering.

---

You have two full archives:

**The reader + PDF** — the comic as designed. Page curl, chapter flow, download for offline.

**The Atlas** — the same world with fog on it. Explore, discover, follow the glow.

One layer many Cartographers miss: **Sabella's letters** in the map Secrets. They are not optional flavor — they count toward the path.

**Quick PDF reminder:** Volume 1 → **Download PDF** (top left) → full 72-page volume.

If you have only done one of the two — reader or map — try an evening with the other. They were built to answer each other.

— Jon

---

### Email 4 — Day 10 · All backers

**Subject:** Still more to come  
**Preview:** You are early. The archive will grow.

---

You are in the first cohort through the door — before guest preview, before the public walk-through in August.

I am not done adding to this world. You will hear from me again when there is something worth your time — not on a schedule for its own sake.

If you have read through Volume 1 or charted a good stretch of the map, I would genuinely like to know: what landed? What confused you? Reply to this email, or leave a comment on the Kickstarter update. I read them.

Your access words do not change:

- Reader: **scribe4**
- Cartographer: **hollowlands9**

Archive: https://archive.intrepidgraphicnovel.com

Thank you again for backing this when it was still a bet.

— Jon

---

## C. "Keeps giving" mechanics

Actionable ideas ranked by effort. Prefer items Jon can run from email + KS comments without a deploy.

### No new code (Jon can do this week)

| Idea | How | Keeps giving because |
|------|-----|---------------------|
| **Numbered "keys" in email** | "You hold Key 1 of 3 this month" in Day 0 / 3 / 7 | Creates anticipation for the next email |
| **KS comment drops** | Short weekly comment: map screenshot, one dossier portrait, one line of lore — no codes | Backers who live in KS see activity; no spam risk |
| **Reply-to unlock lore** | "Reply with the name of the first location you discovered" → Jon sends 1 paragraph private reply | Personal, memorable, zero engineering |
| **Calendar reminder** | ICS or Google Calendar link: "Return to the Hollowlands — 30 min" | Gentle re-open without push notifications |
| **"First discovery" prompt** | Day 3 email asks one question; Day 10 summarizes anonymized replies in KS update | Community without building a forum |
| **Reading order card** | PDF is self-serve; email suggests: Reader Issue 1 → Dossier entry → Issue 2–3 → PDF archive | Reduces "what do I click?" support |
| **Magnify opt-in mention** | One line in Day 7: optional reader magnify exists in settings/localStorage — not required | Power users feel seen |
| **Physical-digital bridge** | "When your print edition arrives, the PDF is the same pages — compare if you like" | Connects two fulfillment tracks |

### Needs Vector / light engineering later (flagged)

| Idea | Why flagged | Notes |
|------|-------------|-------|
| **Unique CART URLs per backer** | Already supported (`?key=CART-*`); bulk generation + mail merge is ops | Stronger than shared `hollowlands9`; more support if links leak |
| **Email at code redemption (v1.1)** | `docs/email-gate-proposal.md` — opt-in value exchange, not hard block | "Get PDF updates + Hollowlands mail" skippable |
| **Automated MailerLite branch on tier** | Requires list import + tags from KS export | Day 3/7 splits become one-click |
| **Webhook PDF email for Stripe guests only** | Paid guests ≠ code backers; backers self-serve PDF today | Do not promise in backer email |
| **Reply keyword auto-responder** | Netlify function + lore snippet bank | Fun but build + maintain |
| **Progress "postcard" image** | Generated share card from map progress | Pretty; not needed for launch |
| **Scheduled KS API updates from deploy log** | Over-automation for n≈backer count | Manual KS comments fine for now |

**Launch recommendation:** Run the 4-email sequence + weekly KS comment drops + reply-to lore for engaged backers. Defer email gate and unique URLs until after the first wave settles.

---

## D. 3-day prep timeline for Jon

Assume **send day = Day 0** (adjust dates to your actual send).

### Day −3 (today) — Prove the archive

| Block | Task |
|-------|------|
| Morning | Incognito QA: `scribe4` and `hollowlands9` full paths (checklist above) |
| Morning | Confirm prod build stamp matches expectation (`210` at time of writing) |
| Afternoon | Export KS backer lists → Reader vs Cartographer segments |
| Afternoon | Paste Email 1 drafts into MailerLite (or KS message composer); set From: Jon |
| Evening | Identify Apple ID / privaterelay backers for personal watch |

### Day −2 — Rehearse the send

| Block | Task |
|-------|------|
| Morning | Test emails to yourself + 1 Android + 1 iOS mailbox |
| Morning | Cartographer path: entry → map → one discovery → hub → reader → PDF download |
| Afternoon | Reader path: entry → Issue 1→2→3 speed flip → PDF full volume download |
| Afternoon | Schedule Email 2 (Day 3) and Email 3 (Day 7) drafts — tier-segmented |
| Evening | Write support macro; block 2× 30 min reply windows for Day 0–1 |

### Day −1 — Lock and breathe

| Block | Task |
|-------|------|
| Morning | Final prod spot-check; no deploy unless Sev-0 |
| Morning | Confirm guest entry still OFF; entry copy still says August for public |
| Afternoon | Schedule Day 0 send (Tuesday–Thursday morning sends perform well for creator mail) |
| Afternoon | Draft short KS update: "Digital archive email arriving — check spam; need Apple ID email fix? reply" |
| Evening | Do not rewrite the emails unless QA found a factual error |

### Day 0 — Send

| Block | Task |
|-------|------|
| Send | Reader email to Reader segment; Cartographer email to Cartographer segment (or unified with clear tier blocks) |
| +2 h | Post KS update pointing to email — **no codes in the update** |
| Same day | Monitor replies; fix individual access issues manually |
| Day 1–2 | Personal replies; log recurring friction for Vector |

### Day 3 / 7 / 10 — Sequence

| Day | Action |
|-----|--------|
| 3 | Send tier-specific "first discovery" email |
| 7 | Send tier-specific "second room" email |
| 10 | Send "still ahead" email; optional KS comment summarizing early reactions |

---

## Quick reference

| Item | Value |
|------|-------|
| Archive URL | https://archive.intrepidgraphicnovel.com |
| Reader code | `scribe4` |
| Cartographer code | `hollowlands9` |
| Reader unlocks | Issues 2–3, dossier, PDF download in reader |
| Cartographer unlocks | Map + all Reader perks |
| PDF | Self-serve: Volume 1 → Download PDF (top left); 72p full or by chapter |
| Guest preview | OFF until mid–late August |
| Physical rewards | Separate fulfillment — not this email |
| **Primary delivery** | **Kickstarter Backer Report bulk actions** (see `docs/WAVE1-KS-FULFILLMENT.md`) |
| Gmail / MailerLite | Copy staging / support only — not the fulfillment system of record |
| Prod build (verify) | Current prod tag (check `index.html` `INTREPID_BUILD`) |

---

*Sources: repo handoff (`AGENT-HANDOFF.md`, `docs/BETA-GO-LIVE-2026-07-13.md`, `docs/SESSION-HANDOFF-2026-07-17.md`), live UI copy (`index.html`, reader overlay), Kickstarter/BackerKit digital distribution docs, creator onboarding sequence patterns (FluentCRM, Scale Growth Digital).*
