/**
 * shared/forecast-engine.js
 * Simple trend + seasonality forecasting engine for Revenue Forecaster (Lite).
 *
 * Approach:
 * - Detrend: linear regression on monthly totals
 * - Seasonal indices: ratio of actual / detrended value per month
 * - Forecast = trend value × seasonal index
 * - Uncertainty: rolling std dev of residuals → confidence bands
 */

'use strict';

/**
 * Linear regression (OLS) returning { slope, intercept, r2, predict }.
 * @param {Array<{x: number, y: number}>} points
 */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const fitted = slope * p.x + intercept;
    ssRes += (p.y - fitted) ** 2;
    ssTot += (p.y - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    slope,
    intercept,
    r2,
    predict: (x) => slope * x + intercept
  };
}

/**
 * Parse CSV or tab-separated data into Array<{ month: string, value: number }>.
 * Handles common date formats and header detection.
 * @param {string} text
 * @returns {Array<{ month: string, value: number }>}
 */
function parseCSVData(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : null;
  if (!delimiter) return [];

  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
  // Find date and value columns
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('month') || h.includes('period') || h.includes('time'));
  const valueIdx = headers.findIndex(h => h.includes('value') || h.includes('revenue') || h.includes('conversion') || h.includes('amount') || h.includes('sales') || h.includes('goal'));

  if (dateIdx === -1 || valueIdx === -1) return [];

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    const month = cols[dateIdx] || '';
    const value = parseFloat(cols[valueIdx]);
    if (month && !isNaN(value) && value >= 0) {
      result.push({ month, value });
    }
  }

  return result;
}

/**
 * Parse an array of { month, value } into time-series format with x (index) and y (value).
 * Sorts chronologically.
 * @param {Array<{month: string, value: number}>} data
 * @returns {Array<{x: number, y: number, month: string}>}
 */
function prepareTimeSeries(data) {
  // Sort by month (simple string sort works for YYYY-MM and MM/YYYY formats)
  const sorted = [...data].sort((a, b) => {
    const ma = a.month.length === 7 ? a.month + '-01' : a.month;
    const mb = b.month.length === 7 ? b.month + '-01' : b.month;
    return ma.localeCompare(mb);
  });

  return sorted.map((d, i) => ({ x: i, y: d.value, month: d.month }));
}

/**
 * Compute seasonal indices (multiplicative) for each month of year.
 * Returns array of 12 indices (Jan-Dec), where 1.0 = average.
 * @param {Array<{x: number, y: number}>} detrended - residuals after removing trend
 * @param {Array<{x: number, y: number, month: string}>} ts
 * @returns {Array<number>|null}
 */
function computeSeasonalIndices(detrended, ts) {
  if (ts.length < 12) return null; // Need at least a year for seasonality

  // Group by calendar month
  const byCalendarMonth = {};
  for (let m = 0; m < 12; m++) byCalendarMonth[m] = [];

  for (let i = 0; i < detrended.length; i++) {
    const date = new Date(ts[i].month);
    if (!isNaN(date.getTime())) {
      const calMonth = date.getMonth(); // 0-11
      byCalendarMonth[calMonth].push(detrended[i].y / ts[i].y); // ratio of actual to trend
    }
  }

  // Average index per calendar month
  const indices = [];
  for (let m = 0; m < 12; m++) {
    const vals = byCalendarMonth[m];
    if (vals.length > 0) {
      indices.push(vals.reduce((s, v) => s + v, 0) / vals.length);
    } else {
      indices.push(1.0);
    }
  }

  // Normalize so product of indices ≈ 1
  const geometricMean = indices.reduce((p, i) => p * (i > 0 ? i : 1), 1) ** (1 / 12);
  return indices.map(i => geometricMean > 0 ? i / geometricMean : 1.0);
}

/**
 * Generate forecast with confidence bands.
 * @param {Array<{x: number, y: number, month: string}>} timeSeries - historical data
 * @param {number} horizon - number of periods to forecast
 * @param {boolean} useSeasonality
 * @returns {{ forecast: Array<{month: string, value: number, lower: number, upper: number}>, trend: object, r2: number, seasonalIndices: Array<number>|null, residualStdDev: number }}
 */
function generateForecast(timeSeries, horizon, useSeasonality) {
  if (timeSeries.length < 3) {
    return { forecast: [], trend: null, r2: 0, seasonalIndices: null, residualStdDev: 0 };
  }

  const trend = linearRegression(timeSeries.map(d => ({ x: d.x, y: d.y })));

  // Compute residuals
  const residuals = timeSeries.map(d => ({
    x: d.x,
    y: d.y,
    residual: d.y - (trend ? trend.predict(d.x) : d.y)
  }));

  // Standard deviation of residuals
  const meanResidual = residuals.reduce((s, r) => s + r.residual, 0) / residuals.length;
  const variance = residuals.reduce((s, r) => s + (r.residual - meanResidual) ** 2, 0) / residuals.length;
  const residualStdDev = Math.sqrt(variance);

  // Seasonal indices
  let seasonalIndices = null;
  if (useSeasonality) {
    const detrended = residuals.map(r => ({
      x: r.x,
      y: trend ? trend.predict(r.x) : r.y
    }));
    seasonalIndices = computeSeasonalIndices(detrended, timeSeries);
  }

  // Generate forecast periods
  const lastX = timeSeries[timeSeries.length - 1].x;
  const lastMonth = timeSeries[timeSeries.length - 1].month;
  const forecast = [];

  for (let h = 1; h <= horizon; h++) {
    const x = lastX + h;
    const baseValue = trend ? Math.max(0, trend.predict(x)) : timeSeries[timeSeries.length - 1].y;

    let value = baseValue;
    let lower = baseValue;
    let upper = baseValue;

    if (seasonalIndices) {
      // Get calendar month for seasonal index
      const date = new Date(lastMonth);
      if (!isNaN(date.getTime())) {
        const calMonth = (date.getMonth() + h) % 12;
        const seasonalFactor = seasonalIndices[calMonth] || 1.0;
        value = baseValue * seasonalFactor;
      }
    }

    // Confidence bands widen with horizon (simple 1.96 * sigma * sqrt(h))
    const confidenceWidth = 1.96 * residualStdDev * Math.sqrt(h);
    lower = Math.max(0, value - confidenceWidth);
    upper = value + confidenceWidth;

    // Project month string
    const projDate = new Date(lastMonth);
    if (!isNaN(projDate.getTime())) {
      projDate.setMonth(projDate.getMonth() + h);
      const projMonth = projDate.toISOString().slice(0, 7);
      forecast.push({ month: projMonth, value, lower, upper });
    }
  }

  return {
    forecast,
    trend,
    r2: trend ? trend.r2 : 0,
    seasonalIndices,
    residualStdDev
  };
}

/**
 * Compute probability of hitting a target given forecast and uncertainty.
 * Uses simple normal distribution approximation.
 * @param {Array<{month: string, value: number, lower: number, upper: number}>} forecast
 * @param {number} target
 * @returns {number} - probability 0-1
 */
function probabilityOfHittingTarget(forecast, target) {
  if (!forecast || forecast.length === 0) return 0;

  // Average expected value over forecast horizon
  const avgExpected = forecast.reduce((s, f) => s + f.value, 0) / forecast.length;
  const avgWidth = forecast.reduce((s, f) => s + (f.upper - f.lower), 0) / forecast.length;
  const sigma = avgWidth / (2 * 1.96); // back-calculate sigma from 95% band

  if (sigma === 0) return avgExpected >= target ? 1 : 0;

  // Z-score for target
  const z = (target - avgExpected) / sigma;
  // Standard normal CDF approximation
  const prob = 0.5 * (1 + erf(z / Math.sqrt(2)));
  return Math.max(0, Math.min(1, prob));
}

// Error function approximation ( Abramowitz & Stegun)
function erf(z) {
  const t = 1 / (1 + 0.5 * Math.abs(z));
  const tau = t * Math.exp(-z * z - 1.26551223 +
    t * (1.00002368 +
    t * (0.37409196 +
    t * (0.09678418 +
    t * (-0.18628806 +
    t * (0.27886807 +
    t * (-1.13520398 +
    t * (1.48851587 +
    t * (-0.82215223 +
    t * 0.17087277)))))))));
  return z >= 0 ? 1 - tau : tau - 1;
}

/**
 * Validate historical data quality.
 * @param {Array<{month: string, value: number}>} data
 * @returns {{ ok: boolean, reason: string, issues: string[] }}
 */
function validateHistoricalData(data) {
  const issues = [];

  if (data.length < 3) {
    return { ok: false, reason: 'At least 3 months of data needed to generate a meaningful forecast.', issues: ['Insufficient data rows'] };
  }

  // Check for missing months (gaps)
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i-1].month);
    const curr = new Date(sorted[i].month);
    const monthsDiff = (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth());
    if (monthsDiff > 1) {
      issues.push(`Gap detected between ${sorted[i-1].month} and ${sorted[i].month}`);
    }
  }

  // Check for zeros or negatives
  const zeroCount = data.filter(d => d.value === 0).length;
  if (zeroCount > data.length * 0.3) {
    issues.push(`${zeroCount} zero-value months detected (${Math.round(zeroCount/data.length*100)}% of data)`);
  }

  // Check outliers (>3 sigma)
  const values = data.map(d => d.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const outlierCount = values.filter(v => Math.abs(v - mean) > 3 * stdDev).length;
  if (outlierCount > 0) {
    issues.push(`${outlierCount} potential outlier(s) detected (>3 sigma from mean)`);
  }

  return {
    ok: issues.length === 0,
    reason: issues.length > 0 ? issues.join('. ') : '',
    issues
  };
}

window.MangroveForecast = {
  parseCSVData,
  prepareTimeSeries,
  linearRegression,
  generateForecast,
  probabilityOfHittingTarget,
  validateHistoricalData
};
