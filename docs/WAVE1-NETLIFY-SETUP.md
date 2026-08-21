# Wave 1 Option B+ — Netlify setup checklist (Jon)

**Status:** AWAITING REVIEW — do not send Wave 1 emails until preview + prod verification pass.

## 1. Environment variables (Netlify UI → Site → Environment variables)

Set for **Production** and **Deploy previews**:

| Variable | Example | Notes |
|----------|---------|--------|
| `READER_ACCESS_CODE` | *(from KS Wave 1 copy)* | Normalized trim+lowercase server-side |
| `CARTOGRAPHER_ACCESS_CODE` | *(from KS Wave 1 copy)* | Grants reader + map |
| `ACCESS_SIGNING_SECRET` | `openssl rand -hex 32` | **Never commit** |
| `ACCESS_COOKIE_VERSION` | `1` | Bump to invalidate all sessions |
| `COMMIT_REF` | *(auto on Netlify)* | Optional; build-info uses it |

After first deploy with functions, Netlify enables **Blob** storage — add:

| Variable | Notes |
|----------|--------|
| `BLOB_READ_WRITE_TOKEN` | From Netlify Blobs UI / CLI |

## 2. Upload protected assets to Netlify Blobs

Blob store name: **`intrepid-protected`**

Use the generated manifest:

- `docs/WAVE1-PROTECTED-ASSET-MIGRATION.json`
- Run locally: `node scripts/generate-protected-asset-manifest.js`

Each row maps `removeFromPublicDeploy` → upload file to blob key `blobKey`.

**Helper scripts:**

```bash
node scripts/generate-protected-asset-manifest.js
node scripts/prepare-protected-assets-local.js          # mirror into protected-assets/ (local dev)
BLOB_READ_WRITE_TOKEN=... node scripts/upload-protected-assets-to-blobs.js
```

**Local dev fallback:** `prepare-protected-assets-local.js` copies files into `protected-assets/` mirroring blob keys (edge function reads these when Blobs empty).

**Large PDFs:** served via edge function `netlify/edge-functions/protected-media.js` (streams from Blobs; avoids 6MB function cap).

## 3. Remove migrated files from public deploy

After blobs are uploaded, generated `.netlifyignore-protected.generated` excludes gated files from static deploy automatically. Regenerate after manifest changes:

```bash
node scripts/generate-protected-asset-manifest.js
```

Also ensure `_redirects` includes `_redirects-protected.generated` entries (404 on legacy URLs).

## 4. Deploy (preview first)

```bash
npm install
node scripts/generate-protected-asset-manifest.js
node scripts/test-access-auth-unit.js
npx netlify dev   # local smoke
node scripts/smoke-server-gate.js http://localhost:8888

npx netlify deploy --dir .              # preview URL
node scripts/smoke-server-gate.js https://YOUR-PREVIEW.netlify.app

# After Jon approves:
npx netlify deploy --prod --dir .
```

## 5. Production verification (incognito)

1. `GET /api/build-info` → `build: 231`
2. Paste reader URL → entry screen (not reader)
3. Login `scribe4` → reader + dossier + Issue 2
4. `curl -I .../page-022.webp` → 404
5. `curl -I /api/protected-media/reader-page/page-022` (no cookie) → 401
6. Logout / Reset access → cookie cleared, reader blocked again

## Known limitations (Wave 1)

- **Shared codes** — `scribe4` / `hollowlands9` can still be deliberately shared (honor system).
- **CART- private URL keys** — no longer auto-grant map; backers use `hollowlands9` at entry until a server CART endpoint ships.
- **Asset migration required** — functions return 503 until blobs populated.
- **Rate limit** — per-function-instance best effort (12/min/IP).

## Automated tests

```bash
node scripts/test-access-auth-unit.js
EXPECTED_INTREPID_BUILD=231 node scripts/smoke-server-gate.js http://localhost:8888
```

Prod smoke (after deploy):

```bash
EXPECTED_INTREPID_BUILD=230 node scripts/smoke-server-gate.js https://archive.intrepidgraphicnovel.com
```
