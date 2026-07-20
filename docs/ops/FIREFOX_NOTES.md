# Firefox PC rendering notes

**Date:** 2026-07-20  
**Symptom:** Site can look “different” in Firefox than Chrome.

## Causes we fixed

1. **`overflow-x: hidden` on `body.tool-page`**  
   Firefox treats this as a scroll container and breaks `position: sticky` on calculator results.  
   **Fix:** `overflow-x: clip` in `tool-shell.css`.

2. **Google Fonts blocked by Enhanced Tracking Protection**  
   Firefox Strict/ETP often blocks `fonts.googleapis.com` / `fonts.gstatic.com`, so Fraunces/Outfit fall back to Georgia/system and the page feels like a different design.  
   **Fix:** Self-host fonts via `/fonts.css` + `/fonts/*.woff2`; CSP no longer needs Google Fonts hosts.

3. **SVG `feTurbulence` noise in CSS data-URI**  
   Firefox paints this grain inconsistently (heavier / missing / striped).  
   **Fix:** CSS-only grain on `.atmosphere::after` in `site.css`.

## Smoke-check after deploy (Firefox)

- Home: Fraunces headings (not Times), vignette + index intact  
- `/letterroi/`: results panel sticky while scrolling the form (desktop)  
- DevTools Network: `/fonts/fraunces.woff2` + `/fonts/outfit.woff2` load 200  
- Console: no CSP font errors  
