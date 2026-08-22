# Reader / Archive Gate — Triage Brief (for multi-AI review)

**Date:** 2026-08-19  
**Status:** OPEN — client-side patches insufficient; need architecture decision before Wave 1 send  
**Live prod:** build **217** (as of triage) — branch `cursor/ks-fulfillment-sop-1ced` has builds **228–229** (not deployed from this agent’s environment)

---

## Problem statement

Backers receive access words (`scribe4`, `hollowlands9`) via Kickstarter. The archive entry screen is meant to gate Volume 1 reader + dossier. **Users can bypass the password** by pasting the reader URL directly in incognito:

```
https://archive.intrepidgraphicnovel.com/reader/intrepid-dusk-volume-1/
```

**Expected:** redirect to archive entry / password screen; Issues 2–3 not readable without code.  
**Observed (Jon, multiple incognito tests):** reader loads; content accessible without entering `scribe4`.

This blocks Wave 1 email send until we agree on an acceptable security model.

---

## Current architecture (honest model)

| Layer | What it does | Trust level |
|-------|----------------|-------------|
| **Archive entry** (`index.html` + `archive-access.js`) | Password → `localStorage` keys | Client-only |
| **Deep-link guards** (reader/dossier inline scripts) | Redirect if no keys | Client-only; bypassable |
| **In-reader gate** (`reader/backer-gate.js`) | Issue 2 modal if `ENABLE_READER_GATE` | Client-only |
| **Static assets** | WebP pages + PDFs at predictable URLs | **Fully public** (no auth) |

**Codes live in plaintext** in shipped `archive-access.js` (`scribe4`, `hollowlands9`).  
**Unlock state** is `localStorage` / `sessionStorage` only — no server session, no cookies, no signed tokens.

Existing project docs already state this explicitly:

- `docs/stripe-vol1-unlock.md`: *“This is friction, not DRM.”*
- `docs/WAVE1-KS-FULFILLMENT.md` links a gate audit noting assets are public static.

---

## Bypass vectors (confirmed in testing)

| Vector | Prod 217 | Branch 229 (local tests) |
|--------|----------|---------------------------|
| Paste reader URL, normal load | Usually redirects home | Redirects home |
| **`archive-access.js` blocked** (privacy ext, network fail) | **Full bypass** — fail-open guard, gate OFF | **Fixed** — inline `<head>` localStorage check |
| **`ENABLE_READER_GATE = false`** on prod | Issues 2–3 unlocked once reader bootstraps | Gate ON |
| **Direct asset URLs** | `page-022.webp`, PDFs fetchable | Same (unchanged) |
| **View source / console** | `grantReaderBackerAccess()` on `window` | Same |
| **Shared code** | `scribe4` in client JS | Same |

**Important:** Even “successful” client redirects do not protect assets. Anyone who knows paths can curl images. The UX bypass (paste URL → read in app) is what backers experience; asset URLs are a separate, harder problem.

---

## What we already tried (builds 228–229)

### Build 228
- `bootstrapPublicContentRoute()` — fail-closed if `archive-access.js` missing
- Defer `spike.js` until guard passes
- Hide body until `archive-access-granted`
- `ENABLE_READER_GATE = true`

### Build 229
- **Inline synchronous guard** in reader/dossier `<head>` checking `localStorage` keys before any external script
- `scripts/smoke-reader-deeplink.js` (Playwright: fresh session, blocked `archive-access.js`, hub path, `scribe4` positive control)

**Local result:** all automated + manual incognito tests PASS on build 229.  
**Prod result:** still build 217; Jon reports bypass persists (expected until deploy — but Jon may have deployed separately; prod curl still shows 217).

**Conclusion:** We are fighting symptoms of a **static-site auth model**. Each patch adds complexity; a determined user or a blocked script edge case can reopen holes. Further client-only iteration has diminishing returns.

---

## Constraints

- **Host:** Netlify static deploy from repo root (`netlify deploy --prod --dir .`)
- **No Netlify Functions in repo yet** (`netlify/functions/` absent; `netlify.toml` has routing stub only)
- **No accounts / license server** — product decision for v1
- **ES5 reader code** — IIFE, no module bundler
- **Wave 1 timeline** — emails blocked on gate confidence
- **Two tiers:** `scribe4` (reader+dossier), `hollowlands9` (+ map)
- **Password eye toggle** required on all gates (project rule)

---

## Solution options (for other AIs to weigh in)

### Option A — Accept “honor system + friction” (minimal change)

**Model:** Same as current spec intent — codes are shared secrets; gate stops casual sharing, not scrapers.

**Ship:** Deploy 229, send Wave 1, document that direct asset URLs exist.  
**Pros:** Fast; matches existing docs; no infra.  
**Cons:** Jon’s incognito test remains unacceptable if prod mis-deployed or extensions bypass; not suitable if “must not read without code” is a hard requirement.

**Wave 1 OK?** Only if Jon accepts friction-not-DRM publicly.

---

### Option B — Server-gated HTML shell, public Issue 1 only (medium)

**Model:**
- `/reader/intrepid-dusk-volume-1/` served by Netlify Function or Edge middleware
- Function checks **HttpOnly cookie** set after valid code entry (server validates code against env var list or hashed lookup)
- Static Issue 1 pages remain public; Issues 2–3 pages moved to `/protected/...` or served via signed URLs

**Pros:** Real gate on reader route; cookie survives better than localStorage-only redirect race.  
**Cons:** Requires functions + cookie auth path; Issue 2–3 assets still need rehost or signing; map/dossier need same pattern.

**Rough effort:** 2–4 engineering days + deploy/env setup.

---

### Option C — Signed URLs for Issues 2–3 assets (medium–high)

**Model:**
- Page WebPs and PDFs for gated content **not** in public `assets/pages/`
- After code verify (function), return short-lived signed URLs (Netlify Blobs, Cloudflare R2, or S3 presigned)
- Reader fetches images only with valid token

**Pros:** Closes the curl/`page-022.webp` hole; industry-standard for digital goods.  
**Cons:** Reader must load pages dynamically; CDN cache complexity; storage migration.

**Rough effort:** 1 week+ (reader refactor + asset move + function).

---

### Option D — Third-party digital fulfillment (low eng, ongoing cost)

**Model:** Deliver reader via Kickstarter/digital shelf (BookFunnel, Gumroad, etc.); archive site becomes marketing + map only.

**Pros:** Fulfillment + access control outsourced.  
**Cons:** Split UX; may not fit interactive reader/map bundle; KS native delivery limits.

---

### Option E — Stripe verify-session path only for guests; keep codes client-side (partial)

**Model:** Already spec’d in `docs/stripe-vol1-unlock.md` for paid guests — server verifies payment before unlock. **Does not fix backer code bypass** unless codes are also verified server-side.

**Pros:** Good for future public sales.  
**Cons:** Insufficient alone for Wave 1 backer gate.

---

## Recommended decision tree

```
Is “cannot read Issue 2+ without code” a HARD legal/business requirement?
├─ NO  → Option A: deploy 229, send Wave 1, document asset caveat
└─ YES → Is “curl page-022.webp” also unacceptable?
         ├─ NO  → Option B: cookie + protected reader route
         └─ YES → Option C: signed asset delivery (+ Option B for HTML)
```

---

## Questions for reviewing AIs

1. **Given static Netlify hosting and no backend today**, what is the **smallest** change that makes incognito deep-link bypass **impossible for a non-technical backer** (not scrapers)?

2. **Is inline `<head>` localStorage guard + deferred scripts sufficient**, or is a **HttpOnly cookie set by a Netlify Function** the minimum viable “real” gate?

3. **Should Wave 1 emails go out** under Option A with explicit “honor system” expectation, or should send wait for Option B/C?

4. **Where should gated assets live?** Same repo (bad), Netlify Blobs, R2, or obfuscated paths with edge auth?

5. **Single code table:** validate `scribe4` / `hollowlands9` server-side from env vars vs hashed list vs KS webhook — tradeoffs for ~N backers?

6. **Regression strategy:** what automated test proves prod is safe post-deploy (Playwright against prod incognito + blocked script scenario)?

---

## Immediate next steps (human)

1. **Confirm prod build** — View source on live site: `INTREPID_BUILD` should be ≥229 after deploy.
2. **Deploy or don’t** — If staying client-only, deploy 229 and re-test incognito; if still failing, stop patching and pick Option B+.
3. **Share this doc** with Antigravity / Fable / second-opinion agent for architecture vote.
4. **Wave 1 hold** until chosen option matches Jon’s risk tolerance.

---

## Key files

| File | Role |
|------|------|
| `archive-access.js` | Codes, localStorage, `hasPublicContentAccess()` |
| `reader/backer-gate.js` | Issue 2 modal, `ENABLE_READER_GATE` |
| `reader/intrepid-dusk-volume-1/index.html` | Deep-link guards (228/229) |
| `index.html` | Archive entry UI |
| `scripts/smoke-backer-login.js` | Code matrix smoke |
| `scripts/smoke-reader-deeplink.js` | Browser deep-link smoke |
| `docs/stripe-vol1-unlock.md` | Server verify pattern (Stripe) |
| `docs/WAVE1-KS-EMAIL-COPY.md` | Paste-ready emails (on hold) |

---

## Copy-paste prompt for other AI reviewers

```
You are reviewing a static-site backer gate for a Kickstarter graphic novel archive.

Site: https://archive.intrepidgraphicnovel.com (Netlify static)
Problem: Reader URL bypasses password in incognito despite client-side guards.
Codes: scribe4 (reader), hollowlands9 (map+reader) — currently in client JS.
Assets: WebP pages and PDFs are publicly fetchable if URL is known.

Read docs/READER-GATE-TRIAGE.md in the intrepid-archive repo and recommend:
(1) minimum viable fix for Wave 1 backer emails,
(2) whether client-only patches are worth continuing,
(3) concrete Netlify architecture (functions, cookies, signed URLs, asset rehost),
(4) test plan to prove prod is safe.

Constraints: no user accounts v1; ES5 reader; two access tiers; password eye toggles on all gates.
```
