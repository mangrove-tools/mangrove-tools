# Budget Advisor Curve Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Budget Advisor's existing marginal-efficiency and response-curve evidence immediately visible after a valid allocation while keeping diagnostics secondary and all analytical outputs unchanged.

**Architecture:** Add an authored, full-width Model evidence region after the plan/result row and keep the existing details element as the diagnostics container. A pure `modelEvidenceView(model, allocation)` projects controlled labels, chart inputs, and spend positions from the existing model and allocation; DOM renderers consume that projection and the existing `MangroveCharts` functions without fitting or optimizing anything.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Python `unittest`, Node.js `node:test`, canvas charts, Vercel static hosting.

## Global Constraints

- Do not alter history normalization, evidence gates, curve fitting, objective selection, marginal metrics, constraints, preservation logic, or budget allocation.
- Do not add inputs, routes, backend calls, storage, dependencies, or analytics events.
- Do not send or store pasted history or other user-entered values.
- Do not change affiliate IDs, `AFFILIATE_URL`, Google Analytics identity, Vercel configuration, DNS, payments, legal claims, or production wiring.
- Keep raw observations, complete gate tables, normalized history, and cleaned-data download inside **Inspect diagnostics and cleaned data**.
- Keep modeled and preserved states explicit in text; never use color as the only status signal.
- Preserve native keyboard behavior, responsive canvas rendering, and `prefers-reduced-motion` behavior.
- At 390px, `document.documentElement.scrollWidth` must be no greater than `390`.
- Use the canonical sources `analytics/budget/app.js` and `analytics/budget/styles.css`; generate byte-identical fingerprinted copies and update `analytics/budget/index.html` whenever either source changes.
- Run the repository validator, validator unit tests, all JavaScript tests, `git diff --check`, desktop verification, and 390px verification before review.
- Do not merge or deploy this feature. Open a ready pull request only after independent exact-HEAD review passes.

## File map

- Modify `analytics/budget/index.html`: author the visible evidence region and rename the existing diagnostics disclosure.
- Modify `analytics/budget/styles.css`: style the evidence hierarchy, two-column desktop curve gallery, one-column mobile cards, and diagnostic separation.
- Modify `analytics/budget/app.js`: add the pure evidence projection, visible chart rendering, diagnostic rendering, invalidation, and repaint behavior.
- Modify `scripts/test_budget_advisor_contract.py`: enforce semantic structure, order, copy, responsive CSS, and existing privacy/network boundaries.
- Modify `tests/budget-app.test.js`: test the pure view, visible evidence DOM, chart calls, fallback behavior, invalidation, and resize handling.
- Replace the current fingerprinted Budget assets referenced by `analytics/budget/index.html` with hash-correct byte-identical copies.
- Create `docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-desktop.png`: desktop result evidence.
- Create `docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-390px.png`: mobile result evidence.

---

### Task 1: Author the visible evidence and diagnostics layout

**Files:**
- Modify: `scripts/test_budget_advisor_contract.py:13-115`
- Modify: `analytics/budget/index.html:204-273`
- Modify: `analytics/budget/styles.css:284-630`
- Replace: `analytics/budget/styles.7493968e0786.css`

**Interfaces:**
- Consumes: existing `#results`, `#model-inspector`, and Budget workspace layout.
- Produces: authored `#model-evidence`, `#model-evidence-title`, `#model-evidence-charts`, and `#model-diagnostics-channels` elements for Task 2.
- Produces: `.evidence-overview`, `.evidence-curve-grid`, `.evidence-card`, and `.model-diagnostics-channels` style contracts.

- [x] **Step 1: Write the failing semantic and responsive contract tests**

Add the new element IDs to `REQUIRED_IDS` in `scripts/test_budget_advisor_contract.py`:

```python
    "model-evidence",
    "model-evidence-title",
    "model-evidence-charts",
    "model-diagnostics-channels",
```

Add a test that reads the authored HTML and CSS:

```python
def test_model_evidence_precedes_collapsed_diagnostics_and_is_responsive(self) -> None:
    parser = parse_budget_page()
    html = (ROOT / "analytics/budget/index.html").read_text(encoding="utf-8")
    styles = (ROOT / "analytics/budget/styles.css").read_text(encoding="utf-8")

    self.assertEqual(parser.elements["model-evidence"]["tag"], "section")
    self.assertIn("hidden", parser.elements["model-evidence"]["attrs"])
    self.assertEqual(
        parser.elements["model-evidence"]["attrs"].get("aria-labelledby"),
        "model-evidence-title",
    )
    self.assertLess(
        parser.order.index("model-evidence"),
        parser.order.index("model-inspector"),
    )
    self.assertIn("Inspect diagnostics and cleaned data", html)
    self.assertRegex(
        styles,
        re.compile(
            r"@media\s*\(min-width:\s*900px\).*?"
            r"\.budget-workspace\s+\.evidence-curve-grid\s*\{.*?"
            r"grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)",
            re.DOTALL,
        ),
    )
    self.assertRegex(
        styles,
        re.compile(
            r"@media\s*\(max-width:\s*600px\).*?"
            r"\.budget-workspace\s+\.evidence-curve-grid\s*\{.*?"
            r"grid-template-columns:\s*minmax\(0,\s*1fr\)",
            re.DOTALL,
        ),
    )
```

- [x] **Step 2: Run the focused contract test and confirm the red state**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  scripts.test_budget_advisor_contract.BudgetAdvisorContractTests.test_progressive_decision_canvas_has_required_regions_and_controls \
  scripts.test_budget_advisor_contract.BudgetAdvisorContractTests.test_model_evidence_precedes_collapsed_diagnostics_and_is_responsive \
  -v
```

Expected: FAIL because `model-evidence` and the new responsive CSS do not exist.

- [x] **Step 3: Add the authored evidence region and diagnostics container**

In `analytics/budget/index.html`, insert this section after `.plan-result-layout` and before `#model-inspector`:

```html
<section
  id="model-evidence"
  class="workspace-panel model-evidence"
  aria-labelledby="model-evidence-title"
  hidden
>
  <p class="results-kicker">Model evidence</p>
  <h2 id="model-evidence-title">Why the budget moved</h2>
  <p>
    Compare modeled marginal efficiency and inspect each channel's observed response.
    Preserved channels remain visible without a fitted line.
  </p>
  <div id="model-evidence-charts" class="model-evidence-charts"></div>
</section>
```

Keep the existing details ID to avoid needless contract churn, change its summary, and add the authored diagnostics container before the cleaned-history paragraph:

```html
<details id="model-inspector" class="workspace-panel model-inspector" hidden>
  <summary>Inspect diagnostics and cleaned data</summary>
  <div id="model-diagnostics-channels" class="model-diagnostics-channels"></div>
```

Retain the existing normalized-history paragraph, table, download button, and closing `</details>` byte-for-byte after the new diagnostics container.

- [x] **Step 4: Add the evidence layout styles**

Replace the inspector-only chart selectors in `analytics/budget/styles.css` with evidence-specific styles while retaining the existing table styles for diagnostics:

```css
.budget-workspace .model-evidence-charts,
.budget-workspace .model-diagnostics-channels {
  display: grid;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  min-width: 0;
}

.budget-workspace .evidence-overview,
.budget-workspace .evidence-card,
.budget-workspace .channel-diagnostics {
  min-width: 0;
  padding: var(--space-md);
  border: 1px solid var(--line);
  background: var(--surface-2);
}

.budget-workspace .evidence-curve-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-md);
  min-width: 0;
}

.budget-workspace .evidence-overview canvas,
.budget-workspace .evidence-card canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border: 1px solid var(--line);
  background: var(--surface);
}

@media (min-width: 900px) {
  .budget-workspace .evidence-curve-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .budget-workspace .evidence-curve-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .budget-workspace .model-evidence,
  .budget-workspace .evidence-card,
  .budget-workspace .evidence-overview {
    min-width: 0;
    max-width: 100%;
  }
}
```

Reuse the current typographic treatment for `.channel-inspector-positions` under a renamed `.evidence-card-positions` selector. Keep `.inspector-observations` and `.inspector-gates` table widths scoped to `.channel-diagnostics` so those minimums never apply to visible evidence cards.

- [x] **Step 5: Fingerprint the changed stylesheet and update the HTML reference**

Run:

```bash
style_hash=$(shasum -a 256 analytics/budget/styles.css | awk '{print substr($1, 1, 12)}')
new_style="analytics/budget/styles.${style_hash}.css"
cp analytics/budget/styles.css "$new_style"
```

Update the stylesheet reference in `analytics/budget/index.html` to `/${new_style}` using the computed twelve-character hash, then remove the superseded tracked copy explicitly:

```bash
git rm -- analytics/budget/styles.7493968e0786.css
```

- [x] **Step 6: Run the focused contracts and asset test**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  scripts.test_budget_advisor_contract \
  scripts.test_asset_versioning \
  -v
git diff --check
```

Expected: PASS, with the canonical and fingerprinted stylesheet byte-identical.

- [x] **Step 7: Commit Task 1**

Stage only the Task 1 paths, substituting the actual computed fingerprint in the command:

```bash
style_hash=$(shasum -a 256 analytics/budget/styles.css | awk '{print substr($1, 1, 12)}')
new_style="analytics/budget/styles.${style_hash}.css"
git add -- \
  scripts/test_budget_advisor_contract.py \
  analytics/budget/index.html \
  analytics/budget/styles.css \
  "$new_style" \
  analytics/budget/styles.7493968e0786.css
git commit -m "feat: add Budget Advisor model evidence layout"
```

---

### Task 2: Render visible evidence and separate diagnostics

**Files:**
- Modify: `tests/budget-app.test.js:250-460,1075-1410`
- Modify: `analytics/budget/app.js:222-342,344-500,1019-1415,1600-1690`
- Modify: `analytics/budget/index.html:30-40,365-385`
- Replace: `analytics/budget/app.9770583dec71.js`

**Interfaces:**
- Consumes: `#model-evidence`, `#model-evidence-charts`, `#model-diagnostics-channels`, and `#model-inspector` from Task 1.
- Consumes: the existing selected Budget model, successful allocation, `diagnosticRows(channel)`, `MangroveCharts.drawMarginalEfficiencyChart`, and `MangroveCharts.drawResponseCurve`.
- Produces: `MangroveBudgetApp.modelEvidenceView(model, allocation)`.
- Produces: visible evidence cards with sanitized chart inputs and textual interpretations; collapsed channel diagnostic tables from `renderDiagnostics(model, inspection)`; one active evidence repaint callback.

- [x] **Step 1: Extend the deterministic DOM harness**

In `tests/budget-app.test.js`, add these authored IDs to `tagsById`:

```javascript
'model-evidence': 'section',
'model-evidence-title': 'h2',
'model-evidence-charts': 'div',
'model-diagnostics-channels': 'div',
```

Include `model-evidence` in the list of initially hidden elements. Change `loadDomApp()` to accept an options object and permit chart APIs to be absent without changing other harness behavior:

```javascript
function loadDomApp(options) {
  const settings = options || {};
  // existing harness setup
  const window = {
    // existing properties
    MangroveCharts: settings.withoutCharts ? {} : chartApi
  };
  // existing module loading and return value
}
```

- [x] **Step 2: Write failing pure-view tests**

Add:

```javascript
test('model evidence view separates modeled curves from preserved observations', () => {
  const view = plain(app.modelEvidenceView(
    planningModel(),
    successfulAllocation('revenue')
  ));

  assert.equal(view.state, 'ready');
  assert.equal(view.overview.chartRows.length, 1);
  assert.equal(view.channels.length, 2);
  assert.equal(view.channels[0].statusLabel, 'Modeled');
  assert.equal(view.channels[0].fitText, '0.91');
  assert.equal(view.channels[0].positions.currentSpendRate, 100);
  assert.equal(view.channels[0].positions.recommendedSpendRate, 200);
  assert.equal(view.channels[1].statusLabel, 'Preserved');
  assert.equal(view.channels[1].chartChannel.curve, null);
  assert.match(view.channels[1].summary, /Not modeled — allocation preserved/);
  assert.doesNotMatch(JSON.stringify(view), /normalizedRawRow|must not enter a view model/);
});

test('conversion evidence compares increasing marginal conversions per dollar', () => {
  const view = app.modelEvidenceView(
    planningModel({ key: 'conversions', label: 'Conversions', costTreatment: null }),
    successfulAllocation('conversions')
  );

  assert.equal(view.overview.chartRows[0].marginalMetric.key, 'marginal_conversions_per_dollar');
  assert.equal(view.overview.chartRows[0].marginalMetric.value, 1 / 12.5);
  assert.match(view.overview.summary, /higher is better/i);
});
```

- [x] **Step 3: Write failing visible-evidence behavior tests**

Replace the old closed-inspector paint expectation with tests for the approved hierarchy:

```javascript
test('successful allocation reveals and paints every channel without opening diagnostics', () => {
  const { elements, chartCalls } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  assert.equal(elements['model-evidence'].hidden, false);
  assert.equal(elements['model-inspector'].open, false);
  assert.equal(chartCalls.marginal.length, 1);
  assert.equal(chartCalls.response.length, 4);
  assert.ok(chartCalls.marginal[0][1].every(row => row.status === 'modelable'));

  const cards = elementsByClass(elements['model-evidence-charts'], 'evidence-card');
  assert.equal(cards.length, 4);
  assert.ok(cards.some(card => /Not modeled — allocation preserved/.test(card.textContent)));
  assert.equal(elementsByTag(elements['model-evidence-charts'], 'table').length, 0);
  assert.ok(elementsByTag(elements['model-diagnostics-channels'], 'table').length > 0);
  elementsByTag(elements['model-evidence-charts'], 'canvas').forEach(canvas => {
    assert.match(canvas.getAttribute('aria-label'), /channel|marginal/i);
  });
});

test('missing chart functions preserve textual evidence without throwing', () => {
  const { elements } = loadDomApp({ withoutCharts: true });
  elements['use-sample-data'].trigger('click');
  assert.doesNotThrow(() => elements['plan-form'].trigger('submit'));
  assert.equal(elements['model-evidence'].hidden, false);
  assert.match(elements['model-evidence-charts'].textContent, /Modeled|Preserved/);
});
```

Extend the existing stale-result test so changing budget or a constraint asserts:

```javascript
assert.equal(elements['model-evidence'].hidden, true);
assert.equal(elements['model-evidence-charts'].children.length, 0);
```

Update the resize test to assert that initial painting occurs immediately, a resize schedules exactly one `150` millisecond repaint, and replacement clears that pending callback. Diagnostics toggling must not trigger a chart repaint.

- [x] **Step 4: Run the Budget app test and confirm the red state**

Run:

```bash
node --test tests/budget-app.test.js
```

Expected: FAIL because `modelEvidenceView` and visible evidence rendering do not exist.

- [x] **Step 5: Implement the pure evidence projection**

Add this `modelEvidenceView(model, allocation)` before the public `MangroveBudgetApp` export:

```javascript
function modelEvidenceView(model, allocation) {
  const selectedModel = model && typeof model === 'object' ? model : {};
  const result = allocation && typeof allocation === 'object' ? allocation : {};
  if (result.ok !== true) {
    return { state: 'hidden', overview: null, channels: [] };
  }

  const metric = selectedModel.metric && typeof selectedModel.metric === 'object'
    ? selectedModel.metric
    : {};
  const allocationRows = Array.isArray(result.allocation) ? result.allocation : [];
  const rowsByName = new Map(allocationRows.map(function indexAllocation(row) {
    return [row && row.channel, row];
  }));
  const modelableRows = allocationRows.filter(function modelableAllocation(row) {
    return row && row.status === 'modelable';
  });
  const chartRows = modelableRows.map(function projectMarginal(row) {
    const sourceMetric = row.marginalMetric && typeof row.marginalMetric === 'object'
      ? row.marginalMetric
      : {};
    const sourceValue = finiteValue(sourceMetric.value);
    const conversionValue = metric.key === 'conversions'
      && sourceValue != null && sourceValue > 0
      ? 1 / sourceValue
      : null;
    return {
      channel: typeof row.channel === 'string' ? row.channel : 'Unnamed channel',
      status: 'modelable',
      marginalMetric: {
        key: metric.key === 'conversions'
          ? 'marginal_conversions_per_dollar'
          : metric.key === 'revenue'
            ? 'marginal_roas'
            : 'marginal_roi',
        value: metric.key === 'conversions' ? conversionValue : sourceValue
      }
    };
  }).filter(function finiteMarginal(row) {
    return Number.isFinite(row.marginalMetric.value);
  });

  const channels = (Array.isArray(selectedModel.channels) ? selectedModel.channels : [])
    .map(function projectChannel(channel) {
      const name = channel && typeof channel.channel === 'string'
        ? channel.channel
        : 'Unnamed channel';
      const status = channel && channel.status === 'modelable' ? 'modelable' : 'preserved';
      const allocationRow = rowsByName.get(name) || {};
      const horizonFactor = finiteValue(result.horizonFactor);
      const currentSpend = finiteValue(allocationRow.currentSpend);
      const currentSpendRate = status === 'modelable'
        && horizonFactor != null && horizonFactor > 0 && currentSpend != null
        ? currentSpend / horizonFactor
        : finiteValue(channel && channel.currentSpendRate);
      const recommendedSpendRate = status === 'modelable'
        ? finiteValue(allocationRow.recommendedSpendRate)
        : null;
      const failedLabels = (Array.isArray(channel && channel.failedGates)
        ? channel.failedGates
        : []).map(function controlledGate(code) {
          return GATE_LABELS[code] || 'Does not meet a controlled evidence gate';
        });
      const visibleFailures = failedLabels.slice(0, 2);
      const remainingFailures = failedLabels.length - visibleFailures.length;
      const evidenceGaps = visibleFailures.join('; ')
        + (remainingFailures > 0 ? '; and ' + String(remainingFailures) + ' more evidence gates' : '');
      const curve = status === 'modelable'
        && channel && channel.curve && typeof channel.curve === 'object'
        && finiteValue(channel.curve.a) != null
        && finiteValue(channel.curve.b) != null
        ? {
          a: finiteValue(channel.curve.a),
          b: finiteValue(channel.curve.b),
          r2: finiteValue(channel.curve.r2)
        }
        : null;
      const observations = (Array.isArray(channel && channel.observations)
        ? channel.observations
        : []).map(function projectObservation(observation) {
          return {
            spend: finiteValue(observation && observation.spend),
            outcome: finiteValue(observation && observation.outcome)
          };
        }).filter(function finiteObservation(observation) {
          return observation.spend != null && observation.outcome != null;
        });
      const cadence = selectedModel.cadence || 'historical';
      const positionRows = status === 'modelable'
        ? [
          ['Fitted treatment', 'In-sample diminishing-return curve'],
          ['Current spend rate', money(currentSpendRate) + ' per ' + cadence + ' period'],
          ['Recommended spend rate', money(recommendedSpendRate) + ' per ' + cadence + ' period'],
          [
            'In-sample log-space fit (R²)',
            curve && curve.r2 != null
              ? curve.r2.toLocaleString('en-US', { maximumFractionDigits: 4 })
              : '—'
          ]
        ]
        : [];

      return {
        name: name,
        status: status,
        statusLabel: status === 'modelable' ? 'Modeled' : 'Preserved',
        summary: status === 'modelable'
          ? 'Modeled response admitted; the curve shows observed diminishing returns and the spend markers used in this plan.'
          : 'Not modeled — allocation preserved.'
            + (evidenceGaps ? ' Evidence gaps: ' + evidenceGaps + '.' : ''),
        fitText: curve && curve.r2 != null
          ? curve.r2.toLocaleString('en-US', { maximumFractionDigits: 4 })
          : '—',
        positions: {
          currentSpendRate: currentSpendRate,
          recommendedSpendRate: recommendedSpendRate
        },
        positionRows: positionRows,
        accessibleLabel: status === 'modelable'
          ? name + ' response curve with observed data and current and recommended spend markers'
          : name + ' observed spend and outcome points; no fitted response curve',
        chartChannel: {
          status: status,
          curve: curve,
          observations: observations
        }
      };
    });

  return {
    state: 'ready',
    overview: {
      heading: 'Cross-channel modeled marginal efficiency',
      summary: metric.key === 'conversions'
        ? 'Compare marginal conversions per dollar across admitted response curves; higher is better. The allocation table reports the equivalent marginal CPA, where lower is better.'
        : 'Compare the selected marginal metric only across channels with admitted response curves; higher is better.',
      chartRows: chartRows
    },
    channels: channels
  };
}
```

Export the helper alongside `createState`, `derivePhase`, `readinessView`, `resultView`, and `constraintRows`. Keep the exact projection free of period keys, imported row objects, dimensions, and rejected values.

- [x] **Step 6: Run the pure-view tests**

Run:

```bash
node --test --test-name-pattern='model evidence view|conversion evidence' tests/budget-app.test.js
```

Expected: PASS.

- [x] **Step 7: Split visible evidence rendering from diagnostics rendering**

In `init()`:

1. Bind `modelEvidence`, `modelEvidenceCharts`, and `modelDiagnosticsChannels` by authored ID.
2. Remove the dynamically created `inspectorCharts` and its insertion into the details element.
3. Keep `resultDetails` insertion unchanged.
4. Replace `renderModelInspector(model, allocation)` with:
   - `renderModelEvidence(model, allocation)`, which consumes `modelEvidenceView`, builds the overview and `.evidence-curve-grid`, and assigns the repaint callback;
   - `renderDiagnostics(model, inspection)`, which builds `.channel-diagnostics` observation and evidence-gate tables inside `#model-diagnostics-channels` and preserves the normalized-history rendering from the supplied successful inspection.

The evidence renderer must:

- create one overview canvas with `role="img"` and the existing marginal-efficiency accessible name;
- create one `.evidence-card` per projected channel;
- render the explicit status and textual interpretation before its canvas;
- render modeled position rows and fit text;
- pass preserved `chartChannel.curve === null` to `drawResponseCurve` so the existing chart shows observations without a fitted line; and
- call the repaint callback immediately after the visible DOM is complete.

The diagnostics renderer must move the existing observation and gate-table construction intact, preserving `textContent` assignment for imported strings.

- [x] **Step 8: Make evidence lifecycle follow allocation lifecycle**

Update state handling so:

```javascript
if (modelEvidence) {
  modelEvidence.hidden = phase !== 'result'
    || !state.allocation
    || state.allocation.ok !== true;
}
```

`clearAllocationResult()` must clear `modelEvidenceCharts`, hide `modelEvidence`, cancel the repaint timer, and null the repaint callback. It must not clear diagnostics, because changing budget or constraints does not invalidate the imported history or its evidence gates.

A full history reset must additionally clear `modelDiagnosticsChannels` and the cleaned-history table. After successful import, call:

```javascript
renderReadiness();
renderCleanedHistory(inspection);
renderDiagnostics(modelFor(analysis, state.selectedObjective), inspection);
syncPhase();
```

When the selected objective changes, rebuild diagnostics with the newly selected cached model and `state.importResult` after clearing the stale allocation.

After successful allocation, construct the result, synchronize phase to reveal `#model-evidence`, then paint the evidence. This ordering is required because the chart renderer measures canvas geometry synchronously; it must not paint under a hidden ancestor. Do this before the existing motion reveal:

```javascript
renderResult(view, planDays);
syncPhase();
renderModelEvidence(model, state.allocation);
downloadAllocation.disabled = false;
```

Remove the model-inspector toggle repaint handler. Resize handling must repaint only when a callback exists and the visible evidence section is not hidden.

- [x] **Step 9: Run all Budget app behavior tests**

Run:

```bash
node --test tests/budget-app.test.js
```

Expected: PASS. Confirm the existing event tests still prove that only controlled action labels are emitted.

- [x] **Step 10: Fingerprint the changed app and update the HTML reference**

Run:

```bash
app_hash=$(shasum -a 256 analytics/budget/app.js | awk '{print substr($1, 1, 12)}')
new_app="analytics/budget/app.${app_hash}.js"
cp analytics/budget/app.js "$new_app"
```

Update the app script reference in `analytics/budget/index.html` to `/${new_app}` using the computed hash, then remove the superseded tracked copy explicitly:

```bash
git rm -- analytics/budget/app.9770583dec71.js
```

- [x] **Step 11: Run the complete focused feature suite**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  scripts.test_budget_advisor_contract \
  scripts.test_budget_sample_data \
  scripts.test_asset_versioning \
  -v
node --test \
  tests/budget-app.test.js \
  tests/marginality-engine.test.js \
  tests/budget-allocator.test.js
git diff --check
```

Expected: PASS. Numerical marginality and allocation expectations must be unchanged.

- [x] **Step 12: Commit Task 2**

Stage only these paths, substituting the actual app fingerprint:

```bash
app_hash=$(shasum -a 256 analytics/budget/app.js | awk '{print substr($1, 1, 12)}')
new_app="analytics/budget/app.${app_hash}.js"
git add -- \
  tests/budget-app.test.js \
  analytics/budget/app.js \
  "$new_app" \
  analytics/budget/app.9770583dec71.js \
  analytics/budget/index.html
git commit -m "feat: surface Budget Advisor response curves"
```

---

### Task 3: Verify the exact feature head and capture evidence

**Files:**
- Create: `docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-desktop.png`
- Create: `docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-390px.png`
- Modify only if a failing test or review finding requires it: the exact Task 1 or Task 2 product/test files implicated by the failure.

**Interfaces:**
- Consumes: the complete Task 1 and Task 2 feature branch.
- Produces: deterministic test evidence, desktop and 390px screenshots, overflow/console results, and independent exact-HEAD approval for PR creation.

- [x] **Step 1: Run the unapproved protected-change gate**

Run:

```bash
python3 scripts/validate_site.py --base-ref origin/main
```

Expected: PASS. If it exits `1`, continue only when every failure line is exactly `FAIL protected changes` caused by unchanged protected values in new fingerprint paths. In that narrow case, record the owner-label requirement and run the local assertion:

```bash
python3 scripts/validate_site.py --base-ref origin/main --allow-protected
```

Any privacy, secret, JavaScript, JSON, link, asset, or other validator failure stops the task and returns to the failing feature test before a fix.

- [x] **Step 2: Run the complete deterministic suite**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
```

Expected: all Python and JavaScript tests pass with zero failures, and `git diff --check` emits no output.

- [x] **Step 3: Start the local static server from the worktree root**

Run in a persistent terminal:

```bash
python3 -m http.server 5173
```

Verify `http://localhost:5173/analytics/budget/` rather than serving the route directory directly.

- [x] **Step 4: Verify the desktop result and capture evidence**

At a `1440 × 1000` viewport:

1. Open `/analytics/budget/`.
2. Activate **Use sample data**.
3. Submit **Build allocation**.
4. Confirm **Allocation ready**.
5. Confirm `#model-evidence` is visible without opening `#model-inspector`.
6. Confirm the marginal-efficiency canvas and all response-curve canvases have non-zero rendered sizes.
7. Confirm at least one Modeled card and one **Not modeled — allocation preserved** card are visible.
8. Confirm opening **Inspect diagnostics and cleaned data** reveals tables without changing chart count.
9. Confirm the browser console has no errors.
10. Save `docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-desktop.png` with the allocation context and visible evidence in frame.

- [x] **Step 5: Verify 390px behavior and capture evidence**

At a `390px` viewport:

1. Repeat the sample-data allocation.
2. Confirm the evidence cards form one column.
3. Evaluate:

```javascript
document.documentElement.scrollWidth <= 390
```

Expected: `true`.

4. Confirm modeled/preserved text, canvas, and spend-position text do not clip.
5. Confirm the browser console has no errors.
6. Save `docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-390px.png` with a response-curve card and its interpretation visible.

- [x] **Step 6: Verify stale evidence removal manually**

After a successful allocation, change the total budget. Confirm:

- `#model-evidence` becomes hidden;
- no previous current/recommended marker remains visible; and
- the status instructs the user to rebuild the plan.

- [x] **Step 7: Commit visual evidence**

Run:

```bash
git add -- \
  docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-desktop.png \
  docs/superpowers/screenshots/budget-curve-discoverability/budget-evidence-390px.png
git commit -m "docs: record Budget Advisor curve verification"
```

- [ ] **Step 8: Request independent exact-HEAD review**

Give the reviewer:

- the approved specification;
- this implementation plan;
- `git diff origin/main...HEAD`;
- the deterministic test results;
- both screenshots; and
- the exact `git rev-parse HEAD` value.

The reviewer must check result hierarchy, model/renderer separation, preserved-channel truthfulness, stale-state clearing, privacy boundaries, fingerprint correctness, accessibility, and 390px behavior. Critical or Important findings block PR creation. Fix a valid finding by adding or tightening the failing test first, then make the minimum product change, rerun the focused and full suites, recapture affected evidence, commit, and request a new exact-HEAD review.

- [ ] **Step 9: Run final controller-side verification on the reviewed commit**

Run fresh after review approval:

```bash
python3 scripts/validate_site.py --base-ref origin/main
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
git status -sb
git rev-parse HEAD
```

Use `--allow-protected` only under the narrow condition established in Step 1. Expected: clean worktree, exact reviewed HEAD, all deterministic checks passing.

- [ ] **Step 10: Hand off for ready PR creation**

Use `superpowers:finishing-a-development-branch`. If the user selects PR creation, push this branch and open one ready PR against `main` containing:

- summary;
- changed routes and files;
- validation commands and exact results;
- desktop and 390px screenshots;
- independent exact-HEAD review notes;
- remaining risks;
- protected-label requirement, if Step 1 established one; and
- the explicit statement **Not merged. Not deployed.**

Do not merge or deploy in this plan.
