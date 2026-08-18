# Wave 1 login test matrix

Run **before** Kickstarter bulk send. Automated first, then incognito browser on **prod**.

```bash
node --check fog.js
node --check archive-access.js
node --check scripts/smoke-backer-login.js
node scripts/smoke-backer-login.js
# optional local server:
# npx http-server . -p 8080 --cors -c-1
# AUDIT_BASE=http://127.0.0.1:8080 node scripts/smoke-backer-login.js
```

The smoke script executes the full code matrix **twice**, then hits live prod HTTP.

## Expected access (live code)

| Who | Word | Hub | Reader + PDF | Map |
|-----|------|-----|--------------|-----|
| Digital / Early Bird / Explorer | `scribe4` | Yes | Yes | **No** (second gate; “reader only” error) |
| Cartographer+ | `hollowlands9` | Yes | Yes | Yes (no second code) |
| No word / guest | — | Entry screen | Deep links bounce home | Gate |

Guest entry is **OFF**. In-reader Issue 2 overlay is currently **OFF** (`ENABLE_READER_GATE = false`) — archive entry is the Wave 1 gate. Once a valid word is entered, Volume 1 reads through.

## Browser matrix (incognito each row; use `?reset` when returning to home)

| # | Action | Expected |
|---|--------|----------|
| B1 | Open archive URL, no code | Entry screen; Unlock Archive; no Continue as guest |
| B2 | Wrong word | Error; stay on entry |
| B3 | Eye icon | Password visible; aria-label flips to Hide; click again hides |
| B4 | `scribe4` (try `SCRIBE4`) | Hub. Reader + dossier open. Atlas still badged Cartographer |
| B5 | After B4, Cartographer’s Atlas | Map **gate**. `scribe4` here → “unlocks the reader only.” Map stays closed |
| B6 | Fresh incognito, `hollowlands9` | Hub. Atlas opens without a second code. Reader + PDF work |
| B7 | Reload after B6 | Still unlocked (no re-prompt) |
| B8 | Paste `/reader/intrepid-dusk-volume-1/` with no code | Redirected to archive entry |
| B9 | Paste `/dossier/` with no code | Redirected to archive entry |
| B10 | Bare URL only (no word) | Cannot reach map. Do **not** test or send `?key=CART-` in Wave 1 mail |

## Known (do not block Wave 1 send)

Page images and PDFs are statically fetchable if someone knows the path. Shared backer words are honor-system among backers. Public checkout is **not** this send. See Vol1 gate audit.

## After send

Track in Kickstarter: digital reward sent. Do not start public marketing because copy exists.
