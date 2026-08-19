# Wave 1 Option B+ — AWAITING REVIEW

**Build:** 230  
**Branch:** `cursor/ks-fulfillment-sop-1ced`  
**Production today:** build 217 (unchanged — **do not send Wave 1 emails**)

## Summary

Implemented server-validated shared access codes with HMAC-signed HttpOnly cookies, function-protected reader/dossier shells, and allowlisted protected media delivery. Client JavaScript no longer contains access codes or tier authority.

## What shipped in code

### Netlify Functions
| Route | Function |
|-------|----------|
| `POST /api/access/login` | `access-login.js` |
| `POST /api/access/logout` | `access-logout.js` |
| `GET /api/access/session` | `access-session.js` |
| `GET /api/build-info` | `build-info.js` |
| `GET /api/protected-media/*` | `protected-media/index.js` |
| `/reader/intrepid-dusk-volume-1/` | `reader-shell.js` |
| `/dossier/` | `dossier-shell.js` |
| Legacy asset paths | `legacy-asset-gone.js` → 404 |

### Client
- `archive-access.js` — fetch login/session/logout only
- `index.html` — async entry login; map loads from protected endpoints
- `reader/backer-gate.js` — server session for Issue 2–3
- `reader/.../spike.js` — Issue 2–3 pages via `/api/protected-media/reader-page/...`
- `dossier/index.html` — protected thumb/portrait URLs

### Tests (local Netlify Dev — PASS)
```bash
node scripts/test-access-auth-unit.js
node scripts/smoke-backer-login.js
EXPECTED_INTREPID_BUILD=230 node scripts/smoke-server-gate.js http://127.0.0.1:8888
```

## Jon action required before Wave 1

1. Set Netlify env vars — see [`docs/WAVE1-NETLIFY-SETUP.md`](WAVE1-NETLIFY-SETUP.md)
2. Upload assets to Netlify Blobs per [`docs/WAVE1-PROTECTED-ASSET-MIGRATION.json`](WAVE1-PROTECTED-ASSET-MIGRATION.json)
3. Remove migrated files from public deploy
4. Preview deploy + run smoke on preview URL
5. Prod deploy + incognito verification on custom domain
6. Independent reviewer confirms before email send

## Known limitations

- Shared codes can still be deliberately shared between people
- CART- private URL keys no longer auto-open map (use `hollowlands9` at entry)
- Protected assets return **503** until Blob migration completes
- Rate limiting is per-function-instance best effort

## Changed files (high level)

- `netlify/` — functions + auth lib + allowlist
- `archive-access.js`, `index.html`, `netlify.toml`, `_redirects`
- `reader/backer-gate.js`, `reader/intrepid-dusk-volume-1/spike.js`, `reader/.../index.html`, `reader/index.html`
- `dossier/index.html`
- `scripts/` — smoke + manifest generator
- `docs/WAVE1-NETLIFY-SETUP.md`, `docs/WAVE1-PROTECTED-ASSET-MIGRATION.json`
- `package.json`, `.gitignore`

**Status: AWAITING REVIEW** — production is not fixed until deploy + verification on `archive.intrepidgraphicnovel.com`.
