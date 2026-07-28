'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared/forecast-engine.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const historical = [
  { month: '2025-10', value: 44100 },
  { month: '2025-11', value: 46800 },
  { month: '2025-12', value: 52300 }
];
const timeSeries = context.window.MangroveForecast.prepareTimeSeries(historical);
const result = context.window.MangroveForecast.generateForecast(timeSeries, 3, false);

assert.strictEqual(
  result.forecast.map(row => row.month).join(','),
  '2026-01,2026-02,2026-03'
);

const lowerTargetProbability = context.window.MangroveForecast.probabilityOfHittingTarget(
  [{ value: 100, lower: 80, upper: 120 }],
  90
);
const higherTargetProbability = context.window.MangroveForecast.probabilityOfHittingTarget(
  [{ value: 100, lower: 80, upper: 120 }],
  110
);

assert(lowerTargetProbability > higherTargetProbability);
