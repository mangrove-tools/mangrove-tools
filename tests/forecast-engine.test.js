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

assert(
  Math.abs(lowerTargetProbability - 0.8365) < 0.002,
  `expected a known-reference probability near 0.8365, got ${lowerTargetProbability}`
);

const seasonalHistory = [];
for (let year = 2024; year <= 2025; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    seasonalHistory.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      value: month === 12 ? 200 : 100
    });
  }
}
const seasonalSeries = context.window.MangroveForecast.prepareTimeSeries(seasonalHistory);
const seasonalResult = context.window.MangroveForecast.generateForecast(
  seasonalSeries,
  12,
  true
);
const novemberForecast = seasonalResult.forecast.find(row => row.month === '2026-11');
const decemberForecast = seasonalResult.forecast.find(row => row.month === '2026-12');

assert(
  decemberForecast.value > novemberForecast.value,
  'a recurring December peak should remain a peak in the seasonal forecast'
);

const slashHistorical = [
  { month: '10/2025', value: 44100 },
  { month: '11/2025', value: 46800 },
  { month: '12/2025', value: 52300 }
];
const slashSeries = context.window.MangroveForecast.prepareTimeSeries(slashHistorical);
const slashResult = context.window.MangroveForecast.generateForecast(
  slashSeries,
  3,
  false
);

assert.strictEqual(
  slashResult.forecast.map(row => row.month).join(','),
  '2026-01,2026-02,2026-03'
);

for (const invalidMonth of ['2025-00', '2025-13', '13/2025', 'not-a-month']) {
  const validation = context.window.MangroveForecast.validateHistoricalData([
    { month: '2025-10', value: 100 },
    { month: '2025-11', value: 110 },
    { month: invalidMonth, value: 120 }
  ]);
  assert.strictEqual(
    validation.ok,
    false,
    `${invalidMonth} should be rejected instead of normalized`
  );
  assert.match(validation.reason, /month format/i);
}
