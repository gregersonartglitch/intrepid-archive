# Cuneiform Font Notes — Decorative Button Layer (T8 scaffold)

Last updated: 2026-07-09

## Recommendation: Noto Sans Cuneiform

Use **[Noto Sans Cuneiform](https://fonts.google.com/noto/specimen/Noto+Sans+Cuneiform)** for all decorative cuneiform UI (button hover crossfade, frame strips, hub flourishes).

| Criterion | Noto Sans Cuneiform |
|-----------|---------------------|
| Coverage | Full Unicode Cuneiform block (U+12000–U+123FF) |
| License | SIL Open Font License — safe for web embed |
| Hosting | Google Fonts CDN (no self-host required for scaffold) |
| Fallback | `serif` — wedges may degrade to boxes if font fails to load; acceptable for decorative-only layer |

**Do not** use Cinzel, Garamond, or system serif for cuneiform glyphs — they lack the block and will show tofu (□).

## Load snippet (flag-gated)

Inject only when `ENABLE_CUNEIFORM_BUTTONS` is true **and** `localStorage.intrepid_cuneiform_buttons_enabled === '1'`:

```html
<link id="noto-cuneiform-font" rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+Cuneiform&display=swap">
```

Runtime equivalent (see `index.html` → `loadNotoSansCuneiformFont()`):

```javascript
var link = document.createElement('link');
link.id = 'noto-cuneiform-font';
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Cuneiform&display=swap';
document.head.appendChild(link);
```

Preconnect is already present on `fonts.googleapis.com` / `fonts.gstatic.com` in `index.html`.

## Decorative-only — translation honesty

The hover cuneiform layer on **Unlock Archive** uses a **thematic glyph sequence** (𒈬 𒊗 𒊳 𒉹 — same family as existing gate strips), **not** a scholarly transliteration of the English label.

**Rules for copy and design review:**

1. Never imply the wedges spell “Unlock Archive” in Akkadian/Sumerian.
2. Marketing, tooltips, and alt text must use the Latin label only.
3. If Jon later commissions authentic copy, replace the glyph string and document the source — do not guess at philology.
4. Cuneiform is **atmosphere**, not content.

## Accessibility pattern

Dual-layer button structure:

```html
<button class="gate-btn cuneiform-btn" type="button" aria-label="Unlock Archive">
  <span class="cuneiform-btn__layer cuneiform-btn__layer--latin">Unlock Archive</span>
  <span class="cuneiform-btn__layer cuneiform-btn__layer--cuneiform" aria-hidden="true">&#x1222D; &#x12297; &#x122B3; &#x12279;</span>
</button>
```

| Concern | Approach |
|---------|----------|
| Accessible name | `aria-label="Unlock Archive"` on `<button>` (stable regardless of hover state) |
| Decorative layer | `aria-hidden="true"` on cuneiform `<span>` — excluded from accessibility tree |
| Hover crossfade | CSS opacity only; Latin layer stays in DOM for SR; visual swap does not change name |
| Motion | `prefers-reduced-motion: reduce` → skip crossfade, show Latin only |
| Contrast | Cuneiform hover uses same amber-on-dark button chrome as Latin layer |
| Focus | Standard `:focus-visible` ring on button; no separate focus target on glyph layer |

## Feature flags

| Control | Key / constant | Default |
|---------|----------------|---------|
| Ship gate | `ENABLE_CUNEIFORM_BUTTONS` in `index.html` | `false` |
| User opt-in | `localStorage.intrepid_cuneiform_buttons_enabled` | unset (off) |
| Kill switch | `localStorage.intrepid_cuneiform_buttons_disabled = '1'` | unset |

Both the compile-time flag **and** localStorage opt-in must be satisfied for the font load and hover crossfade.

## Local test

```bash
npx http-server . -p 8080 --cors -c-1
# http://localhost:8080
```

1. On `feature/cuneiform-buttons`, set `ENABLE_CUNEIFORM_BUTTONS = true` in `index.html` (or merge after Jon approves).
2. Console: `localStorage.setItem('intrepid_cuneiform_buttons_enabled','1'); location.reload();`
3. Archive entry → hover **Unlock Archive** → Latin fades to cuneiform wedges.
4. Kill switch: `localStorage.setItem('intrepid_cuneiform_buttons_disabled','1'); location.reload();`

## Related

- `docs/ACCESS-HUB-SPEC.md` §8 — cuneiform hover on buttons (delight backlog)
- `docs/FIX-DASHBOARD.md` — T8 art polish track (non-gating)
- Existing strips: `.gate-cuneiform-strip`, `.landing-card::before`, `.frame-cune`
