'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared/budget-allocator.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const allocator = context.window.MangroveBudgetAllocator;

function channel(name, curve, options) {
  const settings = options || {};
  return {
    channel: name,
    status: settings.status || (curve ? 'modelable' : 'preserved'),
    curve: curve || null,
    currentSpendRate: settings.currentSpendRate == null ? 1000 : settings.currentSpendRate,
    preservedSpendRate: settings.preservedSpendRate == null ? 1000 : settings.preservedSpendRate
  };
}

function model(channels, metric, cadenceDays) {
  return {
    objective: metric && metric.key === 'financial' ? 'contribution' : (metric && metric.key) || 'conversions',
    cadenceDays: cadenceDays === undefined ? 7 : cadenceDays,
    metric: metric || { key: 'conversions', label: 'Conversions', costTreatment: null },
    channels
  };
}

function allocate(overrides) {
  return allocator.allocatePlan(Object.assign({
    model: model([
      channel('Paid search', { a: 2, b: 0.5 }),
      channel('Paid social', { a: 2, b: 0.5 })
    ]),
    totalBudget: 60000,
    planDays: 42,
    constraints: {}
  }, overrides));
}

function row(result, name) {
  return result.allocation.find(item => item.channel === name);
}

test('symmetric admitted curves split the budget equally', () => {
  const result = allocate();
  assert.equal(result.ok, true);
  assert.equal(row(result, 'Paid search').recommendedSpend, 30000);
  assert.equal(row(result, 'Paid social').recommendedSpend, 30000);
});

test('asymmetric curves balance marginal outcome approximately', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 3, b: 0.5 }),
      channel('Paid social', { a: 1, b: 0.5 })
    ])
  });
  const left = row(result, 'Paid search');
  const right = row(result, 'Paid social');
  const leftMarginal = 3 * 0.5 * Math.pow(left.recommendedSpendRate, -0.5);
  const rightMarginal = 0.5 * Math.pow(right.recommendedSpendRate, -0.5);
  assert.equal(result.ok, true);
  assert.ok(Math.abs(leftMarginal - rightMarginal) < 0.000001);
  assert.ok(left.recommendedSpend > right.recommendedSpend);
});

test('plan horizons convert rates and results reconcile to requested cents', () => {
  const result = allocate({ totalBudget: 60000.01, planDays: 21 });
  assert.equal(result.ok, true);
  assert.equal(result.horizonFactor, 3);
  assert.ok(Math.abs(result.allocation.reduce((sum, item) => sum + item.recommendedSpend, 0) - 60000.01) <= 0.01);
  assert.equal(result.totals.allocatedBudget, 60000.01);
});

test('unmodeled channels preserve their rate and receive no remainder', () => {
  const mixedModel = model([
    channel('Paid search', { a: 2, b: 0.5 }, { currentSpendRate: 2000, preservedSpendRate: 2000 }),
    channel('Local partnerships', null, { currentSpendRate: 1000, preservedSpendRate: 1000 })
  ]);
  const result = allocator.allocatePlan({
    model: mixedModel,
    totalBudget: 60000,
    planDays: 42,
    constraints: {}
  });
  const preserved = result.allocation.find(item => item.channel === 'Local partnerships');

  assert.equal(result.ok, true);
  assert.equal(preserved.status, 'preserved');
  assert.equal(preserved.recommendedSpend, 6000);
  assert.equal(preserved.constraint, 'preserved');
  assert.ok(Math.abs(result.allocation.reduce((sum, item) => sum + item.recommendedSpend, 0) - 60000) <= 0.01);
});

test('an explicit preserved minimum replaces its default rate', () => {
  const result = allocate({
    model: model([channel('Local partnerships', null, { preservedSpendRate: 1000 })]),
    totalBudget: 12000,
    constraints: { 'Local partnerships': { minimum: 12000, maximum: null, excluded: false } }
  });
  assert.equal(result.ok, true);
  assert.equal(row(result, 'Local partnerships').recommendedSpend, 12000);
});

test('excluded preserved channels receive zero', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 2, b: 0.5 }),
      channel('Local partnerships', null, { preservedSpendRate: 1000 })
    ]),
    constraints: { 'Local partnerships': { minimum: null, maximum: null, excluded: true } }
  });
  assert.equal(result.ok, true);
  assert.equal(row(result, 'Local partnerships').recommendedSpend, 0);
  assert.equal(row(result, 'Local partnerships').constraint, 'excluded');
});

test('unsupported channels never receive incremental optimized spend', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 2, b: 0.5 }),
      channel('Unknown channel', { a: 2, b: 1.2 }, { status: 'modelable', preservedSpendRate: 1000 })
    ])
  });
  assert.equal(result.ok, true);
  assert.equal(row(result, 'Unknown channel').recommendedSpend, 6000);
  assert.equal(row(result, 'Unknown channel').status, 'preserved');
});

test('minimums and maximums are honored', () => {
  const result = allocate({
    constraints: {
      'Paid search': { minimum: 18000, maximum: 24000, excluded: false },
      'Paid social': { minimum: 0, maximum: 42000, excluded: false }
    }
  });
  assert.equal(result.ok, true);
  assert.ok(row(result, 'Paid search').recommendedSpend >= 18000);
  assert.ok(row(result, 'Paid search').recommendedSpend <= 24000);
  assert.ok(row(result, 'Paid social').recommendedSpend <= 42000);
});

test('minimums over budget return a controlled failure', () => {
  const result = allocate({
    constraints: {
      'Paid search': { minimum: 36000, maximum: null, excluded: false },
      'Paid social': { minimum: 36000, maximum: null, excluded: false }
    }
  });
  assert.deepEqual(result, {
    ok: false,
    code: 'minimums_exceed_budget',
    message: 'The preserved and minimum allocations require $72,000.',
    minimumBudget: 72000,
    maximumBudget: null,
    conflicts: ['Paid search', 'Paid social']
  });
});

test('finite maximums under budget return a controlled failure', () => {
  const result = allocate({
    constraints: {
      'Paid search': { minimum: 0, maximum: 20000, excluded: false },
      'Paid social': { minimum: 0, maximum: 20000, excluded: false }
    }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'maximums_below_budget');
  assert.equal(result.maximumBudget, 40000);
});

test('a positive remainder without an admitted curve fails closed', () => {
  const result = allocate({
    model: model([channel('Local partnerships', null, { preservedSpendRate: 1000 })])
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_defensible_remainder');
});

test('conversions report marginal CPA and revenue reports marginal ROAS', () => {
  const conversion = allocate();
  const revenue = allocate({ model: model([
    channel('Paid search', { a: 2, b: 0.5 }),
    channel('Paid social', { a: 2, b: 0.5 })
  ], { key: 'revenue', label: 'Revenue', costTreatment: null }) });
  assert.equal(row(conversion, 'Paid search').marginalMetric.key, 'marginal_cpa');
  assert.equal(row(revenue, 'Paid search').marginalMetric.key, 'marginal_roas');
  assert.ok(Math.abs(row(conversion, 'Paid search').marginalMetric.value - 1 / row(revenue, 'Paid search').marginalMetric.value) < 0.000001);
});

test('excluded modeled channels report no zero-spend marginal metric for every objective', () => {
  const cases = [
    {
      metric: { key: 'conversions', label: 'Conversions', costTreatment: null },
      expectedKey: 'marginal_cpa'
    },
    {
      metric: { key: 'revenue', label: 'Revenue', costTreatment: null },
      expectedKey: 'marginal_roas'
    },
    {
      metric: { key: 'financial', label: 'Contribution', costTreatment: 'before_marketing' },
      expectedKey: 'marginal_roi'
    },
    {
      metric: { key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' },
      expectedKey: 'marginal_roi'
    }
  ];

  cases.forEach(({ metric, expectedKey }) => {
    const result = allocate({
      model: model([
        channel('Active modeled', { a: 2, b: 0.5 }),
        channel('Excluded modeled', { a: 2, b: 0.5 })
      ], metric),
      constraints: {
        'Excluded modeled': { minimum: null, maximum: null, excluded: true }
      }
    });
    const excluded = row(result, 'Excluded modeled');

    assert.equal(result.ok, true);
    assert.equal(excluded.status, 'modelable');
    assert.equal(excluded.recommendedSpend, 0);
    assert.equal(excluded.marginalMetric.key, expectedKey);
    assert.equal(excluded.marginalMetric.value, null);
    assert.notEqual(excluded.marginalMetric.value, -1);
    assert.equal(Number.isFinite(excluded.marginalMetric.value), false);
  });
});

test('before-marketing financial outcomes report net contribution and raw marginal minus one', () => {
  const result = allocate({ model: model([
    channel('Paid search', { a: 3, b: 0.5 }),
    channel('Paid social', { a: 3, b: 0.5 })
  ], { key: 'financial', label: 'Contribution', costTreatment: 'before_marketing' }) });
  const item = row(result, 'Paid search');
  const rawOutcome = 3 * Math.pow(item.recommendedSpendRate, 0.5) * result.horizonFactor;
  const rawMarginal = 3 * 0.5 * Math.pow(item.recommendedSpendRate, -0.5);
  assert.equal(item.predictedOutcome, rawOutcome - item.recommendedSpend);
  assert.equal(item.marginalMetric.value, rawMarginal - 1);
  assert.ok(item.recommendedSpend > 0);
  assert.ok(Number.isFinite(item.marginalMetric.value));
  assert.ok(item.marginalMetric.value < 0);
});

test('after-marketing financial outcomes do not subtract spend twice', () => {
  const result = allocate({ model: model([
    channel('Paid search', { a: 3, b: 0.5 }),
    channel('Paid social', { a: 3, b: 0.5 })
  ], { key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' }) });
  const item = row(result, 'Paid search');
  const rawOutcome = 3 * Math.pow(item.recommendedSpendRate, 0.5) * result.horizonFactor;
  const rawMarginal = 3 * 0.5 * Math.pow(item.recommendedSpendRate, -0.5);
  assert.equal(item.predictedOutcome, rawOutcome);
  assert.equal(item.marginalMetric.value, rawMarginal);
});

test('finite channel predictions that overflow their aggregate fail closed', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 1.3482698511467367e308, b: 0.5 }),
      channel('Paid social', { a: 1.3482698511467367e308, b: 0.5 })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 2,
    planDays: 7,
    constraints: {
      'Paid search': { minimum: 1, maximum: 1, excluded: false },
      'Paid social': { minimum: 1, maximum: 1, excluded: false }
    }
  });

  assert.deepEqual(result, {
    ok: false,
    code: 'prediction_overflow',
    message: 'The modeled outcome exceeds the safe calculation range.',
    minimumBudget: null,
    maximumBudget: null,
    conflicts: []
  });
  assert.equal(Object.hasOwn(result, 'allocation'), false);
  assert.equal(Object.hasOwn(result, 'totals'), false);
});

test('a horizon-scaled channel prediction that overflows fails closed', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 1.3482698511467367e308, b: 0.5 })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 2,
    planDays: 14,
    constraints: {
      'Paid search': { minimum: 2, maximum: 2, excluded: false }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'prediction_overflow');
  assert.equal(Object.hasOwn(result, 'allocation'), false);
  assert.equal(Object.hasOwn(result, 'totals'), false);
});

test('a direct channel prediction overflow fails closed instead of becoming zero', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 1.3482698511467367e308, b: 0.5 })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 2,
    planDays: 7,
    constraints: {
      'Paid search': { minimum: 2, maximum: 2, excluded: false }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'prediction_overflow');
  assert.equal(Object.hasOwn(result, 'allocation'), false);
  assert.equal(Object.hasOwn(result, 'totals'), false);
});

test('negative, nonfinite, and unit-inconsistent inputs fail closed', () => {
  [
    { totalBudget: -1 },
    { totalBudget: Number.POSITIVE_INFINITY },
    { planDays: 0 },
    { model: model([channel('Paid search', { a: 2, b: 0.5 })], null, 0) },
    { constraints: { 'Paid search': { minimum: -1, maximum: null, excluded: false } } },
    { constraints: { 'Paid search': { minimum: 100, maximum: 99, excluded: false } } }
  ].forEach(overrides => {
    const result = allocate(overrides);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'invalid_input');
  });
});

test('derived nonfinite horizons fail closed with finite controlled output', () => {
  const result = allocate({
    planDays: Number.MAX_VALUE,
    model: model([channel('Paid search', { a: 2, b: 0.5 })], null, Number.MIN_VALUE)
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'invalid_input');
  assert.equal(result.minimumBudget, null);
  assert.equal(result.maximumBudget, null);
});

test('an admitted curve fixed at its maximum returns a maximum-capacity failure', () => {
  const result = allocate({
    model: model([channel('Paid search', { a: 2, b: 0.5 })]),
    totalBudget: 20,
    planDays: 7,
    constraints: { 'Paid search': { minimum: 10, maximum: 10, excluded: false } }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'maximums_below_budget');
  assert.equal(result.maximumBudget, 10);
});

test('totals are derived from cents without floating-point residue', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 2, b: 0.5 }),
      channel('Paid social', { a: 2, b: 0.5 }),
      channel('Paid video', { a: 2, b: 0.5 })
    ]),
    totalBudget: 0.3,
    planDays: 7
  });
  assert.equal(result.ok, true);
  assert.equal(result.totals.requestedBudget, 0.3);
  assert.equal(result.totals.allocatedBudget, 0.3);
  assert.equal(result.totals.optimizedBudget, 0.3);
  assert.equal(result.totals.preservedBudget, 0);
});

test('conversions and revenue reject mismatched cost treatments', () => {
  [
    { key: 'conversions', label: 'Conversions', costTreatment: 'before_marketing' },
    { key: 'revenue', label: 'Revenue', costTreatment: 'after_marketing' }
  ].forEach(metric => {
    const result = allocate({ model: model([
      channel('Paid search', { a: 2, b: 0.5 }),
      channel('Paid social', { a: 2, b: 0.5 })
    ], metric) });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'invalid_input');
  });
});
