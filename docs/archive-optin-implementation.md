# Archive entrances + MailerLite opt-in

**Build:** 246  
**Status:** AWAITING REVIEW — do not deploy  
**PR:** continue #2 on `cursor/archive-optin-1ced`

Two separate doors. Kickstarter messages should link to **`/backer/`**. The bare Archive URL is the public waitlist.

## A. Backer — `/backer/`

1. Required choice: “Would you like occasional updates about Intrepid Dusk, new releases, and what comes next?”
2. Supporting line: “Your choice does not affect access to your rewards.”
3. **No thanks** → access-word screen immediately. No network request. Records `declined`.
4. **Yes, keep me updated** → email field only (no nickname, no checkbox). **Subscribe and Continue** or **Continue Without Email**.
5. Subscribe is consent. Continue Without Email → password, records `declined`, posts nothing.
6. Password screen primary button: **Enter the Archive** (Latin at rest). Eye toggle unchanged.

## B. Public — `/`

Copy matches the official MailerLite embed (form `196516110968817063`):

- Title: **Guest Access Waitlist**
- Body: **Get notified when guest access opens.**
- Button: **Notify Me**
- Success (after MailerLite `success` only): heading **You’re on the waitlist!** + body **We’ll email you when guest access opens.** (sans, bone, 18px / 16px)
- **Already a backer? Enter the Archive** → `/backer/` (16px desktop / 15px mobile, gold boxed outline at rest, 44px tap target)
- No password field on this screen

Deep links without a session (`/reader/…`, `/dossier/`) bounce to `/backer/?entry=required`.

## MailerLite (source of truth)

Official generated-form action URLs in `mailerlite-config.js`. **Not** Netlify Forms. **Not** an API key.

| Entrance | Group | `fields[source]` |
|----------|-------|------------------|
| Backer Join | Intrepid Dusk Archive Opt-ins | `archive_backer_optin` |
| Public waitlist | Intrepid Dusk Public Waitlist | `archive_public_waitlist` |

Success copy (**You are subscribed!** on `/backer/`, **You’re on the waitlist!** on `/`) only after MailerLite JSONP payload `success`. Fail closed:

> Backer: We couldn’t add you right now. You can try again or continue to the Archive.  
> Public: We couldn’t add you right now. You can try again.

Reward access is never blocked.

### Official forms (pasted by Jon)

This agent must not change MailerLite account settings. Both generated-form action URLs are now in `mailerlite-config.js`.

**Both official form URLs are in.**

| Config key | Form | Action URL |
|------------|------|------------|
| `backerActionUrl` | Archive Opt-ins `196515214173144716` | `https://assets.mailerlite.com/jsonp/875026/forms/196515214173144716/subscribe` |
| `publicActionUrl` | Public Waitlist `196516110968817063` | `https://assets.mailerlite.com/jsonp/875026/forms/196516110968817063/subscribe` |

No unverified local/Netlify fallback. Do not live-test signup until Jon says so.

## Local choice state

Key `intrepid_archive_ml_choice_v1` = `joined` | `declined`. Absent = not asked.  
Session fallback if localStorage is blocked. **Email is never stored.** Reset access does not clear this key.

## Kill

`ENABLE_ARCHIVE_MAILING = false` in `index.html`, or `localStorage.setItem('intrepid_archive_mailing_disabled','1')` — skips the choice and goes to the password on `/backer/`.

## Restore

`cp index.html.bak-preoptin-2026-08-21 index.html` still restores pre-238 entry HTML (Netlify-ignored). Prefer git revert of this branch for 241.

## QA

```bash
node scripts/smoke-archive-optin.js
node scripts/smoke-backer-login.js
```
