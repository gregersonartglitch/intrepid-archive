# Cuneiform Font Notes — Decorative Button Layer

Last updated: 2026-07-09 (hub UX pass on `feature/cuneiform-buttons`)

## Recommendation: **SantakkuM** (self-hosted)

For **button-sized** decorative cuneiform (proximity glitch reveal on hub tiles and archive entry), use **SantakkuM** — Sylvie Vanséveren's Old Babylonian monumental script (Hammurabi-style). It reads clearly at small sizes because wedges are bolder and less hairline than Noto Sans Cuneiform.

| Font | Role | Verdict at button size |
|------|------|------------------------|
| **Noto Sans Cuneiform** | Google Fonts CDN | Too fiddly — fine hairlines, tiny internal detail, hard to parse at 15–20px |
| **Santakku** | OB cursive (DARIAH) | Readable but thinner than SantakkuM; better for flowing text than labels |
| **SantakkuM** | OB monumental (DARIAH) | **Chosen** — chunky wedges, good silhouette at 20–26px |
| **Assurbanipal** | Neo-Assyrian (DARIAH) | Bold but very large file (~735KB woff2); kept as alternate only |
| **UllikummiA** | Hittite (CTAN hittype) | Available; not tested on hub — different sign shapes |

### Credits & license

Fonts by **Sylvie Vanséveren**, distributed via [Hethitologie Portal / DARIAH cuneifont](https://smaw.de.dariah.eu/cuneifont/).

- Free for academic/research and scholarly websites
- **Not** for commercial redistribution or modified forms
- Source: `download/Santakku.zip` → `SantakkuM.ttf`

### How we load it (branch-local)

Self-hosted **woff2** under `assets/fonts/SantakkuM.woff2`, injected at runtime when `ENABLE_CUNEIFORM_BUTTONS` is on:

```javascript
function loadCuneiformDisplayFont() {
  if (document.getElementById('santakkum-cuneiform-font')) return;
  var style = document.createElement('style');
  style.id = 'santakkum-cuneiform-font';
  style.textContent = "@font-face{font-family:'SantakkuM';src:url('assets/fonts/SantakkuM.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap;}";
  document.head.appendChild(style);
}
```

CSS token: `--font-cuneiform: 'SantakkuM', serif;`

**Noto Sans Cuneiform** is no longer used for the button layer on this branch. Gate frame strips (`.gate-cuneiform-strip`) still use literal Unicode characters and inherit system fallback unless we add a separate strip font rule later.

### Hub UX tweaks (2026-07-09)

1. **Fewer glyphs per tile** — 2 wedges per button (was 4) for legibility at larger sizes
2. **Larger cuneiform layer** — gate btn 26px; hub tiles `clamp(20px, 3.2vw, 26px)`; positive letter-spacing
3. **Subtext reveal** — `.landing-badge` hidden by default; fades in on `.cuneiform-btn--near` only (same proximity class that triggers cuneiform→Latin glitch)

## Decorative-only — translation honesty

The hover cuneiform layer uses a **thematic glyph sequence**, **not** a scholarly transliteration of the English label.

**Rules for copy and design review:**

1. Never imply the wedges spell the English label in Akkadian/Sumerian.
2. Marketing, tooltips, and alt text must use the Latin label only (`aria-label` on buttons).
3. If Jon later commissions authentic copy, replace the glyph string and document the source.
4. Cuneiform is **atmosphere**, not content.

## Accessibility pattern

Dual-layer button structure:

```html
<button class="gate-btn cuneiform-btn" type="button" aria-label="Unlock Archive">
  <span class="cuneiform-btn__layer cuneiform-btn__layer--latin">Unlock Archive</span>
  <span class="cuneiform-btn__layer cuneiform-btn__layer--cuneiform" aria-hidden="true">&#x1222D;&#x12297;</span>
</button>
```

| Concern | Approach |
|---------|----------|
| Accessible name | `aria-label` on `<button>` (stable regardless of hover state) |
| Decorative layer | `aria-hidden="true"` on cuneiform `<span>` |
| Hover crossfade | Proximity + glitch CSS; Latin layer stays in DOM for SR |
| Motion | `prefers-reduced-motion: reduce` → skip crossfade, show Latin only |
| Hub subtext | `.landing-badge` hidden until `.cuneiform-btn--near`; still in DOM for SR when visible |

## Feature flags

| Control | Key / constant | Default |
|---------|----------------|---------|
| Ship gate | `ENABLE_CUNEIFORM_BUTTONS` in `index.html` | `true` on branch (revert before prod) |
| Kill switch | `localStorage.intrepid_cuneiform_buttons_disabled = '1'` | unset |

## Local test

```bash
npx http-server . -p 8080 --cors -c-1
# http://localhost:8080
```

1. Archive entry → move cursor near **Unlock Archive** → wedges glitch to Latin
2. Hub → badges ("Included with your code", etc.) appear only on proximity/hover
3. Kill switch: `localStorage.setItem('intrepid_cuneiform_buttons_disabled','1'); location.reload();`

## Related

- `docs/ACCESS-HUB-SPEC.md` §8 — cuneiform hover on buttons
- Existing strips: `.gate-cuneiform-strip`, `.landing-card::before`
