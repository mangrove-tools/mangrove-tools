# Analysis Value Visualizations — Design Specification

**Date:** 2026-08-03

**Status:** Approved design

**Selected direction:** Stacked decision story

## Summary

Every successful Mangrove analysis must include a primary visualization that shows the value of the decision it produces. Model diagnostics may explain why an analysis is defensible, but they do not replace a direct view of what changes and what the model expects.

Budget Advisor will add two stacked value visualizations inside its successful result, before the detailed allocation table:

1. latest-observed current plan-rate spend versus the resulting plan spend for every channel;
2. current versus recommended expected outcome for modeled channels only.

Revenue Forecaster already satisfies the broader product rule with its historical-versus-forecast chart. This change will preserve that behavior and add a durable repository contract for future analysis tools.

## Problem

Budget Advisor currently presents:

- a numeric allocation summary and table;
- an explanation panel;
- cross-channel marginal-efficiency evidence;
- a response curve for each channel.

Those views explain the recommendation and its evidence. They do not give the user one immediate visual answer to either of these questions:

- Where does the plan move my budget?
- What difference does the fitted model expect from that move?

The missing layer is decision value. It must be visually distinct from model evidence and must not imply causal lift where the model only supports an observational comparison.

## Goals

- Show the allocation change directly, not only in a table.
- Show the expected modeled-outcome difference directly, not only as a recommended total.
- Keep preserved and excluded channels visible in the allocation comparison.
- Scope the outcome comparison to channels with admitted response curves.
- Make the modeled-only boundary prominent in text and accessible output.
- Support revenue, conversions, and both accepted financial cost treatments.
- Preserve current optimization decisions, privacy behavior, routes, analytics events, and backend boundaries.
- Establish a testable rule that every successful analysis result includes a primary value visualization.

## Non-goals

- No change to the budget optimization objective, constraints, or allocation decisions.
- No causal-incrementality, marketing-mix, or guaranteed-lift claim.
- No attempt to predict outcomes for preserved or excluded unsupported channels.
- No new backend, storage, API, model, routing, dependency, or analytics event.
- No change to Revenue Forecaster calculations or visual design beyond any required shared-asset fingerprint reference.
- No affiliate, Google Analytics, Vercel, DNS, payment, legal, or production-wiring change.

## Product Contract

Every analysis tool must expose a primary value visualization in its successful result state. That visualization must:

- show the decision or projection the tool produces;
- use the same controlled result data as the adjacent text and tables;
- include a textual equivalent for every important value;
- state material scope limits beside the visualization;
- clear immediately when the result becomes stale;
- remain legible and contained at a 390px viewport;
- avoid unsupported causal, confidence, or performance claims.

For the existing tools:

- **Budget Advisor:** allocation shift plus scoped modeled-outcome comparison;
- **Revenue Forecaster:** historical trajectory plus forecast and confidence band.

This rule will be recorded in `AGENTS.md` and covered by a repository contract test.

## Selected Layout

The selected layout is the stacked decision story:

1. **Where the budget moves**
2. **Modeled-channel expected {selected metric}**

Both panels use the available width of the successful Budget result and appear after the numeric summary but before the detailed allocation table. On mobile they retain the same order and stack without a secondary layout mode.

This order separates three questions:

1. **What changes?** — allocation visualization;
2. **What does the fitted model expect?** — outcome visualization;
3. **Why did the model do this?** — the existing Model evidence section.

### Alternatives considered

**Side-by-side dashboard:** more compact on wide screens, but it gives both charts less room and weakens their reading order before stacking on mobile.

**Combined impact board:** visually concise, but it reduces the outcome comparison to a KPI and fails the requirement to show both values as visualizations.

## Allocation-Shift Visualization

### Content

The first panel is titled **Where the budget moves** and uses the existing allocation-chart grammar:

- one channel per row;
- current plan-rate spend from the latest observation as the first labeled bar;
- resulting plan spend as the second labeled bar;
- requested plan budget stated in adjacent text;
- fixed **Current / Plan** legend order and textual value summary.

Every allocation row is included:

- modeled;
- preserved;
- explicitly excluded.

Preserved channels may show different current and plan bars without any optimizer-driven change. Their current bar uses the latest observed spend rate projected over the plan horizon, while their automatic preserved plan baseline uses the recent-period median projected over that horizon. A manually entered preserved amount replaces that automatic baseline. Excluded channels show the latest-observed current plan-rate spend and a zero plan amount.

### Semantics

“Current” means the channel's latest observed spend rate projected over the selected plan horizon. It is not historical total spend and must not be labeled as such.

“Plan” is an umbrella label: it means the bounded optimizer recommendation for modeled channels, the preserved baseline or manual preserved amount for unsupported channels, and zero for an explicit exclusion. Preserved plan amounts must be labeled as preserved and not optimizer recommendations.

The chart does not claim that a larger allocation is intrinsically better. It visualizes the decision returned under the selected objective and constraints.

## Modeled-Outcome Visualization

### Content

The second panel title uses the selected metric, for example:

- **Modeled-channel expected revenue**
- **Modeled-channel expected conversions**
- **Modeled-channel expected contribution**

It shows:

- current modeled outcome;
- recommended modeled outcome;
- absolute expected difference;
- percentage expected difference when mathematically valid;
- modeled-channel count;
- unscored-channel count;
- the fixed scope statement described below.

The two outcome values are displayed as labeled comparison bars. Positive, zero, or negative financial outcome values and positive, flat, or negative differences remain visually and textually truthful; signed financial values use a visible zero baseline.

### Scope statement

The panel must state:

> Modeled channels only. Preserved and excluded unsupported channels remain in the allocation view but are not scored here.

The exact unscored count may be added to the statement, but imported channel names or raw input values must not be interpolated into analytics events or logs.

The product must use **expected difference**, **modeled difference**, or equivalent observational wording. It must not call the value incremental lift, causal lift, guaranteed return, or calibrated forecast confidence.

### Not-estimable state

If no channel has an admitted curve, the outcome panel remains in the result flow but replaces its chart with controlled text:

> Modeled outcome comparison is unavailable because no channel has an admitted response curve.

The allocation visualization may still render for a successful fixed plan.

### Zero and nonfinite behavior

- If the current modeled outcome is positive and both totals are finite, show the percentage difference.
- If the current modeled outcome is zero, omit the percentage and show the absolute difference only.
- If either total or the difference is nonfinite, fail closed through the allocator's controlled prediction-overflow path; do not render `NaN`, `Infinity`, or a fabricated zero.

## Outcome Data Contract

`shared/budget-allocator.js` will enrich the published allocation result without changing allocation decisions.

### Per modeled row

Each modeled allocation row will publish:

- `currentPredictedOutcome` — fitted outcome at current plan-rate spend over the selected horizon;
- existing `predictedOutcome` — fitted outcome at recommended spend over the same horizon.

Preserved unsupported rows publish `null` for both outcome fields.

### Totals

Successful allocation totals will publish:

- `currentPredictedOutcome` — finite sum across modeled channels;
- existing `predictedOutcome` — finite recommended sum across modeled channels.

The current prediction must use the allocator's existing private curve prediction and financial-treatment logic:

1. convert current plan spend to the history cadence rate using the same horizon factor;
2. evaluate the admitted curve;
3. scale the fitted rate outcome over the plan horizon;
4. for `financial` with `before_marketing`, subtract current plan spend;
5. for `financial` with `after_marketing`, do not subtract spend again.

The allocator's published-result validation must require finite modeled current predictions and a finite current total. Existing overflow handling remains the fail-closed boundary.

Explicitly excluded channels that still have admitted curves remain part of the modeled comparison: their current fitted outcome is compared with the recommended outcome at zero spend. Unsupported channels remain unscored regardless of whether they are preserved or excluded.

## View Projection

`analytics/budget/app.js` will project a controlled `valueVisualization` object from the model and allocation result. It contains no raw observations or imported rows.

Conceptually:

```text
valueVisualization
  allocation
    requestedBudget
    rows[]
      channel
      status
      currentSpend
      recommendedSpend
  outcome
    state: ready | not_estimable
    metricLabel
    unit
    currentValue
    recommendedValue
    absoluteDifference
    percentageDifference | null
    modeledCount
    unscoredCount
    scopeCopy
```

Formatting remains a rendering concern. Numeric chart inputs stay numeric until the text or canvas boundary.

## Rendering and Lifecycle

### DOM order

Within a successful Budget result:

1. method note;
2. numeric summary;
3. Plan value block;
4. detailed allocation table;
5. financial-treatment note when applicable;
6. existing recommendation explanation.

The Plan value block contains two full-width subpanels in the selected stacked order.

### Paint order

The application must build the result DOM before revealing the result panel. Canvas painting occurs only after `syncPhase()` has made the result visible, preventing zero-width first paint.

The successful allocation flow therefore separates:

- result DOM construction;
- phase synchronization and reveal;
- value-chart paint;
- existing Model evidence paint.

### Repaint and stale state

The value charts use the existing debounced resize pattern and repaint only when a valid visible result exists.

Any action that invalidates the allocation must clear the value visualization and its repaint callback immediately, including:

- total-budget input;
- plan-days input;
- constraint input or toggle;
- objective change;
- confirmed history replacement;
- failed or blocked replan.

Diagnostics remain governed by their existing history-validity lifecycle.

## Shared Chart Functions

### Allocation chart

Reuse and harden `drawAllocationChart(canvas, rows, unit)` rather than introduce a duplicate implementation. The Budget result supplies every controlled channel row.

The chart must remain readable at the current desktop result width and a 266px mobile canvas. Channel labels, legend labels, and values must stay inside the canvas.

### Outcome comparison chart

Add a focused shared function such as:

```javascript
drawOutcomeComparisonChart(canvas, comparison, options)
```

Its controlled input contains only the metric label, unit, current value, recommended value, and difference metadata required for rendering.

The chart draws two labeled bars with fixed current/recommended order. It must handle:

- currency values;
- conversion counts;
- signed financial outcome values with a visible zero baseline;
- positive, zero, and negative modeled differences;
- a zero current baseline;
- narrow canvases without clipped value labels.

The chart is not responsible for estimating outcomes or deciding whether the result is estimable.

## Accessibility

- Both canvases use `role="img"` and specific accessible names.
- All chart values and the expected-difference statement also appear as visible text.
- Current and plan states are distinguished by labels, order, and legend in addition to color; preserved plan text explicitly states that the channel was not optimized.
- Heading order remains valid within the Budget result.
- The not-estimable state is plain text and does not leave an empty canvas in the accessibility tree.
- The layout has no horizontal page overflow at 390px.
- Existing focus behavior and `prefers-reduced-motion` handling remain unchanged.

## Privacy and Telemetry

All values are calculated and rendered in the browser.

This change does not:

- POST calculator inputs;
- add storage;
- add a product event;
- expand event metadata;
- add imported values or channel names to logs;
- change the existing download boundary.

The allocation download may retain its existing controlled projection. Adding current predicted outcomes to the download is out of scope unless separately specified.

## Testing Strategy

Implementation will follow test-driven development.

### Allocator tests

- current and recommended modeled outcomes use the same horizon scaling;
- revenue and conversions produce finite current totals;
- before-marketing financial outcomes subtract current spend once;
- after-marketing financial outcomes do not subtract current spend;
- preserved unsupported channels remain `null` and excluded from both modeled totals;
- excluded admitted curves remain in the modeled comparison;
- overflow and nonfinite values fail closed.

### View tests

- allocation comparison includes modeled, preserved, and excluded rows;
- outcome comparison includes controlled numeric values and counts only;
- percentage difference is correct for a positive current baseline;
- zero current baseline yields a `null` percentage;
- flat and negative differences retain their sign;
- no imported observations or unrestricted prose enter the value view.

### DOM and lifecycle tests

- successful result builds both panels before reveal and paints after reveal;
- both canvases have nonzero initial geometry;
- textual equivalents and accessible names are present;
- missing chart functions preserve the textual result without throwing;
- invalidating budget, days, constraints, objective, history, or replanning clears value charts;
- resize repaint is debounced and canceled on reset;
- a no-modeled-channel fixed plan renders the controlled not-estimable state.

### Shared chart tests

- current and plan allocation colors and labels remain stable;
- allocation labels and values fit a 266px canvas;
- allocation canvases expand for 12 or more rows so paired 11px value-label centers remain at least 11px apart;
- outcome comparison labels and values fit a 266px canvas;
- currency and conversion formats remain controlled;
- zero and negative differences render without invalid geometry.

### Analysis product-contract tests

- Budget success markup exposes the Plan value visualization contract;
- Forecast success markup and behavior retain the forecast value chart;
- repository guidance records the requirement for future analysis tools.

### Full verification

Run:

```bash
python3 scripts/validate_site.py --base-ref origin/main
python3 -m unittest discover -s scripts -p 'test_*.py'
node --test tests/*.test.js
git diff --check origin/main...HEAD
```

Manually verify sample-data success at desktop and 390px. Capture screenshots showing:

- allocation context and both value panels on desktop;
- the allocation comparison and modeled-outcome scope on mobile;
- no clipping, zero-width canvas, horizontal overflow, or console error.

An independent agent must review the exact feature HEAD before a draft PR is opened.

## File Scope

Expected implementation files:

- `AGENTS.md`
- `analytics/budget/index.html`
- `analytics/budget/styles.css` and its fingerprinted copy
- `analytics/budget/app.js` and its fingerprinted copy
- `shared/budget-allocator.js` and its fingerprinted copy
- `shared/charts.js` and its fingerprinted copy
- `analytics/forecast/index.html` only if the shared chart fingerprint changes
- relevant Python and Node tests
- desktop and 390px screenshot evidence

No other route or product surface is in scope.

## Delivery Boundary

This is one bounded pull request. It may be implemented, tested, independently reviewed, committed, pushed, and opened as a draft PR after the written implementation plan is approved.

It must not be merged or deployed without the repository's later owner-review and production gates.
