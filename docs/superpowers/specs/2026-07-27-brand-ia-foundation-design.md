# Mangrove Tools Brand and IA Foundation Design

**Status:** Approved July 27, 2026

## Purpose

Mangrove Tools should feel like a small, serious analytical practice: calm
enough to understand quickly, specific enough to trust, and useful in one
sitting. The site is not a generic collection of tools and should not borrow
the visual language of AI wrappers, growth dashboards, or template marketplaces.

This foundation makes the product hierarchy explicit before further homepage
storytelling or motion work.

## Current Baseline

The site already has:

- a dark editorial visual system;
- self-hosted Source Serif 4 and IBM Plex Sans;
- an analytics-first homepage and analytics hub;
- two browser-first analytics products;
- five newsletter-oriented utilities at their existing root URLs;
- sample data, recommendation explanations, and contextual Analytics links;
- an inactive Supabase analytics foundation;
- public metadata and route validation.

The remaining structural gaps are:

- no `/calculators/` collection page;
- no `/method/` trust page;
- Calculators navigation points to a homepage fragment rather than a durable
  collection;
- Home and Method are absent from primary navigation;
- the homepage hero presents two competing product buttons rather than one
  primary route into Analytics;
- the five-link target navigation needs an intentional 390px layout.

## Information Architecture

Primary navigation, in this order:

1. Home — `/`
2. Analytics — `/analytics/`
3. Calculators — `/calculators/`
4. Method — `/method/`
5. About — `/about/`

The header remains fully visible. There is no hamburger menu.

Desktop uses a single row with the brand on the left and navigation on the
right. At 390px the header becomes two rows: brand first, then five evenly
distributed text links. Focus, hover, and current-page states use the existing
pine accent without adding decorative color.

## Route Strategy

Add:

- `/calculators/`
- `/method/`

Keep all existing calculator routes unchanged:

- `/letterroi/`
- `/sponsorquote/`
- `/subtarget/`
- `/mediakit/`
- `/inventory/`

No calculator route moves, so no migration redirect is necessary. Keep
`id="calculators"` on the homepage calculator teaser so existing
`/#calculators` links still land on meaningful content.

Do not change `vercel.json`, Vercel configuration, DNS, domain wiring, or
production behavior.

## Homepage Foundation Change

The hero should have one filled primary action:

- `Explore Analytics` → `/analytics/`

It should have one secondary text action:

- `Browse Calculators` → `/calculators/`

The two individual analytics products remain visible in the next section, where
users can choose the appropriate tool with more context.

This PR changes hierarchy and navigation only. The later homepage story PR will
rework the analytical narrative and progressive disclosure.

## Calculators Page

`/calculators/` is a concise secondary-utility collection, not a second product
homepage.

Group the five existing utilities by job:

### Revenue and pricing

- LetterROI — estimate newsletter revenue ranges.
- SponsorQuote — frame sponsorship pricing.
- SubTarget — calculate the paid-subscriber count for a revenue target.

### Sales operations

- Media Kit Composer — prepare a compact sponsor-facing one-pager.
- Inventory Planner — estimate sponsorship capacity and booked revenue.

Each entry names its required inputs and concrete output. The page includes one
quiet route into `/analytics/` for operators whose decision requires historical
business data rather than a quick calculator.

## Method Page

`/method/` is the trust and operating-philosophy page. It uses short structured
sections instead of policy prose:

1. **Start with the decision** — tools begin with a bounded operating question.
2. **Work in the browser** — calculator inputs are processed locally by default.
3. **Show the model** — name inputs, transformations, outputs, and known
   limitations.
4. **Use benchmarks carefully** — distinguish references from guarantees or
   universal targets.
5. **State confidence and caveats** — describe evidence strength and the primary
   condition that could change the result.
6. **Know what the tools are not** — not legal, financial, or guaranteed
   performance advice; not a replacement for controlled measurement.

The page links naturally to Home, Analytics, About, and Privacy. Copy must not
make legal, financial, or guaranteed-performance claims.

## Visual Direction

Retain the current “small-operator data room” system:

- Source Serif 4 for decisive editorial display;
- IBM Plex Sans for body, labels, tables, and controls;
- dark paper surface with warm off-white text;
- pine/teal only for action, active state, and analytical signal;
- fine rules, compact labels, restrained corner radii;
- response-curve and confidence motifs only when they explain a relationship.

This PR may refine spacing, navigation behavior, and collection-card hierarchy.
It must not add gradients, decorative illustrations, dashboard chrome, or
gratuitous motion.

## Accessibility and Responsive Behavior

- One H1 per page with ordered H2/H3 sections.
- Current navigation item uses `aria-current="page"`.
- Navigation remains keyboard accessible at every viewport.
- 390px pages have no horizontal overflow or clipped labels.
- Focus indicators remain visible.
- Existing skip links and landmark structure remain intact.
- Motion is not added in this PR.

## Validation and Evidence

Automated:

- Add a route and navigation contract test that exercises rendered HTML files
  and the nav/footer updater in a temporary repository fixture.
- Update exact public-route assertions for `/calculators/` and `/method/`.
- Run `python3 scripts/validate_site.py`.
- Run `python3 -m unittest discover -s scripts -p 'test_*.py' -v`.
- Run `git diff --check`.

Manual/browser:

- Desktop at 1440×1000.
- Mobile at 390×844, DPR 1.
- Home, Analytics, Calculators, Method, and representative tool pages load.
- No blank page, overlay, console error, horizontal overflow, or clipped nav.
- Keyboard focus reaches all five navigation links and the primary CTA.

Commit desktop and 390px evidence under
`docs/superpowers/screenshots/brand-ia-foundation/` so the pull request can show
reviewable images without relying on a local-only path.

## Pull Request Sequence

1. Brand, IA, Calculators, and Method Foundation.
2. Rebase, re-review, and merge existing About PR #22.
3. Homepage analytical story.
4. Purposeful motion and final brand polish.

Each PR is independently tested and reviewed against its exact head. Once green,
the PR may be merged and the resulting production deployment verified before the
next PR starts.

## Non-Goals and Protected Boundaries

- No new analytics calculation, backend, event collection, or tool.
- No changes to Affiliate IDs or `AFFILIATE_URL`.
- No changes to Google Analytics identity.
- No changes to Vercel, DNS, domains, payments, secrets, or production wiring.
- No storage of raw calculator inputs.
- No changes to calculator mathematics.
- No legal, financial, or guaranteed-performance claims.
- No unrelated cleanup.

