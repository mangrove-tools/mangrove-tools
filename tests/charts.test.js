'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const test = require('node:test');

const source = fs.readFileSync('shared/charts.js', 'utf8');

const cssValues = {
  '--accent': '#42a28e',
  '--ink': '#f5f3ef',
  '--ink-soft': '#a8aaa5',
  '--line': 'rgba(232, 238, 233, 0.1)',
  '--signal': '#d4a85c',
  '--signal-soft': 'rgba(212, 168, 92, 0.11)'
};

function loadCharts() {
  const window = { devicePixelRatio: 1 };
  const sandbox = {
    document: { documentElement: {} },
    getComputedStyle() {
      return {
        getPropertyValue(name) {
          return cssValues[name] || '';
        }
      };
    },
    window
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return window.MangroveCharts;
}

function makeCanvas(width = 500, height = 260) {
  const clears = [];
  const fillRects = [];
  const fills = [];
  const strokes = [];
  const paths = [];
  const arcs = [];
  const fonts = [];
  const labels = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
    scale() {},
    clearRect(...args) {
      clears.push(args);
    },
    beginPath() {
      paths.push([]);
    },
    moveTo(x, y) {
      paths.at(-1)?.push({ type: 'moveTo', x, y });
    },
    lineTo(x, y) {
      paths.at(-1)?.push({ type: 'lineTo', x, y });
    },
    closePath() {},
    arc(x, y) {
      arcs.push({ x, y, style: this.fillStyle });
    },
    setLineDash() {},
    fillRect(...args) {
      fillRects.push({ style: this.fillStyle, args });
    },
    fill() {
      fills.push(this.fillStyle);
    },
    stroke() {
      strokes.push({ style: this.strokeStyle, path: paths.at(-1) || [] });
    },
    fillText(text, x, y) {
      fonts.push(this.font);
      labels.push({
        text,
        x,
        y,
        align: this.textAlign,
        width: this.measureText(text).width
      });
    },
    measureText(text) {
      const fontSize = Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 10;
      return { width: String(text).length * fontSize * 0.6 };
    }
  };

  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext() {
      return context;
    },
    getBoundingClientRect() {
      const inlineHeight = Number.parseFloat(this.style.height);
      return {
        width,
        height: Number.isFinite(inlineHeight) && inlineHeight > 0 ? inlineHeight : height
      };
    }
  };

  return {
    canvas,
    context,
    clears,
    fillRects,
    fills,
    strokes,
    paths,
    arcs,
    fonts,
    labels
  };
}

function assertLabelsInside(view, width, height) {
  for (const label of view.labels) {
    const left = label.align === 'right'
      ? label.x - label.width
      : label.align === 'center'
        ? label.x - label.width / 2
        : label.x;
    const right = left + label.width;
    assert.ok(
      left >= 0 && right <= width && label.y >= 0 && label.y <= height,
      `${label.text} should stay inside the ${width}x${height}px canvas`
    );
  }
}

const responseOptions = {
  spendLabel: 'Weekly spend',
  outcomeLabel: 'Conversions',
  marginalLabel: 'Marginal CPA',
  formatSpend: (value) => `$${Math.round(value).toLocaleString()}`,
  formatOutcome: (value) => Math.round(value).toLocaleString(),
  formatMarginal: (value) => `$${Math.round(value).toLocaleString()}`
};

test('allocation chart maps current to signal and recommended to pine', () => {
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawAllocationChart(
    view.canvas,
    [{ label: 'Paid search', current: 4200, recommended: 5100 }],
    '$'
  );

  assert.strictEqual(view.fillRects[0].style, cssValues['--signal']);
  assert.strictEqual(view.fillRects[1].style, cssValues['--accent']);
  assert.ok(view.fonts.every((font) => font.includes('IBM Plex Mono')));
});

test('allocation chart keeps labels, values, and legend inside 266px', () => {
  // This catches fixed columns that clip long labels, values, or the legend on mobile.
  const charts = loadCharts();
  const view = makeCanvas(266, 300);
  charts.drawAllocationChart(view.canvas, [
    { label: 'Very long paid search channel', current: 12000, recommended: 9000 },
    { label: 'Paid social', current: 8000, recommended: 11000 },
    { label: 'Local partnerships', current: 4000, recommended: 4000 },
    { label: 'Podcast sponsorships', current: 2000, recommended: 0 },
    { label: 'Referral', current: 0, recommended: 2000 }
  ], '$');

  assertLabelsInside(view, 266, 300);
  view.fillRects.forEach((rect) => {
    assert.ok(rect.args[0] >= 0);
    assert.ok(rect.args[1] >= 0);
    assert.ok(rect.args[0] + rect.args[2] <= 266);
    assert.ok(rect.args[1] + rect.args[3] <= 300);
  });
});

test('allocation chart expands 12 rows and keeps each value-label pair separated at 266px', () => {
  // This catches a fixed-height canvas compressing two 11px value labels until they overlap.
  const charts = loadCharts();
  const view = makeCanvas(266, 300);
  const rows = Array.from({ length: 12 }, (_, index) => ({
    label: `Channel ${index + 1}`,
    current: 101 + index * 200,
    recommended: 151 + index * 200
  }));

  charts.drawAllocationChart(view.canvas, rows, '$');

  const renderedHeight = view.canvas.getBoundingClientRect().height;
  assert.ok(renderedHeight > 300, '12 rows should expand the CSS layout height');
  assert.equal(view.canvas.height, renderedHeight, 'bitmap height should match the expanded CSS height');
  rows.forEach((row) => {
    const current = view.labels.find(label => label.text === `$${row.current.toLocaleString()}`);
    const recommended = view.labels.find(label => label.text === `$${row.recommended.toLocaleString()}`);
    assert.ok(current, `missing current value for ${row.label}`);
    assert.ok(recommended, `missing plan value for ${row.label}`);
    assert.ok(
      Math.abs(recommended.y - current.y) >= 11,
      `${row.label} value-label centers should be at least 11px apart`
    );
  });
  assertLabelsInside(view, 266, renderedHeight);
});

test('allocation chart exposes the full Current and Plan legend on desktop', () => {
  // This catches the plan bar being mislabeled as an optimizer recommendation for preserved rows.
  const charts = loadCharts();
  const view = makeCanvas(500, 260);
  charts.drawAllocationChart(view.canvas, [
    { label: 'Paid search', current: 4200, recommended: 5100 }
  ], '$');

  assert.ok(view.labels.some(({ text }) => text === 'Current'));
  assert.ok(view.labels.some(({ text }) => text === 'Plan'));
  assert.ok(view.labels.every(({ text }) => text !== 'Recommended'));
});

test('allocation chart fits finite extreme-value labels inside a 266px canvas', () => {
  // This catches a capped value column that lets a valid large amount extend beyond the left edge.
  const charts = loadCharts();
  const view = makeCanvas(266, 300);
  charts.drawAllocationChart(view.canvas, [
    { label: 'Paid search', current: Number.MAX_VALUE, recommended: Number.MAX_VALUE }
  ], '$');

  assertLabelsInside(view, 266, 300);
});

test('allocation chart rejects an invalid canvas context before mutation', () => {
  // This catches partial contexts being cleared or resized before a later required canvas method throws.
  const charts = loadCharts();
  const allocation = makeCanvas();
  delete allocation.context.fillRect;

  assert.doesNotThrow(() => charts.drawAllocationChart(null, [
    { label: 'Paid search', current: 100, recommended: 200 }
  ], '$'));
  assert.doesNotThrow(() => charts.drawAllocationChart(allocation.canvas, [
    { label: 'Paid search', current: 100, recommended: 200 }
  ], '$'));
  assert.strictEqual(allocation.clears.length, 0);
});

test('outcome comparison rejects missing measurement and baseline capabilities before mutation', () => {
  // This catches positive and negative outcomes clearing a partial context before their later render calls fail.
  const charts = loadCharts();
  const missingMeasurement = makeCanvas();
  const missingBaselineStroke = makeCanvas();
  delete missingMeasurement.context.measureText;
  delete missingBaselineStroke.context.stroke;

  assert.doesNotThrow(() => charts.drawOutcomeComparisonChart(missingMeasurement.canvas, {
    current: 100,
    recommended: 200,
    difference: 100
  }, { unit: '$', metricLabel: 'Contribution' }));
  assert.doesNotThrow(() => charts.drawOutcomeComparisonChart(missingBaselineStroke.canvas, {
    current: -100,
    recommended: 200,
    difference: 300
  }, { unit: '$', metricLabel: 'Contribution' }));
  assert.strictEqual(missingMeasurement.clears.length, 0);
  assert.strictEqual(missingBaselineStroke.clears.length, 0);
});

test('outcome comparison rejects invalid dimensions without drawing', () => {
  // This catches zero-sized canvases being cleared and then populated with invalid geometry.
  const charts = loadCharts();
  const invalidDimensions = makeCanvas(0, 300);

  assert.doesNotThrow(() => charts.drawOutcomeComparisonChart(invalidDimensions.canvas, {
    current: 100,
    recommended: 200,
    difference: 100
  }, { unit: '$', metricLabel: 'Contribution' }));
  assert.strictEqual(invalidDimensions.clears.length, 0);
});

test('outcome comparison draws currency and count values in Current then Recommended order', () => {
  // This catches swapped rows and formatting that loses the selected unit.
  const charts = loadCharts();
  const currency = makeCanvas();
  const counts = makeCanvas();

  charts.drawOutcomeComparisonChart(currency.canvas, {
    current: 1200,
    recommended: 1545,
    difference: 345
  }, { unit: '$', metricLabel: 'Contribution' });
  charts.drawOutcomeComparisonChart(counts.canvas, {
    current: 120,
    recommended: 128,
    difference: 8
  }, { unit: '', metricLabel: 'Conversions' });

  assert.deepStrictEqual(
    currency.labels.filter(({ text }) => text === 'Current' || text === 'Recommended').map(({ text }) => text),
    ['Current', 'Recommended']
  );
  assert.ok(currency.labels.some(({ text }) => text === '$1,200'));
  assert.ok(currency.labels.some(({ text }) => text === '$1,545'));
  assert.ok(currency.labels.some(({ text }) => text === '+$345'));
  assert.ok(counts.labels.some(({ text }) => text === '120'));
  assert.ok(counts.labels.some(({ text }) => text === '128'));
  assert.ok(counts.labels.some(({ text }) => text === '+8'));
});

test('outcome comparison preserves positive, flat, and negative modeled differences', () => {
  // This catches a formatter that drops the direction of an outcome change.
  const charts = loadCharts();
  const cases = [
    [{ current: 100, recommended: 140, difference: 40 }, '+$40'],
    [{ current: 100, recommended: 100, difference: 0 }, '$0'],
    [{ current: 140, recommended: 100, difference: -40 }, '-$40']
  ];

  for (const [comparison, expectedDifference] of cases) {
    const view = makeCanvas();
    charts.drawOutcomeComparisonChart(view.canvas, comparison, { unit: '$', metricLabel: 'Revenue' });
    assert.ok(view.labels.some(({ text }) => text === expectedDifference));
  }
});

test('outcome comparison supports signed financial values and draws a muted zero baseline', () => {
  // This catches signed bars being drawn from the plot edge instead of the zero baseline.
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawOutcomeComparisonChart(view.canvas, {
    current: -200,
    recommended: 100,
    difference: 300
  }, { unit: '$', metricLabel: 'Contribution' });

  assert.ok(view.strokes.some((stroke) => stroke.style === cssValues['--ink-soft']));
  assert.ok(view.labels.some((label) => label.text === 'Current'));
  assert.ok(view.labels.some((label) => label.text === 'Recommended'));
  assert.ok(view.labels.some((label) => label.text.includes('+$300')));
  assert.ok(view.labels.some((label) => label.text === '-$200'));
  assert.ok(view.labels.some((label) => label.text === '$100'));
  assert.strictEqual(view.fillRects[0].style, cssValues['--signal']);
  assert.strictEqual(view.fillRects[1].style, cssValues['--accent']);
});

test('outcome comparison keeps a zero current baseline and narrow geometry inside the canvas', () => {
  // This catches zero values disappearing and narrow charts overflowing their drawing box.
  const charts = loadCharts();
  const view = makeCanvas(266, 300);

  charts.drawOutcomeComparisonChart(view.canvas, {
    current: 0,
    recommended: 2000,
    difference: 2000
  }, { unit: '$', metricLabel: 'Incremental contribution after long-term costs' });

  assert.strictEqual(view.fillRects[0].args[2], 0, 'zero current value draws from the zero baseline');
  assertLabelsInside(view, 266, 300);
  for (const rect of view.fillRects) {
    assert.ok(rect.args[0] >= 0 && rect.args[0] + rect.args[2] <= 266);
    assert.ok(rect.args[1] >= 0 && rect.args[1] + rect.args[3] <= 300);
  }
});

test('outcome comparison fits finite extreme-value labels inside a 266px canvas', () => {
  // This catches an oversized modeled amount escaping the value column despite finite input.
  const charts = loadCharts();
  const view = makeCanvas(266, 300);
  charts.drawOutcomeComparisonChart(view.canvas, {
    current: Number.MAX_VALUE,
    recommended: Number.MAX_VALUE,
    difference: Number.MAX_VALUE
  }, { unit: '$', metricLabel: 'Contribution' });

  assertLabelsInside(view, 266, 300);
});

test('outcome comparison skips invalid or nonfinite comparison data', () => {
  // This catches fabricated bars or labels when modeled values are unusable.
  const charts = loadCharts();
  const invalidCases = [
    { current: 100, recommended: Number.NaN, difference: 20 },
    { current: Infinity, recommended: 120, difference: 20 },
    { current: 100, recommended: 120, difference: -Infinity }
  ];

  for (const comparison of invalidCases) {
    const view = makeCanvas();
    charts.drawOutcomeComparisonChart(view.canvas, comparison, { unit: '$', metricLabel: 'Revenue' });
    assert.strictEqual(view.fillRects.length, 0);
    assert.strictEqual(view.labels.length, 0);
    assert.strictEqual(view.clears.length, 0);
  }
});

test('forecast chart maps confidence to signal and forecast to pine', () => {
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawForecastChart(
    view.canvas,
    [
      { x: 0, y: 100, month: '2026-01' },
      { x: 1, y: 112, month: '2026-02' }
    ],
    [
      {
        month: '2026-03',
        value: 118,
        lower: 105,
        upper: 132
      }
    ],
    '$'
  );

  assert.ok(view.fills.includes(cssValues['--signal-soft']));
  assert.ok(view.strokes.some(({ style }) => style === cssValues['--accent']));
  assert.ok(view.fonts.every((font) => font.includes('IBM Plex Mono')));

  const forecastLabel = view.labels.find(({ text }) => /forecast/i.test(text));
  assert.ok(forecastLabel, 'forecast region should be labeled');
  assert.ok(
    forecastLabel.y < 60,
    'forecast region label should remain inside the plot, above the x-axis labels'
  );
});

test('forecast chart keeps date ticks separated on a narrow canvas', () => {
  const charts = loadCharts();
  const view = makeCanvas(300, 260);
  const historical = Array.from({ length: 12 }, (_, index) => ({
    x: index,
    y: 100 + index,
    month: `2025-${String(index + 1).padStart(2, '0')}`
  }));
  const forecast = Array.from({ length: 6 }, (_, index) => ({
    month: `2026-${String(index + 1).padStart(2, '0')}`,
    value: 112 + index,
    lower: 106 + index,
    upper: 118 + index
  }));

  charts.drawForecastChart(view.canvas, historical, forecast, '$');

  const dateTicks = view.labels.filter(({ text }) => /^\d{4}-\d{2}$/.test(text));
  assert.strictEqual(dateTicks[0].text, '2025-01');
  assert.strictEqual(dateTicks[0].align, 'left');
  assert.strictEqual(dateTicks.at(-1).text, '2026-06');
  assert.strictEqual(dateTicks.at(-1).align, 'right');
  assert.ok(dateTicks.length <= 4, 'narrow charts should render at most four date ticks');
  for (let index = 1; index < dateTicks.length; index += 1) {
    assert.ok(
      dateTicks[index].x - dateTicks[index - 1].x >= 64,
      'adjacent narrow-chart date ticks should have at least 64px of space'
    );
  }
});

test('response curve renders modeled observed points, fitted evidence, and position labels', () => {
  const charts = loadCharts();
  const view = makeCanvas(300, 260);

  charts.drawResponseCurve(
    view.canvas,
    {
      channel: 'Paid search',
      status: 'modelable',
      observations: [
        { spend: 1200, outcome: 28 },
        { spend: 1800, outcome: 39 },
        { spend: 2400, outcome: 48 }
      ],
      curve: { a: 0.6, b: 0.56 }
    },
    { currentSpendRate: 1800, recommendedSpendRate: 2400 },
    responseOptions
  );

  assert.ok(view.fills.includes(cssValues['--signal']), 'observed points use signal color');
  assert.ok(
    view.strokes.some(({ style }) => style === cssValues['--accent']),
    'modelable channels draw an accent fitted curve'
  );
  assert.ok(view.labels.some(({ text }) => text === 'CURRENT'));
  assert.ok(view.labels.some(({ text }) => text === 'RECOMMENDED'));
  assert.ok(view.labels.every(({ x }) => x >= 0 && x <= 300), 'labels stay inside a 300px canvas');
  assert.ok(view.fonts.every((font) => font.includes('IBM Plex Mono')));
});

test('response curve keeps narrow y-axis and endpoint spend labels inside the canvas', () => {
  const charts = loadCharts();
  const width = 266;
  const view = makeCanvas(width, 120);

  charts.drawResponseCurve(
    view.canvas,
    {
      channel: 'Local partnerships',
      status: 'preserved',
      observations: [
        { spend: 895, outcome: 3269 },
        { spend: 905, outcome: 3290 },
        { spend: 910, outcome: 3331 }
      ],
      curve: null
    },
    {},
    {
      spendLabel: 'Spend per weekly period',
      outcomeLabel: 'Revenue',
      formatSpend: () => '$915.82',
      formatOutcome: () => '$3,331.18'
    }
  );

  for (const label of view.labels) {
    const left = label.align === 'right'
      ? label.x - label.width
      : label.align === 'center'
        ? label.x - label.width / 2
        : label.x;
    const right = left + label.width;
    assert.ok(
      left >= 0 && right <= width,
      `${label.text} should stay inside the ${width}px response canvas (left=${left}, right=${right})`
    );
  }
});

test('response curve preserves observed-only channels without a fitted line', () => {
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawResponseCurve(
    view.canvas,
    {
      channel: 'Organic',
      status: 'preserved',
      observations: [
        { spend: 0, outcome: 12 },
        { spend: 400, outcome: 18 },
        { spend: 650, outcome: 20 }
      ],
      curve: null
    },
    {},
    responseOptions
  );

  assert.ok(view.fills.includes(cssValues['--signal']), 'preserved channels still show observations');
  assert.ok(!view.strokes.some(({ style }) => style === cssValues['--accent']));
  assert.ok(
    !view.strokes.some(({ style }) => style === cssValues['--ink-soft']),
    'missing positions do not invent marker lines'
  );
  assert.strictEqual(
    view.arcs.filter(({ style }) => style === cssValues['--signal']).length,
    3,
    'only observed points are drawn'
  );
  assert.ok(!view.labels.some(({ text }) => text === 'CURRENT'));
  assert.ok(!view.labels.some(({ text }) => text === 'RECOMMENDED'));
  assert.ok(view.labels.some(({ text }) => text === 'OBSERVED ONLY'));
  assert.ok(view.fonts.every((font) => font.includes('IBM Plex Mono')));
});

test('response curve ignores supplied marker positions for observed-only channels', () => {
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawResponseCurve(
    view.canvas,
    {
      channel: 'Organic',
      status: 'preserved',
      modelable: false,
      observations: [
        { spend: 0, outcome: 12 },
        { spend: 400, outcome: 18 },
        { spend: 650, outcome: 20 }
      ],
      curve: null
    },
    { currentSpendRate: 400, recommendedSpendRate: 650 },
    responseOptions
  );

  assert.ok(
    !view.strokes.some(({ style }) => style === cssValues['--ink-soft']),
    'observed-only channels do not draw marker lines'
  );
  assert.strictEqual(
    view.arcs.filter(({ style }) => style === cssValues['--signal']).length,
    3,
    'only observed points are drawn'
  );
  assert.ok(!view.labels.some(({ text }) => text === 'CURRENT'));
  assert.ok(!view.labels.some(({ text }) => text === 'RECOMMENDED'));
});

test('response curve treats an explicit zero as a valid marker position', () => {
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawResponseCurve(
    view.canvas,
    {
      channel: 'Paid search',
      status: 'modelable',
      observations: [
        { spend: 0, outcome: 0 },
        { spend: 400, outcome: 18 },
        { spend: 650, outcome: 24 }
      ],
      curve: { a: 0.8, b: 0.54 }
    },
    { currentSpendRate: 0, recommendedSpendRate: 650 },
    responseOptions
  );

  assert.ok(view.labels.some(({ text }) => text === 'CURRENT'));
  assert.ok(view.labels.some(({ text }) => text === 'RECOMMENDED'));
  assert.strictEqual(
    view.strokes.filter(({ style }) => style === cssValues['--ink-soft']).length,
    2,
    'both explicit marker positions draw'
  );
});

test('response curve excludes zero for a tightly clustered high-baseline series', () => {
  const charts = loadCharts();
  const view = makeCanvas(300, 260);

  charts.drawResponseCurve(
    view.canvas,
    {
      channel: 'Brand search',
      status: 'preserved',
      observations: [
        { spend: 90, outcome: 90 },
        { spend: 100, outcome: 100 }
      ],
      curve: null
    },
    { currentSpendRate: 90, recommendedSpendRate: 100 },
    responseOptions
  );

  const observedPoints = view.arcs.filter(({ style }) => style === cssValues['--signal']);
  assert.ok(observedPoints.length >= 2);
  assert.ok(
    Math.min(...observedPoints.map(({ x }) => x)) <= 80,
    'the lowest observed spend should start near the plot edge instead of the right quarter'
  );
});

test('marginal efficiency chart labels each modeled allocation and metric', () => {
  const charts = loadCharts();
  const view = makeCanvas();

  charts.drawMarginalEfficiencyChart(
    view.canvas,
    [
      { channel: 'Paid search', status: 'modelable', marginalMetric: { value: 42 } },
      { channel: 'Email', status: 'modelable', marginalMetric: { value: 18 } },
      { channel: 'Organic', status: 'preserved', marginalMetric: { value: 5 } }
    ],
    responseOptions
  );

  assert.ok(view.labels.some(({ text }) => text === 'Marginal CPA'));
  assert.ok(view.labels.some(({ text }) => text === 'Paid search'));
  assert.ok(view.labels.some(({ text }) => text === 'Email'));
  assert.ok(view.labels.some(({ text }) => text === '$42'));
  assert.ok(view.labels.some(({ text }) => text === '$18'));
  assert.ok(!view.labels.some(({ text }) => text === 'Organic'));
  assert.ok(view.fonts.every((font) => font.includes('IBM Plex Mono')));
});
