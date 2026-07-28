# Homepage Identity Sharpening Design

**Date:** 2026-07-28
**Status:** Approved for implementation
**Scope:** `/` plus the shared CSS and motion assets the homepage already
imports

## Objective

Sharpen the homepage visual identity without revisiting its information
architecture, copy structure, routes, or analytical premise. The first viewport
should feel like a calm, proprietary decision instrument rather than a generic
dark landing page.

The existing homepage decision graph is the strongest visual asset and remains
the source of truth. This pass frames and activates that instrument; it does not
replace or redraw it.

## Approved direction

Use the **Signal + Glow + Locator** direction:

- a three-part signal rail maps pine to evidence, amber to the bounded move,
  and neutral gray to recheck;
- the Mangrove logo receives a small, localized pine glow and a stronger
  wordmark lockup;
- the primary CTA becomes a rounded split control with a pine label area and
  amber arrow compartment;
- opposing locator corners frame the instrument, with pine at the evidence
  origin and amber at the bounded-decision edge;
- the existing instrument readouts become linked focus targets for the real
  graph.

No global haze, decorative gradient field, or new dashboard chrome is added.

## Hero typography

Keep IBM Plex Sans and the existing headline text. Reduce the headline from the
current heavy, tightly tracked treatment to the committed 500 weight with
approximately `-0.025em` tracking and a slightly more open line height. Preserve
the existing responsive type scale unless visual verification shows a local
mobile adjustment is required.

The change should make the heading feel measured and precise, not smaller,
quieter, or editorial.

## Header lockup and signal rail

Strengthen only the homepage header:

- make the logo and wordmark read as one deliberate lockup;
- keep the glow tight to the logo mark;
- add a small datum divider after the wordmark;
- replace the undifferentiated header rule with a restrained three-segment rail.

The rail is not arbitrary decoration. Its segment order and colors mirror the
instrument sequence: evidence, bounded move, recheck. The instrument repeats
that mapping with compact visible labels, so the visual grammar is explained
inside the product rather than left as an abstract stripe.

Navigation order, labels, links, focus behavior, and mobile wrapping remain
unchanged.

## Primary and secondary actions

Keep “Explore Analytics” as the primary action and “Browse Calculators” as the
secondary action.

The primary action becomes a single semantic link with two visual regions:

- a roomy pine label region;
- an amber arrow region that indicates forward movement.

The control uses a restrained pill radius, clear focus treatment, and a small
hover/active response. It must remain at least 44 pixels high and keep the full
label on one line at 390 pixels without clipping or overlap.

The secondary calculator link remains visibly secondary but receives sufficient
contrast and spacing to avoid looking like incidental body text.

## Instrument preservation and framing

Preserve the existing decision graph exactly:

- SVG `viewBox`;
- grid paths;
- search and social curve paths;
- uncertainty-band path;
- bounded-zone rectangle, dashed line, and arrow;
- plotted point coordinates;
- axis and bounded-test labels;
- legend;
- three-column observation, bounded move, and recheck readout content.

Add only surrounding or state-based presentation:

- pine top-left and amber bottom-right locator corners;
- a restrained localized instrument shadow;
- a three-part concept rail aligned with the readout sequence;
- active-state emphasis that changes opacity, stroke emphasis, glow, and
  readout surface treatment without changing geometry or values.

## Linked instrument interaction

The three existing readout columns become keyboard-focusable and pointer/touch
targets:

1. **Observation** emphasizes the existing paid-search curve, its point, and
   evidence readout while quieting unrelated marks.
2. **Bounded move** emphasizes the existing amber social curve, uncertainty
   band, ≤10% bounded zone, and decision readout.
3. **Recheck** emphasizes the existing terminal curve points and recheck
   readout, signaling comparison over time without adding a new metric.

Pointer hover and keyboard focus are transient. Tap/click selects a state until
another readout is selected or the visitor leaves the instrument. `Escape`
clears the selected state. The interaction never changes the illustrative
numbers, calculation logic, accessible names, or reading order.

The current once-per-load graph reveal remains. Linked states become available
after initialization and are the memorable above-the-fold moment; there is no
looping animation, parallax, or scroll-jacking.

## Reduced motion and progressive enhancement

The instrument and all content remain complete without JavaScript.

With `prefers-reduced-motion: reduce`:

- the graph appears in its final state immediately;
- no entrance frames or animated transitions are scheduled;
- linked readout emphasis remains available as an instantaneous state change;
- no pulsing, looping, or delayed content is introduced.

Missing browser APIs must continue to fall back to a fully visible static
instrument.

## Responsive behavior

At 390 pixels:

- preserve the current stacked hero and full-width instrument;
- keep the logo lockup, navigation, and signal rail contained;
- give the split CTA sufficient width and reduce label weight only if needed;
- stack or compact the concept rail without obscuring the chart;
- retain the existing readable graph, legend, and readout layout;
- introduce no horizontal overflow.

Desktop and 390-pixel screenshots must show stable final states.

## Architecture and affected files

Expected production files:

- `index.html` for homepage-only CTA structure, instrument state hooks, and
  concept-rail markup;
- `site.css` for homepage-scoped lockup, rail, CTA, locator, typography, and
  linked-state styling;
- `shared/motion.js` for linked focus/tap state behavior alongside the existing
  instrument reveal;
- content-addressed copies of changed shared assets and the mechanically updated
  references required by the existing asset-versioning contract.

Other routes may receive only fingerprint URL updates for a changed shared
asset. Their markup, IA, styles, and behavior must not change.

No new framework, dependency, route, backend, build step, or data flow is
introduced.

## Boundaries

- Do not change affiliate IDs or `AFFILIATE_URL`.
- Do not change Google Analytics identity.
- Do not change Vercel, DNS, domain, or production wiring.
- Do not change secrets, payments, legal claims, Supabase schema, or backend
  behavior.
- Do not change routes or IA.
- Do not change calculator logic or unrelated page presentation.

## Verification

- Add failing semantic tests that protect the existing SVG geometry and
  readout content before editing homepage markup.
- Add failing interaction tests before changing the shared motion helper.
- Verify red, then implement the minimum behavior and styling required to turn
  those tests green.
- Run `python3 scripts/validate_site.py`.
- Run `python3 scripts/validate_site.py --base-ref origin/main`.
- Run `python3 -m unittest discover -s scripts -p 'test_*.py' -v`.
- Run `node --test tests/*.test.js`.
- Exercise the homepage at desktop and 390 pixels with normal and reduced
  motion, keyboard focus, pointer/tap selection, console checks, and overflow
  checks.
- Smoke-test analytics and legacy calculator routes after shared asset URL
  updates.
- Save desktop and 390-pixel screenshots.
- Request an independent read-only review of the exact committed head, address
  all Critical and Important findings, rerun verification, and open a ready PR.
- Do not merge or deploy until the owner approves the PR.
