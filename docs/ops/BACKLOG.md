# MangroveTools.com — Autonomous Engineering Backlog (V1.0)

Legend: **Auto** = Cursor may execute; **Approval** = human gate.

## P0

| ID | Title | Impact | Acceptance | Files / routes | Size | Auto? |
| --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Protect repo | Risk | `.gitignore`/`.cursorignore` complete; branch exists | root ignore files | S | Auto |
| P0-02 | Revise AGENTS.md | Process | Dual model + autonomy rules | `AGENTS.md` | S | Auto |
| P0-03 | Ops docs | Process | Audit, strategy, backlog, discovery written | `docs/ops/*` | M | Auto |
| P0-04 | Shared nav/footer | UX/SEO | All public pages share coherent IA | `site.css`, all HTML | M | Auto |
| P0-05 | Trust pages | Trust | `/about/`, `/privacy/`, `/contact/` live + linked | new folders | M | Auto |
| P0-06 | Method page | SEO/Conv | `/method/` public article + linked | `method/` | M | Auto |
| P0-07 | Lead-Dev suite | Revenue | `/lead-dev/` three offers + placeholders | `lead-dev/` | L | Auto |
| P0-08 | Discoverability | SEO | sitemap/llms/robots/netlify redirects updated | sitemap, llms, netlify | S | Auto |
| P0-09 | Revenue setup doc | Revenue | Owner knows exact config keys | `docs/setup/LEAD_DEV_REVENUE.md` | S | Auto |
| P0-10 | Prod readiness note | Risk | QA documented; deploy still gated | `docs/ops/PROD_READINESS.md` | S | Auto |

## P1

| ID | Title | Notes | Auto? |
| --- | --- | --- | --- |
| P1-01 | Link checker script | `scripts/check-links.py` | Auto |
| P1-02 | Tool footer/nav parity | LetterROI + SponsorQuote match site shell | Auto |
| P1-03 | Remove unused `.tool-soon` if still unused | Dead CSS | Auto |
| P1-04 | Home dual-path section | Tools + Method/Lead-Dev without clutter | Auto |

## P2

| ID | Title | Notes | Auto? |
| --- | --- | --- | --- |
| P2-01 | SubTarget tool | Decision: `docs/ops/NEXT_TOOL_SUBTARGET.md` | Auto |
| P2-01b | Design shell (Httpster craft) | Home index + motion + foot grid | Auto / done 2026-07-19 |
| P2-02 | Case-study depth page | Only with owner-approved metrics | Approval for claims |
| P2-03 | Email waitlist vendor | UI ok; live vendor activation gated | Approval to activate |

## P3

| ID | Title | Notes | Auto? |
| --- | --- | --- | --- |
| P3-01 | Performance pass | Font subsetting, image audit | Auto |
| P3-02 | Structured data for Product offers | Honest Offer schema when prices final | Approval if claims |

## Approval-gated (never autonomous)

- Live payments / payouts / tax / storefront account  
- Production deploy / DNS / Netlify identity  
- Affiliate ID changes  
- Legal terms, guarantees, invented testimonials  
- Destructive git / rebrand

## Batch map

1. **A** — P0-01…P0-03  
2. **B** — P0-04, P0-05, P1-02/P1-04 partial  
3. **C** — P0-06…P0-09  
4. **D** — P1-01…P1-03, polish  
5. **E** — P0-10
