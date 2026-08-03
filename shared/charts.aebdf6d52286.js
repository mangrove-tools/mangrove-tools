/**
 * shared/charts.js
 * Lightweight vanilla JS canvas chart utilities for Mangrove Tools analytics pages.
 * No dependencies. Supports bar charts and line charts with optional bands.
 */

'use strict';

function getChartColors() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    current: read('--signal', '#d4a85c'),
    recommended: read('--accent', '#42a28e'),
    confidence: read('--signal-soft', 'rgba(212, 168, 92, 0.11)'),
    text: read('--ink', '#f5f3ef'),
    muted: read('--ink-soft', '#a8aaa5'),
    grid: read('--line', 'rgba(232, 238, 233, 0.1)')
  };
}

function fitCanvasText(ctx, text, maxWidth) {
  const value = String(text);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return '';
  if (ctx.measureText(value).width <= maxWidth) return value;

  const ellipsis = '…';
  if (ctx.measureText(ellipsis).width > maxWidth) return '';

  let end = value.length;
  while (end > 0 && ctx.measureText(value.slice(0, end) + ellipsis).width > maxWidth) {
    end -= 1;
  }
  return value.slice(0, end) + ellipsis;
}

function chartValue(value, unit, signed) {
  const rounded = Math.round(value);
  const absolute = Math.abs(rounded).toLocaleString();
  const prefix = signed && rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return prefix + (unit === '$' ? '$' : '') + absolute;
}

function prepareCanvas(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.getBoundingClientRect !== 'function') {
    return null;
  }
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  if (!ctx || !rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)
    || rect.width <= 0 || rect.height <= 0 || typeof ctx.clearRect !== 'function'
    || typeof ctx.scale !== 'function') {
    return null;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx, width: rect.width, height: rect.height };
}

/**
 * Draw a horizontal bar chart (current vs recommended allocation).
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{label: string, current: number, recommended: number}>} data
 * @param {string} unit - e.g. "$" or ""
 */
function drawAllocationChart(canvas, data, unit) {
  const rows = Array.isArray(data) ? data : [];
  const validRows = rows.length > 0 && rows.every((row) => (
    row && typeof row.label === 'string'
      && Number.isFinite(row.current) && row.current >= 0
      && Number.isFinite(row.recommended) && row.recommended >= 0
  ));
  if (!validRows) return;

  const view = prepareCanvas(canvas);
  if (!view) return;
  const ctx = view.ctx;
  const W = view.width;
  const H = view.height;
  const colors = getChartColors();
  const chartUnit = unit === '$' ? '$' : '';
  const allValues = rows.flatMap((row) => [row.current, row.recommended]);
  const maxVal = Math.max(...allValues, 1);
  const outer = 4;
  const legendSpace = Math.min(28, Math.max(20, H * 0.14));
  const chartHeight = Math.max(0, H - legendSpace);
  const rowH = chartHeight / rows.length;

  ctx.font = '600 11px IBM Plex Mono, monospace';
  const valueWidth = Math.min(
    Math.max(...allValues.map((value) => ctx.measureText(chartValue(value, chartUnit, false)).width), 0) + 8,
    Math.max(0, W * 0.38)
  );
  const labelWidth = Math.max(0, Math.min(W * 0.36, W - outer * 2 - valueWidth - 12));
  const barStart = outer + labelWidth + 8;
  const barEnd = Math.max(barStart, W - outer - valueWidth);
  const barMaxWidth = Math.max(0, barEnd - barStart);

  rows.forEach((row, index) => {
    const y = index * rowH;
    const labelY = y + rowH / 2;
    const barHeight = Math.max(0, Math.min(11, rowH * 0.32));
    const currentY = y + Math.max(0, rowH * 0.14);
    const recommendedY = y + Math.max(0, rowH * 0.58);

    ctx.fillStyle = colors.text;
    ctx.font = '500 12px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitCanvasText(ctx, row.label, labelWidth), outer, labelY);

    const currentWidth = Math.max(0, Math.min(barMaxWidth, (row.current / maxVal) * barMaxWidth));
    ctx.fillStyle = colors.current;
    ctx.fillRect(barStart, currentY, currentWidth, barHeight);

    const recommendedWidth = Math.max(0, Math.min(barMaxWidth, (row.recommended / maxVal) * barMaxWidth));
    ctx.fillStyle = colors.recommended;
    ctx.fillRect(barStart, recommendedY, recommendedWidth, barHeight);

    ctx.fillStyle = colors.muted;
    ctx.font = '600 11px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(chartValue(row.current, chartUnit, false), W - outer, currentY + barHeight / 2);
    ctx.fillStyle = colors.recommended;
    ctx.fillText(chartValue(row.recommended, chartUnit, false), W - outer, recommendedY + barHeight / 2);
  });

  ctx.font = '500 11px IBM Plex Mono, monospace';
  const currentLegend = 'Current';
  const recommendedLegend = 'Recommended';
  const legendWidth = 12 + 4 + ctx.measureText(currentLegend).width + 14
    + 12 + 4 + ctx.measureText(recommendedLegend).width;
  const legendX = Math.max(outer, Math.min((W - legendWidth) / 2, W - legendWidth - outer));
  const legendY = Math.max(chartHeight + 4, H - 16);
  ctx.fillStyle = colors.current;
  ctx.fillRect(legendX, legendY, 12, 8);
  ctx.fillStyle = colors.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentLegend, legendX + 16, legendY + 4);

  ctx.fillStyle = colors.recommended;
  const recommendedX = legendX + 16 + ctx.measureText(currentLegend).width + 14;
  ctx.fillRect(recommendedX, legendY, 12, 8);
  ctx.fillStyle = colors.muted;
  ctx.fillText(recommendedLegend, recommendedX + 16, legendY + 4);
}

/**
 * Draw a signed current/recommended outcome comparison around a zero baseline.
 * @param {HTMLCanvasElement} canvas
 * @param {{current: number, recommended: number, difference: number}} comparison
 * @param {{unit: '$'|'', metricLabel: string}} options
 */
function drawOutcomeComparisonChart(canvas, comparison, options) {
  if (!comparison || !Number.isFinite(comparison.current) || !Number.isFinite(comparison.recommended)
    || !Number.isFinite(comparison.difference) || !options
    || (options.unit !== '$' && options.unit !== '') || typeof options.metricLabel !== 'string') {
    return;
  }

  const view = prepareCanvas(canvas);
  if (!view) return;
  const ctx = view.ctx;
  const W = view.width;
  const H = view.height;
  const colors = getChartColors();
  const outer = 4;
  const currentValue = chartValue(comparison.current, options.unit, false);
  const recommendedValue = chartValue(comparison.recommended, options.unit, false);
  const differenceValue = chartValue(comparison.difference, options.unit, true);

  ctx.font = '600 11px IBM Plex Mono, monospace';
  const valueWidth = Math.min(
    Math.max(ctx.measureText(currentValue).width, ctx.measureText(recommendedValue).width) + 8,
    Math.max(0, W * 0.36)
  );
  const labelWidth = Math.max(0, Math.min(W * 0.3, W - outer * 2 - valueWidth - 12));
  const plotLeft = outer + labelWidth + 8;
  const plotRight = Math.max(plotLeft, W - outer - valueWidth);
  const plotWidth = Math.max(0, plotRight - plotLeft);
  const top = 28;
  const bottom = 30;
  const rowH = Math.max(0, Math.min(44, (H - top - bottom) / 2));
  const barHeight = Math.max(0, Math.min(12, rowH * 0.38));
  const minValue = Math.min(0, comparison.current, comparison.recommended);
  const maxValue = Math.max(0, comparison.current, comparison.recommended);
  const span = Math.max(maxValue - minValue, 1);
  const zeroX = plotLeft + ((0 - minValue) / span) * plotWidth;
  const scaleX = value => plotLeft + ((value - minValue) / span) * plotWidth;

  ctx.fillStyle = colors.muted;
  ctx.font = '600 10px IBM Plex Mono, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitCanvasText(ctx, options.metricLabel, Math.max(0, W - outer * 2)), outer, 6);

  if (minValue < 0) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(zeroX, top - 4);
    ctx.lineTo(zeroX, top + rowH * 2);
    ctx.stroke();
  }

  [
    { label: 'Current', value: comparison.current, valueLabel: currentValue, color: colors.current },
    { label: 'Recommended', value: comparison.recommended, valueLabel: recommendedValue, color: colors.recommended }
  ].forEach((row, index) => {
    const y = top + index * rowH;
    const scaledX = scaleX(row.value);
    const barX = Math.min(zeroX, scaledX);
    const barWidth = Math.abs(scaledX - zeroX);

    ctx.fillStyle = colors.text;
    ctx.font = '500 11px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitCanvasText(ctx, row.label, labelWidth), outer, y + rowH / 2);

    ctx.fillStyle = row.color;
    ctx.fillRect(barX, y + (rowH - barHeight) / 2, barWidth, barHeight);

    ctx.fillStyle = row.color;
    ctx.font = '600 11px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(row.valueLabel, W - outer, y + rowH / 2);
  });

  const differenceY = Math.min(H - 6, top + rowH * 2 + 8);
  ctx.fillStyle = colors.muted;
  ctx.font = '500 10px IBM Plex Mono, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitCanvasText(ctx, 'Modeled difference', Math.max(0, W - outer * 2 - ctx.measureText(differenceValue).width - 8)), outer, differenceY);
  ctx.fillStyle = colors.recommended;
  ctx.textAlign = 'right';
  ctx.fillText(differenceValue, W - outer, differenceY);
}

/**
 * Draw a line chart with historical data and forecast + confidence bands.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{x: number, y: number}>} historical
 * @param {Array<{month: string, value: number, lower: number, upper: number}>} forecast
 * @param {string} unit
 */
function drawForecastChart(canvas, historical, forecast, unit) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const pad = { top: 16, right: 16, bottom: 36, left: 56 };
  const base = getChartColors();
  const colors = {
    line: base.recommended,
    band: base.confidence,
    historical: base.text,
    grid: base.grid,
    text: base.muted,
    axis: base.text
  };

  ctx.clearRect(0, 0, W, H);

  // Combine historical + forecast for scaling
  const allY = [
    ...historical.map(p => p.y),
    ...forecast.map(f => f.upper)
  ];
  const minY = 0;
  const maxY = Math.max(...allY, 1) * 1.1;

  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const totalPoints = historical.length + forecast.length;

  // Scale functions
  const scaleX = (i) => pad.left + (i / (totalPoints - 1)) * chartW;
  const scaleY = (v) => pad.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

  // Grid lines (5 horizontal)
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.top + (g / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();

    const val = maxY - (g / 4) * (maxY - minY);
    ctx.fillStyle = colors.text;
    ctx.font = '500 10px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const label = unit === '$' ? `$${Math.round(val).toLocaleString()}` : Math.round(val).toLocaleString();
    ctx.fillText(label, pad.left - 6, y);
  }

  // Confidence band for forecast
  if (forecast.length > 0) {
    ctx.fillStyle = colors.band;
    ctx.beginPath();

    // Upper band (left to right)
    forecast.forEach((f, i) => {
      const xi = scaleX(historical.length + i);
      const yi = scaleY(f.upper);
      if (i === 0) ctx.moveTo(xi, yi);
      else ctx.lineTo(xi, yi);
    });

    // Lower band (right to left)
    for (let i = forecast.length - 1; i >= 0; i--) {
      const f = forecast[i];
      const xi = scaleX(historical.length + i);
      const yi = scaleY(f.lower);
      ctx.lineTo(xi, yi);
    }

    ctx.closePath();
    ctx.fill();
  }

  // Historical line
  if (historical.length > 0) {
    ctx.strokeStyle = colors.historical;
    ctx.lineWidth = 2;
    ctx.beginPath();
    historical.forEach((p, i) => {
      const xi = scaleX(i);
      const yi = scaleY(p.y);
      if (i === 0) ctx.moveTo(xi, yi);
      else ctx.lineTo(xi, yi);
    });
    ctx.stroke();

    // Dots
    ctx.fillStyle = colors.historical;
    historical.forEach((p, i) => {
      const xi = scaleX(i);
      const yi = scaleY(p.y);
      ctx.beginPath();
      ctx.arc(xi, yi, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Forecast line
  if (forecast.length > 0) {
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    forecast.forEach((f, i) => {
      const xi = scaleX(historical.length + i);
      const yi = scaleY(f.value);
      if (i === 0) {
        // Connect from last historical
        const lastH = historical[historical.length - 1];
        ctx.moveTo(scaleX(historical.length - 1), scaleY(lastH.y));
        ctx.lineTo(xi, yi);
      } else {
        ctx.lineTo(xi, yi);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Forecast dots
    ctx.fillStyle = colors.line;
    forecast.forEach((f, i) => {
      const xi = scaleX(historical.length + i);
      const yi = scaleY(f.value);
      ctx.beginPath();
      ctx.arc(xi, yi, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Vertical separator between historical and forecast
  if (historical.length > 0 && forecast.length > 0) {
    const sepX = scaleX(historical.length - 0.5);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sepX, pad.top);
    ctx.lineTo(sepX, pad.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Keep the forecast region marker inside the plot so it cannot collide
    // with the x-axis month labels.
    ctx.fillStyle = colors.line;
    ctx.font = '600 9px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FORECAST', sepX + 8, pad.top + 6);
  }

  // X-axis labels
  ctx.fillStyle = colors.text;
  ctx.font = '500 10px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Keep a readable minimum interval between complete YYYY-MM labels and
  // include both endpoints so narrow canvases still show the full time range.
  const maxLabelsByWidth = Math.max(2, Math.floor(chartW / 64) + 1);
  const labelCount = Math.max(1, Math.min(totalPoints, 6, maxLabelsByWidth));
  const labelIndexes = labelCount === 1
    ? [0]
    : Array.from(
        { length: labelCount },
        (_, index) => Math.round((index * (totalPoints - 1)) / (labelCount - 1))
      );

  labelIndexes.forEach((i) => {
    const xi = scaleX(i);
    ctx.textAlign = labelCount === 1
      ? 'center'
      : i === 0
        ? 'left'
        : i === totalPoints - 1
          ? 'right'
          : 'center';
    let label;
    if (i < historical.length) {
      label = historical[i].month || String(i + 1);
    } else {
      label = forecast[i - historical.length]?.month || '';
    }
    ctx.fillText(label, xi, H - pad.bottom + 4);
  });
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  return { ctx, width: rect.width, height: rect.height };
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function chartBounds(values) {
  const finiteValues = values.filter(finiteNonNegative);
  const observedMinimum = finiteValues.length > 0 ? Math.min(...finiteValues) : 0;
  const maximum = Math.max(...finiteValues, 1);
  const positiveValues = finiteValues.filter(value => value > 0);
  const positiveMinimum = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
  const includeZero = positiveMinimum === 0 || positiveMinimum / maximum < 0.75;
  const minimum = includeZero ? 0 : observedMinimum;
  const span = Math.max(maximum - minimum, maximum * 0.08, 1);

  return { minimum, maximum: maximum + span * 0.08 };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Draw observed spend/outcome evidence and an admitted fitted response curve.
 * @param {HTMLCanvasElement} canvas
 * @param {{status: string, observations: Array<{spend: number, outcome: number}>, curve?: {a: number, b: number}}} channel
 * @param {{currentSpendRate?: number, recommendedSpendRate?: number}} positions
 * @param {{spendLabel: string, outcomeLabel: string, formatSpend: Function, formatOutcome: Function}} options
 */
function drawResponseCurve(canvas, channel, positions, options) {
  const view = setupCanvas(canvas);
  const ctx = view.ctx;
  const W = view.width;
  const H = view.height;
  const colors = getChartColors();
  const settings = options || {};
  const observed = Array.isArray(channel?.observations)
    ? channel.observations.filter(point => finiteNonNegative(point.spend) && finiteNonNegative(point.outcome))
    : [];
  const modelable = channel?.status === 'modelable'
    && Number.isFinite(channel?.curve?.a)
    && Number.isFinite(channel?.curve?.b);
  const currentSpendRate = modelable && finiteNonNegative(positions?.currentSpendRate)
    ? positions.currentSpendRate
    : null;
  const recommendedSpendRate = modelable && finiteNonNegative(positions?.recommendedSpendRate)
    ? positions.recommendedSpendRate
    : null;
  const positionValues = [currentSpendRate, recommendedSpendRate].filter(finiteNonNegative);
  const predictedOutcome = (spend) => modelable
    ? channel.curve.a * Math.pow(spend, channel.curve.b)
    : 0;
  const outcomeValues = observed.map(point => point.outcome);
  if (modelable) {
    positionValues.forEach(spend => outcomeValues.push(predictedOutcome(spend)));
  }
  const xBounds = chartBounds([...observed.map(point => point.spend), ...positionValues]);
  const yBounds = chartBounds(outcomeValues);
  const formatSpend = typeof settings.formatSpend === 'function'
    ? settings.formatSpend
    : value => Math.round(value).toLocaleString();
  const formatOutcome = typeof settings.formatOutcome === 'function'
    ? settings.formatOutcome
    : value => Math.round(value).toLocaleString();
  const yTickValues = Array.from({ length: 5 }, (_, index) => (
    yBounds.maximum - (index / 4) * (yBounds.maximum - yBounds.minimum)
  ));
  const yTickLabels = yTickValues.map(formatOutcome);
  const xTickValues = [xBounds.minimum, (xBounds.minimum + xBounds.maximum) / 2, xBounds.maximum];
  const xTickLabels = xTickValues.map(formatSpend);

  ctx.font = '500 10px IBM Plex Mono, monospace';
  const widestYTick = Math.max(...yTickLabels.map(label => ctx.measureText(label).width), 0);
  const pad = { top: 28, right: 16, bottom: 42, left: Math.max(58, Math.ceil(widestYTick) + 8) };
  const chartW = Math.max(1, W - pad.left - pad.right);
  const chartH = Math.max(1, H - pad.top - pad.bottom);
  const scaleX = (value) => pad.left + ((value - xBounds.minimum) / (xBounds.maximum - xBounds.minimum)) * chartW;
  const scaleY = (value) => pad.top + chartH - ((value - yBounds.minimum) / (yBounds.maximum - yBounds.minimum)) * chartH;

  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = pad.top + (index / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.font = '500 10px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(yTickLabels[index], pad.left - 6, y);
  }

  ctx.fillStyle = colors.muted;
  ctx.font = '500 10px IBM Plex Mono, monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(settings.outcomeLabel || 'Outcome', pad.left, 6);
  ctx.textAlign = 'center';
  ctx.fillText(settings.spendLabel || 'Spend', pad.left + chartW / 2, H - 14);
  xTickValues.forEach((value, index) => {
    ctx.textAlign = index === 0 ? 'left' : index === xTickValues.length - 1 ? 'right' : 'center';
    ctx.fillText(xTickLabels[index], scaleX(value), H - pad.bottom + 5);
  });

  if (modelable) {
    ctx.strokeStyle = colors.recommended;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let index = 0; index <= 64; index += 1) {
      const spend = xBounds.minimum + (index / 64) * (xBounds.maximum - xBounds.minimum);
      const x = scaleX(spend);
      const y = scaleY(predictedOutcome(spend));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = colors.current;
  observed.forEach((point) => {
    ctx.beginPath();
    ctx.arc(scaleX(point.spend), scaleY(point.outcome), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const drawPosition = (spend, label, offset) => {
    const x = clamp(scaleX(spend), pad.left, pad.left + chartW);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.text;
    ctx.font = '600 9px IBM Plex Mono, monospace';
    ctx.textAlign = x > W - 92 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, clamp(x + (x > W - 92 ? -4 : 4), 4, W - 4), pad.top + offset);
  };

  if (currentSpendRate != null) drawPosition(currentSpendRate, 'CURRENT', 2);
  if (recommendedSpendRate != null) drawPosition(recommendedSpendRate, 'RECOMMENDED', 14);

  if (!modelable) {
    ctx.fillStyle = colors.muted;
    ctx.font = '600 9px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('OBSERVED ONLY', W - pad.right, 6);
  }
}

/**
 * Draw a comparable marginal-efficiency bar for each admitted allocation.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{channel: string, status: string, marginalMetric: {value: number}}>} rows
 * @param {{marginalLabel: string, formatMarginal: Function}} options
 */
function drawMarginalEfficiencyChart(canvas, rows, options) {
  const view = setupCanvas(canvas);
  const ctx = view.ctx;
  const W = view.width;
  const H = view.height;
  const colors = getChartColors();
  const settings = options || {};
  const modelableRows = (Array.isArray(rows) ? rows : []).filter((row) =>
    row?.status === 'modelable' && Number.isFinite(row?.marginalMetric?.value)
  );
  const values = modelableRows.map(row => row.marginalMetric.value);
  const largestFinite = Math.max(...values);
  const normalizer = largestFinite > 0 ? largestFinite : 1;
  const formatMarginal = typeof settings.formatMarginal === 'function'
    ? settings.formatMarginal
    : value => Math.round(value).toLocaleString();
  const labelWidth = Math.min(118, Math.max(88, W * 0.31));
  const valueWidth = 66;
  const barStart = labelWidth;
  const barMaxWidth = Math.max(1, W - barStart - valueWidth - 10);
  const top = 24;
  const rowH = Math.max(22, Math.min(38, (H - top - 4) / Math.max(modelableRows.length, 1)));

  ctx.fillStyle = colors.muted;
  ctx.font = '600 10px IBM Plex Mono, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(settings.marginalLabel || 'Marginal efficiency', 0, 6);

  modelableRows.forEach((row, index) => {
    const y = top + index * rowH;
    const label = String(row.channel || 'Channel');
    const value = row.marginalMetric.value;
    const width = Math.max(0, value / normalizer) * barMaxWidth;
    ctx.fillStyle = colors.text;
    ctx.font = '500 11px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, y + rowH / 2);
    ctx.fillStyle = colors.grid;
    ctx.fillRect(barStart, y + rowH * 0.27, barMaxWidth, rowH * 0.42);
    ctx.fillStyle = colors.recommended;
    ctx.fillRect(barStart, y + rowH * 0.27, width, rowH * 0.42);
    ctx.fillStyle = colors.text;
    ctx.font = '600 11px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(formatMarginal(value), W - 2, y + rowH / 2);
  });
}

window.MangroveCharts = {
  drawAllocationChart,
  drawOutcomeComparisonChart,
  drawForecastChart,
  drawResponseCurve,
  drawMarginalEfficiencyChart
};
