'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('shared/response-curve.js', 'utf8'), sandbox);
const engine = sandbox.window.MangroveResponseCurve;

function channel(channel, spend, a, b, minSpend = 0, maxSpend = Infinity) {
  return {
    channel,
    spend,
    conversions: a * Math.pow(spend, b),
    curve: { a, b, r2: 1, assumed: false },
    minSpend,
    maxSpend
  };
}

const symmetric = engine.optimizeBudget(
  [
    channel('A', 1, 1, 0.5),
    channel('B', 4, 1, 0.5)
  ],
  20
);
assert.strictEqual(symmetric.length, 2);
assert(Math.abs(symmetric[0].recommendedSpend - 10) < 0.01);
assert(Math.abs(symmetric[1].recommendedSpend - 10) < 0.01);
assert(
  Math.abs(symmetric[0].marginalCPA - symmetric[1].marginalCPA) < 0.01,
  'unconstrained channels should finish at equal modeled marginal efficiency'
);

const largerSymmetric = engine.optimizeBudget(
  [
    channel('A', 100, 1, 0.5),
    channel('B', 100, 1, 0.5)
  ],
  400
);
assert(Math.abs(largerSymmetric[0].recommendedSpend - 200) < 0.01);
assert(Math.abs(largerSymmetric[1].recommendedSpend - 200) < 0.01);

const infeasible = engine.optimizeBudget(
  [
    channel('A', 100, 1, 0.5, 80),
    channel('B', 100, 1, 0.5, 80)
  ],
  100
);
assert.deepStrictEqual(Array.from(infeasible), []);

const assumption = engine.createAssumptionCurve(1000, 50);
assert.strictEqual(assumption.assumed, true);
assert.strictEqual(assumption.r2, null);
assert(Math.abs(engine.predictConversions(1000, assumption) - 50) < 1e-9);
assert(assumption.b > 0 && assumption.b < 1);

const manualValidation = engine.validateDataQuality([
  {
    channel: 'A',
    spend: 1000,
    conversions: 50,
    months: 6,
    dataPoints: [{ spend: 1000, conversions: 50 }]
  },
  {
    channel: 'B',
    spend: 800,
    conversions: 32,
    months: 6,
    dataPoints: [{ spend: 800, conversions: 32 }]
  }
]);
assert.strictEqual(manualValidation.ok, true);
assert.strictEqual(manualValidation.evidence, 'assumption');
