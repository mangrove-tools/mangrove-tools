# Budget Advisor Curve Discoverability Design

**Date:** 2026-08-03
**Status:** Approved design; implementation not started

## Context

Budget Advisor already renders a cross-channel marginal-efficiency chart and one response-curve chart per channel after a valid allocation. Those visuals are inserted inside a collapsed section titled **Inspect cleaned history**. The title describes the normalized-data table but does not signal that the allocation's model evidence and response curves are also inside it.

The problem is discoverability and result hierarchy, not the marginality model. Users should see why modeled budget moved and why unsupported channels were preserved without having to discover an inaccurately named disclosure.

## Goal

Make the existing visual model evidence an immediate, readable part of a successful Budget Advisor result.

After a valid allocation, a user must be able to see:

1. the relative marginal efficiency of admitted channels;
2. the observed data and fitted response for every modeled channel;
3. current and recommended spend positions on each modeled curve; and
4. which channels were preserved because no defensible response curve was admitted.

## Non-goals

This change will not:

- alter history normalization, evidence gates, curve fitting, objective selection, marginal metrics, constraints, preservation logic, or budget allocation;
- add inputs, routes, backend calls, storage, dependencies, or analytics events;
- send or store pasted history or other user-entered values;
- change affiliate IDs, `AFFILIATE_URL`, Google Analytics identity, Vercel configuration, DNS, payments, legal claims, or production wiring; or
- redesign the rest of Budget Advisor or the site.

## Chosen approach

Use an always-visible, full-width **Model evidence** section immediately after the plan/result layout. Keep technical tables in a separate collapsed **Inspect diagnostics and cleaned data** section.

This preserves a decision-first hierarchy:

1. allocation summary and recommendation explanation;
2. visual evidence supporting the allocation; and
3. technical diagnostics for users who need to audit the model inputs and gates.

The rejected alternatives were keeping per-channel curves behind one disclosure and moving evidence to a separate tab. Both would leave the existing discoverability problem partially intact.

## Result hierarchy

### Allocation result

The existing budget summary, allocation table, explanation panel, caveats, and download action remain the primary result. Their values and ordering do not change except where a small link or cue is useful to introduce the evidence immediately below.

### Model evidence

The new section is hidden until an allocation completes successfully. It contains:

1. **Cross-channel modeled marginal efficiency** — the existing comparable marginal-efficiency chart, with copy explaining whether higher or lower values indicate better marginal performance for the selected objective.
2. **Response curves** — a responsive card for every channel in the selected model.

For a modeled channel, the card shows:

- channel name and **Modeled** status;
- observed points and the admitted fitted curve;
- current and recommended spend-rate markers;
- textual current and recommended spend rates;
- in-sample log-space fit (`R²`); and
- a short explanation that the allocation uses observational diminishing-return evidence.

For a preserved channel, the card shows:

- channel name and **Preserved** status;
- observed points without a fitted line;
- the explicit message **Not modeled — allocation preserved**; and
- a concise controlled reason that the history did not clear the evidence gates.

Preserved cards must never imply a fitted response or predicted outcome.

### Diagnostics and cleaned data

Raw observation tables, complete evidence-gate tables, normalized history, and the cleaned-data download remain available inside a collapsed disclosure titled **Inspect diagnostics and cleaned data**. The disclosure is secondary to the visible charts.

## Architecture and component boundaries

The existing result renderer remains responsible for the allocation summary and explanation. Evidence rendering is separated into two responsibilities:

- `renderModelEvidence(model, allocation)` builds the visible overview and response-curve cards.
- `renderDiagnostics(model, inspection)` builds the collapsed observation, gate, and cleaned-history detail.

The implementation may introduce small pure view-model helpers so labels, statuses, spend positions, fit values, and preservation reasons can be tested without canvas drawing. These helpers must consume existing controlled model/allocation fields and must not recompute analytical results.

The existing chart functions remain the rendering authority:

- `MangroveCharts.drawMarginalEfficiencyChart`
- `MangroveCharts.drawResponseCurve`

No second curve or allocation implementation is permitted in the UI layer.

## Data and state flow

1. History import and marginality analysis proceed unchanged.
2. The user selects an objective, horizon, budget, and optional constraints.
3. The allocator returns the existing allocation object.
4. The allocation result renderer displays the plan.
5. The evidence renderer consumes the same selected model and allocation object and reveals the Model evidence section.
6. Canvas charts draw after their visible containers are in the document.

Changing history, objective, horizon, budget, or constraints invalidates the allocation. Invalidation must:

- clear the allocation result;
- clear and hide the Model evidence section;
- cancel scheduled chart repaints; and
- prevent stale curve positions from remaining visible.

Blocked or failed allocations show controlled guidance and no allocation evidence. Readiness information remains available through the existing readiness view.

## Rendering and responsive behavior

- Desktop uses a full-width evidence region with a spacious two-column response-curve grid where width permits.
- At 390px, cards form one column and the document must not exceed the viewport width.
- Canvas elements use the existing responsive drawing path and repaint on resize.
- Large diagnostic tables may scroll inside their own wrappers; the evidence cards and page itself must not require horizontal scrolling.
- No new animation is required. Existing reduced-motion behavior remains sufficient.

## Accessibility

- The evidence section has a semantic heading following the allocation result.
- Every canvas retains `role="img"` and receives a specific accessible name that includes the channel and chart purpose.
- Each chart has an adjacent textual interpretation. The allocation must remain understandable without reading canvas pixels.
- Modeled and preserved states use explicit words, not color alone.
- Current and recommended spend markers are repeated as text.
- Existing keyboard and focus behavior remains intact; the diagnostics disclosure uses native `details`/`summary` behavior.

## Failure behavior

- If an optional chart function is unavailable, the page must not throw. Text summaries and allocation output remain usable.
- If a channel is preserved, no fitted line or fit statistic may be fabricated.
- If the allocation becomes stale, evidence is removed rather than dimmed or labeled as current.
- No raw rejected cell values are reproduced in controlled findings or UI error copy.

## Testing strategy

Implementation follows test-driven development.

### Contract tests

Add or extend product-local tests to require:

- a dedicated Model evidence section outside the collapsed diagnostics disclosure;
- the controlled section and disclosure labels;
- semantic headings and accessible canvas-label construction; and
- no new backend, storage, analytics-event, or dependency surface.

### JavaScript behavior tests

Exercise the Budget Advisor with a deterministic DOM and existing sample history to verify:

- a successful allocation reveals Model evidence;
- the marginal-efficiency chart receives only modeled allocation rows;
- modeled cards request a fitted curve and spend markers;
- preserved cards request observations without a fitted line and show the preservation message;
- result invalidation clears and hides all evidence; and
- missing chart functions preserve textual results without throwing.

Numerical engine expectations remain covered by the existing marginality and allocation tests. This feature must not change their outputs.

### Manual verification

Capture desktop and 390px screenshots after the sample-data allocation reaches its result state. Verify:

- allocation, overview chart, and response curves are visibly discoverable;
- modeled/preserved meaning is understandable without opening diagnostics;
- diagnostics remain keyboard accessible;
- `document.documentElement.scrollWidth <= 390` at the mobile viewport;
- no console errors; and
- changing an allocation input removes stale evidence.

Run:

```bash
python3 scripts/validate_site.py --base-ref origin/main
python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
```

If the validator requires the local protected-change assertion solely because changed public product assets contain unchanged protected values, document that result and use the assertion only for offline validation. GitHub still requires the owner-applied `protected-change-approved` label.

## Expected file scope

Implementation should remain within:

- `analytics/budget/index.html`
- `analytics/budget/app.js`
- `analytics/budget/styles.css`
- focused Budget Advisor contract or JavaScript tests
- fingerprinted copies and HTML references required by the repository asset contract
- this specification, the implementation plan, and verification screenshots

Changes outside that list require a documented reason and separate review.

## Acceptance criteria

The feature is complete when:

1. a successful allocation immediately reveals the cross-channel chart and every channel's evidence card without opening a disclosure;
2. modeled cards show observations, fitted curves, and current/recommended positions;
3. preserved cards show observations, no fitted line, and an explicit preservation explanation;
4. technical tables and cleaned data remain available in a clearly named collapsed disclosure;
5. invalidating the allocation removes all stale evidence;
6. allocation and marginality engine outputs are unchanged;
7. desktop and 390px verification pass without console errors or horizontal page overflow;
8. deterministic validation and tests pass; and
9. an independent reviewer approves the exact commit before a ready pull request is opened.

The pull request must state that it is not merged and not deployed. Production integration requires the repository's owner-controlled review and approval gates.
