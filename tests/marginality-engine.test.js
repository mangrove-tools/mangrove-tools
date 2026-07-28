'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared/marginality-engine.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const marginality = context.window.MangroveMarginality;

function series(channel, spends, a, b) {
  return spends.map((spend, index) => ({
    periodKey: `2026-W${String(index + 2).padStart(2, '0')}`,
    periodStart: new Date(Date.UTC(2026, 0, 5 + index * 7))
      .toISOString()
      .slice(0, 10),
    cadence: 'weekly',
    channel,
    spend,
    outcomes: {
      conversions: Number((a * Math.pow(spend, b)).toFixed(6))
    }
  }));
}

function history(rows, metrics) {
  return {
    ok: true,
    state: 'ready',
    cadence: 'weekly',
    cadenceDays: 7,
    metrics: metrics || [{ key: 'conversions', label: 'Conversions', costTreatment: null }],
    rows
  };
}

function modelFor(rows, metrics) {
  return marginality.analyzeHistory(history(rows, metrics));
}

function channelFor(result, objective) {
  return result.models[objective].channels[0];
}

function assertFinite(value) {
  if (Array.isArray(value)) {
    value.forEach(assertFinite);
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(assertFinite);
  } else if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `expected finite number, received ${value}`);
  }
}

const variedSpends = [500, 620, 710, 840, 930, 1080, 1210, 1350, 1490, 1640, 1780, 1930, 2110, 2280, 2460, 2650];

test('admits a stable 16-period diminishing-returns response curve', () => {
  const result = modelFor(series('Paid search', variedSpends, 0.31, 0.62));
  const channel = channelFor(result, 'conversions');

  assert.equal(result.ok, true);
  assert.deepEqual(result.eligibleObjectives, ['conversions']);
  assert.equal(result.recommendedObjective, 'conversions');
  assert.equal(channel.status, 'modelable');
  assert.equal(channel.failedGates.length, 0);
  assert.ok(Math.abs(channel.curve.b - 0.62) < 0.001);
  assert.equal(channel.preservedSpendRate, 2370);
  assert.equal(channel.currentSpendRate, 2650);
});

test('preserves an 11-period series for failing the complete-period gate', () => {
  const result = modelFor(series('Paid search', variedSpends.slice(0, 11), 0.31, 0.62));
  const channel = channelFor(result, 'conversions');

  assert.equal(channel.status, 'preserved');
  assert.ok(channel.failedGates.includes('minimum_complete_periods'));
});

test('preserves constant spend for insufficient distinct spend and variation', () => {
  const result = modelFor(series('Paid search', Array(16).fill(1200), 0.31, 0.62));
  const channel = channelFor(result, 'conversions');

  assert.equal(channel.status, 'preserved');
  assert.ok(channel.failedGates.includes('distinct_spend'));
  assert.ok(channel.failedGates.includes('spend_variation'));
});

test('preserves a series with fewer than 75 percent positive outcomes', () => {
  const rows = series('Paid search', variedSpends, 0.31, 0.62);
  rows.slice(0, 5).forEach(row => { row.outcomes.conversions = 0; });
  const channel = channelFor(modelFor(rows), 'conversions');

  assert.equal(channel.status, 'preserved');
  assert.ok(channel.failedGates.includes('positive_coverage'));
  assert.equal(channel.diagnostics.positiveCoverage, 11 / 16);
});

test('preserves non-diminishing or negative-elasticity curves', () => {
  [0, 1].forEach(elasticity => {
    const channel = channelFor(modelFor(series('Paid search', variedSpends, 0.31, elasticity)), 'conversions');
    assert.equal(channel.status, 'preserved');
    assert.ok(channel.failedGates.includes('elasticity'));
  });
});

test('preserves a curve when a high-leverage period changes its current prediction too much', () => {
  const rows = series('Paid search', variedSpends, 0.31, 0.62);
  rows[15].outcomes.conversions *= 12;
  const channel = channelFor(modelFor(rows), 'conversions');

  assert.equal(channel.status, 'preserved');
  assert.ok(channel.failedGates.includes('current_prediction_stability'));
});

test('preserves a curve when the recent-spend reference is zero and cannot support comparison', () => {
  const rows = series('Paid search', variedSpends, 0.31, 0.62);
  rows.slice(-4).forEach(row => {
    row.spend = 0;
    row.outcomes.conversions = 0;
  });
  const channel = channelFor(modelFor(rows), 'conversions');

  assert.equal(channel.diagnostics.positiveCoverage, 0.75);
  assert.equal(channel.preservedSpendRate, 0);
  assert.equal(channel.status, 'preserved');
  assert.ok(channel.failedGates.includes('current_prediction_stability'));
});

test('preserves a curve with unstable leave-one-out elasticities', () => {
  const rows = series('Paid search', variedSpends, 0.31, 0.62);
  [100, 0.01, 100, 0.01, 100, 0.01, 100, 0.01, 0.01, 100, 0.01, 100, 0.01, 100, 0.01, 100]
    .forEach((factor, index) => { rows[index].outcomes.conversions *= factor; });
  const channel = channelFor(modelFor(rows), 'conversions');

  assert.equal(channel.status, 'preserved');
  assert.ok(channel.failedGates.includes('elasticity_stability'));
});

test('admits elasticities strictly inside the boundary even when very close to zero', () => {
  const elasticity = 5e-10;
  const rows = variedSpends.map((spend, index) => ({
    periodKey: `2026-W${String(index + 2).padStart(2, '0')}`,
    periodStart: new Date(Date.UTC(2026, 0, 5 + index * 7)).toISOString().slice(0, 10),
    cadence: 'weekly',
    channel: 'Paid search',
    spend,
    outcomes: { conversions: Math.pow(spend, elasticity) }
  }));
  const channel = channelFor(modelFor(rows), 'conversions');

  assert.equal(channel.status, 'modelable');
  assert.equal(channel.failedGates.includes('elasticity'), false);
  assert.ok(channel.curve.b > 0 && channel.curve.b < 1);
});

test('keeps conversions, revenue, and treated financial outcomes as separate objective models', () => {
  const rows = series('Paid search', variedSpends, 0.31, 0.62).map(row => ({
    ...row,
    outcomes: {
      conversions: row.outcomes.conversions,
      revenue: Number((2.4 * Math.pow(row.spend, 0.55)).toFixed(6)),
      financial: Number((1.2 * Math.pow(row.spend, 0.51)).toFixed(6))
    }
  }));
  const result = modelFor(rows, [
    { key: 'conversions', label: 'Conversions', costTreatment: null },
    { key: 'revenue', label: 'Revenue', costTreatment: null },
    { key: 'financial', label: 'Financial outcome', costTreatment: 'after_marketing' }
  ]);

  assert.deepEqual(result.eligibleObjectives, ['contribution', 'revenue', 'conversions']);
  assert.equal(result.recommendedObjective, 'contribution');
  assert.equal(result.models.conversions.objective, 'conversions');
  assert.equal(result.models.revenue.objective, 'revenue');
  assert.equal(result.models.contribution.objective, 'contribution');
  assert.equal(result.models.contribution.metric.key, 'financial');
  assert.equal(result.models.contribution.metric.costTreatment, 'after_marketing');
  assert.notEqual(result.models.conversions.channels[0].curve.b, result.models.revenue.channels[0].curve.b);
});

test('returns only finite model values and safe zeroes for invalid prediction inputs', () => {
  const result = modelFor(series('Paid search', variedSpends, 0.31, 0.62));

  assertFinite(result);
  assert.equal(marginality.predict(null, 1200), 0);
  assert.equal(marginality.predict({ a: 1, b: 0.5 }, 0), 0);
  assert.equal(marginality.marginalOutcome({ a: 1, b: 0.5 }, Number.POSITIVE_INFINITY), 0);
});
