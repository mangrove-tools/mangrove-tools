# MangroveTools.com — Repository & Product Audit

**Date:** 2026-07-20  
**Mode:** Read-only inspection of `/workspace` + live `https://mangrovetools.com/` verification  
**Workflow stage:** 2 (Inspect)  
**Branch context:** `cursor/mangrove-workflow-foundation-f444`

Do not treat this as a rewrite brief. Prefer incremental improvement of what already ships.

---

## 1. Concise product description

Mangrove Tools is a **static Netlify library** of free, single-purpose in-browser calculators for newsletter creators, plus a **Lead-Dev** path (methodology, studio wizards, and paid kit/cohort/DWY offers). Brand: Naples / Gulf Coast calm — paper, pine, terracotta; Fraunces + Outfit.

---

## 2. Findings by topic

### Verified facts

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | What it does | Free calculators (revenue, sponsorship rates, subscriber goals, media kit, inventory) + Lead-Dev studio + paid offers |
| 2 | Users | Newsletter creators (primary); solo builders wanting agent OS discipline (secondary) — `AGENTS.md`, `SITE_STRATEGY_V1.md` |
| 3 | Value prop | “Tools that earn their keep” — clear answer, no accounts; optional Lead-Dev install path — `index.html` |
| 4 | Public HTML routes (19) | `/`, `/letterroi/`, `/sponsorquote/`, `/subtarget/`, `/mediakit/`, `/inventory/`, `/method/`, `/walkthrough/`, `/constitution/`, `/phasegate/`, `/nichegate/`, `/lead-dev/`, `/about/`, `/faq/`, `/privacy/`, `/contact/`, `/deliver/kit/`, `/deliver/cohort/`, `404.html` |
| 5 | Primary journey | Home → tool → calculate → optional affiliate CTA |
| 6 | Secondary journeys | Home → Method / studio → Lead-Dev → Stripe or mailto; Home → About / FAQ / Contact |
| 7 | Completeness | V1.0 shell + expansion tools shipped; Stripe Payment Links live in `lead-dev/config.js`; deliver zips present |
| 8 | Frontend | **No framework** — no `package.json`; HTML/CSS/vanilla JS |
| 9 | Backend | None for core product; Netlify static hosting only |
| 10 | Rendering | Fully static HTML; client JS for calcs/wizards |
| 11 | Components | No component library; shared CSS classes in `site.css` / `studio.css`; per-page HTML |
| 12 | State | In-page JS variables; no global store; no persistence of calculator inputs |
| 13 | Data fetching | None for tools; no APIs |
| 14 | Integrations | Beehiiv affiliate anchors (`*/config.js`); Stripe Payment Links; Google Analytics `G-E20401V5WB` |
| 15 | Auth | None |
| 16 | Database | None |
| 17 | Styling | Design tokens in `site.css` `:root`; calculator pages duplicate expanded tokens in local `styles.css`; studio uses `studio.css` |
| 18 | Design system | Informal token + class system; not a packaged library |
| 19 | Responsive | Flex/wrap nav; shell max-width `--shell: 1040px`; mobile stack patterns in CSS |
| 20 | Motion | `.reveal` / `.reveal-delay-*`, `.is-pop`, studio step enter; `prefers-reduced-motion` honored in `site.css`, tool CSS, `studio.css` |
| 21 | Forms | Calculator `readAndValidate` / `setFieldError` / `aria-invalid`; contact is mailto only |
| 22 | Errors | Field-level `role="alert"` on tools; no global error boundary (N/A for static) |
| 23 | Loading / empty | Tools reset to em dash + empty copy until first valid calc; no network loading states |
| 24 | Tests | Only `scripts/check-links.py` (internal href scan). No unit/e2e |
| 25 | Build | None — publish repo root |
| 26 | Deploy | `netlify.toml` redirects + headers; production is live |
| 27 | Analytics | gtag `G-E20401V5WB` on all 19 HTML pages |
| 28 | SEO | Titles, descriptions, canonicals, OG/Twitter on indexable pages; `sitemap.xml` (16 URLs); `robots.txt`; `llms.txt` |
| 29 | Social meta | Strong on core pages; some studio pages omit `og:locale`; walkthrough lacks JSON-LD |
| 30 | Accessibility | Skip-link + landmarks on all pages; focus-visible; calculator ARIA errors |
| 31 | Performance risks | Google Fonts + GA third parties; duplicated ~2k lines of calculator CSS; `og.jpg` ~90KB |
| 32 | Security / privacy | No secrets in repo; calcs client-side; no CSP; Stripe/affiliate URLs are public by design |
| 33 | Broken links | `python3 scripts/check-links.py` → OK (19 HTML). Live route probe 2026-07-20 → all public 200 |
| 34 | TODOs / dead code | No TODO/FIXME in source; stub `mediakit/styles.css` + `inventory/styles.css`; CSS duplication across three calculators |
| 35 | Browser risk | Modern CSS (flex, `:focus-visible`, CSS variables) — fine for current evergreen browsers |
| 36 | Mobile risk | Nav wraps; tool forms dense — needs ongoing viewport QA |
| 37 | Production blockers | **None for free-tool library.** Paid path depends on Stripe products remaining configured (owner) |
| 38 | Professional gaps | Calculator brand mark vs full logo inconsistency; docs drift (older audit said trust pages missing) |
| 39 | Distinctive UI opportunities | Deeper Httpster-craft index; shared UI foundation; signature tool result transitions; home product demonstration without dashboard clutter |

**Live parity (2026-07-20):** Homepage SHA-256 matched local `index.html`. Stripe kit/cohort Payment Links return HTTP 200.

### Reasonable inferences

- V1.0 backlog items (trust pages, method, lead-dev, discoverability) are **shipped**.
- Next product phase is **polish / UI foundation / SEO hardening / selective differentiation**, not greenfield features.
- Calculator pages keep independent CSS for historical isolation; unifying is a maintainability win with visual-regression risk.
- `AGENTS.md` still says Lead-Dev may ship with placeholder CTAs; runtime config now has live Stripe URLs (owner-configured).

### Manual verification still required

| Item | Why |
| --- | --- |
| Real-device mobile / keyboard / screen reader | Agent browser spot-check ≠ full a11y audit |
| End-to-end Stripe purchase → `/deliver/*` download | Money path; owner should confirm |
| Affiliate click-through + GA realtime | External systems |
| Contrast on every studio step | Partial CSS AA work done; not exhaustively measured |
| Netlify dashboard = `main` deploy | Confirm publish source |

---

## 3. Preserve vs replace

### Preserve

- Static folder routes `/{slug}/` + trailing-slash redirects
- Mangrove Gulf Coast tokens and voice (do **not** rebrand to generic SaaS / purple AI)
- Client-side-only calculator math; affiliate URLs only in tool `config.js`
- Lead-Dev URLs only in `lead-dev/config.js`
- Soft affiliate CTAs after value; never hard-paywall results
- Forced 404 for `/docs/*`, `AGENTS.md`, `README.md`
- Skip-links, landmarks, reduced-motion
- Approved GA ID only (no extra analytics SDKs)

### Candidates to improve (not wholesale replace)

- Shared UI foundation / token completeness (`UI_FOUNDATION_PLAN.md`)
- Unify calculator chrome onto `site.css` (or shared `tool-shell.css`)
- Align docs with live Stripe + deliver flow
- CSP (carefully, for GA + fonts + Stripe outbound)
- Broader SEO parity on thinner studio pages
- Performance pass (fonts, image, third-party weight)

---

## 4. Maturity assessments

| Area | Rating | Notes |
| --- | --- | --- |
| UX maturity | **B+** | Clear home index, working tools, Lead-Dev path; polish uneven across calculator vs site shell |
| Technical maturity | **B** | Excellent fit for static constraints; weak automated test surface; CSS duplication debt |
| SEO maturity | **A−** | Strong core; minor parity gaps on studio/deliver |
| Trust / commerce | **B+** | Privacy/about/contact live; Stripe live; legal depth still light by design |

---

## 5. Risk summary

| Severity | Risk |
| --- | --- |
| HIGH | Broad visual rewrite that breaks brand or calculator UX without foundation-first work |
| MEDIUM | CSS drift across three calculator shells; no automated visual/regression tests |
| MEDIUM | No CSP; third-party GA + fonts |
| LOW | Docs drift vs live Stripe (mitigated this pass) |
| OWNER | Stripe product/tax/payout correctness; deliver zip content freshness |

---

## 6. Prioritized action plan (post-audit)

1. **Freeze architecture** — no framework introduction.  
2. **Approve backlog IDs** in `BACKLOG.md` one at a time.  
3. **UI foundation first** (`UI_FOUNDATION_PLAN.md`) before page-by-page redesigns.  
4. **Primary workflow polish** — home + top tools + Lead-Dev conversion clarity.  
5. **Hardening** — a11y/responsive/performance/SEO/security passes.  
6. **Expand** only after optimize → polish → SEO (per `AGENTS.md`).

Next workflow stage after owner approval: implement **one** backlog item (Stage 8).
