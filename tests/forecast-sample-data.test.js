'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'analytics/forecast/app.js'), 'utf8');
const pageSource = fs.readFileSync(
  path.join(root, 'analytics/forecast/index.html'),
  'utf8'
);

assert.match(pageSource, /id="use-sample-data"/);

function createElement(tagName) {
  const listeners = {};
  const children = [];
  return {
    tagName: tagName.toUpperCase(),
    children,
    className: '',
    hidden: false,
    value: '',
    textContent: '',
    innerHTML: '',
    dataset: {},
    attributes: {},
    style: {},
    appendChild(child) {
      children.push(child);
      return child;
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    dispatchEvent(event) {
      if (listeners[event.type]) listeners[event.type](event);
    },
    requestSubmit() {
      if (listeners.submit) {
        listeners.submit({
          type: 'submit',
          preventDefault() {}
        });
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function loadForecastApp() {
  const elements = new Map();
  const productEvents = [];
  const document = {
    createElement,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement('div'));
      return elements.get(id);
    }
  };

  const ids = [
    'forecast-form',
    'data-method',
    'paste-area',
    'manual-area',
    'manual-rows',
    'add-row',
    'forecast-summary',
    'results-note',
    'guardrail',
    'guardrail-text',
    'chart-wrap',
    'forecast-table-wrap',
    'forecast-tbody',
    'target-prob',
    'target-prob-text',
    'next-steps',
    'metric-type',
    'horizon',
    'seasonality-toggle',
    'growth-target',
    'csv-input',
    'use-sample-data',
    'forecast-chart'
  ];
  ids.forEach(id => document.getElementById(id));

  document.getElementById('data-method').value = 'paste';
  document.getElementById('metric-type').value = 'conversions';
  document.getElementById('horizon').value = '3';
  document.getElementById('seasonality-toggle').value = 'false';
  document.getElementById('growth-target').value = '';

  const context = {
    document,
    window: {
      MangroveForecast: {
        parseCSVData(text) {
          return text.trim().split('\n').slice(1).map(line => {
            const [month, value] = line.split(',');
            return { month, value: Number(value) };
          });
        },
        validateHistoricalData(data) {
          return { ok: data.length >= 12, reason: '', issues: [] };
        },
        prepareTimeSeries(data) {
          return data.map((row, index) => ({ x: index, y: row.value, month: row.month }));
        },
        generateForecast(timeSeries, horizon) {
          const last = timeSeries[timeSeries.length - 1].y;
          return {
            forecast: Array.from({ length: horizon }, (_, index) => ({
              month: `2026-${String(index + 1).padStart(2, '0')}`,
              value: last + ((index + 1) * 1200),
              lower: last + ((index + 1) * 700),
              upper: last + ((index + 1) * 1700)
            }))
          };
        },
        probabilityOfHittingTarget() {
          return 0.78;
        }
      },
      MangroveCharts: {
        drawForecastChart(canvas, timeSeries, forecast, prefix) {
          canvas.drawn = { timeSeries, forecast, prefix };
        }
      },
      MangroveToolExtras: {
        trackProductEvent(eventName, payload) {
          productEvents.push({ eventName, payload });
        }
      }
    }
  };
  context.MangroveForecast = context.window.MangroveForecast;
  context.MangroveCharts = context.window.MangroveCharts;
  vm.createContext(context);
  vm.runInContext(appSource, context);

  return { document, productEvents };
}

const { document, productEvents } = loadForecastApp();
document.getElementById('use-sample-data').dispatchEvent({ type: 'click' });

assert.strictEqual(document.getElementById('metric-type').value, 'revenue');
assert.strictEqual(document.getElementById('horizon').value, '6');
assert.strictEqual(document.getElementById('seasonality-toggle').value, 'true');
assert.strictEqual(document.getElementById('growth-target').value, '42000');
assert.strictEqual(document.getElementById('data-method').value, 'paste');
assert.match(document.getElementById('csv-input').value, /^date,value\n2025-01,28600/m);
assert.match(document.getElementById('forecast-summary').textContent, /^Avg \$[0-9.]+k\/mo over 6 months$/);
assert.strictEqual(document.getElementById('chart-wrap').hidden, false);
assert.strictEqual(document.getElementById('forecast-table-wrap').hidden, false);
assert.strictEqual(document.getElementById('next-steps').hidden, false);
assert.strictEqual(document.getElementById('guardrail').hidden, true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(productEvents)), [
  {
    eventName: 'sample_data_used',
    payload: {
      route: '/analytics/forecast/',
      tool: 'Revenue Forecaster',
      action: 'sample'
    }
  },
  {
    eventName: 'tool_started',
    payload: {
      route: '/analytics/forecast/',
      tool: 'Revenue Forecaster',
      action: 'sample'
    }
  },
  {
    eventName: 'calculation_completed',
    payload: {
      route: '/analytics/forecast/',
      tool: 'Revenue Forecaster',
      action: 'sample'
    }
  }
]);
