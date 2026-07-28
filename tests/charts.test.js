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
    fillText() {
      fonts.push(this.font);
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
    fonts
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
});
