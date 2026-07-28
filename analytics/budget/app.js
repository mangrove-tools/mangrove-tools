/**
 * analytics/budget/app.js
 * Budget Advisor — Marginality × Budget Appropriation Hybrid
 */
'use strict';

(function () {
  // DOM refs
  const form = document.getElementById('budget-form');
  const periodSel = document.getElementById('period');
  const totalBudgetInput = document.getElementById('total-budget');
  const numChannelsSel = document.getElementById('num-channels');
  const targetMetricSel = document.getElementById('target-metric');
  const sampleDataButton = document.getElementById('use-sample-data');
  const channelRows = document.getElementById('channel-rows');
  const resultsNote = document.getElementById('results-note');
  const totalConversions = document.getElementById('total-conversions');
  const guardrail = document.getElementById('guardrail');
  const guardrailText = document.getElementById('guardrail-text');
  const chartWrap = document.getElementById('chart-wrap');
  const allocationTableWrap = document.getElementById('allocation-table-wrap');
  const allocationTbody = document.getElementById('allocation-tbody');
  const nextSteps = document.getElementById('next-steps');

  // Channel name presets
  const CHANNEL_PRESETS = [
    'Google Ads', 'Meta Ads', 'Email / Newsletter', 'SEO / Organic',
    'YouTube', 'TikTok', 'Podcast Ads', 'LinkedIn Ads', 'Influencer', 'Other'
  ];

  /** Build channel input rows */
  function buildChannelRows(count) {
    channelRows.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const preset = CHANNEL_PRESETS[i] || `Channel ${i + 1}`;
      const row = document.createElement('div');
      row.className = 'channel-row field-wide';
      row.innerHTML = `
        <div class="field channel-name-field">
          <label>
            Channel ${i + 1}
          </label>
          <input type="text" class="ch-name" value="${preset}"
            aria-label="Channel ${i + 1} name" />
        </div>
        <div class="field">
          <label>Monthly spend ($)</label>
          <input type="number" class="ch-spend" inputmode="numeric" min="0" step="50"
            placeholder="e.g. 2000"
            aria-label="Monthly spend for channel ${i + 1}" />
        </div>
        <div class="field">
          <label>Monthly conversions</label>
          <input type="number" class="ch-conversions" inputmode="numeric" min="0" step="1"
            placeholder="e.g. 50"
            aria-label="Monthly conversions for channel ${i + 1}" />
        </div>
        <div class="field">
          <label>Months of data</label>
          <input type="number" class="ch-months" inputmode="numeric" min="1" max="36" step="1"
            value="6" min="1"
            aria-label="Months of data for channel ${i + 1}" />
        </div>
        <div class="field">
          <label>Min spend ($)</label>
          <input type="number" class="ch-min" inputmode="numeric" min="0" step="50" value="0"
            aria-label="Minimum spend for channel ${i + 1}" />
        </div>
      `;
      channelRows.appendChild(row);
    }
  }

  /** Read form data into channel objects */
  function readChannels() {
    const rows = channelRows.querySelectorAll('.channel-row');
    return Array.from(rows).map((row, i) => {
      const name = row.querySelector('.ch-name').value.trim() || `Channel ${i + 1}`;
      const spend = parseFloat(row.querySelector('.ch-spend').value) || 0;
      const conversions = parseFloat(row.querySelector('.ch-conversions').value) || 0;
      const months = parseInt(row.querySelector('.ch-months').value, 10) || 6;
      const minSpend = parseFloat(row.querySelector('.ch-min').value) || 0;
      const sampleDataPoints = row.dataset.sampleDataPoints
        ? JSON.parse(row.dataset.sampleDataPoints)
        : null;

      // Synthesize monthly data points from aggregate
      // This is a simplification: we use the monthly spend/conversions as one data point
      // and create synthetic variation for the power-law fit
      const dataPoints = [];
      if (sampleDataPoints) {
        dataPoints.push(...sampleDataPoints);
      } else if (months >= 1 && spend > 0 && conversions > 0) {
        // Use the single aggregate as the representative point
        dataPoints.push({ spend, conversions });
        // Add realistic lower/higher synthetic points for aggregate entry.
        if (months >= 3 && spend > 50) {
          dataPoints.unshift({
            spend: spend * 0.65,
            conversions: conversions * Math.pow(0.65, 0.82)
          });
          dataPoints.push({
            spend: spend * 1.25,
            conversions: conversions * Math.pow(1.25, 0.82)
          });
        } else if (spend > 50) {
          const scaledSpend = spend * 0.2;
          const scaledConversions = conversions * 0.2;
          dataPoints.push({ spend: scaledSpend, conversions: scaledConversions });
        }
      }

      return { channel: name, spend, conversions, months, minSpend, dataPoints };
    });
  }

  /** Format currency */
  function fmtCurrency(v) {
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
    return '$' + Math.round(v).toLocaleString();
  }

  /** Format CPA */
  function fmtCPA(v) {
    if (!isFinite(v) || v > 1000000) return '—';
    return '$' + Math.round(v).toLocaleString();
  }

  /** Render results */
  function renderResults(channels, result, validation) {
    if (!validation.ok) {
      guardrail.hidden = false;
      guardrailText.textContent = validation.reason;
      chartWrap.hidden = true;
      allocationTableWrap.hidden = true;
      totalConversions.textContent = '—';
      resultsNote.textContent = 'Not enough data to run the model.';
      nextSteps.hidden = true;
      return;
    }

    guardrail.hidden = true;

    const totalConv = result.reduce((s, r) => s + r.expectedConversions, 0);
    totalConversions.textContent = totalConv < 1000
      ? Math.round(totalConv).toLocaleString() + ' expected conversions'
      : (totalConv / 1000).toFixed(1) + 'k expected conversions';

    resultsNote.textContent = 'Based on your historical data and total budget.';

    // Chart
    chartWrap.hidden = false;
    const canvas = document.getElementById('allocation-chart');
    const chartData = result.map(r => ({
      label: r.channel,
      current: r.currentSpend,
      recommended: r.recommendedSpend
    }));
    MangroveCharts.drawAllocationChart(canvas, chartData, '$');

    // Table
    allocationTableWrap.hidden = false;
    allocationTbody.innerHTML = '';
    result.forEach(r => {
      const tr = document.createElement('tr');
      const currentChange = r.recommendedSpend - r.currentSpend;
      const changeStr = currentChange !== 0
        ? (currentChange > 0 ? '+' : '') + fmtCurrency(currentChange)
        : '—';
      const changeColor = currentChange > 0 ? 'color:#2f5d3a' : currentChange < 0 ? 'color:#8a3b2a' : '';
      tr.innerHTML = `
        <td style="font-weight:600;color:var(--ink);">${r.channel}</td>
        <td style="font-variant-numeric:tabular-nums;">${fmtCurrency(r.currentSpend)}</td>
        <td style="font-variant-numeric:tabular-nums;">
          ${fmtCurrency(r.recommendedSpend)}
          <span style="font-size:0.8em;${changeColor}">${changeStr}</span>
        </td>
        <td style="font-variant-numeric:tabular-nums;">${fmtCPA(r.marginalCPA)}</td>
        <td style="font-variant-numeric:tabular-nums;">${(r.contributionPct * 100).toFixed(1)}%</td>
      `;
      allocationTbody.appendChild(tr);
    });

    nextSteps.hidden = false;
  }

  /** Populate and run the built-in small-business example */
  function useSampleData() {
    const sample = window.MangroveBudgetSampleData;
    if (!sample) return;

    periodSel.value = sample.period;
    targetMetricSel.value = sample.targetMetric;
    totalBudgetInput.value = String(sample.totalBudget);
    numChannelsSel.value = String(sample.channels.length);
    buildChannelRows(sample.channels.length);

    const rows = channelRows.querySelectorAll('.channel-row');
    sample.channels.forEach((channel, i) => {
      const row = rows[i];
      row.querySelector('.ch-name').value = channel.channel;
      row.querySelector('.ch-spend').value = String(channel.spend);
      row.querySelector('.ch-conversions').value = String(channel.conversions);
      row.querySelector('.ch-months').value = String(channel.months);
      row.querySelector('.ch-min').value = String(channel.minSpend);
      row.dataset.sampleDataPoints = JSON.stringify(channel.dataPoints);
    });

    form._hasRunOnce = true;
    handleSubmit(new Event('submit'));
    resultsNote.textContent = 'Sample small-business marketing data. Adjust any value to make it yours.';
  }

  /** Handle form submit */
  function handleSubmit(e) {
    e.preventDefault();

    const totalBudget = parseFloat(document.getElementById('total-budget').value) || 0;
    if (totalBudget <= 0) {
      resultsNote.textContent = 'Enter a total budget greater than zero.';
      return;
    }

    const channels = readChannels();

    // Validate
    const validation = MangroveResponseCurve.validateDataQuality(channels);
    if (!validation.ok) {
      renderResults(channels, [], validation);
      return;
    }

    // Fit curves and optimize
    const fittedChannels = channels.map(ch => {
      const curve = MangroveResponseCurve.fitPowerLaw(ch.dataPoints);
      return { ...ch, curve };
    }).filter(ch => ch.curve !== null);

    const result = MangroveResponseCurve.optimizeBudget(fittedChannels, totalBudget);
    renderResults(fittedChannels, result, { ok: true, reason: '', supported: ['budget'] });
  }

  /** Budget slider sync */
  function setupBudgetSlider() {
    totalBudgetInput.addEventListener('input', () => {
      // Re-run on slider change with debounce
      clearTimeout(totalBudgetInput._debounce);
      totalBudgetInput._debounce = setTimeout(() => {
        if (form._hasRunOnce) handleSubmit(new Event('submit'));
      }, 400);
    });
  }

  /** Init */
  function init() {
    buildChannelRows(parseInt(numChannelsSel.value, 10));

    numChannelsSel.addEventListener('change', () => {
      buildChannelRows(parseInt(numChannelsSel.value, 10));
    });

    channelRows.addEventListener('input', (e) => {
      const row = e.target.closest('.channel-row');
      if (row) delete row.dataset.sampleDataPoints;
    });

    form.addEventListener('submit', (e) => {
      form._hasRunOnce = true;
      handleSubmit(e);
    });

    sampleDataButton.addEventListener('click', useSampleData);

    setupBudgetSlider();
  }

  init();
})();
