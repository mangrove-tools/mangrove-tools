# UI Foundation Plan (Stage 7 — plan only)

**Date:** 2026-07-20 (updated with P1-10)  
**Status:** Steps A–D largely **implemented** (`site.css` tokens + `/tool-shell.css` shared by three calculators). P2-20 craft pass layered on top.  
**Constraint:** Improve the existing CSS architecture; do not replace it with a component framework.

## Tokens now in `site.css` `:root`

| Group | Tokens |
| --- | --- |
| Color | `--ink`, `--ink-soft`, `--paper`, `--surface`, `--line`, `--line-strong`, `--accent`, `--accent-text`, `--pine`, `--ok-text`, `--danger-text` |
| Type | `--font-display`, `--font-body` |
| Space | `--space-2xs` … `--space-2xl` |
| Radius | `--radius`, `--radius-sm` |
| Focus / motion | `--focus-ring`, `--focus-offset`, `--ease` |
| Layout | `--shell` |

Pilot usage: skip-link, focus-visible, `.btn`, `.shell` / `.section-block` / `.home-support` spacing.

## Current styling approach (verified)

| Layer | Files | Role |
| --- | --- | --- |
| Site shell | `site.css` | Tokens, atmosphere, nav, footer, home index, shared prose |
| Studio | `studio.css` | Wizard/step chrome for Lead-Dev studio tools |
| Calculator shells | `letterroi/styles.css`, `sponsorquote/styles.css`, `subtarget/styles.css` | Self-contained duplicates of shell + form/results |
| Page stubs | `mediakit/styles.css`, `inventory/styles.css` | Near-empty comments; real styles in `studio.css` |
| Minor page CSS | `lead-dev/styles.css`, `walkthrough/styles.css`, etc. | Local overrides |

## Inconsistencies

- Three calculators redefine `:root` instead of importing `site.css`  
- Calculators use favicon brand-mark; site pages use full logo SVG  
- Spacing/radius tokens incomplete on site shell vs calculators (`--radius` exists in tools, not site)  
- Stub CSS files add noise

## Smallest viable foundation

1. **Document tokens** already in `site.css` (source of truth).  
2. **Add missing semantic tokens** only as needed: `--space-*`, `--radius`, `--focus-ring`, optional `--ok` / `--danger` text.  
3. **Extract shared tool chrome** into `tool-shell.css` (or carefully share `site.css`) — migration one calculator at a time.  
4. **Standardize** `.btn`, field, error, and results classes.  
5. **Motion utilities** stay in CSS (`reveal`, `is-pop`); no animation library.  
6. **No new npm dependencies.**

## Migration sequence

| Step | Backlog | Risk |
| --- | --- | --- |
| A | Token completeness in `site.css` | Low |
| B | Button/link/field state parity on site shell | Low |
| C | Pilot: SubTarget → shared shell | Medium |
| D | LetterROI + SponsorQuote follow | Medium |
| E | Remove stub CSS or replace with real local overrides | Low |
| F | Home craft pass using foundation | Medium UX |

## Test / rollback

- `python3 scripts/check-links.py`  
- Manual screenshots at 390 / 768 / 1440 for touched routes  
- Rollback = revert PR; static site has no migration DB  

## Visual regression

No visual test service in repo. Do not add one without approval. Use before/after screenshots in PR for UI work.

## Preserve

Atmosphere, Fraunces/Outfit loading pattern, skip-link, reduced-motion media queries, calculator validation JS (logic stays in `app.js`).
