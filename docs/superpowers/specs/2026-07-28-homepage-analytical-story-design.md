# Homepage Analytical Story Design

**Date:** 2026-07-28
**Status:** Approved for implementation
**Scope:** Homepage only, plus shared styles and focused validation

## Objective

Make the Mangrove Tools homepage communicate one clear product thesis:
imperfect operating data can still support a bounded, testable marketing
decision.

The page should feel like a concise analytical brief, not a software dashboard
or a directory of unrelated tools. Analytics remains the primary path.
Calculators remain a useful secondary path.

## Experience

### Hero

The hero should make the promise concrete:

- headline: make the next marketing decision with evidence;
- supporting copy: use the history already available to compare channels,
  surface uncertainty, and choose a measured next step;
- one filled primary action to `/analytics/`;
- one understated secondary link to `/calculators/`;
- a compact decision brief replaces the generic response-curve illustration.

The brief is explicitly illustrative. It shows the shape of a useful answer:
an observation, a bounded move, and a recheck condition. It must not imply that
Mangrove Tools has measured a real customer or can guarantee an outcome.

### Analytical story

A three-stage editorial sequence follows the hero:

1. **Bring the evidence together.** Show a small, plausible set of channel
   spend and conversion observations. Label it as an example.
2. **Test what the history supports.** Show the checks that matter: coverage,
   response shape, seasonality where relevant, and uncertainty.
3. **Set a boundary around the decision.** Show a capped reallocation, a
   measurement window, and a condition that would cause the operator to stop or
   revise the move.

The sequence is static in this PR. Motion and scroll-linked state are reserved
for the next PR so that content, hierarchy, and responsive behavior can be
reviewed independently.

### Remaining homepage

The existing analytics cards remain the next functional destination. The
calculator list stays secondary and retains its `#calculators` anchor. Trust and
FAQ content remain available but should not compete with the analytical story.

## Visual direction

- Use the existing paper, pine, teal, Source Serif 4, and IBM Plex Sans system.
- Favor editorial rules, tabular numerals, quiet labels, and one strong decision
  card over dashboard chrome.
- The three stages should read as a sequence at desktop widths and as a clean
  vertical narrative at 390px.
- No decorative illustration, generic gradient spectacle, fake live status, or
  fabricated performance metric.
- No overlap, clipping, or horizontal overflow at 390px.

## Accessibility

- Preserve one H1 and a logical heading order.
- Keep the example data readable in semantic HTML.
- Do not rely on color alone to distinguish stages or the decision boundary.
- Preserve visible focus states and the existing skip link.
- Mark purely decorative connectors as hidden from assistive technology.

## Content rules

- Dry, specific, operational copy.
- Avoid “unlock insights,” “AI-powered,” “transform your business,”
  “revolutionize,” “seamless,” “toolbox,” and unqualified performance claims.
- Explain uncertainty and a stop/recheck condition.
- Keep the browser-first privacy claim consistent with the current product
  contract.

## Boundaries

- No calculator, forecasting, response-curve, or analytics logic changes.
- No new backend, events, dependencies, routes, redirects, or production
  configuration.
- No changes to affiliate identifiers, `AFFILIATE_URL`, Google Analytics
  identity, legal terms, secrets, payments, Vercel, DNS, or domain wiring.
- No raw calculator input storage.

## Acceptance criteria

- The homepage presents one memorable, three-stage story from messy inputs to a
  bounded decision.
- The example is visibly labeled as illustrative.
- The bounded decision contains a cap, a recheck window, and a stop/revise
  condition.
- The only filled hero action routes to `/analytics/`.
- The secondary hero action routes to `/calculators/`.
- Existing analytics and calculator routes remain intact.
- Desktop and 390px layouts are polished and free of clipping or overflow.
- The repository validator and all validator unit tests pass.
- Exact HEAD receives an independent review before the PR is opened.
