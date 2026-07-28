/**
 * Browser-only constrained budget allocation for evidence-admitted curves.
 */
'use strict';

(function attachBudgetAllocator(root) {
  const TOLERANCE = 0.001;
  const MAX_RECONCILIATION_STEPS = 100;

  function finiteNonNegative(value) {
    return Number.isFinite(value) && value >= 0;
  }

  function toCents(value) {
    return Math.round(value * 100);
  }

  function safeCents(value) {
    if (!Number.isFinite(value)) return null;
    const cents = toCents(value);
    return Number.isSafeInteger(cents) ? cents : null;
  }

  function safeSum(values) {
    const sum = values.reduce(function add(total, value) { return total + value; }, 0);
    return Number.isSafeInteger(sum) ? sum : null;
  }

  function fromCents(value) {
    return value / 100;
  }

  function currency(value) {
    return `$${fromCents(toCents(value)).toLocaleString('en-US', {
      minimumFractionDigits: toCents(value) % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    })}`;
  }

  function failure(code, message, minimumBudget, maximumBudget, conflicts) {
    return {
      ok: false,
      code: code,
      message: message,
      minimumBudget: minimumBudget == null ? null : minimumBudget,
      maximumBudget: maximumBudget == null ? null : maximumBudget,
      conflicts: conflicts || []
    };
  }

  function invalidInput(message) {
    return failure('invalid_input', message || 'The allocation inputs are not valid.', null, null, []);
  }

  function predictionOverflow() {
    return failure(
      'prediction_overflow',
      'The modeled outcome exceeds the safe calculation range.',
      null,
      null,
      []
    );
  }

  function finiteOrNull(value) {
    return value === null || Number.isFinite(value);
  }

  function marginalKeyForObjective(objective) {
    if (objective === 'conversions') return 'marginal_cpa';
    if (objective === 'revenue') return 'marginal_roas';
    return objective === 'contribution' ? 'marginal_roi' : null;
  }

  function validPublishedMetric(metric, expectedKey, required) {
    if (metric === null) return required === false;
    return Boolean(metric)
      && typeof metric === 'object'
      && metric.key === expectedKey
      && (required ? Number.isFinite(metric.value) : finiteOrNull(metric.value));
  }

  function validPublishedAllocation(result) {
    if (!result || !Number.isFinite(result.horizonFactor) || result.horizonFactor <= 0
      || !Array.isArray(result.allocation) || !result.totals) {
      return false;
    }
    const expectedMetricKey = marginalKeyForObjective(result.objective);
    if (!expectedMetricKey) return false;
    const rowsValid = result.allocation.every(function validPublishedRow(row) {
      if (!row || (row.status !== 'modelable' && row.status !== 'preserved')
        || !Number.isFinite(row.currentSpend)
        || !Number.isFinite(row.recommendedSpend)
        || !Number.isFinite(row.recommendedSpendRate)) {
        return false;
      }
      if (row.status === 'preserved') {
        return row.predictedOutcome === null && row.marginalMetric === null;
      }
      return Number.isFinite(row.predictedOutcome)
        && validPublishedMetric(
          row.marginalMetric,
          expectedMetricKey,
          row.recommendedSpend > 0
        );
    });
    return rowsValid
      && Number.isFinite(result.totals.requestedBudget)
      && Number.isFinite(result.totals.allocatedBudget)
      && Number.isFinite(result.totals.optimizedBudget)
      && Number.isFinite(result.totals.preservedBudget)
      && Number.isFinite(result.totals.predictedOutcome);
  }

  function validCurve(curve) {
    return Boolean(curve)
      && Number.isFinite(curve.a)
      && Number.isFinite(curve.b)
      && curve.a > 0
      && curve.b > 0
      && curve.b < 1;
  }

  function validMetric(metric) {
    if (!metric || typeof metric.key !== 'string') return false;
    if (metric.key === 'conversions' || metric.key === 'revenue') return metric.costTreatment === null;
    return metric.key === 'financial'
      && (metric.costTreatment === 'before_marketing' || metric.costTreatment === 'after_marketing');
  }

  function normalizedConstraint(raw) {
    const value = raw || {};
    if (typeof value !== 'object' || Array.isArray(value)) return null;
    const minimum = value.minimum == null ? null : value.minimum;
    const maximum = value.maximum == null ? null : value.maximum;
    if ((minimum != null && !finiteNonNegative(minimum))
      || (maximum != null && !finiteNonNegative(maximum))
      || (minimum != null && maximum != null && maximum < minimum)
      || (value.excluded != null && typeof value.excluded !== 'boolean')) {
      return null;
    }
    return { minimum: minimum, maximum: maximum, excluded: value.excluded === true };
  }

  function predict(curve, rate) {
    if (!validCurve(curve) || !Number.isFinite(rate) || rate < 0) return null;
    if (rate === 0) return 0;
    const value = curve.a * Math.pow(rate, curve.b);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function marginalOutcome(curve, rate) {
    if (!validCurve(curve) || !Number.isFinite(rate) || rate <= 0) return null;
    const value = curve.a * curve.b * Math.pow(rate, curve.b - 1);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function metricFor(metric, rawMarginal) {
    const marginal = Number.isFinite(rawMarginal) ? rawMarginal : null;
    if (metric.key === 'conversions') {
      return { key: 'marginal_cpa', value: marginal > 0 ? 1 / marginal : null };
    }
    if (metric.key === 'revenue') {
      return { key: 'marginal_roas', value: marginal };
    }
    return {
      key: 'marginal_roi',
      value: marginal == null
        ? null
        : metric.costTreatment === 'before_marketing' ? marginal - 1 : marginal
    };
  }

  function deriveConstraint(channel, constraint, horizonFactor) {
    const isModelable = channel.status === 'modelable' && validCurve(channel.curve);
    const currentSpend = safeCents(channel.currentSpendRate * horizonFactor);
    const preservedSpend = safeCents(channel.preservedSpendRate * horizonFactor);
    if (currentSpend == null || preservedSpend == null) return null;
    if (constraint.excluded) {
      return {
        channel: channel.channel,
        status: isModelable ? 'modelable' : 'preserved',
        curve: isModelable ? channel.curve : null,
        currentSpend: fromCents(currentSpend),
        minimumCents: 0,
        maximumCents: 0,
        constraint: 'excluded'
      };
    }
    if (!isModelable) {
      const overridden = constraint.minimum == null ? preservedSpend : safeCents(constraint.minimum);
      if (overridden == null) return null;
      return {
        channel: channel.channel,
        status: 'preserved',
        curve: null,
        currentSpend: fromCents(currentSpend),
        minimumCents: overridden,
        maximumCents: overridden,
        constraint: 'preserved'
      };
    }
    const minimumCents = constraint.minimum == null ? 0 : safeCents(constraint.minimum);
    const maximumCents = constraint.maximum == null ? Infinity : safeCents(constraint.maximum);
    if (minimumCents == null || maximumCents == null) return null;
    return {
      channel: channel.channel,
      status: 'modelable',
      curve: channel.curve,
      currentSpend: fromCents(currentSpend),
      minimumCents: minimumCents,
      maximumCents: maximumCents,
      constraint: 'interior'
    };
  }

  function spendAtThreshold(item, threshold, horizonFactor) {
    const ratio = (item.curve.a * item.curve.b) / threshold;
    const rate = Math.pow(ratio, 1 / (1 - item.curve.b));
    const cents = Number.isFinite(rate) ? rate * horizonFactor * 100 : Infinity;
    return Math.max(item.minimumCents, Math.min(cents, item.maximumCents));
  }

  function geometricMidpoint(low, high) {
    if (low === 0 || high === 0) return 0;
    return Math.sqrt(low) * Math.sqrt(high);
  }

  function balance(modelable, budgetCents, horizonFactor) {
    function totalAt(threshold) {
      return modelable.reduce(function sumSpend(total, item) {
        return total + spendAtThreshold(item, threshold, horizonFactor);
      }, 0);
    }

    let low = Number.MIN_VALUE;
    let high = 1;
    while (totalAt(high) > budgetCents && high < Number.MAX_VALUE / 10) high *= 10;
    if (totalAt(high) > budgetCents + TOLERANCE * 100) return null;

    for (let iteration = 0; iteration < 200; iteration += 1) {
      const midpoint = geometricMidpoint(low, high);
      if (totalAt(midpoint) > budgetCents) low = midpoint;
      else high = midpoint;
    }
    const threshold = geometricMidpoint(low, high);
    const allocations = modelable.map(function allocate(item) {
      const allocatedCents = safeCents(spendAtThreshold(item, threshold, horizonFactor) / 100);
      return allocatedCents == null ? null : Object.assign({}, item, { allocatedCents: allocatedCents });
    });
    if (allocations.some(function invalidAllocation(item) { return item == null; })) return null;
    return allocations;
  }

  function marginalAtCents(item, cents, horizonFactor) {
    return marginalOutcome(item.curve, fromCents(cents) / horizonFactor);
  }

  function reconcile(modelable, targetCents, horizonFactor) {
    const allocatedTotal = safeSum(modelable.map(function allocated(item) { return item.allocatedCents; }));
    if (allocatedTotal == null) return false;
    let delta = targetCents - allocatedTotal;
    const roundingBound = Math.ceil(modelable.length / 2) + 1;
    const stepLimit = Math.min(roundingBound, MAX_RECONCILIATION_STEPS);
    // Nearest-cent rounding contributes at most half a cent per channel. The
    // extra cent covers the balance tolerance and floating-point boundary.
    if (!Number.isSafeInteger(delta) || Math.abs(delta) > stepLimit) return false;
    let steps = 0;
    while (delta !== 0) {
      if (steps >= stepLimit) return false;
      const candidates = modelable.filter(function hasCapacity(item) {
        return delta > 0 ? item.allocatedCents < item.maximumCents : item.allocatedCents > item.minimumCents;
      }).sort(function byMarginalThenName(left, right) {
        const leftMarginal = marginalAtCents(left, left.allocatedCents, horizonFactor);
        const rightMarginal = marginalAtCents(right, right.allocatedCents, horizonFactor);
        const leftValue = leftMarginal == null ? -Infinity : leftMarginal;
        const rightValue = rightMarginal == null ? -Infinity : rightMarginal;
        const comparison = delta > 0 ? rightValue - leftValue : leftValue - rightValue;
        return comparison || left.channel.localeCompare(right.channel);
      });
      if (candidates.length === 0) return false;
      candidates[0].allocatedCents += delta > 0 ? 1 : -1;
      delta += delta > 0 ? -1 : 1;
      steps += 1;
    }
    return true;
  }

  function allocationConstraint(item) {
    if (item.constraint !== 'interior') return item.constraint;
    if (item.allocatedCents === item.minimumCents) return 'minimum';
    if (item.allocatedCents === item.maximumCents) return 'maximum';
    return 'interior';
  }

  function allocatePlan(input) {
    if (!input || typeof input !== 'object' || !finiteNonNegative(input.totalBudget) || input.totalBudget <= 0
      || !Number.isFinite(input.planDays) || input.planDays <= 0) {
      return invalidInput();
    }
    const model = input.model;
    if (!model || !Number.isFinite(model.cadenceDays) || model.cadenceDays <= 0
      || !validMetric(model.metric) || !Array.isArray(model.channels) || model.channels.length === 0
      || typeof input.constraints !== 'object' || input.constraints == null || Array.isArray(input.constraints)) {
      return invalidInput();
    }
    const expectedObjective = model.metric.key === 'financial' ? 'contribution' : model.metric.key;
    if (model.objective !== expectedObjective) return invalidInput();
    const names = new Set();
    const constraints = input.constraints;
    const knownNames = new Set(model.channels.map(function nameOf(channel) { return channel && channel.channel; }));
    if (Object.keys(constraints).some(function unknownChannel(name) { return !knownNames.has(name); })) return invalidInput();

    const normalized = [];
    for (let index = 0; index < model.channels.length; index += 1) {
      const channel = model.channels[index];
      if (!channel || typeof channel.channel !== 'string' || channel.channel.length === 0 || names.has(channel.channel)
        || !finiteNonNegative(channel.currentSpendRate) || !finiteNonNegative(channel.preservedSpendRate)) {
        return invalidInput();
      }
      names.add(channel.channel);
      const constraint = normalizedConstraint(constraints[channel.channel]);
      if (!constraint) return invalidInput();
      normalized.push({ channel: channel, constraint: constraint });
    }

    const horizonFactor = input.planDays / model.cadenceDays;
    const requestedCents = safeCents(input.totalBudget);
    if (!Number.isFinite(horizonFactor) || horizonFactor <= 0 || requestedCents == null) return invalidInput();
    const derivedItems = normalized.map(function buildItem(entry) {
      return deriveConstraint(entry.channel, entry.constraint, horizonFactor);
    });
    if (derivedItems.some(function invalidItem(item) { return item == null; })) return invalidInput();
    const items = derivedItems.sort(function byChannel(left, right) { return left.channel.localeCompare(right.channel); });
    const minimumCents = safeSum(items.map(function minimumOf(item) { return item.minimumCents; }));
    const finiteMaximum = items.every(function finiteMaximum(item) { return Number.isFinite(item.maximumCents); });
    const maximumCents = finiteMaximum ? safeSum(items.map(function maximumOf(item) { return item.maximumCents; })) : null;
    if (minimumCents == null || (finiteMaximum && maximumCents == null)) return invalidInput();
    const minimumConflicts = items.filter(function hasMinimum(item) { return item.minimumCents > 0; }).map(function nameOf(item) { return item.channel; });
    const maximumConflicts = items.filter(function hasMaximum(item) { return Number.isFinite(item.maximumCents); }).map(function nameOf(item) { return item.channel; });
    const modelable = items.filter(function modelableItem(item) {
      return item.status === 'modelable' && item.maximumCents > item.minimumCents;
    });
    const hasAdmittedCurve = items.some(function admittedCurve(item) { return item.status === 'modelable'; });
    if (minimumCents > requestedCents) {
      return failure('minimums_exceed_budget', `The preserved and minimum allocations require ${currency(fromCents(minimumCents))}.`, fromCents(minimumCents), null, minimumConflicts);
    }
    if (maximumCents != null && maximumCents < requestedCents && hasAdmittedCurve) {
      return failure('maximums_below_budget', `The channel maximums allow only ${currency(fromCents(maximumCents))}.`, fromCents(minimumCents), fromCents(maximumCents), maximumConflicts);
    }
    if (requestedCents > minimumCents && modelable.length === 0) {
      return failure('no_defensible_remainder', 'No admitted response curve can receive the remaining budget.', fromCents(minimumCents), maximumCents == null ? null : fromCents(maximumCents), []);
    }
    if (!Number.isFinite(fromCents(requestedCents) / horizonFactor)) return predictionOverflow();

    const modeledMinimumCents = safeSum(modelable.map(function minimumOf(item) { return item.minimumCents; }));
    if (modeledMinimumCents == null) return invalidInput();
    const fixedCents = minimumCents - modeledMinimumCents;
    const modeledTargetCents = requestedCents - fixedCents;
    if (!Number.isSafeInteger(fixedCents) || !Number.isSafeInteger(modeledTargetCents)) return invalidInput();
    const balanced = balance(modelable, modeledTargetCents, horizonFactor);
    if (!balanced) return failure('no_defensible_remainder', 'No admitted response curve can receive the remaining budget.', fromCents(minimumCents), maximumCents == null ? null : fromCents(maximumCents), []);
    if (!reconcile(balanced, modeledTargetCents, horizonFactor)) {
      return failure('currency_reconciliation_failed', 'The allocation could not be reconciled to whole cents.', fromCents(minimumCents), maximumCents == null ? null : fromCents(maximumCents), []);
    }
    const allocations = new Map(balanced.map(function byName(item) { return [item.channel, item]; }));
    items.forEach(function retainFixed(item) {
      if (!allocations.has(item.channel)) allocations.set(item.channel, Object.assign({}, item, { allocatedCents: item.minimumCents }));
    });

    let predictedOutcome = 0;
    let predictionFailed = false;
    const allocation = items.map(function resultRow(item) {
      const allocated = allocations.get(item.channel);
      const recommendedSpend = fromCents(allocated.allocatedCents);
      const recommendedSpendRate = recommendedSpend / horizonFactor;
      if (allocated.status !== 'modelable') {
        return {
          channel: allocated.channel,
          status: allocated.status,
          currentSpend: allocated.currentSpend,
          recommendedSpend: recommendedSpend,
          recommendedSpendRate: recommendedSpendRate,
          predictedOutcome: null,
          marginalMetric: null,
          constraint: allocationConstraint(allocated)
        };
      }
      const predictedRateOutcome = predict(allocated.curve, recommendedSpendRate);
      const rawOutcome = predictedRateOutcome == null
        ? null
        : predictedRateOutcome * horizonFactor;
      const rawMarginal = marginalOutcome(allocated.curve, recommendedSpendRate);
      const outcome = rawOutcome == null
        ? null
        : model.metric.key === 'financial' && model.metric.costTreatment === 'before_marketing'
          ? rawOutcome - recommendedSpend
          : rawOutcome;
      const nextPredictedOutcome = outcome == null ? null : predictedOutcome + outcome;
      if (!Number.isFinite(rawOutcome) || !Number.isFinite(outcome)
        || !Number.isFinite(nextPredictedOutcome)) {
        predictionFailed = true;
        return null;
      }
      predictedOutcome = nextPredictedOutcome;
      return {
        channel: allocated.channel,
        status: 'modelable',
        currentSpend: allocated.currentSpend,
        recommendedSpend: recommendedSpend,
        recommendedSpendRate: recommendedSpendRate,
        predictedOutcome: outcome,
        marginalMetric: metricFor(model.metric, rawMarginal),
        constraint: allocationConstraint(allocated)
      };
    });
    if (predictionFailed) return predictionOverflow();
    const optimizedCents = safeSum(allocation.filter(function modeled(item) { return item.status === 'modelable'; })
      .map(function allocatedCents(item) { return allocations.get(item.channel).allocatedCents; }));
    const preservedCents = requestedCents - optimizedCents;
    if (optimizedCents == null || !Number.isSafeInteger(preservedCents) || preservedCents < 0) return invalidInput();
    const result = {
      ok: true,
      code: 'allocated',
      horizonFactor: horizonFactor,
      objective: model.objective,
      allocation: allocation,
      totals: {
        requestedBudget: fromCents(requestedCents),
        allocatedBudget: fromCents(requestedCents),
        optimizedBudget: fromCents(optimizedCents),
        preservedBudget: fromCents(preservedCents),
        predictedOutcome: predictedOutcome
      },
      conflicts: []
    };
    return validPublishedAllocation(result) ? result : predictionOverflow();
  }

  root.MangroveBudgetAllocator = { allocatePlan: allocatePlan };
}(window));
