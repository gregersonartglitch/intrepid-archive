# Archive entrances + MailerLite opt-in

**Build:** 239  
**Status:** AWAITING REVIEW — do not deploy  
**PR:** continue #2 on `cursor/archive-optin-1ced`

Two separate doors. Kickstarter messages should link to **`/backer/`**. The bare Archive URL is the public waitlist.

## A. Backer — `/backer/`

1. Required choice: “Would you like occasional updates about Intrepid Dusk, new releases, and what comes next?”
2. Supporting line: “Your choice does not affect access to your rewards.”
3. **No thanks** → access-word screen immediately. No network request. Records `declined`.
4. **Yes, keep me updated** → email field only (no nickname, no checkbox). **Join the email list** or **Continue without joining**.
5. Join is consent. Continue without joining → password, records `declined`, posts nothing.
6. Password screen primary button: **Enter the Archive** (Latin at rest). Eye toggle unchanged.

## B. Public — `/`

“The Archive will open to new readers later. Leave your email if you’d like to know when it does.”

- Email + **Join the waitlist**
- **Already a backer? Enter the Archive** → `/backer/`
- No password field on this screen

Deep links without a session (`/reader/…`, `/dossier/`) bounce to `/backer/?entry=required`.

## MailerLite (source of truth)

Official generated-form action URLs in `mailerlite-config.js`. **Not** Netlify Forms. **Not** an API key.

| Entrance | Group | `fields[source]` |
|----------|-------|------------------|
| Backer Join | Intrepid Dusk Archive Opt-ins | `archive_backer_optin` |
| Public waitlist | Intrepid Dusk Public Waitlist | `archive_public_waitlist` |

Success copy **You’re on the list** only after MailerLite JSONP payload `success`. Empty action URLs fail closed:

> We couldn’t add you right now. You can try again or continue to the Archive.

Reward access is never blocked.

### Blocker — Jon must create these before Join can succeed

This agent must not change MailerLite account settings. Create:

1. Subscriber groups (single opt-in for this version):
   - **Intrepid Dusk Archive Opt-ins**
   - **Intrepid Dusk Public Waitlist**
2. One **Embedded form** assigned to each group.
3. Optional subscriber field **source** (text).
4. Forms → Embedded → Overview → HTML → copy each `action="https://assets.mailerlite.com/jsonp/{account}/forms/{id}/subscribe"` into `mailerlite-config.js` (`backerActionUrl` / `publicActionUrl`).

Until those URLs are pasted, Join always shows the failure copy. No unverified local/Netlify fallback.

## Local choice state

Key `intrepid_archive_ml_choice_v1` = `joined` | `declined`. Absent = not asked.  
Session fallback if localStorage is blocked. **Email is never stored.** Reset access does not clear this key.

## Kill

`ENABLE_ARCHIVE_MAILING = false` in `index.html`, or `localStorage.setItem('intrepid_archive_mailing_disabled','1')` — skips the choice and goes to the password on `/backer/`.

## Restore

`cp index.html.bak-preoptin-2026-08-21 index.html` still restores pre-238 entry HTML (Netlify-ignored). Prefer git revert of this branch for 239.

## QA

```bash
node scripts/smoke-archive-optin.js
node scripts/smoke-backer-login.js
```
