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
  const motion = {
    resetCount: 0,
    revealResult(element) {
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
    MangroveCharts: {},
    MangroveToolExtras: {},
    clearTimeout
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
    motion
  };
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

  assert.equal(elements.results.hidden, true);
  assert.equal(elements['decision-canvas'].dataset.phase, 'partially_modelable');
  assert.equal(
    elements['results-note'].textContent,
    'Choose a budget and horizon to build the plan.'
  );
  assert.notEqual(elements['results-note'].textContent, successfulText);
  assert.match(elements['import-status'].textContent, /require/i);
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
