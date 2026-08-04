'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'analytics/budget/app.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'analytics/budget/styles.css'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const app = context.window.MangroveBudgetApp;

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function analysisWith(statuses) {
  return {
    ok: true,
    eligibleObjectives: ['revenue', 'conversions'],
    recommendedObjective: 'revenue',
    historySummary: {
      completePeriods: 16,
      channels: statuses.length,
      excludedRows: 2
    },
    models: {
      revenue: {
        objective: 'revenue',
        metric: { key: 'revenue', label: 'Revenue', costTreatment: null },
        channels: statuses.map((status, index) => ({
          channel: `Channel ${index + 1}`,
          status,
          failedGates: status === 'preserved'
            ? ['minimum_complete_periods', 'spend_variation']
            : [],
          observations: [{ private: 'raw row must not escape' }]
        }))
      },
      conversions: {
        objective: 'conversions',
        metric: { key: 'conversions', label: 'Conversions', costTreatment: null },
        channels: []
      }
    }
  };
}

function planningModel(metric, statuses) {
  const selectedMetric = metric || {
    key: 'revenue',
    label: 'Revenue',
    costTreatment: null
  };
  return {
    objective: selectedMetric.key === 'financial' ? 'contribution' : selectedMetric.key,
    cadence: 'weekly',
    cadenceDays: 7,
    metric: selectedMetric,
    channels: (statuses || ['modelable', 'preserved']).map((status, index) => ({
      channel: index === 0 ? 'Paid search <em>unsafe</em>' : 'Local partnerships',
      status,
      currentSpendRate: index === 0 ? 100 : 50,
      preservedSpendRate: index === 0 ? 90 : 50,
      curve: status === 'modelable' ? { a: 2, b: 0.5, r2: 0.91 } : null,
      diagnostics: {
        completePeriods: 16,
        positiveCoverage: 1,
        distinctPositiveSpend: status === 'modelable' ? 16 : 3,
        robustSpendVariation: status === 'modelable' ? 0.44 : 0.08,
        elasticity: status === 'modelable' ? 0.5 : 0,
        elasticityIqr: status === 'modelable' ? 0.04 : 0.4,
        maximumCurrentPredictionChange: status === 'modelable' ? 0.08 : 0.5
      },
      failedGates: status === 'modelable' ? [] : ['distinct_spend', 'spend_variation'],
      observations: [{
        periodKey: '2026-W01',
        spend: 100,
        outcome: 200,
        normalizedRawRow: 'must not enter a view model'
      }]
    }))
  };
}

function successfulAllocation(metricKey, overrides) {
  const marginal = {
    conversions: { key: 'marginal_cpa', value: 12.5 },
    revenue: { key: 'marginal_roas', value: 3.5 },
    financial: { key: 'marginal_roi', value: 0.6 }
  }[metricKey];
  return Object.assign({
    ok: true,
    code: 'allocated',
    horizonFactor: 2,
    objective: metricKey === 'financial' ? 'contribution' : metricKey,
    allocation: [
      {
        channel: 'Paid search <em>unsafe</em>',
        status: 'modelable',
        currentSpend: 200,
        recommendedSpend: 400,
        recommendedSpendRate: 200,
        currentPredictedOutcome: metricKey === 'conversions' ? 20 : 900,
        predictedOutcome: metricKey === 'conversions' ? 32 : 1200,
        marginalMetric: marginal,
        constraint: 'interior'
      },
      {
        channel: 'Local partnerships',
        status: 'preserved',
        currentSpend: 100,
        recommendedSpend: 100,
        recommendedSpendRate: 50,
        currentPredictedOutcome: null,
        predictedOutcome: null,
        marginalMetric: null,
        constraint: 'preserved'
      }
    ],
    totals: {
      requestedBudget: 500,
      allocatedBudget: 500,
      optimizedBudget: 400,
      preservedBudget: 100,
      currentPredictedOutcome: metricKey === 'conversions' ? 20 : 900,
      predictedOutcome: metricKey === 'conversions' ? 32 : 1200
    },
    conflicts: []
  }, overrides || {});
}

function createCanvasContext() {
  const clearRects = [];
  return {
    clearRects,
    scale() {},
    clearRect(...args) {
      clearRects.push(args);
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
    measureText(text) {
      return { width: String(text).length * 6 };
    },
    setLineDash() {},
    arc() {},
    fill() {},
    fillRect() {}
  };
}

class FakeElement {
  constructor(tagName, id) {
    this.tagName = tagName.toUpperCase();
    this.id = id || '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.selected = false;
    this.open = false;
    this.value = '';
    this.className = '';
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this._textContent = '';
    this._canvasContext = this.tagName === 'CANVAS' ? createCanvasContext() : null;
  }

  get textContent() {
    return this._textContent + this.children.map(child => child.textContent).join('');
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  set innerHTML(_) {
    throw new Error('Imported content must not be inserted as HTML.');
  }

  get options() {
    return this.children.filter(child => child.tagName === 'OPTION');
  }

  addEventListener(type, listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  trigger(type) {
    const event = {
      target: this,
      preventDefault() {}
    };
    (this.listeners[type] || []).forEach(listener => listener(event));
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  replaceChildren(...children) {
    this._textContent = '';
    this.children = [];
    this.append(...children);
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  getContext() {
    return this._canvasContext;
  }

  getBoundingClientRect() {
    let ancestor = this;
    while (ancestor) {
      if (ancestor.hidden) return { width: 0, height: 0 };
      ancestor = ancestor.parentNode;
    }
    return {
      width: Number.isFinite(this.width) && this.width > 0 ? this.width : 720,
      height: Number.isFinite(this.height) && this.height > 0 ? this.height : 320
    };
  }

  focus() {}

  click() {
    this.trigger('click');
  }

  descendants() {
    return this.children.flatMap(child => [child, ...child.descendants()]);
  }

  querySelectorAll(selector) {
    return this.descendants().filter(element => {
      if (selector === 'select[data-field]') {
        return element.tagName === 'SELECT' && element.dataset.field !== undefined;
      }
      return false;
    });
  }

  querySelector(selector) {
    if (selector === 'input[name="financial-treatment"]:checked') {
      return this.descendants().find(element => (
        element.tagName === 'INPUT'
        && element.attributes.name === 'financial-treatment'
        && element.checked
      )) || null;
    }
    return this.querySelectorAll(selector)[0] || null;
  }
}

function createDocument(clickedAnchors) {
  const tagsById = {
    'decision-canvas': 'section',
    'history-file': 'input',
    'paste-history-toggle': 'button',
    'paste-history-panel': 'section',
    'history-paste': 'textarea',
    'parse-pasted-history': 'button',
    'use-sample-data': 'button',
    'import-status': 'p',
    'correction-panel': 'section',
    'correction-findings': 'ul',
    'column-mapping': 'div',
    'financial-treatment': 'fieldset',
    'apply-corrections': 'button',
    'download-correction-guide': 'button',
    'replacement-warning': 'section',
    'confirm-replacement': 'button',
    'cancel-replacement': 'button',
    'readiness-panel': 'section',
    'readiness-summary': 'dl',
    'readiness-channel-rows': 'tbody',
    'plan-form': 'form',
    'total-budget': 'input',
    'plan-days': 'input',
    objective: 'select',
    'constraints-list': 'div',
    results: 'section',
    'results-note': 'p',
    'model-evidence': 'section',
    'model-evidence-title': 'h2',
    'model-evidence-charts': 'div',
    'model-inspector': 'details',
    'model-diagnostics-channels': 'div',
    'cleaned-history-head': 'thead',
    'cleaned-history-rows': 'tbody',
    'download-cleaned-data': 'button',
    'download-allocation': 'button',
    'recommendation-explanation': 'section',
    'explanation-confidence': 'dd',
    'explanation-driver': 'dd',
    'explanation-caveat': 'dd'
  };
  const elements = Object.fromEntries(
    Object.entries(tagsById).map(([id, tag]) => [id, new FakeElement(tag, id)])
  );
  [
    'paste-history-panel',
    'correction-panel',
    'financial-treatment',
    'apply-corrections',
    'replacement-warning',
    'readiness-panel',
    'plan-form',
    'results',
    'model-evidence',
    'model-inspector',
    'recommendation-explanation'
  ].forEach(id => { elements[id].hidden = true; });
  elements['paste-history-toggle'].setAttribute('aria-expanded', 'false');
  elements['results-note'].textContent = 'Choose a budget and horizon to build the plan.';
  elements['plan-days'].value = '30';
  elements['model-evidence'].appendChild(elements['model-evidence-charts']);
  [
    ['financial-before', 'before_marketing'],
    ['financial-after', 'after_marketing']
  ].forEach(([id, value]) => {
    const input = new FakeElement('input', id);
    input.setAttribute('name', 'financial-treatment');
    input.value = value;
    elements['financial-treatment'].appendChild(input);
  });

  return {
    readyState: 'complete',
    documentElement: new FakeElement('html', 'html'),
    body: new FakeElement('body', 'body'),
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tagName) {
      const element = new FakeElement(tagName);
      if (String(tagName).toLowerCase() === 'a') {
        element.click = function clickDownloadAnchor() {
          clickedAnchors.push({
            href: element.href,
            download: element.download
          });
          element.trigger('click');
        };
      }
      return element;
    },
    elements
  };
}

function loadDomApp(options) {
  const settings = options || {};
  const clickedAnchors = [];
  const document = createDocument(clickedAnchors);
  const events = [];
  const createdBlobs = new Map();
  const activeObjectUrls = new Set();
  const revokedObjectUrls = [];
  let nextObjectUrl = 1;
  const chartCalls = {
    allocation: [],
    outcome: [],
    response: [],
    marginal: []
  };
  const chartApi = {
    drawAllocationChart(canvas, rows, unit) {
      chartCalls.allocation.push({
        canvas,
        rows,
        unit,
        visible: document.elements.results.hidden === false
      });
    },
    drawOutcomeComparisonChart(canvas, comparison, options) {
      chartCalls.outcome.push({
        canvas,
        comparison,
        options,
        visible: document.elements.results.hidden === false
      });
    },
    drawResponseCurve(...args) {
      chartCalls.response.push(args);
    },
    drawMarginalEfficiencyChart(...args) {
      chartCalls.marginal.push(args);
    }
  };
  const windowListeners = {};
  const pendingTimers = new Map();
  const timerDelays = [];
  let nextTimer = 1;
  const motion = {
    resetCount: 0,
    revealSnapshots: [],
    revealResult(element) {
      this.revealSnapshots.push(element.textContent);
      element.dataset.resultState = 'ready';
    },
    resetResult(element) {
      this.resetCount += 1;
      delete element.dataset.resultState;
    }
  };
  const window = {
    document,
    Blob: class FakeBlob {
      constructor(parts, options) {
        this.parts = Array.from(parts);
        this.type = options && options.type;
        this.text = this.parts.join('');
      }
    },
    URL: {
      createObjectURL(blob) {
        const url = `blob:budget-test-${nextObjectUrl}`;
        nextObjectUrl += 1;
        createdBlobs.set(url, blob);
        activeObjectUrls.add(url);
        return url;
      },
      revokeObjectURL(url) {
        revokedObjectUrls.push(url);
        activeObjectUrls.delete(url);
      }
    },
    MangroveMotion: motion,
    MangroveCharts: settings.withoutCharts ? {} : chartApi,
    MangroveToolExtras: {
      trackProductEvent(name, metadata) {
        events.push({ name, metadata });
      }
    },
    addEventListener(type, listener) {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(listener);
    },
    trigger(type) {
      (windowListeners[type] || []).forEach(listener => listener());
    },
    setTimeout(callback, delay) {
      const id = nextTimer;
      nextTimer += 1;
      pendingTimers.set(id, callback);
      timerDelays.push(delay);
      return id;
    },
    clearTimeout(id) {
      pendingTimers.delete(id);
    }
  };
  const domContext = {
    window,
    document,
    getComputedStyle() {
      return {
        getPropertyValue() {
          return '';
        }
      };
    }
  };
  vm.createContext(domContext);
  const scripts = [
    'shared/history-data.js',
    'shared/marginality-engine.js',
    'shared/budget-allocator.js',
    'shared/budget-sample-data.js'
  ];
  if (settings.withRealCharts) scripts.push('shared/charts.js');
  scripts.push(
    'analytics/budget/app.js'
  );
  scripts.forEach(relativePath => {
    vm.runInContext(
      fs.readFileSync(path.join(root, relativePath), 'utf8'),
      domContext
    );
  });
  return {
    window,
    elements: document.elements,
    motion,
    events,
    chartCalls,
    downloads: {
      clickedAnchors,
      createdBlobs,
      activeObjectUrls,
      revokedObjectUrls,
      latest() {
        const anchor = clickedAnchors.at(-1);
        return anchor
          ? { ...anchor, blob: createdBlobs.get(anchor.href) }
          : null;
      }
    },
    timers: {
      delays: timerDelays,
      pendingCount() {
        return pendingTimers.size;
      },
      flush() {
        const callbacks = Array.from(pendingTimers.values());
        pendingTimers.clear();
        callbacks.forEach(callback => callback());
      }
    }
  };
}

function elementsByTag(element, tagName) {
  return element.descendants().filter(child => child.tagName === tagName.toUpperCase());
}

function elementByClass(element, className) {
  return element.descendants().find(child => (
    String(child.className).split(/\s+/).includes(className)
  ));
}

function elementsByClass(element, className) {
  return element.descendants().filter(child => (
    String(child.className).split(/\s+/).includes(className)
  ));
}

test('creates the exact empty decision state', () => {
  assert.deepEqual(plain(app.createState()), {
    phase: 'empty',
    importResult: null,
    analysis: null,
    selectedObjective: null,
    allocation: null,
    constraints: {},
    sourceKind: null,
    pendingImport: null
  });
});

test('derives empty, parsing, and correction phases before analysis', () => {
  assert.equal(app.derivePhase(app.createState()), 'empty');
  assert.equal(
    app.derivePhase({ ...app.createState(), phase: 'parsing' }),
    'parsing'
  );
  assert.equal(
    app.derivePhase({
      ...app.createState(),
      importResult: { ok: false, state: 'needs_correction' }
    }),
    'needs_correction'
  );
});

test('derives readiness phases from modeled and preserved channels', () => {
  assert.equal(
    app.derivePhase({
      ...app.createState(),
      importResult: { ok: true },
      analysis: analysisWith(['modelable', 'modelable'])
    }),
    'ready'
  );
  assert.equal(
    app.derivePhase({
      ...app.createState(),
      phase: 'parsing',
      importResult: { ok: true },
      analysis: {
        ok: true,
        models: {
          revenue: {
            channels: [
              { status: 'modelable' },
              { status: 'preserved' }
            ]
          }
        },
        recommendedObjective: 'revenue'
      }
    }),
    'partially_modelable'
  );
  assert.equal(
    app.derivePhase({
      ...app.createState(),
      importResult: { ok: true },
      analysis: analysisWith(['preserved', 'preserved'])
    }),
    'partially_modelable'
  );
});

test('a completed allocation derives the result phase', () => {
  assert.equal(
    app.derivePhase({
      ...app.createState(),
      importResult: { ok: true },
      analysis: analysisWith(['modelable']),
      allocation: { ok: true, allocation: [] }
    }),
    'result'
  );
});

test('an infeasible allocation derives the blocked phase', () => {
  assert.equal(
    app.derivePhase({
      ...app.createState(),
      importResult: { ok: true },
      analysis: analysisWith(['modelable']),
      allocation: { ok: false, code: 'minimums_exceed_budget' }
    }),
    'blocked'
  );
});

test('readiness view returns display values and controlled gate labels without raw rows', () => {
  const view = plain(app.readinessView(analysisWith(['modelable', 'preserved'])));

  assert.deepEqual(view, {
    completePeriods: 16,
    channelCount: 2,
    eligibleMetrics: ['Revenue', 'Conversions'],
    excludedRowCount: 2,
    modelableCount: 1,
    preservedCount: 1,
    channels: [
      {
        name: 'Channel 1',
        status: 'modelable',
        statusLabel: 'Modeled marginal response',
        failedGates: []
      },
      {
        name: 'Channel 2',
        status: 'preserved',
        statusLabel: 'Preserved from recent-period median',
        failedGates: [
          'Needs at least 12 complete periods',
          'Needs at least 20% robust spend variation'
        ]
      }
    ]
  });
  assert.doesNotMatch(JSON.stringify(view), /observations|private|raw row/);
});

test('constraint rows use array-index IDs and distinguish optional modeled bounds from preserved amount', () => {
  const rows = plain(app.constraintRows(planningModel(), {
    'Paid search <em>unsafe</em>': { minimum: 25, maximum: 450, excluded: false },
    'Local partnerships': { minimum: 100, maximum: null, excluded: true }
  }));

  assert.deepEqual(rows, [
    {
      channel: 'Paid search <em>unsafe</em>',
      status: 'modelable',
      statusLabel: 'Modeled',
      minimum: { id: 'constraint-minimum-0', value: 25 },
      maximum: { id: 'constraint-maximum-0', value: 450 },
      preserved: null,
      excluded: { id: 'constraint-excluded-0', value: false }
    },
    {
      channel: 'Local partnerships',
      status: 'preserved',
      statusLabel: 'Preserved',
      minimum: null,
      maximum: null,
      preserved: { id: 'constraint-preserved-1', value: 100 },
      excluded: { id: 'constraint-excluded-1', value: true }
    }
  ]);
  assert.doesNotMatch(rows.map(row => [
    row.minimum && row.minimum.id,
    row.maximum && row.maximum.id,
    row.preserved && row.preserved.id,
    row.excluded.id
  ]).join(' '), /Paid search|Local partnerships|unsafe/);
  assert.doesNotMatch(JSON.stringify(rows[1]), /fit/i);
});

test('allocator failures map to exact controlled next actions', () => {
  const cases = [
    [
      'minimums_exceed_budget',
      'Preserved and minimum allocations exceed this budget. Increase the budget or lower the listed constraints.'
    ],
    [
      'maximums_below_budget',
      'Channel maximums leave part of this budget unassigned. Raise a maximum or lower the total budget.'
    ],
    [
      'no_defensible_remainder',
      'No modeled channel can accept the remaining budget. Add spend variation or change an explicit constraint.'
    ],
    [
      'invalid_input',
      'Enter a positive budget and planning window.'
    ],
    [
      'currency_reconciliation_failed',
      'The plan cannot be reconciled to currency cents under the current constraints.'
    ],
    [
      'prediction_overflow',
      'The modeled outcome is too large to calculate safely. Review the imported values or choose a shorter planning window.'
    ]
  ];

  cases.forEach(([code, message]) => {
    assert.deepEqual(plain(app.resultView(planningModel(), {
      ok: false,
      code,
      message: 'Uncontrolled allocator detail',
      conflicts: ['Paid search <em>unsafe</em>']
    })), {
      state: 'blocked',
      message,
      conflicts: ['Paid search <em>unsafe</em>'],
      minimumBudget: null,
      maximumBudget: null
    });
  });
});

test('allocator failures retain structured feasible-budget boundaries', () => {
  assert.deepEqual(plain(app.resultView(planningModel(), {
    ok: false,
    code: 'maximums_below_budget',
    message: 'Uncontrolled allocator detail',
    conflicts: ['Paid search <em>unsafe</em>'],
    minimumBudget: 100,
    maximumBudget: 40000
  })), {
    state: 'blocked',
    message: 'Channel maximums leave part of this budget unassigned. Raise a maximum or lower the total budget.',
    conflicts: ['Paid search <em>unsafe</em>'],
    minimumBudget: 100,
    maximumBudget: 40000
  });
});

test('result view uses observational modeled-marginal copy without confidence claims or raw rows', () => {
  const view = plain(app.resultView(
    planningModel(),
    successfulAllocation('revenue')
  ));
  const text = JSON.stringify(view);
  const preserved = view.rows.find(row => row.status === 'Preserved');

  assert.equal(view.state, 'result');
  assert.equal(view.summary[3].label, 'Predicted modeled-channel Revenue');
  assert.match(view.outcomeScope, /whole-plan predicted Revenue is unavailable/i);
  assert.equal(view.marginalMetricLabel, 'Marginal ROAS');
  assert.match(text, /observational/i);
  assert.match(text, /modeled marginal/i);
  assert.doesNotMatch(text, /confidence|certainty|accuracy/i);
  assert.doesNotMatch(text, /normalizedRawRow|must not enter a view model|observations/);
  assert.equal(preserved.evidence, 'Preserved');
  assert.equal(preserved.marginalMetric, '—');
  assert.doesNotMatch(JSON.stringify(preserved), /fit/i);
});

test('result view projects a controlled Plan value comparison without imported evidence', () => {
  const view = plain(app.resultView(planningModel(), successfulAllocation('revenue')));

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
  assert.doesNotMatch(
    JSON.stringify(view.valueVisualization),
    /observations|normalizedRawRow|diagnostics|Uncontrolled allocator detail/
  );
});

test('Plan value outcome preserves units, zero baselines, and non-positive changes', () => {
  const conversionView = plain(app.resultView(
    planningModel({ key: 'conversions', label: 'Conversions', costTreatment: null }),
    successfulAllocation('conversions')
  ));
  const zeroBaseline = successfulAllocation('revenue', {
    totals: Object.assign({}, successfulAllocation('revenue').totals, {
      currentPredictedOutcome: 0,
      predictedOutcome: 1200
    })
  });
  const flatBaseline = successfulAllocation('financial', {
    totals: Object.assign({}, successfulAllocation('financial').totals, {
      currentPredictedOutcome: 900,
      predictedOutcome: 900
    })
  });
  const negativeBaseline = successfulAllocation('revenue', {
    totals: Object.assign({}, successfulAllocation('revenue').totals, {
      currentPredictedOutcome: 900,
      predictedOutcome: 600
    })
  });

  assert.equal(conversionView.valueVisualization.outcome.unit, '');
  assert.equal(conversionView.valueVisualization.outcome.currentValue, 20);
  assert.equal(conversionView.valueVisualization.outcome.recommendedValue, 32);
  assert.equal(
    plain(app.resultView(planningModel(), zeroBaseline)).valueVisualization.outcome.percentageDifference,
    null
  );
  assert.equal(
    plain(app.resultView(
      planningModel({ key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' }),
      flatBaseline
    )).valueVisualization.outcome.unit,
    '$'
  );
  assert.equal(
    plain(app.resultView(
      planningModel({ key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' }),
      flatBaseline
    )).valueVisualization.outcome.absoluteDifference,
    0
  );
  assert.equal(
    plain(app.resultView(planningModel(), negativeBaseline)).valueVisualization.outcome.absoluteDifference,
    -300
  );
});

test('Plan value counts excluded rows by model support and keeps their allocation status', () => {
  const allocation = successfulAllocation('revenue');
  allocation.allocation[0] = Object.assign({}, allocation.allocation[0], { constraint: 'excluded' });
  allocation.allocation[1] = Object.assign({}, allocation.allocation[1], { constraint: 'excluded' });
  const view = plain(app.resultView(planningModel(), allocation));

  assert.deepEqual(
    view.valueVisualization.allocation.rows.map(row => row.status),
    ['excluded', 'excluded']
  );
  assert.equal(view.valueVisualization.outcome.modeledCount, 1);
  assert.equal(view.valueVisualization.outcome.unscoredCount, 1);
});

test('Plan value reports a controlled not-estimable outcome when no curve was admitted', () => {
  const allocation = successfulAllocation('revenue', {
    allocation: [Object.assign({}, successfulAllocation('revenue').allocation[1], {
      constraint: 'preserved'
    })],
    totals: Object.assign({}, successfulAllocation('revenue').totals, {
      currentPredictedOutcome: null,
      predictedOutcome: null
    })
  });
  const view = plain(app.resultView(planningModel(null, ['preserved']), allocation));

  assert.equal(view.valueVisualization.outcome.state, 'not_estimable');
  assert.equal(
    view.valueVisualization.outcome.message,
    'Modeled outcome comparison is unavailable because no channel has an admitted response curve.'
  );
});

test('fixed plan with zero modeled rows marks the modeled outcome summary unavailable', () => {
  // This catches allocator-shaped zero totals being presented as a modeled $0 prediction.
  const allocation = successfulAllocation('revenue', {
    allocation: [{
      channel: 'Paid search <em>unsafe</em>',
      status: 'preserved',
      currentSpend: 200,
      recommendedSpend: 180,
      recommendedSpendRate: 90,
      currentPredictedOutcome: null,
      predictedOutcome: null,
      marginalMetric: null,
      constraint: 'preserved'
    }],
    totals: {
      requestedBudget: 180,
      allocatedBudget: 180,
      optimizedBudget: 0,
      preservedBudget: 180,
      currentPredictedOutcome: 0,
      predictedOutcome: 0
    }
  });
  const view = plain(app.resultView(planningModel(null, ['preserved']), allocation));
  const predictedSummary = view.summary.find(item => item.label === 'Predicted modeled-channel Revenue');

  assert.equal(view.valueVisualization.outcome.state, 'not_estimable');
  assert.equal(predictedSummary.value, 'Unavailable');
});

test('fixed plan DOM omits empty modeled-outcome details', () => {
  // This catches the not-estimable state leaving an empty definition list in the accessibility tree.
  const { elements } = loadDomApp();
  const lines = ['period,channel,spend,conversions'];
  for (let week = 1; week <= 12; week += 1) {
    lines.push(`2024-W${String(week).padStart(2, '0')},Local partnerships,100,10`);
  }
  elements['history-paste'].value = lines.join('\n');
  elements['parse-pasted-history'].trigger('click');
  elements['total-budget'].value = '428.57';
  elements['plan-form'].trigger('submit');

  const details = elementByClass(elements.results, 'result-details');
  const summary = elementByClass(details, 'result-summary');
  const predictedWrapper = summary.children.find(wrapper => (
    wrapper.children[0] && wrapper.children[0].textContent === 'Predicted modeled-channel Conversions'
  ));
  const outcomePanel = elementByClass(details, 'outcome-comparison');
  assert.equal(elementsByTag(outcomePanel, 'dl').length, 0, 'not-estimable state should not render an empty details list');
  assert.equal(predictedWrapper.children[1].textContent, 'Unavailable');
  assert.match(
    outcomePanel.textContent,
    /Modeled outcome comparison is unavailable because no channel has an admitted response curve\./
  );
});

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

test('model evidence labels an excluded unsupported channel without fitting a curve', () => {
  const allocation = successfulAllocation('revenue');
  allocation.allocation[1] = Object.assign({}, allocation.allocation[1], {
    constraint: 'excluded',
    recommendedSpend: 0,
    recommendedSpendRate: 0
  });

  const view = plain(app.modelEvidenceView(planningModel(), allocation));
  const excluded = view.channels[1];

  assert.equal(excluded.status, 'excluded');
  assert.equal(excluded.statusLabel, 'Excluded');
  assert.equal(excluded.positions.recommendedSpendRate, 0);
  assert.equal(excluded.chartChannel.curve, null);
  assert.match(excluded.summary, /Excluded from this plan/);
  assert.doesNotMatch(excluded.summary, /preserved/i);
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

test('result view assigns the objective-specific marginal metric label', () => {
  const cases = [
    [
      { key: 'conversions', label: 'Conversions', costTreatment: null },
      'Marginal CPA'
    ],
    [
      { key: 'revenue', label: 'Revenue', costTreatment: null },
      'Marginal ROAS'
    ],
    [
      { key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' },
      'Marginal ROI'
    ]
  ];

  cases.forEach(([metric, label]) => {
    const view = app.resultView(
      planningModel(metric),
      successfulAllocation(metric.key)
    );
    assert.equal(view.marginalMetricLabel, label);
    assert.match(view.rows[0].marginalMetric, new RegExp(label, 'i'));
  });
});

test('before-marketing financial result states that marketing spend was subtracted', () => {
  const view = plain(app.resultView(
    planningModel({
      key: 'financial',
      label: 'Contribution',
      costTreatment: 'before_marketing'
    }),
    successfulAllocation('financial')
  ));

  assert.match(view.financialTreatment, /marketing spend was subtracted/i);
  assert.match(view.financialTreatment, /Contribution/);
  assert.equal(view.marginalMetricLabel, 'Marginal ROI');
});

test('missing outcome presents explicit source and semantic mapping without guessing', () => {
  const { elements } = loadDomApp();
  const lines = ['period,channel,spend,purchases'];
  for (let week = 1; week <= 12; week += 1) {
    const spend = week * 100;
    lines.push(
      `2024-W${String(week).padStart(2, '0')},Search,${spend},`
      + Number((2 * Math.pow(spend, 0.6)).toFixed(6))
    );
  }
  elements['history-paste'].value = lines.join('\n');

  elements['parse-pasted-history'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'needs_correction');
  const selects = elements['column-mapping'].querySelectorAll('select[data-field]');
  const sourceSelect = selects.find(select => select.dataset.field === 'outcomeSource');
  const typeSelect = selects.find(select => select.dataset.field === 'outcomeType');
  assert.ok(sourceSelect);
  assert.ok(typeSelect);
  assert.equal(sourceSelect.value, '');
  assert.equal(typeSelect.value, '');
  assert.ok(sourceSelect.options.some(option => option.textContent === 'purchases'));
  assert.deepEqual(
    typeSelect.options.slice(1).map(option => option.textContent),
    ['Conversions', 'Revenue', 'Financial outcome']
  );

  elements['apply-corrections'].trigger('click');
  assert.equal(
    elements['import-status'].textContent,
    'Choose every required mapping before applying corrections.'
  );

  sourceSelect.value = 'purchases';
  typeSelect.value = 'conversions';
  elements['apply-corrections'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'ready');
  assert.deepEqual(
    elements.objective.options.map(option => option.textContent),
    ['Conversions']
  );
  assert.match(elements['cleaned-history-head'].textContent, /Conversions/);
});

test('ambiguous known outcome aliases render one usable semantic mapping control', () => {
  const { elements } = loadDomApp();
  const lines = ['period,channel,spend,orders,leads'];
  for (let week = 1; week <= 12; week += 1) {
    const spend = week * 100;
    const outcome = Number((2 * Math.pow(spend, 0.6)).toFixed(6));
    lines.push(
      `2024-W${String(week).padStart(2, '0')},Search,${spend},${outcome},${outcome}`
    );
  }
  elements['history-paste'].value = lines.join('\n');

  elements['parse-pasted-history'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'needs_correction');
  const selects = elements['column-mapping'].querySelectorAll('select[data-field]');
  assert.deepEqual(selects.map(select => select.dataset.field), ['conversions']);
  assert.ok(selects[0].options.some(option => option.textContent === 'orders'));
  assert.ok(selects[0].options.some(option => option.textContent === 'leads'));

  selects[0].value = 'orders';
  elements['apply-corrections'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'ready');
  assert.deepEqual(
    elements.objective.options.map(option => option.textContent),
    ['Conversions']
  );
});

test('explicit financial mapping retains its source identity through treatment and explanation', () => {
  const { elements, events } = loadDomApp();
  const sourceHeader = 'gross margin dollars';
  const lines = [`period,channel,spend,${sourceHeader}`];
  for (let week = 1; week <= 12; week += 1) {
    const spend = week * 100;
    lines.push(
      `2024-W${String(week).padStart(2, '0')},Search,${spend},`
      + Number((2 * Math.pow(spend, 0.6)).toFixed(6))
    );
  }
  elements['history-paste'].value = lines.join('\n');

  elements['parse-pasted-history'].trigger('click');
  let selects = elements['column-mapping'].querySelectorAll('select[data-field]');
  selects.find(select => select.dataset.field === 'outcomeSource').value = sourceHeader;
  selects.find(select => select.dataset.field === 'outcomeType').value = 'financial';
  elements['apply-corrections'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'needs_correction');
  assert.equal(elements['financial-treatment'].hidden, false);
  selects = elements['column-mapping'].querySelectorAll('select[data-field]');
  assert.equal(selects.length, 0);
  const afterMarketing = elements['financial-treatment'].descendants()
    .find(input => input.value === 'after_marketing');
  afterMarketing.checked = true;
  elements['apply-corrections'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'ready');
  assert.deepEqual(
    elements.objective.options.map(option => option.textContent),
    [sourceHeader]
  );
  elements['total-budget'].value = '2000';
  elements['plan-form'].trigger('submit');
  assert.match(elements.results.textContent, new RegExp(sourceHeader));
  assert.match(elements.results.textContent, /already after marketing spend/i);
  assert.doesNotMatch(JSON.stringify(events), new RegExp(sourceHeader));
});

test('replacement financial history requires a fresh cost-treatment choice', () => {
  const { elements } = loadDomApp();
  const financialSource = [
    'period,channel,spend,profit',
    '2024-W01,Search,100,20'
  ].join('\n');
  elements['history-paste'].value = financialSource;
  elements['parse-pasted-history'].trigger('click');
  const afterMarketing = elements['financial-treatment'].descendants()
    .find(input => input.value === 'after_marketing');
  afterMarketing.checked = true;
  elements['apply-corrections'].trigger('click');
  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');

  elements['history-paste'].value = financialSource;
  elements['parse-pasted-history'].trigger('click');
  elements['confirm-replacement'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'needs_correction');
  assert.equal(
    elements['financial-treatment'].querySelector('input[name="financial-treatment"]:checked'),
    null
  );
  elements['apply-corrections'].trigger('click');
  assert.equal(elements['decision-canvas'].dataset.phase, 'needs_correction');
  assert.equal(
    elements['import-status'].textContent,
    'Choose every required mapping before applying corrections.'
  );
});

test('a sub-cadence horizon adds a timing caveat', () => {
  const view = plain(app.resultView(
    planningModel(),
    successfulAllocation('revenue', { horizonFactor: 0.5 })
  ));

  assert.match(view.timingCaveat, /shorter than the weekly history cadence/i);
  assert.match(view.caveat, /timing/i);
});

test('negative allocation changes place the sign before the currency symbol', () => {
  const allocation = successfulAllocation('revenue');
  allocation.allocation[0].currentSpend = 500;
  allocation.allocation[0].recommendedSpend = 400;
  const view = plain(app.resultView(planningModel(), allocation));

  assert.equal(view.rows[0].change, '-$100');
});

test('driver copy never describes a decrease as an increase', () => {
  const allocation = successfulAllocation('revenue');
  allocation.allocation[0].currentSpend = 500;
  allocation.allocation[0].recommendedSpend = 400;
  const view = plain(app.resultView(planningModel(), allocation));

  assert.equal(
    view.mainDriver,
    'No modeled channel receives a positive increase under the current constraints.'
  );
});

test('plan submission requires finite positive budget and days', () => {
  const { elements } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  const cases = [
    ['', '30'],
    ['0', '30'],
    ['-1', '30'],
    ['Infinity', '30'],
    ['500', ''],
    ['500', '0'],
    ['500', '-1'],
    ['500', 'NaN']
  ];

  cases.forEach(([budget, days]) => {
    elements['total-budget'].value = budget;
    elements['plan-days'].value = days;
    elements['plan-form'].trigger('submit');
    assert.equal(
      elements['import-status'].textContent,
      'Enter a positive budget and planning window.'
    );
    assert.equal(elements.results.hidden, true);
  });
});

test('advanced constraints need no user values beyond budget and days', () => {
  const { elements } = loadDomApp();

  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  const inputs = elementsByTag(elements['constraints-list'], 'input');
  assert.equal(inputs.length, 11);
  assert.equal(elements['decision-canvas'].dataset.phase, 'result');
  assert.equal(elements.results.hidden, false);
  assert.equal(
    elements['results-note'].textContent,
    'Allocation calculated for a 42-day decision horizon.'
  );
});

test('preserved-only histories expose a fixed plan and keep an infeasible remainder controlled', () => {
  const { elements } = loadDomApp();
  const lines = ['period,channel,spend,conversions'];
  for (let week = 1; week <= 12; week += 1) {
    lines.push(`2024-W${String(week).padStart(2, '0')},Local partnerships,100,10`);
  }
  elements['history-paste'].value = lines.join('\n');

  elements['parse-pasted-history'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');
  assert.equal(elements['plan-form'].hidden, false);
  elements['total-budget'].value = '428.57';
  elements['plan-form'].trigger('submit');
  assert.equal(elements['decision-canvas'].dataset.phase, 'result');
  assert.equal(elements.results.hidden, false);

  elements['total-budget'].value = '500';
  elements['plan-form'].trigger('submit');
  assert.equal(elements['decision-canvas'].dataset.phase, 'blocked');
  assert.match(
    elements.results.textContent,
    /No modeled channel can accept the remaining budget\. Add spend variation or change an explicit constraint\./
  );
});

test('advanced constraints use safe generated IDs and write exact channel-keyed allocator constraints', () => {
  const harness = loadDomApp();
  const { elements, window } = harness;
  elements['use-sample-data'].trigger('click');
  const inputs = elementsByTag(elements['constraints-list'], 'input');
  const ids = inputs.map(input => input.id);
  const preserved = inputs.find(input => input.id === 'constraint-preserved-1');
  const minimum = inputs.find(input => input.id === 'constraint-minimum-2');
  const maximum = inputs.find(input => input.id === 'constraint-maximum-2');
  const excluded = inputs.find(input => input.id === 'constraint-excluded-2');

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^constraint-(minimum|maximum|preserved|excluded)-\d+$/.test(id)));
  assert.equal(preserved.value, '5415');

  minimum.value = '2000';
  minimum.trigger('input');
  maximum.value = '20000';
  maximum.trigger('input');
  excluded.checked = true;
  excluded.trigger('change');

  let allocatorInput = null;
  const originalAllocate = window.MangroveBudgetAllocator.allocatePlan;
  window.MangroveBudgetAllocator.allocatePlan = input => {
    allocatorInput = input;
    return originalAllocate(input);
  };
  elements['plan-form'].trigger('submit');

  assert.deepEqual(plain(allocatorInput.constraints['Paid search']), {
    minimum: 2000,
    maximum: 20000,
    excluded: true
  });
  assert.equal(Object.prototype.hasOwnProperty.call(
    allocatorInput.constraints,
    'constraint-minimum-2'
  ), false);
});

test('objective changes select the cached model, rebuild constraints, and clear results with status', () => {
  const harness = loadDomApp();
  const { elements, window } = harness;
  elements['use-sample-data'].trigger('click');
  const priorFirstConstraint = elements['constraints-list'].children[0];
  elements['plan-form'].trigger('submit');
  assert.equal(elements.results.hidden, false);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 2);

  elements.objective.value = 'conversions';
  elements.objective.trigger('change');

  assert.equal(elements.results.hidden, true);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
  assert.notEqual(elements['constraints-list'].children[0], priorFirstConstraint);
  assert.equal(
    elements['import-status'].textContent,
    'Objective changed to Conversions. Review constraints before rebuilding the plan.'
  );

  let selectedObjective = null;
  const originalAllocate = window.MangroveBudgetAllocator.allocatePlan;
  window.MangroveBudgetAllocator.allocatePlan = input => {
    selectedObjective = input.model.objective;
    return originalAllocate(input);
  };
  elements['plan-form'].trigger('submit');
  assert.equal(selectedObjective, 'conversions');
});

test('successful result DOM is complete before reveal and charts inspect every channel', () => {
  const harness = loadDomApp();
  const { elements, motion, chartCalls, events } = harness;
  elements['use-sample-data'].trigger('click');
  elements['model-inspector'].open = true;
  elements['plan-form'].trigger('submit');

  const allocationTable = elementByClass(elements.results, 'allocation-table');
  const resultSummary = elementByClass(elements.results, 'result-summary');
  assert.match(resultSummary.textContent, /Requested budget/);
  assert.match(resultSummary.textContent, /Optimized budget/);
  assert.match(resultSummary.textContent, /Preserved budget/);
  assert.match(resultSummary.textContent, /Predicted modeled-channel Revenue/);
  assert.match(resultSummary.textContent, /whole-plan predicted Revenue is unavailable/i);
  assert.deepEqual(
    elementsByTag(allocationTable, 'th').map(header => header.textContent),
    [
      'Channel',
      'Evidence',
      'Current plan-rate spend',
      'Recommended',
      'Change',
      'Selected marginal metric',
      'Constraint'
    ]
  );
  assert.match(elements['explanation-confidence'].textContent, /modelable channel/i);
  assert.match(elements['explanation-driver'].textContent, /marginal ROAS/i);
  assert.match(elements['explanation-caveat'].textContent, /seasonality/i);
  assert.match(elements['explanation-caveat'].textContent, /bounded test to recheck/i);
  assert.doesNotMatch([
    elements['explanation-confidence'].textContent,
    elements['explanation-driver'].textContent,
    elements['explanation-caveat'].textContent
  ].join(' '), /confidence|certainty|accuracy/i);
  assert.equal(chartCalls.response.length, 4);
  assert.equal(chartCalls.marginal.length, 1);
  assert.ok(chartCalls.marginal[0][1].every(row => row.status === 'modelable'));
  assert.match(motion.revealSnapshots[0], /Requested budget/);
  assert.deepEqual(events.at(-1), {
    name: 'calculation_completed',
    metadata: { action: 'sample' }
  });
});

test('successful allocation builds an accessible Plan value block before reveal and paints it visibly', () => {
  const { elements, motion, chartCalls } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  const details = elementByClass(elements.results, 'result-details');
  const summary = elementByClass(details, 'result-summary');
  const planValue = elementByClass(details, 'plan-value');
  const table = elementByClass(details, 'table-scroll');
  const panels = elementsByClass(planValue, 'plan-value-panel');
  const canvases = elementsByTag(planValue, 'canvas');

  assert.ok(planValue);
  assert.ok(details.children.indexOf(summary) < details.children.indexOf(planValue));
  assert.ok(details.children.indexOf(planValue) < details.children.indexOf(table));
  assert.equal(panels.length, 2);
  assert.ok(String(panels[0].className).includes('allocation-comparison'));
  assert.ok(String(panels[1].className).includes('outcome-comparison'));
  assert.equal(canvases.length, 2);
  assert.equal(canvases[0].getAttribute('role'), 'img');
  assert.equal(
    canvases[0].getAttribute('aria-label'),
    'Current and plan allocation by channel'
  );
  assert.equal(canvases[1].getAttribute('role'), 'img');
  assert.match(canvases[1].getAttribute('aria-label'), /Current and recommended modeled-channel Revenue/i);
  assert.match(planValue.textContent, /Current/);
  assert.match(planValue.textContent, /Recommended/);
  assert.match(planValue.textContent, /Modeled difference/);
  assert.match(planValue.textContent, /%/);
  assert.match(planValue.textContent, /modeled channel/i);
  assert.match(planValue.textContent, /unscored channel/i);
  assert.match(planValue.textContent, /Preserved and excluded unsupported channels remain/i);
  assert.ok(chartCalls.allocation.every(call => call.visible));
  assert.ok(chartCalls.outcome.every(call => call.visible));
  assert.match(motion.revealSnapshots[0], /Plan value.*See what changes/);
});

test('Plan value identifies a distinct recent-median preserved baseline as not optimized', () => {
  // This catches the latest observed current spend and automatic preserved median being mislabeled as an optimizer move.
  const { elements, chartCalls } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  assert.match(elements['readiness-channel-rows'].textContent, /Preserved from recent-period median/);
  assert.equal(
    elements['import-status'].textContent,
    'History is ready. Unsupported channels will use a recent-period median preserved baseline.'
  );
  elements['plan-form'].trigger('submit');

  const planValue = elementByClass(elements.results, 'plan-value');
  const allocationPanel = elementByClass(planValue, 'allocation-comparison');
  const terms = elementsByTag(allocationPanel, 'dt').map(term => term.textContent);
  const preservedChartRow = chartCalls.allocation[0].rows.find(row => row.label === 'Local partnerships');

  assert.deepEqual(
    { current: preservedChartRow.current, plan: preservedChartRow.recommended },
    { current: 5460, plan: 5415 },
    'sample data should exercise distinct latest-observed and recent-median spends'
  );
  assert.ok(terms.includes('Current (latest observed rate) — Local partnerships'));
  assert.ok(terms.includes('Preserved plan baseline — Local partnerships'));
  assert.match(allocationPanel.textContent, /recent-period median/i);
  assert.match(allocationPanel.textContent, /not optimized/i);
  assert.doesNotMatch(allocationPanel.textContent, /Recommended — Local partnerships/);
});

test('Plan value uses the approved allocation heading and metric-specific outcome headings', () => {
  // This catches generic panel headings that hide what each comparison measures.
  const { elements } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  let planValue = elementByClass(elements.results, 'plan-value');
  assert.deepEqual(
    elementsByTag(planValue, 'h4').map(heading => heading.textContent),
    ['Where the budget moves', 'Modeled-channel expected revenue']
  );

  elements.objective.value = 'conversions';
  elements.objective.trigger('change');
  elements['plan-form'].trigger('submit');
  planValue = elementByClass(elements.results, 'plan-value');
  assert.deepEqual(
    elementsByTag(planValue, 'h4').map(heading => heading.textContent),
    ['Where the budget moves', 'Modeled-channel expected conversions']
  );
});

test('Plan value text remains when chart functions are unavailable and hides an unestimable outcome canvas', () => {
  const missingCharts = loadDomApp({ withoutCharts: true });
  missingCharts.elements['use-sample-data'].trigger('click');
  assert.doesNotThrow(() => missingCharts.elements['plan-form'].trigger('submit'));
  const readyPlanValue = elementByClass(missingCharts.elements.results, 'plan-value');
  assert.match(readyPlanValue.textContent, /Current.*Recommended.*Modeled difference/);

  const fixedPlan = loadDomApp();
  const { elements } = fixedPlan;
  const lines = ['period,channel,spend,conversions'];
  for (let week = 1; week <= 12; week += 1) {
    lines.push(`2024-W${String(week).padStart(2, '0')},Local partnerships,100,10`);
  }
  elements['history-paste'].value = lines.join('\n');
  elements['parse-pasted-history'].trigger('click');
  elements['total-budget'].value = '428.57';
  elements['plan-form'].trigger('submit');

  const fixedPlanValue = elementByClass(elements.results, 'plan-value');
  assert.equal(elementsByTag(fixedPlanValue, 'canvas').length, 1);
  assert.match(
    fixedPlanValue.textContent,
    /Modeled outcome comparison is unavailable because no channel has an admitted response curve\./
  );
});

test('product events contain only a controlled import action', () => {
  const { elements, events, window } = loadDomApp();
  const privatePaste = [
    'period,channel,spend,revenue',
    '2024-W01,Private channel,1234,5678'
  ].join('\n');
  elements['history-paste'].value = privatePaste;

  elements['parse-pasted-history'].trigger('click');
  elements['use-sample-data'].trigger('click');
  elements['confirm-replacement'].trigger('click');
  elements['plan-form'].trigger('submit');

  assert.ok(events.length >= 3);
  events.forEach(event => {
    assert.ok([
      'tool_started',
      'sample_data_used',
      'calculation_completed'
    ].includes(event.name));
    assert.deepEqual(Object.keys(event.metadata), ['action']);
    assert.ok(['upload', 'paste', 'sample'].includes(event.metadata.action));
  });
  assert.equal(
    events.filter(event => (
      event.name === 'tool_started' && event.metadata.action === 'paste'
    )).length,
    1
  );
  assert.equal(
    events.filter(event => (
      event.name === 'tool_started' && event.metadata.action === 'sample'
    )).length,
    1
  );
  assert.equal(
    events.filter(event => event.name === 'sample_data_used').length,
    1
  );
  assert.equal(
    events.filter(event => event.name === 'calculation_completed').length,
    1
  );
  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /Private channel|1234|5678|2024-W01/);
  assert.doesNotMatch(serialized, new RegExp(
    window.MangroveBudgetSampleData.text.split('\n')[1].split(',')[1]
  ));
});

test('replacement telemetry is emitted once only after the replacement is confirmed', () => {
  const { elements, events } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  assert.equal(events.length, 2);

  elements['use-sample-data'].trigger('click');
  assert.equal(events.length, 2);
  elements['cancel-replacement'].trigger('click');
  assert.equal(events.length, 2);

  elements['use-sample-data'].trigger('click');
  assert.equal(events.length, 2);
  elements['confirm-replacement'].trigger('click');

  assert.deepEqual(events.slice(2), [
    { name: 'sample_data_used', metadata: { action: 'sample' } },
    { name: 'tool_started', metadata: { action: 'sample' } }
  ]);
});

test('correction guidance is generated only on click with a fixed local filename', () => {
  const { elements, downloads } = loadDomApp();
  const privateValue = 'customer-secret-text';
  elements['history-paste'].value = [
    'period,channel,spend,conversions',
    `2026-W02,Paid search,${privateValue},28`
  ].join('\n');

  elements['parse-pasted-history'].trigger('click');

  assert.equal(downloads.createdBlobs.size, 0);
  elements['download-correction-guide'].trigger('click');
  const download = downloads.latest();
  assert.equal(download.download, 'mangrove-budget-correction-guide.txt');
  assert.equal(download.blob.type, 'text/plain;charset=utf-8');
  assert.match(download.blob.text, /Budget Advisor correction guide/);
  assert.doesNotMatch(download.blob.text, new RegExp(privateValue));
});

test('cleaned CSV is serialized only on click with a fixed local filename', () => {
  const { elements, downloads, window } = loadDomApp();
  let cleanCsvCalls = 0;
  const originalToCleanCsv = window.MangroveHistoryData.toCleanCsv;
  window.MangroveHistoryData.toCleanCsv = history => {
    cleanCsvCalls += 1;
    return originalToCleanCsv(history);
  };

  elements['use-sample-data'].trigger('click');

  assert.equal(cleanCsvCalls, 0);
  assert.equal(downloads.createdBlobs.size, 0);
  elements['download-cleaned-data'].trigger('click');
  const download = downloads.latest();
  assert.equal(cleanCsvCalls, 1);
  assert.equal(download.download, 'mangrove-budget-cleaned-history.csv');
  assert.equal(download.blob.type, 'text/csv;charset=utf-8');
  assert.match(download.blob.text, /^period,channel,spend,conversions,revenue/m);
});

test('allocation JSON is projected only on click without raw observations or imported fields', () => {
  const { elements, downloads, window } = loadDomApp();
  const privateMarker = 'normalized-private-marker';
  const originalAllocate = window.MangroveBudgetAllocator.allocatePlan;
  window.MangroveBudgetAllocator.allocatePlan = input => {
    const result = originalAllocate(input);
    result.normalizedRawRows = [{ privateMarker }];
    result.allocation[0].importedField = privateMarker;
    return result;
  };

  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  assert.equal(downloads.createdBlobs.size, 0);
  elements['download-allocation'].trigger('click');
  const download = downloads.latest();
  assert.equal(download.download, 'mangrove-budget-allocation.json');
  assert.equal(download.blob.type, 'application/json;charset=utf-8');
  const payload = JSON.parse(download.blob.text);
  assert.deepEqual(Object.keys(payload), [
    'version',
    'objective',
    'allocation',
    'modelDiagnostics'
  ]);
  assert.equal(payload.version, 1);
  assert.equal(payload.objective.key, 'revenue');
  assert.ok(payload.allocation.rows.length > 0);
  assert.ok(payload.modelDiagnostics.length > 0);
  assert.doesNotMatch(
    download.blob.text,
    /observations|periodKey|dimensions|normalizedRawRows|importedField|normalized-private-marker/
  );
});

test('successful allocation reveals and paints every channel without opening diagnostics', () => {
  const { elements, chartCalls } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  assert.equal(elements['model-evidence'].hidden, false);
  assert.equal(elements['model-inspector'].open, false);
  assert.equal(chartCalls.response.length, 4);
  assert.equal(chartCalls.marginal.length, 1);
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

test('initial evidence paint measures visible canvas geometry', () => {
  const { elements } = loadDomApp({ withRealCharts: true });
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  assert.equal(elements['model-evidence'].hidden, false);
  const planValue = elementByClass(elements.results, 'plan-value');
  const planCanvases = elementsByTag(planValue, 'canvas');
  assert.equal(planCanvases.length, 2);
  planCanvases.forEach(canvas => {
    const firstPaint = canvas._canvasContext.clearRects[0];
    assert.ok(firstPaint[2] > 0, 'expected nonzero Plan value canvas width on initial paint');
    assert.ok(firstPaint[3] > 0, 'expected nonzero Plan value canvas height on initial paint');
  });
  const canvases = elementsByTag(elements['model-evidence-charts'], 'canvas');
  assert.equal(canvases.length, 5);
  canvases.forEach(canvas => {
    assert.ok(canvas._canvasContext.clearRects.length > 0);
    const firstPaint = canvas._canvasContext.clearRects[0];
    assert.ok(firstPaint[2] > 0, 'expected nonzero canvas width on initial paint');
    assert.ok(firstPaint[3] > 0, 'expected nonzero canvas height on initial paint');
  });
});

test('missing chart functions preserve textual evidence without throwing', () => {
  const { elements } = loadDomApp({ withoutCharts: true });
  elements['use-sample-data'].trigger('click');
  assert.doesNotThrow(() => elements['plan-form'].trigger('submit'));
  assert.equal(elements['model-evidence'].hidden, false);
  assert.match(elements['model-evidence-charts'].textContent, /Modeled|Preserved/);
});

test('model evidence exposes fitted treatment, marker positions, and in-sample fit as text', () => {
  const { elements } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');

  const modelableInspector = elementsByClass(
    elements['model-evidence-charts'],
    'evidence-card'
  )[0];
  assert.match(modelableInspector.textContent, /Fitted treatment.*diminishing-return curve/i);
  assert.match(modelableInspector.textContent, /Current spend rate.*\$1,550.*weekly period/i);
  assert.match(modelableInspector.textContent, /Recommended spend rate.*\$[\d,.]+.*weekly period/i);
  assert.match(modelableInspector.textContent, /In-sample log-space fit \(R²\)/i);
  assert.doesNotMatch(modelableInspector.textContent, /confidence|certainty|accuracy/i);
});

test('narrow inspector marker text stacks without an intrinsic two-column minimum', () => {
  assert.match(
    styles,
    /@media \(max-width: 600px\)[\s\S]*?\.channel-inspector-positions div\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/
  );
});

test('Plan value stays stacked with compact text and no intrinsic width on narrow screens', () => {
  assert.match(styles, /\.plan-value\s*\{[\s\S]*?min-width:\s*0[\s\S]*?border-block:\s*1px solid var\(--line\)/);
  assert.match(styles, /\.plan-value-stack\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /\.plan-value-panel canvas\s*\{[\s\S]*?width:\s*100%[\s\S]*?height:\s*300px/);
  assert.match(styles, /\.outcome-comparison canvas\s*\{[\s\S]*?height:\s*220px/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*?\.plan-value-panel\s*\{[\s\S]*?padding:\s*var\(--space-sm\)/);
});

test('Plan value keeps a long imported channel label wrap-safe on narrow screens', () => {
  const { elements, window } = loadDomApp();
  const channel = 'SearchChannelWithoutBreaks'.repeat(8);
  elements['history-paste'].value = window.MangroveBudgetSampleData.text
    .split('Paid search')
    .join(channel);
  elements['parse-pasted-history'].trigger('click');
  elements['total-budget'].value = '72000';
  elements['plan-days'].value = '42';
  elements['plan-form'].trigger('submit');

  const planValue = elementByClass(elements.results, 'plan-value');
  const channelTerms = elementsByTag(planValue, 'dt');
  assert.ok(channelTerms.some(term => term.textContent.includes(channel)));
  assert.match(
    styles,
    /\.plan-value-text dt\s*\{[^}]*overflow-wrap:\s*anywhere/
  );
});

test('conversion efficiency chart uses an increasing-is-better metric instead of raw CPA', () => {
  const { elements, chartCalls } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements.objective.value = 'conversions';
  elements.objective.trigger('change');
  elements['plan-form'].trigger('submit');

  const [canvas, rows, options] = chartCalls.marginal[0];
  assert.equal(canvas.tagName, 'CANVAS');
  assert.equal(options.marginalLabel, 'Marginal conversions per dollar (higher is better)');
  assert.ok(rows.every(row => (
    row.marginalMetric.key === 'marginal_conversions_per_dollar'
    && row.marginalMetric.value > 0
  )));
});

test('editing budget or constraints clears a stale result before rebuilding', () => {
  const { elements } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');
  assert.equal(elements.results.hidden, false);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 2);

  elements['total-budget'].value = '20000';
  elements['total-budget'].trigger('input');
  assert.equal(elements.results.hidden, true);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
  assert.equal(elements['model-evidence'].hidden, true);
  assert.equal(elements['model-evidence-charts'].children.length, 0);
  assert.match(elements['import-status'].textContent, /Budget changed.*rebuild/i);

  elements['plan-form'].trigger('submit');
  assert.equal(elements.results.hidden, false);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 2);
  const minimum = elementsByTag(elements['constraints-list'], 'input')
    .find(input => input.id === 'constraint-minimum-2');
  minimum.value = '1000';
  minimum.trigger('input');
  assert.equal(elements.results.hidden, true);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
  assert.equal(elements['model-evidence'].hidden, true);
  assert.equal(elements['model-evidence-charts'].children.length, 0);
  assert.match(elements['import-status'].textContent, /Constraint changed.*rebuild/i);
});

test('editing plan days clears allocation evidence on native input before change', () => {
  const { elements } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');
  assert.equal(elements.results.hidden, false);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 2);
  assert.equal(elements['model-evidence'].hidden, false);

  elements['plan-days'].value = '21';
  elements['plan-days'].trigger('input');

  assert.equal(elements.results.hidden, true);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
  assert.equal(elements['model-evidence'].hidden, true);
  assert.equal(elements['model-evidence-charts'].children.length, 0);
  assert.match(elements['import-status'].textContent, /Planning window changed.*rebuild/i);
});

test('blocked result renders the allocator feasible-budget boundaries', () => {
  const { elements, window } = loadDomApp();
  elements['use-sample-data'].trigger('click');
  window.MangroveBudgetAllocator.allocatePlan = () => ({
    ok: false,
    code: 'maximums_below_budget',
    message: 'Uncontrolled allocator detail',
    conflicts: ['Paid search'],
    minimumBudget: 100,
    maximumBudget: 40000
  });

  elements['plan-form'].trigger('submit');

  assert.match(elements.results.textContent, /Minimum feasible budget\$100/);
  assert.match(elements.results.textContent, /Maximum feasible budget\$40,000/);
  assert.match(
    elements.results.textContent,
    /Channel maximums leave part of this budget unassigned/
  );
  assert.doesNotMatch(elements.results.textContent, /Uncontrolled allocator detail/);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
});

test('Plan value and evidence charts debounce resize once and replacement cancels the pending repaint', () => {
  const harness = loadDomApp();
  const { elements, window, chartCalls, timers } = harness;
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');
  const initialResponses = chartCalls.response.length;
  const initialMarginals = chartCalls.marginal.length;
  const initialAllocations = chartCalls.allocation.length;
  const initialOutcomes = chartCalls.outcome.length;

  assert.equal(initialResponses, 4);
  assert.equal(initialMarginals, 1);
  elements['model-inspector'].open = true;
  elements['model-inspector'].trigger('toggle');
  assert.equal(chartCalls.response.length, initialResponses);
  assert.equal(chartCalls.marginal.length, initialMarginals);
  assert.equal(chartCalls.allocation.length, initialAllocations);
  assert.equal(chartCalls.outcome.length, initialOutcomes);

  window.trigger('resize');
  assert.equal(timers.pendingCount(), 1);
  assert.equal(timers.delays.at(-1), 150);
  timers.flush();
  assert.equal(chartCalls.response.length, initialResponses + 4);
  assert.equal(chartCalls.marginal.length, initialMarginals + 1);
  assert.equal(chartCalls.allocation.length, initialAllocations + 1);
  assert.equal(chartCalls.outcome.length, initialOutcomes + 1);

  window.trigger('resize');
  window.trigger('resize');
  assert.equal(timers.pendingCount(), 1);
  assert.deepEqual(timers.delays.slice(-2), [150, 150]);
  elements['use-sample-data'].trigger('click');
  elements['confirm-replacement'].trigger('click');
  assert.equal(timers.pendingCount(), 0);
});

test('confirmed replacement clears prior UI, object URLs, and timers before reading the next source', () => {
  const harness = loadDomApp();
  const { elements, window, downloads, timers } = harness;
  elements['use-sample-data'].trigger('click');
  elements['model-inspector'].open = true;
  elements['plan-form'].trigger('submit');
  elements['download-cleaned-data'].trigger('click');
  elements['download-allocation'].trigger('click');
  window.trigger('resize');
  const priorUrls = Array.from(downloads.activeObjectUrls);
  let replacementSnapshot = null;
  let inspections = 0;
  const originalInspect = window.MangroveHistoryData.inspectHistory;
  window.MangroveHistoryData.inspectHistory = function inspectReplacement(...args) {
    inspections += 1;
    if (inspections === 1) {
      replacementSnapshot = {
        resultsHidden: elements.results.hidden,
        resultText: elements.results.textContent,
        planValueCanvases: elementsByTag(elements.results, 'canvas').length,
        constraintCount: elements['constraints-list'].children.length,
        readinessCount: elements['readiness-summary'].children.length,
        activeUrls: downloads.activeObjectUrls.size,
        pendingTimers: timers.pendingCount()
      };
    }
    return originalInspect(...args);
  };

  elements['use-sample-data'].trigger('click');
  elements['confirm-replacement'].trigger('click');

  assert.deepEqual(replacementSnapshot, {
    resultsHidden: true,
    resultText: '',
    planValueCanvases: 0,
    constraintCount: 0,
    readinessCount: 0,
    activeUrls: 0,
    pendingTimers: 0
  });
  assert.deepEqual(
    downloads.revokedObjectUrls.slice().sort(),
    priorUrls.slice().sort()
  );
  assert.equal(elements['history-paste'].value, '');
  assert.equal(elements['replacement-warning'].hidden, true);
});

test('imported channel and dimension strings remain text and never become IDs', () => {
  const { elements } = loadDomApp();
  const channel = '<img src=x onerror=alert(1)>';
  const campaign = '<script>campaign</script>';
  const segment = '#audience';
  const lines = ['period,channel,spend,conversions,campaign,segment'];
  for (let week = 1; week <= 12; week += 1) {
    const spend = week * 100;
    lines.push(
      '2024-W' + String(week).padStart(2, '0') + ','
      + channel + ',' + spend + ',' + Math.round(Math.sqrt(spend) * 10) + ','
      + campaign + ',' + segment
    );
  }
  elements['history-paste'].value = lines.join('\n');

  elements['parse-pasted-history'].trigger('click');

  const cleanedText = elements['cleaned-history-rows'].textContent;
  const allIds = Object.values(elements)
    .concat(Object.values(elements).flatMap(element => element.descendants()))
    .map(element => element.id)
    .filter(Boolean);
  assert.match(cleanedText, /<img src=x onerror=alert\(1\)>/);
  assert.match(cleanedText, /<script>campaign<\/script>/);
  assert.match(cleanedText, /#audience/);
  assert.ok(allIds.every(id => !id.includes(channel) && !id.includes(campaign) && !id.includes(segment)));
});

test('successful replanning is invalidated before an invalid budget is rejected', () => {
  const harness = loadDomApp();
  const { elements, motion } = harness;

  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');
  const successfulText = elements['results-note'].textContent;
  assert.equal(elements.results.hidden, false);
  assert.equal(elements['decision-canvas'].dataset.phase, 'result');

  elements['total-budget'].value = '0';
  elements['plan-form'].trigger('submit');

  assert.equal(elements.results.hidden, true);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');
  assert.equal(
    elements['results-note'].textContent,
    'Choose a budget and horizon to build the plan.'
  );
  assert.notEqual(elements['results-note'].textContent, successfulText);
  assert.ok(motion.resetCount > 0);
});

test('successful replanning is invalidated when the allocator returns infeasible', () => {
  const harness = loadDomApp();
  const { elements, motion } = harness;

  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');
  const successfulText = elements['results-note'].textContent;
  assert.equal(elements.results.hidden, false);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 2);

  elements['total-budget'].value = '1';
  elements['plan-form'].trigger('submit');

  assert.equal(elements.results.hidden, false);
  assert.equal(elementsByTag(elements.results, 'canvas').length, 0);
  assert.equal(elements['decision-canvas'].dataset.phase, 'blocked');
  assert.equal(elements['results-note'].textContent, [
    'Preserved and minimum allocations exceed this budget.',
    'Increase the budget or lower the listed constraints.'
  ].join(' '));
  assert.notEqual(elements['results-note'].textContent, successfulText);
  assert.equal(elements['import-status'].textContent, 'Plan blocked. Review the result and constraints.');
  assert.ok(motion.resetCount > 0);
});

test('successful pasted history is removed from the textarea after normalization', () => {
  const harness = loadDomApp();
  const { elements, window } = harness;
  elements['history-paste'].value = window.MangroveBudgetSampleData.text;

  elements['parse-pasted-history'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');
  assert.equal(elements['history-paste'].value, '');
});

test('successful sample history removes an abandoned malformed paste', () => {
  const harness = loadDomApp();
  const { elements } = harness;
  const malformedPaste = 'unknown,columns\nnot,budget-history';
  elements['history-paste'].value = malformedPaste;

  elements['parse-pasted-history'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'needs_correction');
  assert.equal(elements['history-paste'].value, malformedPaste);

  elements['use-sample-data'].trigger('click');

  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');
  assert.equal(elements['history-paste'].value, '');
});

test('cancelling a pending pasted replacement removes its raw textarea copy', () => {
  const harness = loadDomApp();
  const { elements } = harness;
  const replacement = [
    'period,channel,spend,conversions',
    '2026-W02,Replacement channel,100,4'
  ].join('\n');

  elements['use-sample-data'].trigger('click');
  elements['history-paste'].value = replacement;
  elements['parse-pasted-history'].trigger('click');
  assert.equal(elements['replacement-warning'].hidden, false);

  elements['cancel-replacement'].trigger('click');

  assert.equal(elements['replacement-warning'].hidden, true);
  assert.equal(elements['history-paste'].value, '');
  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');
});
