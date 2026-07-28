/**
 * analytics/budget/app.js
 * Budget Advisor — Marginality × Budget Appropriation Hybrid
 */
'use strict';

(function () {
  // DOM refs
  const form = document.getElementById('budget-form');
  const numChannelsSel = document.getElementById('num-channels');
  const channelRows = document.getElementById('channel-rows');
  const resultsNote = document.getElementById('results-note');
  const totalConversions = document.getElementById('total-conversions');
  const guardrail = document.getElementById('guardrail');
  const guardrailText = document.getElementById('guardrail-text');
  const chartWrap = document.getElementById('chart-wrap');
  const allocationTableWrap = document.getElementById('allocation-table-wrap');
  const allocationTbody = document.getElementById('allocation-tbody');
  const nextSteps = document.getElementById('next-steps');
  const recommendationExplanation = document.getElementById('recommendation-explanation');
  const explanationConfidence = document.getElementById('explanation-confidence');
  const explanationDriver = document.getElementById('explanation-driver');
  const explanationCaveat = document.getElementById('explanation-caveat');

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
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;padding:0.75rem 0;border-top:1px solid var(--line);';
      row.innerHTML = `
        <div class="field" style="grid-column:1/-1;display:flex;flex-direction:column;gap:0.3rem;">
          <label style="font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-soft);">
            Channel ${i + 1}
          </label>
          <input type="text" class="ch-name" value="${preset}"
            style="width:100%;border:1px solid var(--line);border-radius:2px;padding:0.65rem 0.85rem;background:var(--surface);color:var(--ink);font:inherit;font-weight:500;"
            aria-label="Channel ${i + 1} name" />
        </div>
        <div class="field">
          <label style="font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-soft);">Monthly spend ($)</label>
          <input type="number" class="ch-spend" inputmode="numeric" min="0" step="50"
            placeholder="e.g. 2000"
            style="width:100%;border:1px solid var(--line);border-radius:2px;padding:0.65rem 0.85rem;background:var(--surface);color:var(--ink);font:inherit;"
            aria-label="Monthly spend for channel ${i + 1}" />
        </div>
        <div class="field">
          <label style="font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-soft);">Monthly conversions</label>
          <input type="number" class="ch-conversions" inputmode="numeric" min="0" step="1"
            placeholder="e.g. 50"
            style="width:100%;border:1px solid var(--line);border-radius:2px;padding:0.65rem 0.85rem;background:var(--surface);color:var(--ink);font:inherit;"
            aria-label="Monthly conversions for channel ${i + 1}" />
        </div>
        <div class="field">
          <label style="font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-soft);">Months of data</label>
          <input type="number" class="ch-months" inputmode="numeric" min="1" max="36" step="1"
            value="6" min="1"
            style="width:100%;border:1px solid var(--line);border-radius:2px;padding:0.65rem 0.85rem;background:var(--surface);color:var(--ink);font:inherit;"
            aria-label="Months of data for channel ${i + 1}" />
        </div>
        <div class="field">
          <label style="font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-soft);">Min spend ($)</label>
          <input type="number" class="ch-min" inputmode="numeric" min="0" step="50" value="0"
            style="width:100%;border:1px solid var(--line);border-radius:2px;padding:0.65rem 0.85rem;background:var(--surface);color:var(--ink);font:inherit;"
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

      // Synthesize monthly data points from aggregate
      // This is a simplification: we use the monthly spend/conversions as one data point
      // and create synthetic variation for the power-law fit
      const dataPoints = [];
      if (months >= 1 && spend > 0 && conversions > 0) {
        // Use the single aggregate as the representative point
        dataPoints.push({ spend, conversions });
        // Add a scaled-down synthetic point (20% spend) for curve fitting
        if (spend > 50) {
          const scaledSpend = spend * 0.2;
          const scaledConversions = conversions * 0.2;
          const scaledMidSpend = spend * 0.6;
          const scaledMidConversions = conversions * 0.6;
          dataPoints.push({ spend: scaledSpend, conversions: scaledConversions });
          dataPoints.push({ spend: scaledMidSpend, conversions: scaledMidConversions });
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

  function confidenceLabel(channels) {
    const avgR2 = channels.reduce((sum, ch) => sum + (ch.curve?.r2 || 0), 0) / channels.length;
    const minPoints = Math.min(...channels.map(ch => ch.dataPoints?.length || 0));
    if (channels.length >= 4 && minPoints >= 6 && avgR2 >= 0.8) return 'High';
    if (channels.length >= 3 && minPoints >= 3 && avgR2 >= 0.55) return 'Medium';
    return 'Directional';
  }

  function renderExplanation(channels, result) {
    if (!recommendationExplanation || result.length === 0) return;

    const strongestIncrease = result
      .map(r => ({ ...r, change: r.recommendedSpend - r.currentSpend }))
      .sort((a, b) => b.change - a.change)[0];
    const bestMarginal = [...result].sort((a, b) => a.marginalCPA - b.marginalCPA)[0];
    const confidence = confidenceLabel(channels);

    explanationConfidence.textContent = `${confidence} - based on ${channels.length} modeled channels and the fitted response curves.`;
    explanationDriver.textContent = strongestIncrease && strongestIncrease.change > 1
      ? `${strongestIncrease.channel} receives the largest increase because its modeled marginal CPA is strongest at the recommended allocation.`
      : `${bestMarginal.channel} has the lowest modeled marginal CPA, so the allocation stays close to the current mix.`;
    explanationCaveat.textContent = 'Treat this as a planning signal; sparse history, tracking changes, or campaign mix shifts can change the real next-dollar return.';
    recommendationExplanation.hidden = false;
  }

  function hideExplanation() {
    if (recommendationExplanation) recommendationExplanation.hidden = true;
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
      hideExplanation();
      return;
    }

    guardrail.hidden = true;

    const totalConv = result.reduce((s, r) => s + r.expectedConversions, 0);
    totalConversions.textContent = totalConv < 1000
      ? Math.round(totalConv).toLocaleString() + ' expected conversions'
      : (totalConv / 1000).toFixed(1) + 'k expected conversions';

    resultsNote.textContent = 'Based on your historical data and total budget.';
    renderExplanation(channels, result);

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

  /** Handle form submit */
  function handleSubmit(e) {
    e.preventDefault();

    const totalBudget = parseFloat(document.getElementById('total-budget').value) || 0;
    if (totalBudget <= 0) {
      resultsNote.textContent = 'Enter a total budget greater than zero.';
      hideExplanation();
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
    const budgetInput = document.getElementById('total-budget');
    budgetInput.addEventListener('input', () => {
      // Re-run on slider change with debounce
      clearTimeout(budgetInput._debounce);
      budgetInput._debounce = setTimeout(() => {
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

    form.addEventListener('submit', (e) => {
      form._hasRunOnce = true;
      handleSubmit(e);
    });

    setupBudgetSlider();
  }

  init();
})();
