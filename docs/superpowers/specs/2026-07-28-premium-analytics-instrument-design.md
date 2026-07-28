# Premium Analytics Instrument Design

**Date:** 2026-07-28
**Status:** Approved for implementation
**Scope:** `/`, `/analytics/`, `/analytics/budget/`, `/analytics/forecast/`,
`/calculators/`, `/method/`, `/about/`, and their shared visual primitives

## Objective

Keep the completed calm information architecture and Mangrove decision-support
positioning, while making the first impression more precise, data-rich, and
agency-grade. The site should feel like a premium analytical instrument rather
than a dark editorial publication or a collection of generic cards.

## Visual system

- Use IBM Plex Sans for both display and body roles.
- Add self-hosted IBM Plex Mono for metrics, field labels, evidence markers,
  tables, confidence language, and chart labels.
- Keep paper, ink, and pine as the brand base. Add one restrained signal amber
  for uncertainty ranges, thresholds, current-state comparisons, and caveats.
- Replace soft editorial framing with calibrated rules, compact metadata rails,
  tabular numerals, subtle coordinate grids, and higher-information-density
  surfaces.
- Preserve generous spacing and quiet copy. Do not add fake live status,
  invented customer data, gradients used as spectacle, glass effects, or
  dashboard chrome without analytical meaning.

## Homepage instrument

The hero keeps its current promise, primary analytics action, secondary
calculator action, and privacy note. The illustrative decision brief becomes a
single analytical instrument with:

- an explicitly illustrative status rail;
- two channel response curves and a visible uncertainty range;
- a capped reallocation marker that connects the evidence to the decision;
- the existing observation, bounded move, and 30-day recheck content.

The graphic must be meaningful without motion. With motion enabled, the
evidence curves resolve first, followed by the decision bound and the compact
brief. With reduced motion or unavailable browser APIs, the final state is
shown immediately.

## Shared route treatment

- Analytics, calculator, method, and about headings use the same precise sans
  hierarchy.
- Section kickers, evidence labels, tables, metrics, breadcrumbs, result
  summaries, and form labels use the mono role where legibility permits.
- Cards and workspaces use calibrated borders, inset data rails, and subtle
  grid texture rather than large undifferentiated dark rectangles.
- Budget allocation charts distinguish current allocation with signal amber
  and recommended allocation with pine.
- Forecast charts distinguish the forecast line with pine and the confidence
  band with signal amber.

## Accessibility and responsive behavior

- Preserve semantic headings, nav order, focus styles, skip links, and
  calculator labels.
- Never use color as the only carrier of current/recommended, confidence, or
  decision-bound meaning; retain labels and value text.
- `prefers-reduced-motion: reduce` shows the final instrument and result states
  without transitions or animation frames.
- At 390px, the hero instrument stacks, tables remain contained, labels wrap
  safely, and no route introduces horizontal overflow.

## Boundaries

- No changes to information architecture, calculations, forecasts,
  response-curve logic, affiliate IDs or `AFFILIATE_URL`, Google Analytics
  identity, Supabase schema or backend behavior, legal claims, payments,
  secrets, Vercel, DNS, domains, or production wiring.
- No new framework, runtime dependency, build step, route, or external data
  flow.
- Existing calculators and unrelated routes must retain their behavior.

## Verification

- Add failing tests before the font and motion behavior changes.
- Run the canonical validator, all validator unit tests, and Node tests.
- Exercise all affected routes locally, including successful sample-data
  results for Budget Advisor and Revenue Forecaster.
- Check desktop and 390px layouts, console errors, reduced motion, and
  horizontal overflow.
- Save desktop and 390px screenshots for visible changes.
- Request an independent review of the exact committed head, address all
  critical and important findings, then re-run verification before opening a
  ready pull request.
