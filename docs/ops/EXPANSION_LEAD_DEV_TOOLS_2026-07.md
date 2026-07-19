# Phase 4 expansion — Lead-Dev studio + creator artifacts (2026-07)

Owner waived “more newsletter math.” Implement the unique set from the expansion brief, in dependency order.

## Sequence (strict)

| Order | Ship | Route | Depends on | Monetization |
| --- | --- | --- | --- | --- |
| 1 | Offer Fit | `/lead-dev/#offer-fit` | Live Lead-Dev CTAs | Routes to Kit / Cohort / DWY email |
| 2 | Constitution Builder | `/constitution/` | Offer Fit CTAs exist | Lead-Dev Kit upsell |
| 3 | Phase Gate | `/phasegate/` | Method phases + Constitution | Kit / Cohort / DWY |
| 4 | Niche Gate | `/nichegate/` | Phase Gate rubric language | Cohort / Kit |
| 5 | Method Walkthrough | `/walkthrough/` | Method + Lead-Dev | Kit / Cohort |
| 6 | Media Kit Composer | `/mediakit/` | SponsorQuote family | Soft beehiiv affiliate |
| 7 | Inventory Planner | `/inventory/` | SponsorQuote family | Soft beehiiv affiliate |

## Decision notes (per tool)

### Offer Fit
1. Name: Offer Fit (section, not a separate product brand)
2. Intent: which Lead-Dev offer fits me
3. Unique: honest ladder recommender that can refuse DWY / say “read method first”
4. Shape: 6 questions → one primary offer + why + what not to buy
5. Monetization: Lead-Dev only
6. Out of scope: pushy always-upsell quiz

### Constitution Builder
1. Name / slug: Constitution Builder — `/constitution/`
2. Intent: AGENTS.md template / AI coding agent constitution
3. Unique: opinionated downloadable AGENTS.md + session brief (not a prompt pack)
4. Inputs → stack, model, constraints, gates → Markdown files
5. Monetization: Lead-Dev Kit
6. Out of scope: chat, cloud save, inventing legal terms

### Phase Gate
1. Name / slug: Phase Gate — `/phasegate/`
2. Intent: is my site ready to expand / optimize before new features
3. Unique: Phases 1–3 scored readiness + ordered “don’t expand yet” backlog
4. Inputs → checklist scores → green/yellow/red + sequenced fixes
5. Monetization: Lead-Dev
6. Out of scope: generic Lighthouse clone, invented scores as guarantees

### Niche Gate
1. Name / slug: Niche Gate — `/nichegate/`
2. Intent: niche product idea filter / what to build next
3. Unique: Assignment-04 rubric as UX; critique three ideas; pick ≤1
4. Inputs → idea cards → pass/fail + kill reasons
5. Monetization: Lead-Dev Cohort / Kit
6. Out of scope: vague idea validator without hard rejects

### Method Walkthrough
1. Name / slug: Method Walkthrough — `/walkthrough/`
2. Intent: lead-dev prompting example / interactive case
3. Unique: branched Needle + Mangrove decision path → reveal Lead-Dev choice
4. Shape: short forks + checkpoints → CTAs
5. Monetization: Lead-Dev
6. Out of scope: invented metrics, long fake interactivity

### Media Kit Composer
1. Name / slug: Media Kit Composer — `/mediakit/`
2. Intent: newsletter media kit template
3. Unique: composed one-pager (print CSS), not another CPM number alone
4. Inputs → audience, rates, placements → printable kit + copy
5. Monetization: soft beehiiv `via=mediakit`
6. Out of scope: blank PDF host, CRM, fake brand logos

### Inventory Planner
1. Name / slug: Inventory Planner — `/inventory/`
2. Intent: newsletter sponsorship inventory / capacity planning
3. Unique: slots × cadence × fill × exclusivity over a horizon (not single-issue CPM)
4. Inputs → issues/month, slots, fill, rates → booked $ + open capacity + sold-out estimate
5. Monetization: soft beehiiv `via=inventory`
6. Out of scope: LetterROI redo, calendar SaaS, invoicing

## Explicitly rejected (still)

Churn/LTV/open-rate calculators, SEO generators, prompt libraries, platform comparison doorway pages.
