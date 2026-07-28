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
  const fillRects = [];
  const fills = [];
  const strokes = [];
  const fonts = [];
  const labels = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
    scale() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    arc() {},
    setLineDash() {},
    fillRect(...args) {
      fillRects.push({ style: this.fillStyle, args });
    },
    fill() {
      fills.push(this.fillStyle);
    },
    stroke() {
      strokes.push(this.strokeStyle);
    },
    fillText(text, x, y) {
      fonts.push(this.font);
      labels.push({ text, x, y, align: this.textAlign });
    }
  };

  return {
    canvas: {
      width: 0,
      height: 0,
      getContext() {
        return context;
      },
      getBoundingClientRect() {
        return { width, height };
      }
    },
    fillRects,
    fills,
    strokes,
    fonts,
    labels
  };
}

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
  assert.ok(view.strokes.includes(cssValues['--accent']));
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
