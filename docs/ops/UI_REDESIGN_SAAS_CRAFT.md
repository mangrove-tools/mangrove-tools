# UI redesign brief — SaaS craft, Mangrove filter

**Backlog ID:** P2-20  
**Inspiration source:** [Dribbble · SaaS](https://dribbble.com/tags/saas)  
**Status:** Spec only — implement after explicit approval of P2-20  
**Constraint:** Static HTML/CSS/JS. No React. No UI kit install. Keep Gulf Coast Mangrove identity.

## What to borrow from SaaS Dribbble craft

High-quality SaaS shots usually win on **clarity and product presence**, not on purple gradients:

1. **Clear product hierarchy** — hero → proof of product → detail  
2. **Generous but disciplined spacing** — sections breathe without empty theater  
3. **Result-forward UI** — show the outcome (numbers, bands, next step) as the hero artifact  
4. **Refined control chrome** — inputs/buttons that feel intentional in every state  
5. **Subtle depth** — soft surface shifts, hairlines, restrained elevation (not stacked shadows)  
6. **Purposeful micro-motion** — confirm state change; never delay the task  
7. **Mobile-first density** — same story on 390px without horizontal scroll

## What not to copy

| Dribbble cliché | Why rejected here |
| --- | --- |
| Purple / indigo SaaS gradients | Off-brand; AGENTS + design direction forbid |
| Glassmorphism / neon glow | Trend-dependent; hurts contrast |
| Dashboard card forests in the hero | Violates one-composition / no-cards-in-hero |
| Floating browser mockup collage | Decorative without tool value |
| Pill clusters, emoji feature rows | Clutter; spam aesthetic |
| Dark-mode-first marketing | Brand is light paper; dark mode is P3-13 |
| Fake metrics / social proof strips | No invented testimonials |

## Mangrove translation

| SaaS craft idea | Mangrove expression |
| --- | --- |
| Product screenshot hero | Live tool preview: form + results composition on home or tool pages |
| Feature bento | Numbered index (keep) + optional one “featured tool” result vignette |
| Soft surfaces | `--surface` panels with `--line` rules; atmosphere wash already present |
| Pricing polish | Lead-Dev offer columns stay rule-based, not glossy cards |
| Dashboard density | Tool pages: sharper form → results split; never a widget wall |

## Proposed scope for P2-20

### In scope
- Home: elevate first viewport craft; optional **inline product vignette** (static or lightweight) showing a real calculator result composition — still brand-first  
- Tool pages (LetterROI → SponsorQuote → SubTarget): results panel hierarchy, control polish, spacing aligned to `site.css` tokens  
- Lead-Dev: quieter studio/marketing chrome; clearer offer scan without fake urgency  
- Shared: button/field/focus parity (can absorb leftover P1-11 work)  
- Motion: 2–3 signature transitions max sitewide; honor `prefers-reduced-motion`

### Out of scope
- Rebrand / new palette  
- Framework or component library  
- Dark mode  
- New tools or accounts  
- Changing affiliate or Stripe URLs  

## Acceptance criteria

1. First-time visitor still understands “free calculators + Lead-Dev path” in one viewport.  
2. Brand test: removing nav, page still reads as Mangrove (paper/pine/terracotta + Fraunces).  
3. No purple SaaS look; no hero card grid.  
4. All touched routes pass keyboard focus, ~390 / 768 / 1440, reduced-motion.  
5. `python3 scripts/check-links.py` OK; SEO head tags unchanged or improved.  
6. Before/after screenshots in the PR for home + one tool + Lead-Dev.  

## Dependencies

- Prefer after **P1-14** (tool shell pilot) so redesign isn’t fighting three CSS trees.  
- May include **P1-11** (control state parity) as a sub-pass.  
- Design approval required before coding (this brief counts as the plan; owner says “implement P2-20”).

## Effort / risk

| Factor | Rating |
| --- | --- |
| Size | L |
| UX risk | Medium–High (easy to over-SaaS) |
| Tech risk | Medium (CSS surface area) |
| Parallelization | Unsafe with other `site.css` / home / tool-shell work |
