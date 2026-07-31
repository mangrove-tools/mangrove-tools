# Shared Shell Polish Design

**Date:** 2026-07-31  
**Status:** Approved direction, pending specification review  
**Branch:** `agent/shared-shell-polish`

## Context

Mangrove's homepage now establishes a strong premium analytics-instrument identity, but that identity weakens on secondary routes. The shared header, page headings, buttons, forms, and result panels are functional but visually inconsistent: some controls still feel generic, several focus states belong to the earlier light theme, and important decision outputs do not consistently use the signal language already established by the homepage graph.

This pass sharpens the shared shell without changing information architecture, calculator behavior, or page content. The goal is for the whole site to feel like one calm analytical product while keeping the homepage decision graph as the strongest visual moment.

## Goals

- Carry the premium analytics-instrument identity across the shared site shell.
- Make navigation and primary actions feel deliberate, stable, and product-grade.
- Use signal rails, restrained locator corners, and state color to clarify important outputs.
- Improve focus contrast, typography, spacing, and responsive behavior.
- Preserve the current IA, homepage graph, calculator logic, and brand foundation.

## Non-goals and protected surfaces

This is not a new IA pass, a copy rewrite, or a homepage redesign. It will not change:

- Routes, page hierarchy, navigation labels, or calculator inputs and formulas.
- The homepage decision graph geometry, curves, uncertainty band, labels, or three-column readout.
- Affiliate IDs or `AFFILIATE_URL`.
- Google Analytics identity.
- Vercel, DNS, domain, deployment, or production wiring.
- Secrets, payments, legal claims, Supabase schema, or backend behavior.
- Unrelated files or the open cache-safety PR.

The branch will produce a ready PR only. It will not be merged or deployed without a later explicit instruction.

## Design direction

### 1. Sticky masthead with a non-sticky homepage rail

The shared brand-and-navigation row will use `position: sticky` with an opaque, dark instrument surface, a quiet lower rule, and enough z-index to remain legible over page content. It will not become a permanently fixed overlay.

The homepage's decorative signal rail will remain outside the sticky layer and scroll away with the hero. Because the rail currently lives inside the homepage header, the implementation will minimally separate the sticky brand/navigation row from the rail rather than making the entire header sticky.

The masthead will:

- Preserve every existing navigation link and active-route treatment.
- Strengthen the brand lockup through spacing, alignment, and the existing localized logo glow rather than a larger global glow.
- Compact cleanly at 390px without clipped labels, overlapping controls, or horizontal scrolling.
- Preserve skip-link behavior and visible keyboard focus.

Desktop result panels that already use sticky positioning will receive a shared offset below the masthead so they cannot slide underneath it.

### 2. Shared action system

Buttons and links that act like buttons will share a restrained control language across the site:

- Stable minimum 44px interaction targets.
- Modestly rounded corners through a dedicated control-radius token; pills remain reserved for the homepage split CTA and compact status controls.
- A dark raised secondary treatment and a decisive teal primary treatment.
- A small amber commit detail on primary actions, such as a narrow edge or terminal marker, rather than an arrow that would imply navigation on submit controls.
- Clear hover, active, focus-visible, disabled, and busy states without layout shift.
- Consistent label weight and spacing, with mono reserved for data/status labels rather than every button.

The homepage split primary CTA remains the flagship action. It will be aligned with the shared system but not flattened into the generic button style. Secondary calculator links remain visually clear and lower emphasis.

### 3. Instrument framing for decision outputs

The signal language will be applied only to meaningful decision and result surfaces, not to every card.

Important result panels will gain:

- A thin state rail that uses teal for evidence/readiness and amber for a bounded decision or caution signal.
- Small locator corners that frame the output without enclosing the entire page in decoration.
- Stronger separation between evidence labels, numeric outputs, and explanatory prose.
- Shared surface, border, and shadow tokens with restrained contrast.

Candidate surfaces include calculator results, budget decision outputs, forecast outputs, and studio output panels. Ordinary content cards, FAQs, and explanatory sections will not receive the motif.

### 4. Typography and rhythm

IBM Plex Sans and IBM Plex Mono remain the type foundation. This pass will refine their use rather than introduce another font:

- Secondary-page hero and tool headings will use a slightly lighter weight and relaxed tracking so they feel precise rather than blocky.
- Metrics, table headings, evidence markers, confidence labels, and state labels will consistently use the mono family.
- Brand/tool lockups will use clearer weight and spacing hierarchy.
- Shared section and panel spacing will be normalized where current routes visibly drift.
- The homepage hero typography remains unchanged unless a shared rule unintentionally affects it.

### 5. Purposeful state motion

Motion will explain result state rather than decorate the shell. Existing calculator state hooks will drive a short, non-looping transition:

1. Evidence or inputs resolve in teal.
2. The bounded recommendation or decision marker resolves in amber where applicable.
3. The output settles into its ready state.

There will be no continuous ambient animation. Under `prefers-reduced-motion: reduce`, state changes will be immediate and all visual meaning will remain available statically.

### 6. Contrast and interaction cleanup

Dark-theme remnants will be corrected as part of the shared visual pass:

- Focused inputs will stay on a dark raised surface with a high-contrast teal focus ring; they will not switch to white behind near-white text.
- Studio choices and status treatments will use the current dark surface and signal tokens.
- Error, warning, ready, disabled, and loading states will remain distinguishable without relying on color alone.
- Focus indicators will not be clipped by overflow or locator-corner decoration.

## Technical approach

The work will stay within the static HTML/CSS/vanilla-JavaScript architecture.

Expected implementation surfaces:

- `assets/css/site.css` for tokens, masthead, shared buttons, typography, focus states, and reduced-motion behavior.
- `assets/css/tool-shell.css` for calculator forms, result surfaces, sticky offsets, and result-state presentation.
- `assets/css/studio.css` for media-kit/inventory control and output consistency.
- `analytics/budget/styles.css` and other route-local styles only where shared selectors cannot express the approved treatment safely.
- Homepage markup only as needed to separate the scrolling signal rail from the sticky brand/navigation row.
- Other HTML files only for small presentation hooks that cannot be added safely through existing classes.
- Existing static contract tests, plus the smallest focused tests needed to prevent navigation, asset, focus, or reduced-motion regressions.

Changed CSS assets will be re-fingerprinted and every referring HTML document updated using the repository's existing asset workflow. The implementation will not change configuration or application data.

## Behavior and failure states

No calculation, persistence, analytics-event, or backend data flow changes are planned. Existing JavaScript state classes and ARIA behavior remain authoritative.

Presentation changes must preserve:

- Submit, reset, sample-data, export, copy, print, and navigation behavior.
- Validation messaging and focus movement.
- Disabled and loading behavior during calculations.
- Results remaining readable if JavaScript or animation is unavailable.
- Keyboard navigation across the sticky masthead and every calculator control.

## Route scope

The shared-shell pass will be verified on:

- `/`
- `/analytics/`
- `/analytics/budget/`
- `/analytics/forecast/`
- `/calculators/`
- `/method/`
- `/about/`
- `/letterroi/`
- `/sponsorquote/`
- `/subtarget/`
- `/mediakit/`
- `/inventory/`

Shared navigation will also be spot-checked on FAQ, privacy, contact, and 404 pages. Route-specific changes outside the listed surfaces require a demonstrable shared-CSS dependency and will be called out in the PR.

## Acceptance criteria

- The shared masthead remains visible while scrolling, with no content hidden underneath it.
- The homepage signal rail scrolls away and does not become part of the sticky row.
- The logo glow stays localized and the page does not become hazy.
- Primary, secondary, disabled, busy, hover, active, and focus-visible action states are consistent and product-grade.
- Important result panels use restrained state rails and locator framing; ordinary cards do not.
- Secondary-page headings feel precise rather than heavy, and data labels consistently use the mono family.
- Focused fields retain readable dark-theme contrast.
- Result motion is short, state-driven, non-looping, and removed under reduced-motion preferences.
- Desktop and 390px layouts have no overlap, clipping, or horizontal overflow.
- Existing calculators and unrelated routes continue to work.
- The homepage decision graph is preserved.

## Verification

Automated checks will include:

```bash
python3 scripts/validate_site.py --base-ref origin/main
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.js
git diff --check
```

Browser verification will use a local server started from the worktree root on port 5173. Evidence will include:

- Desktop and 390px screenshots of the homepage, one analytics workspace, one calculator workspace, and one representative content route.
- Scroll checks confirming sticky-header behavior and that the homepage rail leaves the viewport.
- A 390px `scrollWidth <= 390` assertion on every affected route.
- Keyboard checks for skip navigation, masthead links, forms, and result actions.
- Sample-data and primary action flows on representative calculators.
- Reduced-motion verification.
- Console and network-error checks.

An independent reviewer will inspect the exact committed head after the full validation suite passes. The final handoff will be a ready PR with commands, results, screenshots, exact head, and any justified shared-route effects documented.
