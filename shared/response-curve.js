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

  return { a, b, r2, assumed: false };
}

/**
 * Build an explicitly assumption-driven curve from one aggregate observation.
 * This anchors the curve at the entered spend/conversions without pretending
 * that multiple historical observations were supplied.
 *
 * @param {number} spend
 * @param {number} conversions
 * @param {number} elasticity
 * @returns {{ a: number, b: number, r2: null, assumed: true } | null}
 */
function createAssumptionCurve(spend, conversions, elasticity = 0.75) {
  if (
    !Number.isFinite(spend)
    || !Number.isFinite(conversions)
    || !Number.isFinite(elasticity)
    || spend <= 0
    || conversions <= 0
    || elasticity <= 0
    || elasticity >= 1
  ) {
    return null;
  }

  return {
    a: conversions / Math.pow(spend, elasticity),
    b: elasticity,
    r2: null,
    assumed: true
  };
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

  const allocation = channels.map(ch => ({
    channel: ch.channel,
    currentSpend: ch.spend,
    curve: ch.curve,
    minSpend: Math.max(0, ch.minSpend || 0),
    maxSpend: Number.isFinite(ch.maxSpend) ? ch.maxSpend : Infinity,
    conversions: ch.conversions
  }));

  const valid = allocation.every(item => (
    item.curve
    && Number.isFinite(item.curve.a)
    && Number.isFinite(item.curve.b)
    && item.curve.a > 0
    && item.curve.b > 0
    && item.curve.b < 1
    && item.maxSpend >= item.minSpend
  ));
  if (!valid) return [];

  const minTotal = allocation.reduce((sum, item) => sum + item.minSpend, 0);
  const maxTotal = allocation.reduce((sum, item) => sum + item.maxSpend, 0);
  const tolerance = 0.001;
  if (totalBudget < minTotal - tolerance || totalBudget > maxTotal + tolerance) {
    return [];
  }

  function spendAtLambda(item, lambda) {
    const exponent = 1 / (1 - item.curve.b);
    const logSpend = Math.log(item.curve.a * item.curve.b / lambda) * exponent;
    const unconstrained = logSpend >= Math.log(Number.MAX_VALUE)
      ? Infinity
      : Math.exp(logSpend);
    return Math.max(item.minSpend, Math.min(unconstrained, item.maxSpend));
  }

  function totalAtLambda(lambda) {
    return allocation.reduce(
      (sum, item) => sum + spendAtLambda(item, lambda),
      0
    );
  }

  let lowLambda = 1e-12;
  let highLambda = 1;
  while (totalAtLambda(lowLambda) < totalBudget && lowLambda > Number.MIN_VALUE) {
    lowLambda /= 10;
  }
  while (totalAtLambda(highLambda) > totalBudget && highLambda < Number.MAX_VALUE / 10) {
    highLambda *= 10;
  }

  for (let iteration = 0; iteration < 200; iteration++) {
    const lambda = Math.sqrt(lowLambda * highLambda);
    if (totalAtLambda(lambda) > totalBudget) {
      lowLambda = lambda;
    } else {
      highLambda = lambda;
    }
  }

  const finalLambda = Math.sqrt(lowLambda * highLambda);
  allocation.forEach(item => {
    item.recommendedSpend = spendAtLambda(item, finalLambda);
  });

  const allocatedTotal = allocation.reduce(
    (sum, item) => sum + item.recommendedSpend,
    0
  );
  const residual = totalBudget - allocatedTotal;
  if (Math.abs(residual) > tolerance) {
    const adjustable = allocation.find(item => (
      residual > 0
        ? item.recommendedSpend < item.maxSpend
        : item.recommendedSpend > item.minSpend
    ));
    if (!adjustable) return [];
    adjustable.recommendedSpend += residual;
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

  if (channels.length < 2) {
    return {
      ok: false,
      reason: 'At least 2 channels are required to compare budget allocation.',
      supported: []
    };
  }

  const invalidChannels = channels.filter(ch => {
    const dataPoints = ch.dataPoints || [];
    if (dataPoints.length >= 3) {
      const curve = fitPowerLaw(dataPoints);
      return !curve || curve.b <= 0 || curve.b >= 1;
    }
    return createAssumptionCurve(ch.spend, ch.conversions) === null;
  });

  if (invalidChannels.length > 0) {
    return {
      ok: false,
      reason: `Enter positive spend and conversions for: ${invalidChannels.map(ch => ch.channel).join(', ')}.`,
      supported: []
    };
  }

  const evidence = channels.every(ch => (ch.dataPoints || []).length >= 3)
    ? 'historical'
    : 'assumption';
  return { ok: true, reason: '', supported: ['budget'], evidence };
}

window.MangroveResponseCurve = {
  fitPowerLaw,
  createAssumptionCurve,
  predictConversions,
  marginalCPA,
  computeContributions,
  optimizeBudget,
  validateDataQuality
};
