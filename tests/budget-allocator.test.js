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

function allocatorInternals() {
  const assignment = 'root.MangroveBudgetAllocator = { allocatePlan: allocatePlan };';
  const instrumented = source.replace(
    assignment,
    'root.MangroveBudgetAllocator = { allocatePlan: allocatePlan, __testOnly: { geometricMidpoint: geometricMidpoint, projectToBoundedBudget: projectToBoundedBudget, reconcile: reconcile } };'
  );
  assert.notEqual(instrumented, source);
  const internalContext = { window: {} };
  vm.createContext(internalContext);
  vm.runInContext(instrumented, internalContext);
  return internalContext.window.MangroveBudgetAllocator.__testOnly;
}

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

test('conversion rows and totals publish finite current modeled outcomes', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 2, b: 0.5 }, {
        currentSpendRate: 100,
        preservedSpendRate: 100
      }),
      channel('Paid social', { a: 3, b: 0.5 }, {
        currentSpendRate: 200,
        preservedSpendRate: 200
      })
    ]),
    totalBudget: 1000,
    planDays: 14,
    constraints: {
      'Paid search': { minimum: 400, maximum: 400, excluded: false },
      'Paid social': { minimum: 600, maximum: 600, excluded: false }
    }
  });
  const modeledRows = result.allocation.filter(item => item.status === 'modelable');

  assert.equal(result.ok, true);
  modeledRows.forEach(item => {
    assert.equal(Number.isFinite(item.currentPredictedOutcome), true);
    assert.equal(Number.isFinite(item.predictedOutcome), true);
  });
  assert.equal(Number.isFinite(result.totals.currentPredictedOutcome), true);
  assert.equal(Number.isFinite(result.totals.predictedOutcome), true);
  assert.equal(
    result.totals.currentPredictedOutcome,
    modeledRows.reduce((sum, item) => sum + item.currentPredictedOutcome, 0)
  );
  assert.equal(
    result.totals.predictedOutcome,
    modeledRows.reduce((sum, item) => sum + item.predictedOutcome, 0)
  );
});

test('geometric midpoint remains finite across overflow and zero-bound edges', () => {
  const { geometricMidpoint } = allocatorInternals();
  const overflowSafe = geometricMidpoint(1e200, 1e300);
  const subnormalSafe = geometricMidpoint(Number.MIN_VALUE, 1);

  assert.equal(Number.isFinite(overflowSafe), true);
  assert.ok(Math.abs((overflowSafe / 1e250) - 1) < 1e-15);
  assert.equal(Number.isFinite(subnormalSafe), true);
  assert.ok(subnormalSafe > 0);
  assert.equal(geometricMidpoint(Number.MIN_VALUE, Number.MIN_VALUE), Number.MIN_VALUE);
  assert.equal(geometricMidpoint(0, Number.MAX_VALUE), 0);
  assert.equal(geometricMidpoint(Number.MAX_VALUE, 0), 0);
});

test('reconciliation rejects pathological deltas without cent-by-cent mutation', () => {
  const { reconcile } = allocatorInternals();
  const rows = [{
    channel: 'Paid search',
    curve: { a: 2, b: 0.5 },
    allocatedCents: 0,
    minimumCents: 0,
    maximumCents: Infinity
  }];

  assert.equal(reconcile(rows, 1000000, 1), false);
  assert.equal(rows[0].allocatedCents, 0);
});

test('reconciliation accepts the original near-safe-integer positive 17-cent delta', () => {
  const { reconcile } = allocatorInternals();
  const targetCents = 7711710266582669;
  const rows = [
    {
      channel: 'Paid search',
      curve: { a: 2, b: 0.5 },
      allocatedCents: 3855855133291326,
      minimumCents: 0,
      maximumCents: Infinity
    },
    {
      channel: 'Paid social',
      curve: { a: 2, b: 0.5 },
      allocatedCents: 3855855133291326,
      minimumCents: 0,
      maximumCents: Infinity
    }
  ];

  assert.equal(
    targetCents - rows.reduce((sum, item) => sum + item.allocatedCents, 0),
    17
  );
  assert.equal(reconcile(rows, targetCents, 1), true);
  assert.equal(
    rows.reduce((sum, item) => sum + item.allocatedCents, 0),
    targetCents
  );
});

test('reconciliation safely reduces an intermediate sum just above the safe-integer ceiling', () => {
  const { reconcile } = allocatorInternals();
  const targetCents = Number.MAX_SAFE_INTEGER;
  const rows = [
    {
      channel: 'Paid search',
      curve: { a: 2, b: 0.5 },
      allocatedCents: 4503599627370518,
      minimumCents: 0,
      maximumCents: Infinity
    },
    {
      channel: 'Paid social',
      curve: { a: 2, b: 0.5 },
      allocatedCents: 4503599627370518,
      minimumCents: 0,
      maximumCents: Infinity
    }
  ];

  assert.equal(Number.isSafeInteger(rows[0].allocatedCents + rows[1].allocatedCents), false);
  assert.equal(reconcile(rows, targetCents, 1), true);
  assert.equal(
    rows.reduce((sum, item) => sum + item.allocatedCents, 0),
    targetCents
  );
});

test('202 identical channels reconcile the legitimate half-cent rounding delta exactly', () => {
  const result = allocate({
    model: model(Array.from({ length: 202 }, (_, index) => channel(
      `Channel ${String(index).padStart(3, '0')}`,
      { a: 2, b: 0.5 },
      { currentSpendRate: 0, preservedSpendRate: 0 }
    )), { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 40401.01,
    planDays: 7
  });

  assert.equal(result.ok, true);
  assert.equal(result.totals.allocatedBudget, 40401.01);
  assert.equal(
    result.allocation.reduce((sum, item) => sum + Math.round(item.recommendedSpend * 100), 0),
    4040101
  );
  assert.equal(result.allocation.filter(item => item.recommendedSpend === 200).length, 101);
  assert.equal(result.allocation.filter(item => item.recommendedSpend === 200.01).length, 101);
  assert.equal(row(result, 'Channel 000').recommendedSpend, 200);
  assert.equal(row(result, 'Channel 100').recommendedSpend, 200);
  assert.equal(row(result, 'Channel 101').recommendedSpend, 200.01);
});

test('near-safe-integer two-channel allocation reconciles its floating-precision delta', () => {
  const totalBudget = (Number.MAX_SAFE_INTEGER - 578) / 100;
  const result = allocate({
    model: model([
      channel('Paid search', {
        a: 0.004047999876811963,
        b: 0.921399003872648
      }, { currentSpendRate: 0, preservedSpendRate: 0 }),
      channel('Paid social', {
        a: 0.0005000356887975505,
        b: 0.4893822947749868
      }, { currentSpendRate: 0, preservedSpendRate: 0 })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }, 1),
    totalBudget,
    planDays: 32.44467312947183
  });

  assert.equal(result.ok, true);
  assert.equal(result.totals.allocatedBudget, totalBudget);
  assert.equal(
    result.allocation.reduce((sum, item) => sum + Math.round(item.recommendedSpend * 100), 0),
    Math.round(totalBudget * 100)
  );
});

test('near-one elasticities project to prompt exact symmetric allocations', () => {
  [35, 40, 48, 52].forEach(power => {
    const elasticity = 1 - (2 ** -power);
    const started = process.hrtime.bigint();
    const result = allocate({
      model: model([
        channel('Paid search', { a: 2, b: elasticity }, {
          currentSpendRate: 0,
          preservedSpendRate: 0
        }),
        channel('Paid social', { a: 2, b: elasticity }, {
          currentSpendRate: 0,
          preservedSpendRate: 0
        })
      ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
      totalBudget: 10000.01,
      planDays: 7
    });
    const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;

    assert.ok(
      elapsedMilliseconds < 1000,
      `b=1-2^-${power} allocation took ${elapsedMilliseconds.toFixed(1)}ms`
    );
    assert.equal(result.ok, true);
    assert.equal(result.totals.allocatedBudget, 10000.01);
    const cents = result.allocation.map(item => Math.round(item.recommendedSpend * 100));
    assert.equal(cents[0] + cents[1], 1000001);
    assert.ok(Math.abs(cents[0] - cents[1]) <= 1);
    result.allocation.forEach(item => {
      assert.equal(Number.isFinite(item.predictedOutcome), true);
      assert.equal(Number.isFinite(item.marginalMetric.value), true);
    });
  });
});

test('near-one asymmetric curves preserve the cent-precision marginal optimum', () => {
  [40, 48].forEach(power => {
    const elasticity = 1 - (2 ** -power);
    const result = allocate({
      model: model([
        channel('Weaker channel', { a: 1, b: elasticity }, {
          currentSpendRate: 0,
          preservedSpendRate: 0
        }),
        channel('Stronger channel', { a: 2, b: elasticity }, {
          currentSpendRate: 0,
          preservedSpendRate: 0
        })
      ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
      totalBudget: 10000.01,
      planDays: 7
    });

    assert.equal(result.ok, true);
    assert.equal(row(result, 'Weaker channel').recommendedSpend, 0);
    assert.equal(row(result, 'Stronger channel').recommendedSpend, 10000.01);
    assert.equal(result.totals.allocatedBudget, 10000.01);
    assert.equal(Number.isFinite(row(result, 'Stronger channel').marginalMetric.value), true);
  });
});

test('unequal near-one elasticities retain equal interior marginals', () => {
  const firstElasticity = 1 - (2 ** -40);
  const secondElasticity = 1 - (2 ** -48);
  const firstReferenceSpend = 4000;
  const secondReferenceSpend = 6000.01;
  const secondScale = (
    firstElasticity * Math.pow(firstReferenceSpend, firstElasticity - 1)
  ) / (
    secondElasticity * Math.pow(secondReferenceSpend, secondElasticity - 1)
  );
  const result = allocate({
    model: model([
      channel('First channel', { a: 1, b: firstElasticity }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('Second channel', { a: secondScale, b: secondElasticity }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 10000.01,
    planDays: 7
  });
  const first = row(result, 'First channel');
  const second = row(result, 'Second channel');

  assert.equal(result.ok, true);
  assert.equal(first.recommendedSpend, 4000.25);
  assert.equal(second.recommendedSpend, 5999.76);
  assert.equal(
    Math.round(first.recommendedSpend * 100) + Math.round(second.recommendedSpend * 100),
    1000001
  );
  assert.ok(
    Math.abs(first.marginalMetric.value - second.marginalMetric.value)
      <= Number.EPSILON * 8
  );
});

test('mixed elasticities reject a profitable one-cent local exchange', () => {
  const result = allocate({
    model: model([
      channel('C0', { a: 116766.96419497507, b: 0.9999999999999964 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('C1', { a: 661.1554320970627, b: 0.6451448898762464 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('C2', { a: 13194.183658816703, b: 0.5731349268555641 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('C3', { a: 8451788.597087873, b: 0.0848016581684351 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('C4', { a: 265913.5381282103, b: 0.3030463482439518 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 93509.49,
    planDays: 782.6114767670637,
    constraints: {
      C4: { minimum: 0, maximum: 9223.99, excluded: false }
    }
  });
  const donor = row(result, 'C0');
  const receiver = row(result, 'C3');
  function outcome(item, spend) {
    const rate = spend / result.horizonFactor;
    return item.curve.a * Math.pow(rate, item.curve.b) * result.horizonFactor;
  }
  const donorCurve = { curve: { a: 116766.96419497507, b: 0.9999999999999964 } };
  const receiverCurve = { curve: { a: 8451788.597087873, b: 0.0848016581684351 } };
  const exchangeGain = (
    outcome(donorCurve, donor.recommendedSpend - 0.01)
    + outcome(receiverCurve, receiver.recommendedSpend + 0.01)
  ) - (
    outcome(donorCurve, donor.recommendedSpend)
    + outcome(receiverCurve, receiver.recommendedSpend)
  );

  assert.equal(result.ok, true);
  assert.equal(result.totals.allocatedBudget, 93509.49);
  assert.ok(receiver.recommendedSpend > 0);
  assert.ok(exchangeGain <= 0, `one-cent exchange improves outcome by ${exchangeGain}`);
});

test('near-one projection preserves bounds while reconciling the exact budget', () => {
  const elasticity = 1 - (2 ** -48);
  const result = allocate({
    model: model([
      channel('Paid search', { a: 2, b: elasticity }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('Paid social', { a: 2, b: elasticity }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('Paid video', { a: 2, b: elasticity }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 10000.01,
    planDays: 7,
    constraints: {
      'Paid search': { minimum: 0, maximum: 1000, excluded: false }
    }
  });

  assert.equal(result.ok, true);
  assert.ok(row(result, 'Paid search').recommendedSpend <= 1000);
  assert.equal(
    result.allocation.reduce((sum, item) => sum + Math.round(item.recommendedSpend * 100), 0),
    1000001
  );
  assert.ok(
    Math.abs(
      Math.round(row(result, 'Paid social').recommendedSpend * 100)
      - Math.round(row(result, 'Paid video').recommendedSpend * 100)
    ) <= 1
  );
});

test('bounded-simplex projection fixes active caps atomically', () => {
  const { projectToBoundedBudget } = allocatorInternals();
  const items = [
    { minimumCents: 0, maximumCents: 4000 },
    { minimumCents: 0, maximumCents: Infinity },
    { minimumCents: 0, maximumCents: Infinity }
  ];
  const rawCents = [5000, 2000, 2000];
  const projection = projectToBoundedBudget(items, rawCents, 10000);

  assert.deepEqual(Array.from(projection.values), [4000, 3000, 3000]);
  assert.deepEqual(rawCents, [5000, 2000, 2000]);
  assert.equal(projection.passes, 2);
});

test('bounded-simplex projection avoids cancellation with huge raw operands', () => {
  const { projectToBoundedBudget } = allocatorInternals();
  const items = [
    { minimumCents: 0, maximumCents: Infinity },
    { minimumCents: 0, maximumCents: Infinity }
  ];
  const rawCents = [1e18, 1e18];
  const projection = projectToBoundedBudget(items, rawCents, 1000001);

  assert.deepEqual(Array.from(projection.values), [500000.5, 500000.5]);
  assert.deepEqual(rawCents, [1e18, 1e18]);
});

test('extreme accepted curves complete promptly with exact finite allocations', () => {
  const started = process.hrtime.bigint();
  const result = allocate({
    model: model([
      channel('Paid search', { a: 1e306, b: 0.5 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('Paid social', { a: 9e305, b: 0.5 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 10000,
    planDays: 7
  });
  const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;

  assert.ok(
    elapsedMilliseconds < 1000,
    `extreme allocation took ${elapsedMilliseconds.toFixed(1)}ms`
  );
  assert.equal(result.ok, true);
  assert.equal(result.code, 'allocated');
  assert.equal(result.totals.allocatedBudget, 10000);
  assert.equal(
    result.allocation.reduce((sum, item) => sum + item.recommendedSpend, 0),
    10000
  );
  result.allocation.forEach(item => {
    assert.equal(Number.isFinite(item.recommendedSpend), true);
    assert.equal(Number.isFinite(item.predictedOutcome), true);
    assert.equal(Number.isFinite(item.marginalMetric.value), true);
  });
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

test('financial current outcomes retain the metric cost treatment', () => {
  const channelOptions = { currentSpendRate: 400, preservedSpendRate: 400 };
  const constraints = { 'Paid search': { minimum: 1800, maximum: 1800, excluded: false } };
  const before = allocate({
    model: model([
      channel('Paid search', { a: 3, b: 0.5 }, channelOptions)
    ], { key: 'financial', label: 'Contribution', costTreatment: 'before_marketing' }),
    totalBudget: 1800,
    planDays: 14,
    constraints
  });
  const after = allocate({
    model: model([
      channel('Paid search', { a: 3, b: 0.5 }, channelOptions)
    ], { key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' }),
    totalBudget: 1800,
    planDays: 14,
    constraints
  });
  const beforeItem = row(before, 'Paid search');
  const afterItem = row(after, 'Paid search');
  const beforeRawCurrent = 3 * Math.pow(400, 0.5) * 2;
  const afterRawCurrent = 3 * Math.pow(400, 0.5) * 2;

  assert.equal(before.ok, true);
  assert.equal(after.ok, true);
  assert.equal(beforeItem.currentPredictedOutcome, beforeRawCurrent - beforeItem.currentSpend);
  assert.equal(afterItem.currentPredictedOutcome, afterRawCurrent);
});

test('preserved and excluded rows publish only modeled current outcomes', () => {
  const channels = [
    channel('Active modeled', { a: 2, b: 0.5 }, {
      currentSpendRate: 300,
      preservedSpendRate: 300
    }),
    channel('Excluded modeled', { a: 2, b: 0.5 }, {
      currentSpendRate: 400,
      preservedSpendRate: 400
    }),
    channel('Excluded unsupported', null, {
      currentSpendRate: 500,
      preservedSpendRate: 500
    })
  ];
  const constraints = {
    'Active modeled': { minimum: 1800, maximum: 1800, excluded: false },
    'Excluded modeled': { minimum: null, maximum: null, excluded: true },
    'Excluded unsupported': { minimum: null, maximum: null, excluded: true }
  };
  const result = allocate({
    model: model(channels, { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 1800,
    planDays: 14,
    constraints
  });
  const withoutUnsupported = allocate({
    model: model(channels.slice(0, 2), { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 1800,
    planDays: 14,
    constraints: {
      'Active modeled': constraints['Active modeled'],
      'Excluded modeled': constraints['Excluded modeled']
    }
  });
  const preserved = row(result, 'Excluded unsupported');
  const excludedModeled = row(result, 'Excluded modeled');
  const expectedCurrentOutcome = 2 * Math.pow(400, 0.5) * 2;

  assert.equal(result.ok, true);
  assert.equal(withoutUnsupported.ok, true);
  assert.equal(preserved.currentPredictedOutcome, null);
  assert.equal(preserved.predictedOutcome, null);
  assert.equal(excludedModeled.currentPredictedOutcome, expectedCurrentOutcome);
  assert.equal(excludedModeled.predictedOutcome, 0);
  assert.equal(result.totals.currentPredictedOutcome, withoutUnsupported.totals.currentPredictedOutcome);
  assert.equal(result.totals.predictedOutcome, withoutUnsupported.totals.predictedOutcome);
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

test('a current-only channel prediction overflow fails closed', () => {
  const result = allocate({
    model: model([
      channel('Active modeled', { a: 2, b: 0.5 }, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      }),
      channel('Excluded modeled', { a: 1.3482698511467367e308, b: 0.5 }, {
        currentSpendRate: 4,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }),
    totalBudget: 2,
    planDays: 7,
    constraints: {
      'Active modeled': { minimum: 2, maximum: 2, excluded: false },
      'Excluded modeled': { minimum: null, maximum: null, excluded: true }
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
});

test('a subnormal horizon cannot publish an infinite preserved spend rate', () => {
  const result = allocate({
    model: model([
      channel('Local partnerships', null, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }, 1),
    totalBudget: 1,
    planDays: Number.MIN_VALUE,
    constraints: {
      'Local partnerships': { minimum: 1, maximum: null, excluded: false }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'prediction_overflow');
  assert.equal(Object.hasOwn(result, 'allocation'), false);
  assert.equal(Object.hasOwn(result, 'totals'), false);
});

test('a marginal CPA reciprocal overflow fails closed', () => {
  const result = allocate({
    model: model([
      channel('Paid search', { a: 1e-307, b: 0.5 })
    ]),
    totalBudget: 100,
    planDays: 7,
    constraints: {
      'Paid search': { minimum: 100, maximum: 100, excluded: false }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'prediction_overflow');
  assert.equal(Object.hasOwn(result, 'allocation'), false);
  assert.equal(Object.hasOwn(result, 'totals'), false);
});

test('positive modeled spend requires a finite objective-specific marginal metric', () => {
  const cases = [
    { key: 'conversions', label: 'Conversions', costTreatment: null },
    { key: 'revenue', label: 'Revenue', costTreatment: null },
    { key: 'financial', label: 'Contribution', costTreatment: 'before_marketing' },
    { key: 'financial', label: 'Contribution', costTreatment: 'after_marketing' }
  ];

  cases.forEach(metric => {
    const result = allocate({
      model: model([
        channel('Paid search', { a: 1e208, b: 0.5 }, {
          currentSpendRate: 0,
          preservedSpendRate: 0
        })
      ], metric),
      totalBudget: 0.01,
      planDays: 1e200,
      constraints: {
        'Paid search': { minimum: 0.01, maximum: 0.01, excluded: false }
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'prediction_overflow');
    assert.equal(Object.hasOwn(result, 'allocation'), false);
    assert.equal(Object.hasOwn(result, 'totals'), false);
  });
});

test('minimum infeasibility takes precedence over a subnormal horizon', () => {
  const result = allocate({
    model: model([
      channel('Local partnerships', null, {
        currentSpendRate: 0,
        preservedSpendRate: 0
      })
    ], { key: 'revenue', label: 'Revenue', costTreatment: null }, 1),
    totalBudget: 1,
    planDays: Number.MIN_VALUE,
    constraints: {
      'Local partnerships': { minimum: 2, maximum: null, excluded: false }
    }
  });

  assert.deepEqual(result, {
    ok: false,
    code: 'minimums_exceed_budget',
    message: 'The preserved and minimum allocations require $2.',
    minimumBudget: 2,
    maximumBudget: null,
    conflicts: ['Local partnerships']
  });
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
