# MangroveTools.com — Product Definition (V1.0 shipped / V1.1 next)

**Date:** 2026-07-20  
**Workflow stage:** 3  
**Source:** Verified audit in `SITE_AUDIT.md` + live site check

## Status

**Version 1.0 is shipped on production** (tools library, trust pages, method, Lead-Dev offers, studio wizards, sitemap/llms, Stripe kit/cohort links, deliver thank-you pages).

This document defines what V1.0 *was*, what remains essential to keep healthy, and what **V1.1** may include. It is not a license to invent parallel products.

---

## Target users

| Priority | User | Need |
| --- | --- | --- |
| Primary | Newsletter creator | One clear monetization answer (revenue, rate, subs, kit, inventory) without accounts |
| Secondary | Solo builder / indie hacker | Disciplined AI-agent operating system (constitution, phases, offers) |

## Core user problem

Creators waste time on vague “monetize your newsletter” advice. Builders waste time prompting AI without constraints. Mangrove answers with **specific tools** and an optional **lead-dev method**.

## Positioning

Free, calm, Gulf Coast micro-tools that earn their keep — plus Lead-Dev for people ready to install an agent OS.

## Value proposition

- **Tools path:** Instant, private, in-browser math → trust → soft affiliate.  
- **Lead-Dev path:** Method → studio self-checks → paid kit/cohort or email for Full-Stack.

## Primary success events

| Path | Success event |
| --- | --- |
| Tools | User completes a calculation and understands the result |
| Affiliate | User clicks soft Beehiiv CTA after value (not before) |
| Lead-Dev | User starts checkout (Kit/Cohort) or emails for Full-Stack Kit |
| Trust | User finds About / Privacy / Contact without friction |

## Primary workflow

1. Land on home (brand + numbered tool index).  
2. Open one calculator.  
3. Enter inputs → see validated result.  
4. Leave, or follow soft CTA / Lead-Dev path.

## Secondary workflows

- Method article → Constitution / Phase Gate / Offer Fit → Lead-Dev offers  
- FAQ / Privacy for data questions  
- Post-purchase `/deliver/kit/` or `/deliver/cohort/` download

## Existing strengths

- Clear dual model without dashboard theater  
- Strong SEO on core tools  
- Honest client-side privacy story  
- Distinct brand (not generic AI purple)  
- Live commerce path for Kit + Cohort

## Existing weaknesses

- Calculator chrome inconsistent with site shell (logo/CSS duplication)  
- Thin automated QA  
- Studio pages uneven SEO parity  
- No CSP  
- Visual craft can still deepen without redesigning product IA

## Feature ranking (post-V1.0)

| Item | User | Business | Effort | Tech risk | UX risk | Diff | Perf | Necessity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI token/foundation hardening | High | Med | M | Low | Med | High | Neutral | **Essential** (V1.1) |
| Calculator shell unification | Med | Low | M | Med | Med | Med | Positive | **Valuable** |
| Home craft pass (Httpster depth) | High | Med | M | Low | Med | High | Neutral | **Valuable** |
| Tool empty/extreme UX audit | High | Med | S–M | Low | Low | Low | Neutral | **Essential** |
| CSP + header hardening | Low | Med | S | Med | Low | Low | Neutral | **Valuable** |
| Performance (fonts/images/GA) | Med | Med | S–M | Low | Low | Low | Positive | **Valuable** |
| Walkthrough JSON-LD / OG parity | Low | Low | S | Low | Low | Low | Neutral | **Optional** |
| Case-study with metrics | Med | High | M | Low | Med | Med | Neutral | **Optional** (approval) |
| Email waitlist vendor | Med | Med | M | Med | Low | Low | Neutral | **Optional** (approval) |
| Dark mode | Low | Low | L | Med | High | Low | Neutral | **Distracting** now |
| Command palette / accounts / SaaS | Low | Low | L | High | High | Med | Negative | **Out of scope** |
| New thin clone calculators | Low | Low | M | Low | Med | Low | Neutral | **Out of scope** until phases 1–3 solid |

## V1.0 scope (complete — do not re-litigate)

- Home + 5 tools + studio wizards + method + lead-dev + trust + faq  
- Shared nav/footer IA  
- sitemap / robots / llms / Netlify redirects  
- Stripe kit/cohort + deliver pages (owner-configured)  
- GA site-wide (approved ID)

## V1.1 scope (proposed — needs item-by-item approval)

1. Workflow docs + refreshed audit/strategy/design/backlog (**this PR**)  
2. UI foundation tokens/components plan → implement foundation  
3. Home + primary tool visual/UX polish within brand  
4. Calculator shell consistency  
5. A11y / responsive / performance / SEO parity hardening  
6. Optional: CSP, structured data polish

## V1.1+ / later

- Owner-approved case study metrics  
- Email capture vendor  
- Additional **unique** niche tools only after Niche Gate / Phase Gate discipline

## Trust & credibility

- No invented testimonials or revenue guarantees  
- Affiliate disclosure on tools + privacy  
- Contact: `needlesearchapp@protonmail.com`  
- Pricing bands from `docs/lead-dev-products/` / setup doc

## Requirements (standing)

| Domain | Bar |
| --- | --- |
| Accessibility | WCAG 2.2 AA intent: keyboard, focus, contrast, labels, reduced motion |
| Privacy | Never POST calculator inputs; no extra trackers without approval |
| SEO | Every indexable page: title, description, canonical, robots, OG/Twitter; sitemap/llms accurate |
| Performance | Fast static HTML; limit third parties; optimize fonts/images before adding JS weight |
| Analytics | GA `G-E20401V5WB` only unless approved |
| Release | Feature branch → PR → preview; production deploy remains owner-gated for risky changes |

## Explicit non-goals

Backends, accounts, ad networks, social platforms, blog farms, hard paywalls on tool results, rebrand away from Mangrove identity, fashionable dependency installs without clear benefit.
