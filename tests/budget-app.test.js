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
