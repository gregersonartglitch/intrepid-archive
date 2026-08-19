# Local protected-asset mirror (dev only)

When `BLOB_READ_WRITE_TOKEN` is unset, Netlify Functions read from this tree.

Layout mirrors blob keys in `docs/WAVE1-PROTECTED-ASSET-MIGRATION.json`:

```
protected-assets/
  reader/pages/page-022.webp
  reader/downloads/intrepid-dusk-volume-1.pdf
  dossier/thumbs/...
  dossier/portraits/...
  map/data.js
  map/map5.jpg
  map/regions.json
  map/reveals.json
```

Copy from production deploy artifacts before running `npx netlify dev`.

**Do not commit binary assets to git.** Add large files to `.gitignore` if copying locally.
