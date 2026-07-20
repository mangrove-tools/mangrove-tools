# Design direction — Mangrove Tools

**Date:** 2026-07-20  
**Workflow stage:** 4  
**Inspiration craft:** [httpster.net](https://httpster.net/) — curated indexes, strong brand, numbered work, calm type, intentional motion  
**Secondary craft cue:** [Dribbble · SaaS](https://dribbble.com/tags/saas) — product hierarchy, result-forward UI, refined controls (see backlog **P2-20** / `UI_REDESIGN_SAAS_CRAFT.md`). Borrow *craft*, never purple/glass SaaS templates.  
**Free asset library:** [The People’s Design Library](https://docs.google.com/spreadsheets/d/13GStMRQfbn5glWVkUPqFtW1oovyKhMDdRKD3m5cstBg/edit?gid=0#gid=0) — browse freely; ship only clear-license picks listed in `FREE_ASSET_SOURCES.md`.  
**Not a rebrand:** Keep Gulf Coast Mangrove identity. Borrow *craft*, not foreign palettes.

> Exception to generic “avoid cream + terracotta + serif” heuristics: **this product’s established system is paper / pine / terracotta + Fraunces + Outfit.** Deepen it; do not replace it with purple SaaS or broadsheet pastiche.

---

## 1. Brand & interface personality

Calm, specific, coastal-professional. Tools feel like a **curated index**, not a startup dashboard. Lead-Dev feels like a **studio**, not a course landing spam page.

## 2. Visual principles

1. Brand is a hero-level signal on the first viewport.  
2. One composition per viewport; one job per section.  
3. Hairline rules and rhythm over card grids and shadows.  
4. Motion for presence and hierarchy — never for delay.  
5. Easy to use beats clever.

## 3. Layout philosophy

- Max measure: `--shell` (~1040px) for reading/tool chrome.  
- Home hero: brand + one headline + one support line + one CTA group + atmosphere (no stat strips, no card forest).  
- Tools index: numbered list, not equal card grid.  
- Tool pages: form → results hierarchy; results never below unrelated promo noise.

## 4–6. Grid, spacing, type

| System | Direction |
| --- | --- |
| Grid | Single column primary; split form/results only when width allows |
| Spacing | Prefer multiples from existing padding scale in `site.css`; avoid magic numbers |
| Type | Fraunces for display/brand moments; Outfit for UI/body. Clear H1→H2 hierarchy; readable line length |

## 7. Color roles (`site.css`)

| Token | Role |
| --- | --- |
| `--paper` / `--surface` | Page / elevated surface |
| `--ink` / `--ink-soft` | Primary / secondary text |
| `--pine` | Deep brand / footer weight |
| `--accent` / `--accent-text` | Emphasis; use `--accent-text` for small text/links (AA) |
| `--line` / `--line-strong` | Rules, separators |

Do not introduce purple gradients, neon glow, or glassmorphism stacks.

## 8–10. Surface, border, iconography

- Surfaces: atmosphere wash + paper; avoid multi-layer shadows.  
- Radius: restrained (existing small radii); no pill clusters.  
- Icons: minimal; prefer typography and rules. No emoji decoration.

## 11–12. Imagery & data viz

- Logo SVGs + atmosphere texture are the visual anchors.  
- Tool “visualization” = clear numeric results and bands, not charts unless a backlog item explicitly adds them.

## 13–15. Interaction & motion

| Principle | Use | Avoid |
| --- | --- | --- |
| Hover underline / color shift | Nav, index links | Hover-only essential actions |
| Staggered `.reveal` | Home/section entrance | Long delayed content |
| Result `.is-pop` | Confirm calculation | Continuous looping motion |
| Studio step enter | Wizard progression | Parallax / scroll-jacking |

Always honor `prefers-reduced-motion`.

## 16–17. Responsive & mobile nav

- Nav may wrap; keep targets ≥44px where practical.  
- Do not hide primary tools behind undiscoverable menus.  
- Test 320 / 390 / 768 / 1024 / 1440.

## 18–21. States

Every interactive tool/control should define: default, hover, focus-visible, active, disabled (if any), empty, invalid/error, success/result.  
Forms: labels, `aria-invalid`, alert errors, actionable messages.

## 22–23. Accessibility & reduced motion

WCAG 2.2 AA intent. Skip-link, landmarks, focus order, contrast via `--accent-text`. Reduced motion disables decorative animation and smooth scroll.

## 24. Dark mode

**Not recommended for V1.1.** Brand is intentionally light paper. Revisit only with a full token dual-theme plan.

## 25. High-impact differentiation (approved direction)

1. Stronger home index craft (numbering, rules, motion restraint).  
2. Unified tool shell (brand logo parity, shared tokens).  
3. Result hierarchy that feels “finished” (bands, notes, next step).  
4. Lead-Dev studio calm — wizard clarity over marketing clutter.

---

## Token system (current → extend carefully)

Existing: `--ink`, `--ink-soft`, `--paper`, `--surface`, `--line`, `--line-strong`, `--accent`, `--accent-text`, `--pine`, `--font-display`, `--font-body`, `--ease`, `--shell`.

Proposed additions only when implementing foundation (see `UI_FOUNDATION_PLAN.md`): spacing scale, radius scale, focus ring token, success/warning text roles if needed.

## Component inventory (logical, not a React library)

| Component | Where today | Notes |
| --- | --- | --- |
| Skip-link | all pages | Preserve |
| Atmosphere | site shell | Preserve |
| Brand / nav / footer | most pages | Calculator variants diverge |
| Buttons `.btn` / text CTAs | site + tools | Standardize states |
| Tool form fields | letterroi/sponsorquote/subtarget | Shared validation pattern |
| Results panel | calculators | Preserve math; polish hierarchy |
| Studio steps | studio.css | Preserve |
| Offer cards | lead-dev | Interaction containers OK |

## Page-level design priorities

1. Home  
2. LetterROI / SponsorQuote / SubTarget  
3. Lead-Dev  
4. Method  
5. Studio wizards  
6. Trust pages (lighter touch)

## Signature interactions (high value)

- Index row hover/focus underline  
- First-calc result reveal  
- Studio step transition  
- Offer Fit recommendation appear

## Patterns to avoid

Generic SaaS card dashboards · purple AI gradients · glassmorphism · neon · decorative 3D · scroll-jacking · emoji rows · pill clusters · hover-only critical actions · dark-mode novelty · copying httpster palettes literally
