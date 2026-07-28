/**
 * shared/charts.js
 * Lightweight vanilla JS canvas chart utilities for Mangrove Tools analytics pages.
 * No dependencies. Supports bar charts and line charts with optional bands.
 */

'use strict';

function getChartColors() {
  const isDark = getComputedStyle(document.documentElement)
    .getPropertyValue('--paper').trim() === '#0c0c0c';
  if (isDark) {
    return {
      current: 'rgba(245, 243, 239, 0.15)',
      recommended: '#308e7b',
      text: '#f5f3ef',
      muted: '#9e9a93'
    };
  }
  return {
    current: 'rgba(20, 36, 28, 0.3)',
    recommended: '#c87a53',
    text: '#14241c',
    muted: '#4a5d4e'
  };
}

/**
 * Draw a horizontal bar chart (current vs recommended allocation).
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{label: string, current: number, recommended: number}>} data
 * @param {string} unit - e.g. "$" or ""
 */
function drawAllocationChart(canvas, data, unit) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const colors = getChartColors();

  const labelWidth = 100;
  const barAreaWidth = W - labelWidth - 16;
  const rowH = Math.min(40, H / data.length);
  const padding = 4;

  ctx.clearRect(0, 0, W, H);

  // Find max value for scaling
  const allValues = data.flatMap(d => [d.current, d.recommended]);
  const maxVal = Math.max(...allValues, 1);

  data.forEach((d, i) => {
    const y = i * rowH + padding;

    // Label
    ctx.fillStyle = colors.text;
    ctx.font = '500 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const label = d.label.length > 14 ? d.label.slice(0, 13) + '...' : d.label;
    ctx.fillText(label, 0, y + rowH / 2);

    const barStart = labelWidth;
    const barMaxWidth = barAreaWidth - 80; // leave room for value text

    // Current bar
    const currentW = (d.current / maxVal) * barMaxWidth;
    ctx.fillStyle = colors.current;
    ctx.fillRect(barStart, y, currentW, (rowH - padding * 2) * 0.45);

    // Recommended bar
    const recW = (d.recommended / maxVal) * barMaxWidth;
    ctx.fillStyle = colors.recommended;
    ctx.fillRect(barStart, y + (rowH - padding * 2) * 0.5, recW, (rowH - padding * 2) * 0.45);

    // Values
    ctx.fillStyle = colors.muted;
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    const fmt = (v) => unit === '$' ? `$${Math.round(v).toLocaleString()}` : Math.round(v).toLocaleString();
    ctx.fillText(fmt(d.current), barStart + barMaxWidth + 4, y + (rowH - padding * 2) * 0.28);
    ctx.fillStyle = colors.recommended;
    ctx.fillText(fmt(d.recommended), barStart + barMaxWidth + 4, y + (rowH - padding * 2) * 0.73);
  });

  // Legend
  const recommendedLegend = W < 360 ? 'Rec.' : 'Recommended';
  const legendX = Math.max(labelWidth, W - (recommendedLegend === 'Rec.' ? 112 : 180));
  const legendY = H - 18;
  ctx.fillStyle = colors.current;
  ctx.fillRect(legendX, legendY, 12, 8);
  ctx.fillStyle = colors.muted;
  ctx.font = '500 11px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Current', legendX + 16, legendY + 7);

  ctx.fillStyle = colors.recommended;
  ctx.fillRect(legendX + 72, legendY, 12, 8);
  ctx.fillStyle = colors.muted;
  ctx.fillText(recommendedLegend, legendX + 88, legendY + 7);
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
    band: base.recommended === '#308e7b' ? 'rgba(48, 142, 123, 0.15)' : 'rgba(200, 122, 83, 0.15)',
    historical: base.text,
    grid: base.muted === '#9e9a93' ? 'rgba(245, 243, 239, 0.08)' : 'rgba(20, 36, 28, 0.1)',
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
    ctx.font = '500 10px Outfit, sans-serif';
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

    // "Forecast" label
    ctx.fillStyle = colors.text;
    ctx.font = '500 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Forecast', scaleX(historical.length + forecast.length / 2), H - pad.bottom + 4);
  }

  // X-axis labels
  ctx.fillStyle = colors.text;
  ctx.font = '500 10px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Show every N labels to avoid crowding
  const labelStep = Math.ceil(totalPoints / 6);
  for (let i = 0; i < totalPoints; i += labelStep) {
    const xi = scaleX(i);
    let label;
    if (i < historical.length) {
      label = historical[i].month || String(i + 1);
    } else {
      label = forecast[i - historical.length]?.month || '';
    }
    ctx.fillText(label, xi, H - pad.bottom + 4);
  }
}

window.MangroveCharts = {
  drawAllocationChart,
  drawForecastChart
};
