/**
 * shared/response-curve.js
 * Power-law response curve fitting for Marketing Mix Modeling (Lite).
 *
 * Fits: conversions = a * spend^b per channel using log-log OLS regression.
 * Computes marginal CPA and recommended allocation given business constraints.
 */

'use strict';

/**
 * Fit a power-law curve: conversions = a * spend^b
 * for a single channel across multiple time periods.
 * Returns { a, b, r2 } or null if insufficient data.
 *
 * @param {Array<{spend: number, conversions: number}>} dataPoints
 * @returns {{ a: number, b: number, r2: number } | null}
 */
function fitPowerLaw(dataPoints) {
  // Need at least 2 points with positive spend and conversions
  const valid = dataPoints.filter(d => d.spend > 0 && d.conversions > 0);
  if (valid.length < 2) return null;

  // Log-transform: log(conversions) = log(a) + b * log(spend)
  const n = valid.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (const d of valid) {
    const lx = Math.log(d.spend);
    const ly = Math.log(d.conversions);
    sumX += lx;
    sumY += ly;
    sumXY += lx * ly;
    sumX2 += lx * lx;
    sumY2 += ly * ly;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const b = (n * sumXY - sumX * sumY) / denom;
  const a = Math.exp((sumY - b * sumX) / n);

  // R-squared
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const d of valid) {
    const ly = Math.log(d.conversions);
    const fitted = Math.log(a) + b * Math.log(d.spend);
    ssRes += (ly - fitted) ** 2;
    ssTot += (ly - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { a, b, r2 };
}

/**
 * Compute predicted conversions for a given spend using fitted power law.
 * @param {number} spend
 * @param {{ a: number, b: number }} curve
 * @returns {number}
 */
function predictConversions(spend, curve) {
  if (!curve || spend <= 0) return 0;
  // Saturation: b is typically 0 < b < 1; cap at a practical ceiling
  const raw = curve.a * Math.pow(spend, curve.b);
  return Math.max(0, raw);
}

/**
 * Compute marginal conversions per additional dollar spent at a given level.
 * d(conversions)/d(spend) = a * b * spend^(b-1)
 * @param {number} spend
 * @param {{ a: number, b: number }} curve
 * @returns {number}
 */
function marginalCPA(spend, curve) {
  if (!curve || spend <= 0) return Infinity;
  // dC/dS = a * b * spend^(b-1)
  const marginalConversions = curve.a * curve.b * Math.pow(spend, curve.b - 1);
  if (marginalConversions <= 0) return Infinity;
  return 1 / marginalConversions; // cost per incremental conversion
}

/**
 * Compute contribution share (%) per channel based on total conversions.
 * @param {Array<{channel: string, spend: number, conversions: number, curve: object}>} channels
 * @returns {Array<{channel: string, spend: number, conversions: number, curve: object, contributionPct: number}>}
 */
function computeContributions(channels) {
  const total = channels.reduce((s, ch) => s + ch.conversions, 0);
  if (total === 0) return channels.map(ch => ({ ...ch, contributionPct: 0 }));
  return channels.map(ch => ({
    ...ch,
    contributionPct: ch.conversions / total
  }));
}

/**
 * Optimize budget allocation given total budget and channel data.
 * Uses iterative marginal efficiency reallocation.
 *
 * @param {Array<{channel: string, spend: number, conversions: number, curve: object, minSpend: number, maxSpend: number}>} channels
 * @param {number} totalBudget
 * @returns {Array<{channel: string, currentSpend: number, recommendedSpend: number, expectedConversions: number, marginalCPA: number, contributionPct: number}>}
 */
function optimizeBudget(channels, totalBudget) {
  if (channels.length === 0 || totalBudget <= 0) return [];

  // Initialize with current spend
  let allocation = channels.map(ch => ({
    channel: ch.channel,
    currentSpend: ch.spend,
    recommendedSpend: ch.spend,
    curve: ch.curve,
    minSpend: ch.minSpend || 0,
    maxSpend: ch.maxSpend || Infinity,
    conversions: ch.conversions
  }));

  const MIN_ITER = 50;
  const MAX_ITER = 500;
  const TOLERANCE = 0.01; // $0.01 precision

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const totalSpent = allocation.reduce((s, a) => s + a.recommendedSpend, 0);
    const delta = totalBudget - totalSpent;

    if (Math.abs(delta) < TOLERANCE) break;

    // Compute marginal CPA for each channel at current allocation
    const marginals = allocation.map((a, index) => ({
      ...a,
      index,
      mCPA: marginalCPA(a.recommendedSpend, a.curve)
    }));

    if (delta > 0) {
      // Allocate more: find channel with lowest marginal CPA (best ROI)
      marginals.sort((a, b) => a.mCPA - b.mCPA);
      let remaining = delta;
      for (const ch of marginals) {
        if (remaining <= 0) break;
        const room = ch.maxSpend === Infinity ? remaining : Math.min(remaining, ch.maxSpend - ch.recommendedSpend);
        if (room > 0) {
          allocation[ch.index].recommendedSpend = Math.min(ch.recommendedSpend + room, ch.maxSpend === Infinity ? Infinity : ch.maxSpend);
          remaining -= room;
        }
      }
      // If still remaining, distribute evenly (all caps hit)
      if (remaining > 0) {
        const activeCount = allocation.filter(a => a.recommendedSpend < a.maxSpend).length;
        if (activeCount > 0) {
          const extra = remaining / activeCount;
          for (const ch of allocation) {
            if (ch.recommendedSpend < ch.maxSpend) {
              ch.recommendedSpend = Math.min(ch.recommendedSpend + extra, ch.maxSpend);
            }
          }
        }
      }
    } else {
      // Deallocate: find channel with highest marginal CPA (worst ROI)
      marginals.sort((a, b) => b.mCPA - a.mCPA);
      let remaining = -delta;
      for (const ch of marginals) {
        if (remaining <= 0) break;
        const room = ch.recommendedSpend - Math.max(ch.minSpend, 0);
        if (room > 0) {
          const cut = Math.min(room, remaining);
          allocation[ch.index].recommendedSpend -= cut;
          remaining -= cut;
        }
      }
    }

    // Enforce constraints
    for (const a of allocation) {
      a.recommendedSpend = Math.max(a.minSpend, Math.min(a.recommendedSpend, a.maxSpend === Infinity ? Infinity : a.maxSpend));
    }
  }

  // Compute expected conversions and contributions
  const totalExpectedConversions = allocation.reduce((s, a) => s + predictConversions(a.recommendedSpend, a.curve), 0);

  return allocation.map(a => ({
    channel: a.channel,
    currentSpend: a.currentSpend,
    recommendedSpend: a.recommendedSpend,
    expectedConversions: predictConversions(a.recommendedSpend, a.curve),
    marginalCPA: marginalCPA(a.recommendedSpend, a.curve),
    contributionPct: totalExpectedConversions > 0
      ? predictConversions(a.recommendedSpend, a.curve) / totalExpectedConversions
      : 0
  }));
}

/**
 * Validate that there's enough data to run the model.
 * @param {Array} channels
 * @returns {{ ok: boolean, reason: string, supported: string[] }}
 */
function validateDataQuality(channels) {
  if (channels.length === 0) {
    return { ok: false, reason: 'No channels entered.', supported: [] };
  }

  const dataMonthsPerChannel = channels.map(ch => {
    if (!ch.dataPoints || ch.dataPoints.length < 3) return ch.dataPoints?.length || 0;
    return ch.dataPoints.length;
  });

  const minMonths = Math.min(...dataMonthsPerChannel);

  if (minMonths < 3) {
    return {
      ok: false,
      reason: `This model needs at least 3 months of spend data per channel to produce reliable estimates. Add more historical data for: ${channels.filter((ch, i) => (ch.dataPoints?.length || 0) < 3).map(ch => ch.channel).join(', ') || 'your channels'}.`,
      supported: []
    };
  }

  const validChannels = channels.filter(ch => {
    const curve = fitPowerLaw(ch.dataPoints || []);
    return curve !== null;
  });

  if (validChannels.length < 2) {
    return {
      ok: false,
      reason: 'At least 2 channels need positive spend and conversions data to model response curves. Check that spend and conversions are greater than zero in all periods.',
      supported: []
    };
  }

  return { ok: true, reason: '', supported: ['budget'] };
}

window.MangroveResponseCurve = {
  fitPowerLaw,
  predictConversions,
  marginalCPA,
  computeContributions,
  optimizeBudget,
  validateDataQuality
};
