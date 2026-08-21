# Archive post-unlock opt-in (MailerLite permission)

**Build:** 238  
**Status:** AWAITING REVIEW — do not deploy until Jon + reviewer approve  
**Kill:** `ENABLE_ARCHIVE_POST_UNLOCK_OPTIN = false` in `index.html`, `localStorage.setItem('intrepid_follow_signup_disabled','1')`, or `?optin=0`

This is **not a second login**. After a valid access word the archive is already unlocked. The same card then asks whether they want occasional Intrepid Dusk email. Join is affirmative consent. Skip / Close / Escape go to the hub with **no** form POST.

## What we capture

Permission to contact by email, later imported into MailerLite.

| Path | `opt_in_source` | Extra fields |
|------|-----------------|--------------|
| Post-unlock newsletter card | `archive-post-unlock` | email + `marketing_opt_in=yes` + `opt_in_at` |
| Guest “get notified” on the login card | `archive-entry-follow` | nickname + checkbox + email |

Filter Netlify form `hollowlands-follow` on `opt_in_source` when exporting.

## UX

1. Login card stays: eyebrow Intrepid Dusk Archive, title The Hollowlands, password + eye, gold **Unlock Archive** (Latin at rest, cuneiform on hover). Guest link: **No access word? Get notified when guest access opens**.
2. Valid `scribe4` / `hollowlands9` grants access immediately, then swaps to the newsletter card in the same frame. Invalid code never opens the card and writes no opt-in state.
3. Newsletter copy: heading **Stay connected with Intrepid Dusk**; email; consent line (no checkbox); **Join the email list**; **Continue without joining**; **Your Archive is already unlocked. This step is optional.** Close ✕ + Escape.
4. Success: **Thanks — your signup was recorded. Your Archive is already open.** Failure: access stays; retry; Continue still available; submitted flag is **not** set.
5. Returning backers who already have a session and have never been prompted see the card **once** on the next visit (so existing Kickstarter unlocks are not invisible to this list). After skip, a quiet **Get email updates** link stays on the hub until a successful join. `?map` / `?edit` / `?scan` / `?key` skip the card.
6. Reset access does **not** clear opt-in flags (device already recorded consent or skip).

## MailerLite (later, not in the browser)

1. Netlify → Forms → `hollowlands-follow` → CSV export.
2. Keep rows with `marketing_opt_in=yes`.
3. Filter `opt_in_source=archive-post-unlock` into group **Intrepid Dusk — Archive Opt-ins**.
4. Keep `archive-entry-follow` as the guest-notify list.
5. **No MailerLite API keys in the page.**

## Restore

```bash
cp index.html.bak-preoptin-2026-08-21 index.html
```

Backup is git-tracked and listed in `.netlifyignore` so it never publishes.

## QA

```bash
node scripts/smoke-archive-optin.js
node scripts/smoke-backer-login.js
```

Manual: `docs/QA-SMOKE-CHECKLIST.md` → Archive opt-in (build 238).
