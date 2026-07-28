/**
 * Browser-only evidence gates for marginal response curves.
 */
'use strict';

(function attachMarginality(root) {
  const POLICY = Object.freeze({
    minimumCompletePeriods: 12,
    minimumPositiveCoverage: 0.75,
    minimumDistinctPositiveSpend: 4,
    minimumRobustSpendVariation: 0.20,
    maximumElasticityIqr: 0.25,
    maximumCurrentPredictionChange: 0.25,
    recentPeriodsForPreservation: 4
  });
  const GATE_CODES = [
    'minimum_complete_periods',
    'positive_coverage',
    'distinct_spend',
    'spend_variation',
    'elasticity',
    'elasticity_stability',
    'current_prediction_stability'
  ];
  const ELASTICITY_TOLERANCE = 1e-9;

  function quantile(sorted, probability) {
    const position = (sorted.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  function predict(curve, spendRate) {
    if (!curve || !Number.isFinite(spendRate) || spendRate <= 0) return 0;
    const value = curve.a * Math.pow(spendRate, curve.b);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function marginalOutcome(curve, spendRate) {
    if (!curve || !Number.isFinite(spendRate) || spendRate <= 0) return 0;
    const value = curve.a * curve.b * Math.pow(spendRate, curve.b - 1);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function finiteOrZero(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function median(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.slice().sort(function numericSort(left, right) { return left - right; });
    return quantile(sorted, 0.5);
  }

  function positiveObservations(observations) {
    return observations.filter(function positiveObservation(observation) {
      return observation.spend > 0 && observation.outcome > 0;
    });
  }

  function fitCurve(observations) {
    const usable = positiveObservations(observations);
    if (usable.length < 2) return null;

    const values = usable.map(function logObservation(observation) {
      return { x: Math.log(observation.spend), y: Math.log(observation.outcome) };
    });
    const meanX = values.reduce(function sumX(total, value) { return total + value.x; }, 0) / values.length;
    const meanY = values.reduce(function sumY(total, value) { return total + value.y; }, 0) / values.length;
    let sumXX = 0;
    let sumXY = 0;
    values.forEach(function accumulate(value) {
      const deltaX = value.x - meanX;
      sumXX += deltaX * deltaX;
      sumXY += deltaX * (value.y - meanY);
    });
    if (!Number.isFinite(sumXX) || sumXX <= 0 || !Number.isFinite(sumXY)) return null;

    const b = sumXY / sumXX;
    const intercept = meanY - b * meanX;
    const a = Math.exp(intercept);
    if (!Number.isFinite(a) || a < 0 || !Number.isFinite(b)) return null;

    let totalVariation = 0;
    let residualVariation = 0;
    values.forEach(function calculateFit(value) {
      const fitted = intercept + b * value.x;
      totalVariation += Math.pow(value.y - meanY, 2);
      residualVariation += Math.pow(value.y - fitted, 2);
    });
    const r2 = totalVariation > 0 ? 1 - residualVariation / totalVariation : 0;
    return { a: a, b: b, r2: finiteOrZero(r2) };
  }

  function stableElasticity(curve) {
    return Boolean(curve)
      && curve.b > ELASTICITY_TOLERANCE
      && curve.b < 1 - ELASTICITY_TOLERANCE;
  }

  function objectiveDefinitions(metrics) {
    const sourceMetrics = Array.isArray(metrics) ? metrics : [];
    const byKey = {};
    sourceMetrics.forEach(function indexMetric(metric) {
      if (metric && typeof metric.key === 'string') byKey[metric.key] = metric;
    });
    const objectives = [];
    if (byKey.financial
      && (byKey.financial.costTreatment === 'before_marketing'
        || byKey.financial.costTreatment === 'after_marketing')) {
      objectives.push({ objective: 'contribution', metric: byKey.financial });
    }
    if (byKey.revenue) objectives.push({ objective: 'revenue', metric: byKey.revenue });
    if (byKey.conversions) objectives.push({ objective: 'conversions', metric: byKey.conversions });
    return objectives;
  }

  function observationFor(row, metricKey) {
    const outcome = row && row.outcomes ? row.outcomes[metricKey] : NaN;
    return {
      periodKey: typeof row.periodKey === 'string' ? row.periodKey : '',
      spend: finiteOrZero(row && row.spend),
      outcome: finiteOrZero(outcome)
    };
  }

  function analyzeChannel(channel, rows, metricKey) {
    const observations = rows
      .slice()
      .sort(function chronological(left, right) {
        return String(left.periodStart).localeCompare(String(right.periodStart))
          || String(left.periodKey).localeCompare(String(right.periodKey));
      })
      .map(function rowObservation(row) { return observationFor(row, metricKey); });
    const completePeriods = observations.length;
    const positive = positiveObservations(observations);
    const positiveCoverage = completePeriods === 0 ? 0 : positive.length / completePeriods;
    const positiveSpends = observations
      .filter(function positiveSpend(observation) { return observation.spend > 0; })
      .map(function spendValue(observation) { return observation.spend; });
    const roundedSpends = new Set(positiveSpends.map(function roundedSpend(spend) {
      return Math.round(spend * 100) / 100;
    }));
    const sortedSpends = positiveSpends.slice().sort(function numericSort(left, right) { return left - right; });
    const medianSpend = median(sortedSpends);
    const robustSpendVariation = medianSpend > 0 && sortedSpends.length > 0
      ? finiteOrZero((quantile(sortedSpends, 0.9) - quantile(sortedSpends, 0.1)) / medianSpend)
      : 0;
    const curve = fitCurve(observations);
    const leaveOneOut = observations.map(function leaveOneOutCurve(_, index) {
      return fitCurve(observations.filter(function retainObservation(__, retainedIndex) {
        return retainedIndex !== index;
      }));
    });
    const leaveOneOutElasticities = leaveOneOut
      .filter(function presentCurve(candidate) { return Boolean(candidate); })
      .map(function elasticity(candidate) { return candidate.b; })
      .filter(Number.isFinite)
      .sort(function numericSort(left, right) { return left - right; });
    const allLeaveOneOutElasticitiesStable = leaveOneOut.length === observations.length
      && leaveOneOut.every(stableElasticity);
    const elasticityIqr = leaveOneOutElasticities.length > 0
      ? finiteOrZero(quantile(leaveOneOutElasticities, 0.75) - quantile(leaveOneOutElasticities, 0.25))
      : 0;
    const recentSpends = observations.slice(-POLICY.recentPeriodsForPreservation)
      .map(function spendValue(observation) { return observation.spend; });
    const preservedSpendRate = median(recentSpends);
    const currentSpendRate = observations.length > 0 ? observations[observations.length - 1].spend : 0;
    const fullPrediction = predict(curve, preservedSpendRate);
    const maximumCurrentPredictionChange = fullPrediction > 0
      ? leaveOneOut.reduce(function maximumChange(maximum, candidate) {
        const candidatePrediction = predict(candidate, preservedSpendRate);
        const change = Math.abs(candidatePrediction - fullPrediction) / fullPrediction;
        return Math.max(maximum, finiteOrZero(change));
      }, 0)
      : 0;
    const diagnostics = {
      completePeriods: completePeriods,
      positiveCoverage: finiteOrZero(positiveCoverage),
      distinctPositiveSpend: roundedSpends.size,
      robustSpendVariation: robustSpendVariation,
      elasticity: curve ? finiteOrZero(curve.b) : 0,
      elasticityIqr: elasticityIqr,
      maximumCurrentPredictionChange: finiteOrZero(maximumCurrentPredictionChange)
    };
    const gateResults = {
      minimum_complete_periods: completePeriods < POLICY.minimumCompletePeriods,
      positive_coverage: positiveCoverage < POLICY.minimumPositiveCoverage,
      distinct_spend: roundedSpends.size < POLICY.minimumDistinctPositiveSpend,
      spend_variation: robustSpendVariation < POLICY.minimumRobustSpendVariation,
      elasticity: !stableElasticity(curve),
      elasticity_stability: !allLeaveOneOutElasticitiesStable || elasticityIqr > POLICY.maximumElasticityIqr,
      current_prediction_stability: maximumCurrentPredictionChange > POLICY.maximumCurrentPredictionChange
    };
    const failedGates = GATE_CODES.filter(function failedGate(code) { return gateResults[code]; });

    return {
      channel: channel,
      status: failedGates.length === 0 ? 'modelable' : 'preserved',
      observations: observations,
      currentSpendRate: currentSpendRate,
      preservedSpendRate: preservedSpendRate,
      curve: failedGates.length === 0 ? curve : null,
      diagnostics: diagnostics,
      failedGates: failedGates
    };
  }

  function analyzeHistory(history) {
    if (!history || history.ok !== true || history.state !== 'ready'
      || !Array.isArray(history.rows) || !Array.isArray(history.metrics)) {
      return { ok: false, models: {}, eligibleObjectives: [], recommendedObjective: null };
    }

    const objectives = objectiveDefinitions(history.metrics);
    const models = {};
    objectives.forEach(function buildObjectiveModel(definition) {
      const channels = new Map();
      history.rows.forEach(function groupByChannel(row) {
        const channel = row && typeof row.channel === 'string' ? row.channel : '';
        if (!channels.has(channel)) channels.set(channel, []);
        channels.get(channel).push(row);
      });
      const metric = definition.metric;
      models[definition.objective] = {
        objective: definition.objective,
        metric: {
          key: metric.key,
          label: typeof metric.label === 'string' ? metric.label : metric.key,
          costTreatment: metric.costTreatment || null
        },
        cadence: history.cadence || null,
        cadenceDays: finiteOrZero(history.cadenceDays),
        channels: Array.from(channels.keys()).sort().map(function channelModel(channel) {
          return analyzeChannel(channel, channels.get(channel), metric.key);
        })
      };
    });

    const eligibleObjectives = objectives.map(function objectiveName(definition) { return definition.objective; });
    return {
      ok: true,
      models: models,
      eligibleObjectives: eligibleObjectives,
      recommendedObjective: eligibleObjectives.length > 0 ? eligibleObjectives[0] : null
    };
  }

  root.MangroveMarginality = {
    POLICY: POLICY,
    analyzeHistory: analyzeHistory,
    predict: predict,
    marginalOutcome: marginalOutcome
  };
}(window));
