'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'analytics/budget/app.js'), 'utf8');
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
      predictedOutcome: metricKey === 'conversions' ? 32 : 1200
    },
    conflicts: []
  }, overrides || {});
}

class FakeElement {
  constructor(tagName, id) {
    this.tagName = tagName.toUpperCase();
    this.id = id || '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.selected = false;
    this.value = '';
    this.className = '';
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this._textContent = '';
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

function createDocument() {
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
    'model-inspector': 'details',
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
    'model-inspector',
    'recommendation-explanation'
  ].forEach(id => { elements[id].hidden = true; });
  elements['paste-history-toggle'].setAttribute('aria-expanded', 'false');
  elements['results-note'].textContent = 'Choose a budget and horizon to build the plan.';
  elements['plan-days'].value = '30';

  return {
    readyState: 'complete',
    body: new FakeElement('body', 'body'),
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    elements
  };
}

function loadDomApp() {
  const document = createDocument();
  const events = [];
  const chartCalls = {
    response: [],
    marginal: []
  };
  const chartApi = {
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
    MangroveMotion: motion,
    MangroveCharts: chartApi,
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
  const domContext = { window };
  vm.createContext(domContext);
  [
    'shared/history-data.js',
    'shared/marginality-engine.js',
    'shared/budget-allocator.js',
    'shared/budget-sample-data.js',
    'analytics/budget/app.js'
  ].forEach(relativePath => {
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
    'blocked'
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
        statusLabel: 'Preserved at recent spend',
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
      conflicts: ['Paid search <em>unsafe</em>']
    });
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
  assert.equal(view.marginalMetricLabel, 'Marginal ROAS');
  assert.match(text, /observational/i);
  assert.match(text, /modeled marginal/i);
  assert.doesNotMatch(text, /confidence|certainty|accuracy/i);
  assert.doesNotMatch(text, /normalizedRawRow|must not enter a view model|observations/);
  assert.equal(preserved.evidence, 'Preserved');
  assert.equal(preserved.marginalMetric, '—');
  assert.doesNotMatch(JSON.stringify(preserved), /fit/i);
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
  assert.equal(view.marginalMetricLabel, 'Marginal ROI');
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

  elements.objective.value = 'conversions';
  elements.objective.trigger('change');

  assert.equal(elements.results.hidden, true);
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
  elements['plan-form'].trigger('submit');

  const allocationTable = elementByClass(elements.results, 'allocation-table');
  const resultSummary = elementByClass(elements.results, 'result-summary');
  assert.match(resultSummary.textContent, /Requested budget/);
  assert.match(resultSummary.textContent, /Optimized budget/);
  assert.match(resultSummary.textContent, /Preserved budget/);
  assert.match(resultSummary.textContent, /Predicted Revenue/);
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

test('response charts debounce resize by 150ms and replacement cancels the pending repaint', () => {
  const harness = loadDomApp();
  const { elements, window, chartCalls, timers } = harness;
  elements['use-sample-data'].trigger('click');
  elements['plan-form'].trigger('submit');
  const initialResponses = chartCalls.response.length;

  window.trigger('resize');
  window.trigger('resize');
  assert.equal(timers.pendingCount(), 1);
  assert.deepEqual(timers.delays.slice(-2), [150, 150]);
  timers.flush();
  assert.equal(chartCalls.response.length, initialResponses + 4);

  window.trigger('resize');
  assert.equal(timers.pendingCount(), 1);
  elements['use-sample-data'].trigger('click');
  elements['confirm-replacement'].trigger('click');
  assert.equal(timers.pendingCount(), 0);
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

  elements['total-budget'].value = '1';
  elements['plan-form'].trigger('submit');

  assert.equal(elements.results.hidden, false);
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
