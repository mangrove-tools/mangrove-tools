# Analysis Value Visualizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every successful Mangrove analysis a primary visualization of its value by adding current-versus-recommended allocation and scoped modeled-outcome comparisons to Budget Advisor while preserving Forecast's existing historical-versus-forecast chart.

**Architecture:** Enrich the allocator's controlled result with current fitted outcomes calculated through the same private prediction path as recommended outcomes. Project those numbers into a raw-value-only `valueVisualization` view model, render text equivalents and two canvases inside the existing dynamic Budget result, and paint only after the result is visible. Keep estimation in the allocator, formatting in the application, drawing in shared charts, and the optimizer itself unchanged.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Python `unittest`, Node.js `node:test`, Canvas 2D, Vercel static hosting.

## Global Constraints

- Implement the approved design in `docs/superpowers/specs/2026-08-03-analysis-value-visualizations-design.md` without broadening its scope.
- Do not alter curve fitting, evidence gates, optimizer decisions, constraints, preservation behavior, objective selection, forecast calculations, or downloads.
- Do not add routes, inputs, backend calls, storage, dependencies, analytics events, or event metadata.
- Do not send, store, log, or interpolate raw history, user-entered values, or channel names into telemetry.
- Do not change affiliate IDs, `AFFILIATE_URL`, Google Analytics identity, Vercel configuration, DNS, payments, legal claims, or production wiring.
- Call the outcome comparison an expected or modeled difference. Do not call it causal lift, incremental lift, guaranteed return, or calibrated confidence.
- Keep unsupported preserved and excluded channels visible in the allocation comparison but unscored in the modeled-outcome comparison.
- Keep all chart inputs numeric until the text or canvas formatting boundary.
- Preserve keyboard behavior, visible textual equivalents, `prefers-reduced-motion`, and the existing recommendation explanation.
- At 390px, `document.documentElement.scrollWidth` must be no greater than `390`; both canvases must paint with nonzero geometry and no clipped labels at an approximately 266px content width.
- Use canonical sources. Every changed public CSS or JavaScript asset must have a hash-correct, byte-identical fingerprinted copy, all public references must use the new fingerprint, and superseded tracked copies must be removed.
- Use `apply_patch` for source and test edits. Shell copy/removal commands are permitted only for the mechanical fingerprinted asset copies named in this plan.
- Run focused red/green tests at each task, then the repository validator, all Python validator tests, all Node tests, and `git diff --check` before review.
- Independently review the exact final feature HEAD before opening a draft pull request.
- Do not merge or deploy. This plan ends at a reviewed draft pull request.

## File Map

- Modify `shared/budget-allocator.js`: publish current fitted outcome per modeled row and in totals, using the same horizon and financial treatment as recommended outcome.
- Replace `shared/budget-allocator.c272ddeb5f32.js`: new byte-identical fingerprinted allocator copy.
- Modify `tests/budget-allocator.test.js`: lock horizon, financial treatment, preserved/excluded, and overflow semantics.
- Modify `shared/charts.js`: harden the existing allocation chart and add a signed outcome-comparison chart.
- Replace `shared/charts.a5f455713afe.js`: new byte-identical fingerprinted charts copy.
- Modify `tests/charts.test.js`: verify narrow geometry, labels, formatting, signed zero baseline, and invalid-input fail-closed behavior.
- Modify `analytics/budget/app.js`: create the controlled value view, render text/canvas structure, paint after reveal, repaint on resize, and clear stale jobs.
- Replace `analytics/budget/app.04327854abb0.js`: new byte-identical fingerprinted Budget application copy.
- Modify `analytics/budget/styles.css`: style the stacked Plan value panels and responsive canvases.
- Replace `analytics/budget/styles.3407f45d1268.css`: new byte-identical fingerprinted Budget stylesheet copy.
- Modify `analytics/budget/index.html`: update changed asset fingerprints only; the Plan value DOM remains result-driven.
- Modify `analytics/forecast/index.html`: update the shared charts fingerprint only.
- Modify `tests/budget-app.test.js`: verify the controlled view, DOM order, text equivalents, paint timing, stale clearing, fallback, resize, and raw-data exclusion.
- Modify `tests/forecast-sample-data.test.js`: retain a behavioral contract proving Forecast success draws its historical-versus-forecast value chart.
- Modify `AGENTS.md`: record the durable successful-analysis visualization requirement.
- Create `docs/superpowers/screenshots/analysis-value-visualizations/budget-value-desktop.png`: desktop sample-data result evidence.
- Create `docs/superpowers/screenshots/analysis-value-visualizations/budget-value-390px.png`: 390px sample-data result evidence.

---

### Task 1: Publish current modeled outcomes from the allocator

**Files:**
- Modify: `tests/budget-allocator.test.js`
- Modify: `shared/budget-allocator.js`
- Replace: `shared/budget-allocator.c272ddeb5f32.js`
- Modify: `analytics/budget/index.html`

**Interfaces:**
- Input remains `allocatePlan({ model, totalBudget, planDays, constraints })`.
- Every `modelable` output row adds finite `currentPredictedOutcome`.
- Every `preserved` output row adds `currentPredictedOutcome: null` and retains `predictedOutcome: null`.
- `totals.currentPredictedOutcome` is the finite sum across admitted curves only.
- Allocation amounts, constraints, `predictedOutcome`, marginal metrics, failure codes, and allocation order remain unchanged.

- [x] **Step 1: Add failing revenue and conversion current-outcome tests**

In `tests/budget-allocator.test.js`, add a test that uses a two-week horizon and checks the current and recommended calculations through the same curve:

```javascript
test('modeled rows publish current and recommended outcomes over the same horizon', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 2, b: 0.5 }, {
        currentSpendRate: 400,
        preservedSpendRate: 400
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 1800,
    planDays: 14,
    constraints: { 'Paid search': { minimum: 1800, maximum: 1800, excluded: false } }
  });
  const item = row(result, 'Paid search');

  assert.equal(result.ok, true);
  assert.equal(item.currentSpend, 800);
  assert.equal(item.currentPredictedOutcome, 2 * Math.pow(400, 0.5) * 2);
  assert.equal(item.predictedOutcome, 2 * Math.pow(900, 0.5) * 2);
  assert.equal(result.totals.currentPredictedOutcome, item.currentPredictedOutcome);
  assert.equal(result.totals.predictedOutcome, item.predictedOutcome);
});
```

Add a conversion case with two modeled channels and assert every row plus both totals are finite. The test must compare the total to the sum of row values, not only to a hard-coded fixture.

- [x] **Step 2: Add failing financial-treatment, preservation, exclusion, and overflow tests**

Add focused cases that assert:

```javascript
assert.equal(beforeItem.currentPredictedOutcome, beforeRawCurrent - beforeItem.currentSpend);
assert.equal(afterItem.currentPredictedOutcome, afterRawCurrent);
assert.equal(preserved.currentPredictedOutcome, null);
assert.equal(excludedModeled.currentPredictedOutcome, expectedCurrentOutcome);
assert.equal(excludedModeled.predictedOutcome, 0);
```

For the excluded modeled case, set `excluded: true`, retain a positive current rate, and confirm it contributes its current outcome and a zero recommended outcome to the two modeled totals. For an excluded unsupported channel, confirm both outcome fields are `null` and neither modeled total changes.

Extend the existing overflow coverage with a curve/current-rate combination whose current channel prediction is nonfinite while recommended spend is zero. Expect the existing controlled result:

```javascript
{
  ok: false,
  code: 'prediction_overflow',
  message: 'The modeled outcome exceeds the safe calculation range.',
  minimumBudget: null,
  maximumBudget: null,
  conflicts: []
}
```

- [x] **Step 3: Run the allocator tests and confirm the red state**

Run:

```bash
node --test tests/budget-allocator.test.js
```

Expected: FAIL because successful rows and totals do not yet publish `currentPredictedOutcome`; the current-only overflow case incorrectly succeeds.

- [x] **Step 4: Add one shared plan-outcome helper**

In `shared/budget-allocator.js`, place this helper next to `predict` and use it for both current and recommended outcomes:

```javascript
function planOutcome(metric, curve, planSpend, horizonFactor) {
  if (!Number.isFinite(planSpend) || planSpend < 0
    || !Number.isFinite(horizonFactor) || horizonFactor <= 0) return null;
  const predictedRateOutcome = predict(curve, planSpend / horizonFactor);
  const rawOutcome = predictedRateOutcome == null
    ? null
    : predictedRateOutcome * horizonFactor;
  if (!Number.isFinite(rawOutcome)) return null;
  const outcome = metric.key === 'financial' && metric.costTreatment === 'before_marketing'
    ? rawOutcome - planSpend
    : rawOutcome;
  return Number.isFinite(outcome) ? outcome : null;
}
```

This helper is calculation-only. It must not inspect constraints, choose allocations, format numbers, or mutate rows.

- [x] **Step 5: Enrich rows and totals without changing allocation decisions**

In the result-building section of `allocatePlan`:

1. Initialize `let currentPredictedOutcome = 0;` beside `predictedOutcome`.
2. Publish both outcome fields as `null` on preserved rows.
3. For modeled rows, calculate:

```javascript
const currentOutcome = planOutcome(
  model.metric,
  allocated.curve,
  allocated.currentSpend,
  horizonFactor
);
const outcome = planOutcome(
  model.metric,
  allocated.curve,
  recommendedSpend,
  horizonFactor
);
const nextCurrentPredictedOutcome = currentOutcome == null
  ? null
  : currentPredictedOutcome + currentOutcome;
const nextPredictedOutcome = outcome == null ? null : predictedOutcome + outcome;
```

Fail with `predictionOverflow()` if either row outcome or either aggregate is nonfinite. On success, set `currentPredictedOutcome = nextCurrentPredictedOutcome`, retain the existing recommended aggregation, and publish:

```javascript
currentPredictedOutcome: currentOutcome,
predictedOutcome: outcome,
```

Add `currentPredictedOutcome` to `result.totals`.

Update `validPublishedAllocation` so modeled rows require both outcome fields to be finite, preserved rows require both to be `null`, and totals require finite `currentPredictedOutcome`. Keep the existing marginal-metric requirements unchanged.

- [x] **Step 6: Run focused and regression allocator tests**

Run:

```bash
node --test tests/budget-allocator.test.js
node --test tests/marginality-engine.test.js tests/budget-app.test.js
```

Expected: PASS. Existing `recommendedSpend`, marginal metric, and failure assertions remain unchanged.

- [x] **Step 7: Fingerprint the allocator and update its one public reference**

Run:

```bash
allocator_hash=$(shasum -a 256 shared/budget-allocator.js | awk '{print substr($1, 1, 12)}')
new_allocator="shared/budget-allocator.${allocator_hash}.js"
cp shared/budget-allocator.js "$new_allocator"
cmp -s shared/budget-allocator.js "$new_allocator"
```

Use `apply_patch` to replace `/shared/budget-allocator.c272ddeb5f32.js` with `/${new_allocator}` in `analytics/budget/index.html`. Remove the superseded tracked copy:

```bash
git rm -- shared/budget-allocator.c272ddeb5f32.js
```

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_asset_versioning -v
git diff --check
```

Expected: PASS and the canonical allocator is byte-identical to its referenced fingerprinted copy.

- [x] **Step 8: Commit Task 1**

Stage only the Task 1 paths, substituting the computed fingerprinted filename:

```bash
git add -- \
  tests/budget-allocator.test.js \
  shared/budget-allocator.js \
  shared/budget-allocator.c272ddeb5f32.js \
  "$new_allocator" \
  analytics/budget/index.html
git commit -m "feat: compare current modeled outcomes"
```

---

### Task 2: Add narrow, signed shared comparison charts

**Files:**
- Modify: `tests/charts.test.js`
- Modify: `shared/charts.js`
- Replace: `shared/charts.a5f455713afe.js`
- Modify: `analytics/budget/index.html`
- Modify: `analytics/forecast/index.html`

**Interfaces:**
- Retain `drawAllocationChart(canvas, rows, unit)` with rows shaped as `{ label, current, recommended }`.
- Add `drawOutcomeComparisonChart(canvas, comparison, options)`.
- `comparison` contains only finite numeric `current`, `recommended`, and `difference` values.
- `options` contains controlled `unit` (`'$'` or `''`) and `metricLabel` text produced by the Budget application.
- A chart function returns without drawing when the canvas, dimensions, data, or context is invalid; it never fabricates values.

- [x] **Step 1: Add failing allocation narrow-width tests**

Extend `tests/charts.test.js` so `makeCanvas` records `clearRect`, `fillRect`, line paths, measured labels, alignment, and coordinates. Add a 266px allocation test with long labels and five rows:

```javascript
test('allocation chart keeps labels, values, and legend inside 266px', () => {
  const charts = loadCharts();
  const view = makeCanvas(266, 300);
  charts.drawAllocationChart(view.canvas, [
    { label: 'Very long paid search channel', current: 12000, recommended: 9000 },
    { label: 'Paid social', current: 8000, recommended: 11000 },
    { label: 'Local partnerships', current: 4000, recommended: 4000 },
    { label: 'Podcast sponsorships', current: 2000, recommended: 0 },
    { label: 'Referral', current: 0, recommended: 2000 }
  ], '$');

  view.labels.forEach(label => {
    assert.ok(label.x >= 0 && label.x <= 266);
    assert.ok(label.y >= 0 && label.y <= 300);
  });
  view.fillRects.forEach(rect => {
    assert.ok(rect.args[0] >= 0);
    assert.ok(rect.args[0] + rect.args[2] <= 266);
  });
});
```

Also assert the legend exposes the full words `Current` and `Plan` through canvas text at desktop width. Add a 12-row case at 266px that checks the canvas CSS and bitmap heights expand together and every current/plan value-label center remains at least 11px from its pair.

- [x] **Step 2: Add failing outcome comparison tests**

Add tests for:

- currency values and conversion counts;
- positive, flat, and negative differences;
- signed negative/current/recommended financial values;
- a zero current baseline;
- a 266px canvas with every label and bar inside bounds;
- the current signal color and recommended accent color;
- a visible zero-baseline stroke whenever the domain includes a negative value;
- invalid or nonfinite comparison input producing no bars or labels.

Use an assertion shaped like:

```javascript
charts.drawOutcomeComparisonChart(view.canvas, {
  current: -200,
  recommended: 100,
  difference: 300
}, { unit: '$', metricLabel: 'Contribution' });

assert.ok(view.strokes.some(stroke => stroke.style === cssValues['--ink-soft']));
assert.ok(view.labels.some(label => label.text === 'Current'));
assert.ok(view.labels.some(label => label.text === 'Recommended'));
assert.ok(view.labels.some(label => label.text.includes('+$300')));
```

- [x] **Step 3: Run chart tests and confirm the red state**

Run:

```bash
node --test tests/charts.test.js
```

Expected: FAIL because `drawOutcomeComparisonChart` is absent and the existing fixed allocation geometry clips narrow labels/values.

- [x] **Step 4: Harden `drawAllocationChart`**

Refactor only its layout math:

- validate nonempty finite rows before sizing;
- reserve explicit bottom space for the legend;
- derive label width and value width from canvas width rather than fixed `100` and `80` values;
- clamp bar width to a nonnegative value;
- truncate channel labels by measured width, not a fixed character count;
- right-align values at `W - 4`;
- keep all rectangles inside `[0, W]` and `[0, H]`;
- keep current before plan in every row;
- set the allocation canvas to at least `max(300, rows.length * 28 + 28)` CSS pixels before bitmap sizing so 12 or more rows do not compress paired labels.

Add a small private `fitCanvasText(ctx, text, maxWidth)` helper that returns a measured ellipsis form and is reused by both chart functions. Do not mutate the input rows.

- [x] **Step 5: Implement `drawOutcomeComparisonChart`**

Add a focused function before the response-curve functions. Its scaling must include zero:

```javascript
const minValue = Math.min(0, comparison.current, comparison.recommended);
const maxValue = Math.max(0, comparison.current, comparison.recommended);
const span = Math.max(maxValue - minValue, 1);
const zeroX = plotLeft + ((0 - minValue) / span) * plotWidth;
const scaleX = value => plotLeft + ((value - minValue) / span) * plotWidth;
```

Draw two horizontal rows in fixed Current/Recommended order. For each signed value, draw from `Math.min(zeroX, scaleX(value))` with width `Math.abs(scaleX(value) - zeroX)`. Draw the zero baseline whenever `minValue < 0`. Place formatted values inside the canvas using measured-width clamping.

Use controlled formatting:

```javascript
function chartValue(value, unit, signed) {
  const rounded = Math.round(value);
  const absolute = Math.abs(rounded).toLocaleString();
  const prefix = signed && rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return prefix + (unit === '$' ? '$' : '') + absolute;
}
```

Display `Modeled difference` plus the signed difference below the two bars. Export the function in `root.MangroveCharts` beside the existing chart exports.

- [x] **Step 6: Run focused chart and Forecast regression tests**

Run:

```bash
node --test tests/charts.test.js tests/forecast-sample-data.test.js
```

Expected: PASS. Forecast's call signature and historical/forecast drawing remain unchanged.

- [x] **Step 7: Fingerprint shared charts and update both consumers**

Run:

```bash
charts_hash=$(shasum -a 256 shared/charts.js | awk '{print substr($1, 1, 12)}')
new_charts="shared/charts.${charts_hash}.js"
cp shared/charts.js "$new_charts"
cmp -s shared/charts.js "$new_charts"
```

Use `apply_patch` to replace `/shared/charts.a5f455713afe.js` with `/${new_charts}` in both `analytics/budget/index.html` and `analytics/forecast/index.html`. Remove the superseded copy:

```bash
git rm -- shared/charts.a5f455713afe.js
```

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_asset_versioning -v
node --test tests/charts.test.js tests/forecast-sample-data.test.js
git diff --check
```

Expected: PASS and both pages reference the same byte-identical fingerprinted chart asset.

- [x] **Step 8: Commit Task 2**

Stage only the Task 2 paths, substituting the computed filename:

```bash
git add -- \
  tests/charts.test.js \
  shared/charts.js \
  shared/charts.a5f455713afe.js \
  "$new_charts" \
  analytics/budget/index.html \
  analytics/forecast/index.html
git commit -m "feat: add shared outcome comparison chart"
```

---

### Task 3: Project and render the Budget Plan value block

**Files:**
- Modify: `tests/budget-app.test.js`
- Modify: `analytics/budget/app.js`
- Replace: `analytics/budget/app.04327854abb0.js`
- Modify: `analytics/budget/styles.css`
- Replace: `analytics/budget/styles.3407f45d1268.css`
- Modify: `analytics/budget/index.html`

**Interfaces:**
- `resultView(model, allocation)` adds `valueVisualization` only for successful results.
- `valueVisualization.allocation.rows` contains controlled channel, status, current-spend, and recommended-spend values.
- `valueVisualization.outcome` is either `ready` with finite comparison values or `not_estimable` with controlled explanatory copy.
- `renderResult` builds text and canvases but does not paint them while `#results` is hidden.
- A separate paint callback calls shared chart functions only after `syncPhase()` reveals the result.

- [x] **Step 1: Update the allocation fixture and add failing pure-view tests**

In `tests/budget-app.test.js`, add `currentPredictedOutcome` to every modeled fixture row and total. Use values that make the revenue fixture's expected difference obvious:

```javascript
currentPredictedOutcome: metricKey === 'conversions' ? 20 : 900,
predictedOutcome: metricKey === 'conversions' ? 32 : 1200,
```

Add pure `resultView` assertions for:

```javascript
assert.deepEqual(view.valueVisualization.allocation.rows, [
  {
    channel: 'Paid search <em>unsafe</em>',
    status: 'modeled',
    currentSpend: 200,
    recommendedSpend: 400
  },
  {
    channel: 'Local partnerships',
    status: 'preserved',
    currentSpend: 100,
    recommendedSpend: 100
  }
]);
assert.equal(view.valueVisualization.outcome.currentValue, 900);
assert.equal(view.valueVisualization.outcome.recommendedValue, 1200);
assert.equal(view.valueVisualization.outcome.absoluteDifference, 300);
assert.equal(view.valueVisualization.outcome.percentageDifference, 1 / 3);
assert.equal(view.valueVisualization.outcome.modeledCount, 1);
assert.equal(view.valueVisualization.outcome.unscoredCount, 1);
```

Add cases proving:

- conversions use unit `''` and retain numeric values;
- revenue and financial outcomes use unit `'$'`;
- a zero current total yields `percentageDifference: null`;
- a flat or negative difference retains `0` or a negative number;
- excluded modeled rows remain `status: 'excluded'` in the allocation view but count as modeled in the outcome view;
- excluded unsupported rows remain `status: 'excluded'` and count as unscored;
- a successful fixed allocation with no admitted curve yields `outcome.state === 'not_estimable'` and the approved controlled copy;
- `JSON.stringify(valueVisualization)` contains no observations, normalized rows, gate diagnostics, or unrestricted allocator message.

- [x] **Step 2: Add failing DOM, paint-order, fallback, and stale-state tests**

Extend the DOM chart harness with:

```javascript
const chartCalls = {
  allocation: [],
  outcome: [],
  response: [],
  marginal: []
};
```

Add `drawAllocationChart` and `drawOutcomeComparisonChart` spies. Each spy records whether `elements.results.hidden` is false at call time. Add tests that submit sample data and assert:

- a `section.plan-value` appears after `.result-summary` and before `.table-scroll`;
- the two subpanels are in allocation-then-outcome order;
- both canvases have `role="img"` and specific `aria-label` values;
- visible text includes Current, Recommended, Modeled difference, the absolute values, the percentage when valid, modeled-channel count, unscored-channel count, and the fixed scope statement;
- both chart calls occur only after results are visible;
- `MOTION.revealResult` snapshots already contain the complete textual Plan value block;
- missing chart functions do not throw and retain all text;
- the not-estimable state has no outcome canvas in the accessibility tree.

With `withRealCharts: true`, assert each Plan value canvas's first `clearRect` has positive width and height, just as the existing evidence geometry test does.

Extend the invalidation tests so budget input, plan-days input, constraints, objective change, confirmed source replacement, and blocked replan all leave zero Plan value canvases and cancel the pending Plan value repaint.

Extend the resize test so one 150ms debounced callback repaints allocation, outcome, response, and marginal charts exactly once, then confirm source replacement cancels it.

- [x] **Step 3: Run Budget application tests and confirm the red state**

Run:

```bash
node --test tests/budget-app.test.js
```

Expected: FAIL because the controlled view and Plan value DOM/paint lifecycle do not exist.

- [x] **Step 4: Build the controlled `valueVisualization` projection**

In `resultView`, project from the model and published allocation only. Preserve raw numeric values in this object:

```javascript
const allocationRows = rawRows.map(function valueRow(row) {
  const modeled = row && row.status === 'modelable';
  const excluded = row && row.constraint === 'excluded';
  return {
    channel: row && typeof row.channel === 'string' ? row.channel : 'Unnamed channel',
    status: excluded ? 'excluded' : modeled ? 'modeled' : 'preserved',
    currentSpend: finiteValue(row && row.currentSpend),
    recommendedSpend: finiteValue(row && row.recommendedSpend)
  };
});
const currentValue = finiteValue(totals.currentPredictedOutcome);
const recommendedValue = finiteValue(totals.predictedOutcome);
const difference = currentValue == null || recommendedValue == null
  ? null
  : recommendedValue - currentValue;
```

Count modeled rows from `row.status === 'modelable'`, including an excluded modeled row. Count all other rows as unscored. When the modeled count is positive, require current, recommended, and difference to be finite and produce:

```javascript
{
  state: 'ready',
  metricLabel,
  unit: metric.key === 'conversions' ? '' : '$',
  currentValue,
  recommendedValue,
  absoluteDifference: difference,
  percentageDifference: currentValue > 0 ? difference / currentValue : null,
  modeledCount,
  unscoredCount,
  scopeCopy: 'Modeled channels only. Preserved and excluded unsupported channels remain in the allocation view but are not scored here.'
}
```

When modeled count is zero, produce `state: 'not_estimable'` with:

```text
Modeled outcome comparison is unavailable because no channel has an admitted response curve.
```

Do not copy raw allocator messages, observations, diagnostic arrays, or imported rows into this projection.

- [x] **Step 5: Build text-first DOM and defer canvas paint**

Refactor `renderResult` into two responsibilities:

1. Build the complete result DOM, including the Plan value block.
2. Store a no-argument `repaintValueCharts` closure that holds only the two canvas references and controlled `valueVisualization` data.

The successful DOM order must be:

```javascript
resultDetails.append(method, summary, planValue, tableScroll);
```

Create the block with semantic headings:

```html
<section class="plan-value" aria-labelledby="plan-value-title">
  <p class="results-kicker">Plan value</p>
  <h3 id="plan-value-title">See what changes</h3>
  <div class="plan-value-stack">
    <section class="plan-value-panel allocation-comparison">
      <h4>Where the budget moves</h4>
      <p>Current uses the latest observed spend rate. Preserved plan baselines default to the recent-period median and are not optimized; a manually entered preserved amount replaces that default.</p>
      <canvas role="img" aria-label="Current and plan allocation by channel"></canvas>
      <dl class="plan-value-text"></dl>
    </section>
    <section class="plan-value-panel outcome-comparison">
      <h4>Modeled-channel expected revenue</h4>
      <canvas role="img" aria-label="Current and recommended modeled-channel Revenue"></canvas>
      <dl class="plan-value-text"></dl>
      <p class="plan-value-scope"></p>
    </section>
  </div>
</section>
```

The outcome heading is metric-specific: the revenue sample above renders **Modeled-channel expected revenue**, and the conversions objective renders **Modeled-channel expected conversions**. Because results are dynamically rebuilt, generate a unique heading ID per render or keep the single rendered block invariant. Set each canvas to `role="img"`, with an allocation-specific or metric-specific `aria-label`. Add visible `<dl>` or `<p>` equivalents for every displayed chart value and the expected-difference statement. Allocation text labels current values as latest-observed rates and preserved plan values as preserved baselines; it must not call a preserved baseline recommended.

For a ready outcome, show percentage only when `percentageDifference != null`; otherwise render `Percentage difference unavailable from a zero or non-positive current modeled baseline.` For `not_estimable`, show `Unavailable` in the modeled-outcome summary, render the controlled explanation, and do not render an empty outcome canvas or details list.

Update successful submission order to:

```javascript
renderResult(view, planDays);
syncPhase();
paintValueCharts();
renderModelEvidence(model, state.allocation);
```

Blocked `renderResult` and `clearAllocationResult` must set `repaintValueCharts = null` before clearing DOM. The chart closure must use `CHARTS.drawAllocationChart` and `CHARTS.drawOutcomeComparisonChart` only when those functions exist.

- [x] **Step 6: Integrate resize and every stale-state boundary**

Replace the evidence-only repaint condition with one combined controlled callback. The debounced resize callback may invoke `repaintValueCharts` and existing evidence `repaintCharts`, but only for callbacks that are non-null and whose parent sections are visible.

Ensure these existing paths call `clearAllocationResult()` before any new plan can be treated as current:

- total-budget `input`;
- plan-days `input`;
- constraint input/toggle;
- objective change;
- confirmed replacement;
- submit before allocator validation and before a blocked result is published.

`cancelChartRepaint()` remains the single timer cancellation boundary and must be invoked by source replacement and allocation invalidation. Do not add a second timer.

- [x] **Step 7: Add responsive Plan value styles**

In `analytics/budget/styles.css`, add scoped styles that keep the selected stacked composition at all widths:

```css
.budget-workspace .plan-value {
  min-width: 0;
  padding-block: var(--space-md);
  border-block: 1px solid var(--line);
}

.budget-workspace .plan-value-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-md);
  min-width: 0;
}

.budget-workspace .plan-value-panel {
  min-width: 0;
  padding: var(--space-md);
  border: 1px solid var(--line);
  background: var(--surface-2);
}

.budget-workspace .plan-value-panel canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 300px;
}

.budget-workspace .outcome-comparison canvas {
  height: 220px;
}
```

Add compact definition-list styles and a `max-width: 600px` rule that reduces panel padding without introducing columns or intrinsic minimum widths. Do not hide text equivalents at any breakpoint.

- [x] **Step 8: Run the focused Budget tests and inspect source privacy**

Run:

```bash
node --test tests/budget-app.test.js tests/charts.test.js tests/budget-allocator.test.js
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_budget_advisor_contract -v
rg -n "fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|console\." analytics/budget/app.js shared/budget-allocator.js shared/charts.js
```

Expected: all tests PASS and `rg` returns no matches in the three touched runtime sources.

- [x] **Step 9: Fingerprint Budget application and styles**

Run:

```bash
app_hash=$(shasum -a 256 analytics/budget/app.js | awk '{print substr($1, 1, 12)}')
style_hash=$(shasum -a 256 analytics/budget/styles.css | awk '{print substr($1, 1, 12)}')
new_app="analytics/budget/app.${app_hash}.js"
new_style="analytics/budget/styles.${style_hash}.css"
cp analytics/budget/app.js "$new_app"
cp analytics/budget/styles.css "$new_style"
cmp -s analytics/budget/app.js "$new_app"
cmp -s analytics/budget/styles.css "$new_style"
```

Use `apply_patch` to update the two references in `analytics/budget/index.html`. Remove the superseded copies:

```bash
git rm -- \
  analytics/budget/app.04327854abb0.js \
  analytics/budget/styles.3407f45d1268.css
```

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  scripts.test_asset_versioning \
  scripts.test_budget_advisor_contract \
  -v
git diff --check
```

Expected: PASS and each canonical Budget asset is byte-identical to its referenced fingerprinted copy.

- [x] **Step 10: Commit Task 3**

Stage only the Task 3 paths, substituting the two computed filenames:

```bash
git add -- \
  tests/budget-app.test.js \
  analytics/budget/app.js \
  analytics/budget/app.04327854abb0.js \
  "$new_app" \
  analytics/budget/styles.css \
  analytics/budget/styles.3407f45d1268.css \
  "$new_style" \
  analytics/budget/index.html
git commit -m "feat: show Budget Advisor plan value"
```

---

### Task 4: Record and enforce the cross-analysis product contract

**Files:**
- Modify: `tests/forecast-sample-data.test.js`
- Modify: `AGENTS.md`

**Interfaces:**
- Budget success must construct one primary Plan value region with accessible visual and textual comparisons.
- Forecast success must continue to reveal and draw `#forecast-chart` from historical and forecast values.
- Repository guidance must require a primary value visualization for every successful analysis, without requiring one in empty, invalid, or blocked states.

- [x] **Step 1: Strengthen the existing Forecast behavioral contract**

In `tests/forecast-sample-data.test.js`, make the existing sample-data success contract explicitly verify the rendered chart behavior:

```javascript
const forecastCanvas = document.getElementById('forecast-chart');
assert.strictEqual(document.getElementById('chart-wrap').hidden, false);
assert.ok(forecastCanvas.drawn);
assert.ok(forecastCanvas.drawn.timeSeries.length > 0);
assert.ok(forecastCanvas.drawn.forecast.length > 0);
```

- [x] **Step 2: Run the focused Forecast contract**

Run:

```bash
node --test tests/forecast-sample-data.test.js
```

Expected: PASS because this is a characterization of Forecast's already-shipped value visualization, not a new Forecast behavior. The new assertions must fail if `renderResults` stops drawing historical or forecast series.

- [x] **Step 3: Add the durable rule to `AGENTS.md`**

Append this numbered item to **Product contract**:

```markdown
9. Every successful analysis result includes a primary visualization that shows the value of the analysis. The visualization must expose its scope and values in accessible text, remain truthful about modeled versus unmodeled data, and may be omitted from empty, invalid, or blocked states.
```

Do not change the existing privacy, static-site, monetization, or analytics rules.

- [x] **Step 4: Run product-contract and privacy tests**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_asset_versioning -v
node --test tests/forecast-sample-data.test.js tests/budget-app.test.js
git diff --check
```

Expected: PASS.

- [x] **Step 5: Commit Task 4**

```bash
git add -- \
  tests/forecast-sample-data.test.js \
  AGENTS.md
git commit -m "docs: require value visuals for analyses"
```

---

### Task 5: Full verification, screenshots, and exact-HEAD review

**Files:**
- Create: `docs/superpowers/screenshots/analysis-value-visualizations/budget-value-desktop.png`
- Create: `docs/superpowers/screenshots/analysis-value-visualizations/budget-value-390px.png`
- Modify: `docs/superpowers/plans/2026-08-03-analysis-value-visualizations.md` only to mark completed checkboxes truthfully after each step passes.

- [x] **Step 1: Run every deterministic repository check**

From the isolated worktree root, run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_site.py --base-ref origin/main
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check origin/main...HEAD
git status --short
```

Expected:

- validator: 7/7 checks pass;
- all Python tests pass;
- all Node tests pass;
- diff check emits no output;
- status contains only the plan checkbox update and the two intended screenshot files before the evidence commit.

Verification note (2026-08-03): the unflagged validator stopped at the expected owner-approval gate for `AGENTS.md` (6 pass, 1 protected-change failure). The owner-approved local rerun with `--allow-protected` passed all 7 checks; GitHub still requires the owner-applied `protected-change-approved` label after the pull request exists.

- [x] **Step 2: Start the local site and verify the desktop success path**

Run:

```bash
python3 -m http.server 5173
```

Open `http://localhost:5173/analytics/budget/` at a desktop viewport. Use **Use sample data**, submit the plan, and verify:

- one visible primary route still exists into the analysis and no input workflow changed;
- Plan value appears after summary and before the detailed table;
- allocation chart includes every modeled, preserved, and excluded row;
- modeled-outcome chart shows current, recommended, and modeled difference;
- scope text says unsupported channels are unscored;
- Model evidence and recommendation explanation remain intact;
- canvases paint at nonzero dimensions;
- no console error occurs;
- changing total budget immediately hides and clears the stale result until resubmission.

Capture the result at:

```text
docs/superpowers/screenshots/analysis-value-visualizations/budget-value-desktop.png
```

- [x] **Step 3: Verify 390px behavior and capture mobile evidence**

At a 390px viewport, reload, use sample data, and submit. In the browser console, run:

```javascript
({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  canvases: Array.from(document.querySelectorAll('.plan-value canvas')).map(canvas => ({
    label: canvas.getAttribute('aria-label'),
    cssWidth: canvas.getBoundingClientRect().width,
    cssHeight: canvas.getBoundingClientRect().height,
    bitmapWidth: canvas.width,
    bitmapHeight: canvas.height
  }))
})
```

Expected:

- `innerWidth === 390`;
- `scrollWidth <= 390`;
- both canvas CSS and bitmap dimensions are positive;
- labels, values, legends, and scope copy remain visible without clipping;
- both panels remain stacked;
- detailed allocation table scrolls inside its own existing wrapper rather than widening the page.

Capture:

```text
docs/superpowers/screenshots/analysis-value-visualizations/budget-value-390px.png
```

- [x] **Step 4: Verify outcome edge states locally**

Use the already-passing chart and Budget harness cases for deterministic financial negative/flat/zero-baseline evidence. In the browser, also select each eligible sample objective and confirm currency is used for revenue/contribution while unprefixed counts are used for conversions. Confirm no page text uses causal or guaranteed language:

```bash
rg -ni "causal lift|incremental lift|guaranteed return|guaranteed performance|calibrated confidence" \
  analytics/budget shared/charts.js AGENTS.md
```

Expected: no matches.

- [x] **Step 5: Commit screenshots and completed plan state**

Mark only steps actually completed as `[x]`, then run:

```bash
git add -- \
  docs/superpowers/plans/2026-08-03-analysis-value-visualizations.md \
  docs/superpowers/screenshots/analysis-value-visualizations/budget-value-desktop.png \
  docs/superpowers/screenshots/analysis-value-visualizations/budget-value-390px.png
git commit -m "test: record analysis value visual evidence"
```

- [x] **Step 6: Re-run exact-HEAD verification**

Run after the evidence commit:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_site.py --base-ref origin/main
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check origin/main...HEAD
git status --short --branch
git rev-parse HEAD
```

Expected: all checks pass, the worktree is clean, and the exact review SHA is recorded.

- [x] **Step 7: Request independent review of exact HEAD**

Give the independent reviewer the exact SHA and approved spec. Require review of:

- allocator math and overflow failure boundary;
- no optimizer-decision change;
- modeled/unscored scope accuracy;
- zero, flat, negative, conversion, revenue, and both financial treatments;
- DOM build-before-paint lifecycle and stale clearing;
- 266px chart geometry and 390px page overflow;
- text equivalents and canvas accessible names;
- absence of new telemetry, network, storage, or download fields;
- canonical/fingerprinted byte equality and public references;
- Forecast regression;
- exact diff scope against `origin/main`.

Any finding requires a new focused failing test where mechanically expressible, a bounded fix, rerun of all checks, refreshed screenshots if pixels changed, a new commit, and a fresh independent review of the new exact HEAD.

- [ ] **Step 8: Prepare the draft pull request handoff**

After review passes, use the repository's branch-finishing workflow to push `codex/analysis-value-visualizations` and open a **draft** pull request. The PR body must include:

- summary;
- changed routes and files;
- exact validation commands and pass counts;
- desktop screenshot;
- 390px screenshot;
- independent exact-HEAD review SHA and notes;
- remaining risks, including the observational/noncausal model boundary;
- explicit statement: **not merged, not deployed**.

Do not create or apply `protected-change-approved`. Do not merge the PR and do not deploy it.

---

## Plan Self-Review Checklist

- [x] Every approved design requirement maps to a named task and verification step.
- [x] No step changes allocation decisions, fitting, evidence gates, Forecast math, downloads, telemetry, backend, or production wiring.
- [x] Current and recommended outcomes use one helper and the same horizon/financial treatment.
- [x] Preserved unsupported rows publish `null`; excluded modeled rows remain scored; excluded unsupported rows remain unscored.
- [x] Percentage comparison is emitted only for a positive current modeled baseline.
- [x] Signed outcome chart includes zero and cannot create negative-width bars.
- [x] DOM is built before visibility synchronization and canvas paint.
- [x] All stale-result paths clear chart DOM and repaint closures.
- [x] Every changed public asset has a byte-identical content fingerprint and updated reference.
- [x] Forecast retains its existing primary value visualization.
- [x] No unresolved marker, type, or file path remains.
- [ ] Final delivery stops at a reviewed draft PR.
