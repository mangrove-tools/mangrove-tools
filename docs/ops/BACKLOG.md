# MangroveTools.com — Engineering & Design Backlog

**Date:** 2026-07-20  
**Workflow stage:** 6  
**Legend:** **Auto** = reversible codebase work per `AGENTS.md`; **Approval** = human gate  
**Rule:** Implement **one ID at a time** after Inspect → Plan → Approve.

V1.0 ship items (P0-01…P0-10, SubTarget, studio expansion) are **done on production**. This backlog is the post-V1.0 polish track.

---

## P0 — Production integrity (keep green)

| ID | Title | Type | Problem | Acceptance | Files | Size | Auto? | Design OK? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-A | Keep link graph green | Bug/QA | Drift breaks trust/SEO | `python3 scripts/check-links.py` OK; sitemap locs 200 | `scripts/check-links.py`, all HTML, `sitemap.xml` | S | Auto | No |
| P0-B | Docs match live commerce | Content | Ops still implied placeholders | Audit/strategy/setup/AGENTS describe live Stripe + deliver | `AGENTS.md`, `docs/ops/*`, `docs/setup/*` | S | Auto | No |
| P0-C | Deliver path smoke | Incomplete | Buyers need post-pay download | Kit/cohort deliver pages load; zips present; noindex | `deliver/**` | S | Auto verify | No |

---

## P1 — Essential V1.1 (UI foundation + primary workflow)

| ID | Title | Category | Problem | User impact | Business impact | Acceptance | Likely files | Tests / manual | Deps | Risk | Size | Parallel | Design | Content | Deploy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-10 | Token completeness | UI system | Incomplete spacing/radius/focus tokens | Consistency | Maintainability | **Done 2026-07-20** — tokens in `site.css` + pilot usage | `site.css`, `UI_FOUNDATION_PLAN.md` | Visual 390/1440 | None | Low | S | Unsafe w/ CSS | Yes | No | No |
| P1-11 | Control state parity | UI system | Button/field/focus uneven | Clarity | Trust | **Done 2026-07-20** — btn/text-cta/input states in site + tool-shell | `site.css`, tool CSS | Keyboard focus check | P1-10 | Low | S | Unsafe w/ CSS | Yes | No | No |
| P1-12 | Home craft pass | UX | Home good but can deepen craft | First impression | SEO bounce | **Done 2026-07-20** — hero rule, index craft, focus-within, token spacing | `index.html`, `site.css` | Mobile + reduced-motion | P1-10 preferred | Med UX | M | Unsafe w/ home | Yes | Light copy OK | No |
| P1-13 | Calculator UX audit | UX | Extreme/empty edges uneven | Task success | Affiliate after value | **Done 2026-07-20** — see `CALC_UX_AUDIT.md` | `letterroi/app.js`, `sponsorquote/app.js`, `subtarget/app.js` | Manual edge cases | None | Low | M | Safe per tool if sequential | No | No | No |
| P1-14 | Tool shell unification (pilot) | Architecture | CSS duplication / brand drift | Consistency | Dev speed | **Done 2026-07-20** — `/tool-shell.css` + SubTarget/LetterROI/SponsorQuote on site shell | new `tool-shell.css` or `site.css`, one tool | Screenshot diff | P1-10 | Med | M | Unsafe across tools | Yes | No | No |
| P1-15 | Lead-Dev conversion clarity | UX | Must stay honest about live checkout | Trust | Revenue | **Done 2026-07-20** — live Stripe + email Full-Stack Kit copy clarified | `lead-dev/index.html`, `lead-dev/app.js` | Click-through to Stripe (no purchase) | None | Low | S | Safe | Light | Copy OK | No |

**UI-system prerequisites:** P1-10 → P1-11 → (P1-14 or P1-12).  
**Can ship without visual changes:** P0-A, P0-B, P0-C, P1-13 (logic-only), SEO items below.

---

## P2 — High-value improvements

| ID | Title | Category | Notes | Auto? | Size |
| --- | --- | --- | --- | --- | --- |
| P2-10 | Finish shell unification (LetterROI + SponsorQuote) | Architecture | **Done with P1-14** — all three calculators share shell | Auto | M |
| P2-11 | Studio SEO parity | SEO | **Done** — og:locale + walkthrough JSON-LD | Auto | S |
| P2-12 | Remove/replace stub CSS | Tech debt | **Done** — stub files removed | Auto | S |
| P2-13 | Performance pass | Performance | **Partial** — display=swap, logo fetchpriority; further font subsetting optional | Auto | M |
| P2-14 | CSP headers | Security | **Done** — CSP + frame/permissions in `vercel.json` (was previously in `netlify.toml`; migrated 2026-07-23 when dropping Netlify backup) | Approval for strictness | M |
| P2-15 | Method / About polish | Content/UX | **Done** — clearer CTAs/ledes | Auto | S |
| P2-16 | Expand link checker | Testing | **Done** — `--external` flag on check-links.py | Auto | S |
| **P2-20** | **SaaS-craft UI redesign (Mangrove filter)** | **UI redesign** | **Done 2026-07-20 (v1)** — home result vignette, shared tool shell, result surfaces, Lead-Dev offer polish; assets curated from People’s Design Library in `FREE_ASSET_SOURCES.md`. Further texture/icon drops optional. | Auto after approve | L |

### P2-20 detail

| Field | Value |
| --- | --- |
| Problem | Site is solid but can feel more product-present and contemporary without abandoning brand |
| User impact | Faster comprehension; tools feel “finished”; stronger first impression |
| Business impact | Trust + conversion on tools and Lead-Dev |
| Acceptance | Per `UI_REDESIGN_SAAS_CRAFT.md` — brand test pass; no purple SaaS; a11y/responsive; screenshots in PR |
| Likely files | `index.html`, `site.css`, `studio.css`, `letterroi/*`, `sponsorquote/*`, `subtarget/*`, `lead-dev/*` |
| Dependencies | Prefer **P1-14** first; may fold in **P1-11** |
| Tech / UX risk | Med / High |
| Design approval | **Yes** |
| Content approval | Light copy only |
| Deploy coordination | Preview recommended before prod |

---

## P3 — Future

| ID | Title | Notes | Gate |
| --- | --- | --- | --- |
| P3-10 | Case-study page | Real metrics only | Approval for claims |
| P3-11 | Email waitlist vendor | UI may exist; activation gated | Approval |
| P3-12 | Honest Offer JSON-LD | When prices/offers finalized | Approval if claims |
| P3-13 | Dark mode | Not recommended now | Approval + full token plan |
| P3-14 | New niche tool | Only after Niche Gate | Decision note required |
| P3-15 | Visual regression service | None in repo today | Approval |

---

## Bugs / incomplete / debt (index)

| Kind | IDs |
| --- | --- |
| Bugs | P0-A (preventive) |
| Incomplete | P0-C verify, P1-13 |
| Architecture | P1-14, P2-10 |
| Tech debt | P2-12, CSS duplication |
| UI system | P1-10, P1-11 |
| UX | P1-12, P1-15, P2-15 |
| UI redesign | **P2-20** |
| Responsive | Covered inside P1-12/14 QA + P2-20 |
| Accessibility | Inside P1-11/13 + dedicated QA passes + P2-20 |
| Performance | P2-13 |
| SEO | P2-11 |
| Security | P2-14 |
| Privacy | Standing rules in AGENTS — no open P0 gap |
| Analytics | GA present — no change without approval |
| Testing | P2-16 |
| Content | P0-B, P2-15 |
| Enhancements | P3-* |

---

## Approval-gated (never autonomous)

- Live payment product changes / payouts / tax  
- Production deploy identity / DNS  
- Affiliate ID / `AFFILIATE_URL` changes  
- Legal terms, guarantees, invented testimonials  
- Pricing outside source-doc bands  
- Destructive git / rebrand  
- New analytics SDKs / email vendors going live  

---

## Recommended execution order

1. Land this workflow/docs PR (includes P1-10 / P1-13 / P1-12).  
2. Optional prep for redesign: **P1-14** tool shell pilot (± **P1-11**).  
3. Owner approves **P2-20** (SaaS-craft UI redesign) → implement per `UI_REDESIGN_SAAS_CRAFT.md`.  
4. Hardening: P2-13 performance, P2-14 CSP (gated), SEO parity.  
5. Defer new tools until redesign + polish land.

## Done archive (V1.0)

P0-01…P0-10, P1-01…P1-04, P2-01, P2-01b, P2-04 — shipped (see git history / live site).
