/**
 * analytics/forecast/app.js
 * Revenue Forecaster — trend + seasonality forecasting
 */
'use strict';

(function () {
  const form = document.getElementById('forecast-form');
  const dataMethodSel = document.getElementById('data-method');
  const pasteArea = document.getElementById('paste-area');
  const manualArea = document.getElementById('manual-area');
  const manualRows = document.getElementById('manual-rows');
  const addRowBtn = document.getElementById('add-row');
  const forecastSummary = document.getElementById('forecast-summary');
  const resultsNote = document.getElementById('results-note');
  const guardrail = document.getElementById('guardrail');
  const guardrailText = document.getElementById('guardrail-text');
  const chartWrap = document.getElementById('chart-wrap');
  const forecastTableWrap = document.getElementById('forecast-table-wrap');
  const forecastTbody = document.getElementById('forecast-tbody');
  const targetProb = document.getElementById('target-prob');
  const targetProbText = document.getElementById('target-prob-text');
  const nextSteps = document.getElementById('next-steps');

  const METRIC_LABELS = { revenue: 'Revenue', conversions: 'Conversions' };

  let manualRowCount = 6;

  function buildManualRows(count) {
    manualRows.innerHTML = '';
    // Pre-fill with months starting 12 months ago
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toISOString().slice(0, 7);
      addManualRow(month, '');
    }
  }

  function addManualRow(monthVal, valueVal) {
    const row = document.createElement('div');
    row.className = 'manual-row';

    const monthInput = document.createElement('input');
    monthInput.type = 'month';
    monthInput.className = 'manual-month';
    monthInput.value = monthVal;

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'manual-value';
    valueInput.inputMode = 'numeric';
    valueInput.min = '0';
    valueInput.step = '1';
    valueInput.placeholder = 'Value';
    valueInput.value = valueVal;

    row.appendChild(monthInput);
    row.appendChild(valueInput);
    manualRows.appendChild(row);
  }

  function getHistoricalData() {
    const method = dataMethodSel.value;
    if (method === 'paste') {
      const text = document.getElementById('csv-input').value.trim();
      return MangroveForecast.parseCSVData(text);
    } else {
      const rows = manualRows.querySelectorAll('.manual-row');
      const data = [];
      rows.forEach(row => {
        const month = row.querySelector('.manual-month').value;
        const value = parseFloat(row.querySelector('.manual-value').value);
        if (month && !isNaN(value)) {
          data.push({ month, value });
        }
      });
      return data;
    }
  }

  function fmtValue(v, metric) {
    if (metric === 'revenue') {
      if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M';
      if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
      return '$' + Math.round(v).toLocaleString();
    }
    return Math.round(v).toLocaleString();
  }

  function fmtTarget(v, metric) {
    return metric === 'revenue' ? fmtValue(v, 'revenue') : Math.round(v).toLocaleString() + ' conversions';
  }

  function renderResults(historical, forecast, validation, metric, growthTarget) {
    if (!validation.ok) {
      guardrail.hidden = false;
      guardrailText.textContent = validation.reason;
      chartWrap.hidden = true;
      forecastTableWrap.hidden = true;
      targetProb.hidden = true;
      forecastSummary.textContent = '—';
      resultsNote.textContent = 'Fix the data issues above.';
      nextSteps.hidden = true;
      return;
    }

    guardrail.hidden = true;

    // Summary
    const totalForecast = forecast.reduce((s, f) => s + f.value, 0);
    const avgMonthly = totalForecast / (forecast.length || 1);
    forecastSummary.textContent = `Avg ${fmtValue(avgMonthly, metric)}/mo over ${forecast.length} months`;

    const issues = validation.issues || [];
    if (issues.length > 0) {
      guardrail.hidden = false;
      guardrailText.textContent = 'Data note: ' + issues.join('. ');
    }

    resultsNote.textContent = 'Historical data + forecast with 95% confidence band.';

    // Chart
    const ts = MangroveForecast.prepareTimeSeries(historical);
    chartWrap.hidden = false;
    const canvas = document.getElementById('forecast-chart');
    MangroveCharts.drawForecastChart(canvas, ts, forecast, metric === 'revenue' ? '$' : '');

    // Table
    forecastTableWrap.hidden = false;
    forecastTbody.innerHTML = '';
    forecast.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;color:var(--ink);">${f.month}</td>
        <td style="font-variant-numeric:tabular-nums;">${fmtValue(f.value, metric)}</td>
        <td style="font-variant-numeric:tabular-nums;color:var(--ink-soft);">${fmtValue(f.lower, metric)}</td>
        <td style="font-variant-numeric:tabular-nums;color:var(--ink-soft);">${fmtValue(f.upper, metric)}</td>
      `;
      forecastTbody.appendChild(tr);
    });

    // Growth target probability
    if (growthTarget > 0) {
      targetProb.hidden = false;
      const prob = MangroveForecast.probabilityOfHittingTarget(forecast, growthTarget);
      const probPct = Math.round(prob * 100);
      const verdict = probPct >= 70 ? 'likely' : probPct >= 40 ? 'possible' : 'unlikely';
      targetProbText.textContent = `Probability of averaging ${fmtTarget(growthTarget, metric)}/mo: ${probPct}% — ${verdict} based on current trajectory.`;
    } else {
      targetProb.hidden = true;
    }

    nextSteps.hidden = false;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const metric = document.getElementById('metric-type').value;
    const horizon = parseInt(document.getElementById('horizon').value, 10);
    const seasonality = document.getElementById('seasonality-toggle').value === 'true';
    const growthTarget = parseFloat(document.getElementById('growth-target').value) || 0;

    const historical = getHistoricalData();

    // Validate
    const validation = MangroveForecast.validateHistoricalData(historical);

    if (!validation.ok) {
      renderResults(historical, [], validation, metric, growthTarget);
      return;
    }

    const timeSeries = MangroveForecast.prepareTimeSeries(historical);
    const result = MangroveForecast.generateForecast(timeSeries, horizon, seasonality);

    renderResults(historical, result.forecast, { ok: true, reason: '', issues: [] }, metric, growthTarget);
  }

  function init() {
    buildManualRows(manualRowCount);

    dataMethodSel.addEventListener('change', () => {
      if (dataMethodSel.value === 'paste') {
        pasteArea.hidden = false;
        manualArea.hidden = true;
      } else {
        pasteArea.hidden = true;
        manualArea.hidden = false;
      }
    });

    addRowBtn.addEventListener('click', () => {
      const lastRow = manualRows.querySelector('.manual-row:last-child');
      const lastMonth = lastRow ? lastRow.querySelector('.manual-month').value : '';
      let nextMonth = '';
      if (lastMonth) {
        const d = new Date(lastMonth + '-01');
        d.setMonth(d.getMonth() + 1);
        nextMonth = d.toISOString().slice(0, 7);
      }
      addManualRow(nextMonth, '');
    });

    form.addEventListener('submit', handleSubmit);
  }

  init();
})();
