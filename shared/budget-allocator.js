/**
 * Browser-only constrained budget allocation for evidence-admitted curves.
 */
'use strict';

(function attachBudgetAllocator(root) {
  const BALANCE_ITERATIONS = 200;
  const LOG_MAX_VALUE = Math.log(Number.MAX_VALUE);
  // Per channel: two compensated sums (8), cent conversion (2), delta sum (1).
  const PROJECTION_FIXED_BASE_OPERATIONS = 1;
  const PROJECTION_BASE_OPERATIONS_PER_CHANNEL = 11;
  // Per pass/channel: centered value (1), compensated sum (4), candidate (1).
  const PROJECTION_PASS_OPERATIONS_PER_CHANNEL = 6;
  // Per pass: subtract fixed and active totals, then divide by active count.
  const PROJECTION_PASS_FIXED_OPERATIONS = 3;

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

  function compensatedSum(values) {
    let sum = 0;
    let correction = 0;
    for (let index = 0; index < values.length; index += 1) {
      if (!Number.isFinite(values[index])) return null;
      const adjusted = values[index] - correction;
      const next = sum + adjusted;
      correction = (next - sum) - adjusted;
      sum = next;
    }
    return Number.isFinite(sum) ? sum : null;
  }

  function relativeLog(value, reference) {
    const relativeDifference = (value - reference) / reference;
    if (Number.isFinite(relativeDifference)
      && relativeDifference > -0.5
      && relativeDifference < 1) {
      return Math.log1p(relativeDifference);
    }
    return Math.log(value) - Math.log(reference);
  }

  function compensatedPair(left, right) {
    const sum = left + right;
    const rightApproximation = sum - left;
    return {
      value: sum,
      correction: (left - (sum - rightApproximation)) + (right - rightApproximation)
    };
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
        return row.currentPredictedOutcome === null
          && row.predictedOutcome === null
          && row.marginalMetric === null;
      }
      return Number.isFinite(row.currentPredictedOutcome)
        && Number.isFinite(row.predictedOutcome)
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
      && Number.isFinite(result.totals.currentPredictedOutcome)
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

  function planOutcome(metric, curve, planSpend, horizonFactor) {
    if (!Number.isFinite(planSpend) || planSpend < 0
      || !Number.isFinite(horizonFactor) || horizonFactor <= 0) return null;
    const predictedRateOutcome = predict(curve, planSpend / horizonFactor);
    const rawOutcome = predictedRateOutcome == null
      ? null
      : predictedRateOutcome * horizonFactor;
    if (!Number.isFinite(rawOutcome)) return null;
    const outcome = metric.key === 'financial' && metric.costTreatment === 'before_marketing'
      ? rawOutcome - planSpend
      : rawOutcome;
    return Number.isFinite(outcome) ? outcome : null;
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

  function projectionOperationCount(channelCount, passes) {
    const count = PROJECTION_FIXED_BASE_OPERATIONS
      + PROJECTION_BASE_OPERATIONS_PER_CHANNEL * channelCount
      + passes * (
        PROJECTION_PASS_OPERATIONS_PER_CHANNEL * channelCount
        + PROJECTION_PASS_FIXED_OPERATIONS
      );
    return Number.isSafeInteger(count) && count > 0 ? count : null;
  }

  function projectToBoundedBudget(modelable, rawCents, targetCents) {
    const rawTotal = compensatedSum(rawCents);
    if (rawTotal == null) return null;
    const residual = targetCents - rawTotal;
    if (!Number.isFinite(residual)) return null;
    if (residual === 0) {
      const operations = projectionOperationCount(modelable.length, 0);
      return operations == null ? null : {
        values: rawCents,
        passes: 0,
        operations: operations
      };
    }

    const projected = rawCents.slice();
    const fixed = new Array(modelable.length).fill(false);
    let activeCount = modelable.length;
    // Euclidean box-simplex projection has y_i = clamp(raw_i + shift).
    // Every nonconverged pass fixes at least one new bound, so channelCount + 1
    // passes are sufficient without an input-independent cutoff.
    for (let pass = 1; pass <= modelable.length + 1; pass += 1) {
      if (activeCount === 0) {
        const operations = projectionOperationCount(modelable.length, pass);
        return operations == null ? null : {
          values: projected,
          passes: pass,
          operations: operations
        };
      }

      const activeValues = [];
      const fixedValues = [];
      let activeAnchor = null;
      for (let index = 0; index < modelable.length; index += 1) {
        if (fixed[index]) fixedValues.push(projected[index]);
        else {
          if (activeAnchor === null) activeAnchor = rawCents[index];
          activeValues.push(rawCents[index] - activeAnchor);
        }
      }
      const activeTotal = compensatedSum(activeValues);
      const fixedTotal = compensatedSum(fixedValues);
      if (activeTotal == null || fixedTotal == null) return null;
      const level = (targetCents - fixedTotal - activeTotal) / activeCount;
      if (!Number.isFinite(level)) return null;

      let newlyFixed = 0;
      for (let index = 0; index < modelable.length; index += 1) {
        if (fixed[index]) continue;
        const candidate = (rawCents[index] - activeAnchor) + level;
        if (!Number.isFinite(candidate)) return null;
        if (candidate < modelable[index].minimumCents) {
          projected[index] = modelable[index].minimumCents;
          fixed[index] = true;
          newlyFixed += 1;
        } else if (candidate > modelable[index].maximumCents) {
          projected[index] = modelable[index].maximumCents;
          fixed[index] = true;
          newlyFixed += 1;
        } else {
          projected[index] = candidate;
        }
      }

      const operations = projectionOperationCount(modelable.length, pass);
      if (operations == null) return null;
      if (newlyFixed === 0) {
        return {
          values: projected,
          passes: pass,
          operations: operations
        };
      }
      activeCount -= newlyFixed;
    }
    return null;
  }

  function pivotedDualBudget(modelable, targetCents, horizonFactor) {
    if (modelable.length === 0) return targetCents === 0 ? [] : null;
    const logHorizonCents = Math.log(horizonFactor) + Math.log(100);
    if (!Number.isFinite(logHorizonCents)) return null;
    const pivotIndex = modelable.reduce(function mostStablePivot(selected, item, index) {
      const selectedGap = 1 - modelable[selected].curve.b;
      const gap = 1 - item.curve.b;
      if (gap < selectedGap) return index;
      if (gap > selectedGap) return selected;
      const selectedCoefficient = modelable[selected].curve.a * modelable[selected].curve.b;
      const coefficient = item.curve.a * item.curve.b;
      return coefficient > selectedCoefficient ? index : selected;
    }, 0);
    const reference = modelable[pivotIndex];
    const pivotGap = 1 - reference.curve.b;
    const descriptors = modelable.map(function descriptor(item) {
      const gap = 1 - item.curve.b;
      const relativeCoefficient = compensatedPair(
        relativeLog(item.curve.a, reference.curve.a),
        relativeLog(item.curve.b, reference.curve.b)
      );
      return {
        relativeCoefficient: relativeCoefficient.value,
        relativeCoefficientCorrection: relativeCoefficient.correction,
        gap: gap,
        pivotSlope: pivotGap / gap,
        minimumCents: item.minimumCents,
        maximumCents: item.maximumCents,
        logMinimum: item.minimumCents > 0 ? Math.log(item.minimumCents) : -Infinity,
        logMaximum: Number.isFinite(item.maximumCents) ? Math.log(item.maximumCents) : Infinity
      };
    });
    if (!Number.isFinite(pivotGap) || pivotGap <= 0
      || descriptors.some(function invalidDescriptor(item) {
        return !Number.isFinite(item.relativeCoefficient)
          || !Number.isFinite(item.relativeCoefficientCorrection)
          || !Number.isFinite(item.pivotSlope)
          || item.pivotSlope <= 0
          || item.pivotSlope > 1;
      })) return null;

    function valuesAt(logPivotRate) {
      const values = descriptors.map(function spendAtPivotRate(item) {
        const mainLogRate = (item.relativeCoefficient / item.gap)
          + (item.pivotSlope * logPivotRate);
        const logCents = mainLogRate
          + (item.relativeCoefficientCorrection / item.gap)
          + logHorizonCents;
        if (logCents <= item.logMinimum) return item.minimumCents;
        if (logCents >= item.logMaximum) return item.maximumCents;
        if (logCents > LOG_MAX_VALUE) return Infinity;
        const cents = Math.exp(logCents);
        return Math.max(item.minimumCents, Math.min(cents, item.maximumCents));
      });
      const total = compensatedSum(values);
      return {
        values: values,
        total: total == null ? Infinity : total
      };
    }

    const zero = valuesAt(0);
    if (zero.total === targetCents) return zero.values;
    let low;
    let high;
    if (zero.total > targetCents) {
      high = 0;
      low = -1;
      while (valuesAt(low).total > targetCents) {
        high = low;
        if (low <= -Number.MAX_VALUE / 2) return null;
        low *= 2;
      }
    } else {
      low = 0;
      high = 1;
      while (valuesAt(high).total < targetCents) {
        low = high;
        if (high >= Number.MAX_VALUE / 2) return null;
        high *= 2;
      }
    }

    for (let iteration = 0; iteration < BALANCE_ITERATIONS; iteration += 1) {
      const midpoint = low + ((high - low) / 2);
      if (midpoint === low || midpoint === high) break;
      if (valuesAt(midpoint).total < targetCents) low = midpoint;
      else high = midpoint;
    }
    const lowResult = valuesAt(low);
    const highResult = valuesAt(high);
    return Math.abs(lowResult.total - targetCents) <= Math.abs(highResult.total - targetCents)
      ? lowResult.values
      : highResult.values;
  }

  function balance(modelable, budgetCents, horizonFactor) {
    const stableCents = pivotedDualBudget(modelable, budgetCents, horizonFactor);
    if (!stableCents) return null;
    const allocations = modelable.map(function allocate(item, index) {
      const allocatedCents = Math.floor(stableCents[index]);
      return Number.isSafeInteger(allocatedCents)
        ? Object.assign({}, item, { allocatedCents: allocatedCents })
        : null;
    });
    if (allocations.some(function invalidAllocation(item) { return item == null; })) return null;
    return {
      allocations: allocations,
      precisionOperations: projectionOperationCount(modelable.length, 0)
    };
  }

  function logCentIncrement(item, cents, direction, horizonFactor) {
    const logHorizon = Math.log(horizonFactor);
    const logHorizonCents = logHorizon + Math.log(100);
    const logBase = Math.log(item.curve.a) + logHorizon;
    if (!Number.isFinite(logBase) || !Number.isFinite(logHorizonCents)) return null;
    if (direction > 0 && cents === 0) {
      return logBase - item.curve.b * logHorizonCents;
    }
    if (direction < 0 && cents === 1) {
      return logBase - item.curve.b * logHorizonCents;
    }
    if (cents <= 0) return null;
    const logOutcome = logBase
      + item.curve.b * (Math.log(cents) - logHorizonCents);
    const logRateChange = item.curve.b * Math.log1p(direction / cents);
    const relativeIncrement = direction > 0
      ? Math.expm1(logRateChange)
      : -Math.expm1(logRateChange);
    if (!Number.isFinite(logOutcome)
      || !Number.isFinite(relativeIncrement)
      || relativeIncrement <= 0) return null;
    const result = logOutcome + Math.log(relativeIncrement);
    return Number.isFinite(result) ? result : null;
  }

  function nextDiscreteExchange(modelable, horizonFactor) {
    let firstGain = null;
    let secondGain = null;
    let firstLoss = null;
    let secondLoss = null;
    for (let index = 0; index < modelable.length; index += 1) {
      const item = modelable[index];
      if (item.allocatedCents < item.maximumCents) {
        const gain = logCentIncrement(item, item.allocatedCents, 1, horizonFactor);
        if (gain == null) return false;
        const entry = { index: index, value: gain };
        if (firstGain == null || gain > firstGain.value) {
          secondGain = firstGain;
          firstGain = entry;
        } else if (secondGain == null || gain > secondGain.value) {
          secondGain = entry;
        }
      }
      if (item.allocatedCents > item.minimumCents) {
        const loss = logCentIncrement(item, item.allocatedCents, -1, horizonFactor);
        if (loss == null) return false;
        const entry = { index: index, value: loss };
        if (firstLoss == null || loss < firstLoss.value) {
          secondLoss = firstLoss;
          firstLoss = entry;
        } else if (secondLoss == null || loss < secondLoss.value) {
          secondLoss = entry;
        }
      }
    }
    const gains = [firstGain, secondGain].filter(Boolean);
    const losses = [firstLoss, secondLoss].filter(Boolean);
    const candidates = [];
    for (let gainIndex = 0; gainIndex < gains.length; gainIndex += 1) {
      for (let lossIndex = 0; lossIndex < losses.length; lossIndex += 1) {
        if (gains[gainIndex].index !== losses[lossIndex].index) {
          candidates.push({
            receiver: gains[gainIndex].index,
            donor: losses[lossIndex].index,
            gain: gains[gainIndex].value,
            loss: losses[lossIndex].value
          });
        }
      }
    }
    if (candidates.length === 0) return null;
    const best = candidates.reduce(function largestImprovement(selected, candidate) {
      return candidate.gain - candidate.loss > selected.gain - selected.loss
        ? candidate
        : selected;
    });
    const comparisonTolerance = Number.EPSILON * 64
      * (1 + Math.abs(best.gain) + Math.abs(best.loss));
    return best.gain > best.loss + comparisonTolerance ? best : null;
  }

  function satisfiesDiscreteKkt(modelable, horizonFactor) {
    return nextDiscreteExchange(modelable, horizonFactor) === null;
  }

  function repairDiscreteKkt(modelable, horizonFactor) {
    const versions = new Array(modelable.length).fill(0);
    const gainHeap = [];
    const lossHeap = [];
    function higherGain(left, right) {
      if (left.value !== right.value) return left.value > right.value;
      return left.channel.localeCompare(right.channel) < 0;
    }
    function lowerLoss(left, right) {
      if (left.value !== right.value) return left.value < right.value;
      return left.channel.localeCompare(right.channel) < 0;
    }
    function pushCurrent(index) {
      const item = modelable[index];
      if (item.allocatedCents < item.maximumCents) {
        const gain = logCentIncrement(item, item.allocatedCents, 1, horizonFactor);
        if (gain == null) return false;
        pushHeap(gainHeap, {
          channel: item.channel,
          index: index,
          value: gain,
          version: versions[index]
        }, higherGain);
      }
      if (item.allocatedCents > item.minimumCents) {
        const loss = logCentIncrement(item, item.allocatedCents, -1, horizonFactor);
        if (loss == null) return false;
        pushHeap(lossHeap, {
          channel: item.channel,
          index: index,
          value: loss,
          version: versions[index]
        }, lowerLoss);
      }
      return true;
    }
    function takeCurrent(heap, higherPriority) {
      while (heap.length > 0) {
        const entry = popHeap(heap, higherPriority);
        if (entry.version === versions[entry.index]) return entry;
      }
      return null;
    }
    for (let index = 0; index < modelable.length; index += 1) {
      if (!pushCurrent(index)) return false;
    }
    for (let adjustment = 0; adjustment <= modelable.length; adjustment += 1) {
      const gains = [
        takeCurrent(gainHeap, higherGain),
        takeCurrent(gainHeap, higherGain)
      ].filter(Boolean);
      const losses = [
        takeCurrent(lossHeap, lowerLoss),
        takeCurrent(lossHeap, lowerLoss)
      ].filter(Boolean);
      const candidates = [];
      gains.forEach(function pairGain(gain) {
        losses.forEach(function pairLoss(loss) {
          if (gain.index !== loss.index) {
            candidates.push({
              receiver: gain.index,
              donor: loss.index,
              gain: gain.value,
              loss: loss.value
            });
          }
        });
      });
      const best = candidates.reduce(function largestImprovement(selected, candidate) {
        if (selected == null) return candidate;
        return candidate.gain - candidate.loss > selected.gain - selected.loss
          ? candidate
          : selected;
      }, null);
      const tolerance = best == null
        ? 0
        : Number.EPSILON * 64 * (1 + Math.abs(best.gain) + Math.abs(best.loss));
      if (best == null || best.gain <= best.loss + tolerance) return true;
      if (adjustment === modelable.length) return false;

      modelable[best.donor].allocatedCents -= 1;
      modelable[best.receiver].allocatedCents += 1;
      versions[best.donor] += 1;
      versions[best.receiver] += 1;
      gains.concat(losses).forEach(function restoreUnchanged(entry) {
        if (entry.index !== best.donor && entry.index !== best.receiver) {
          pushHeap(
            gains.includes(entry) ? gainHeap : lossHeap,
            entry,
            gains.includes(entry) ? higherGain : lowerLoss
          );
        }
      });
      if (!pushCurrent(best.donor)
        || (best.receiver !== best.donor && !pushCurrent(best.receiver))) return false;
    }
    return false;
  }

  function pushHeap(heap, item, higherPriority) {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!higherPriority(heap[index], heap[parent])) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
  }

  function popHeap(heap, higherPriority) {
    const first = heap[0];
    const last = heap.pop();
    if (heap.length === 0) return first;
    heap[0] = last;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let next = index;
      if (left < heap.length && higherPriority(heap[left], heap[next])) next = left;
      if (right < heap.length && higherPriority(heap[right], heap[next])) next = right;
      if (next === index) break;
      [heap[index], heap[next]] = [heap[next], heap[index]];
      index = next;
    }
    return first;
  }

  function reconciliationPrecisionBound(operationCount, magnitude) {
    const scaledEpsilon = operationCount * Number.EPSILON;
    if (!Number.isFinite(scaledEpsilon) || scaledEpsilon >= 1) return null;
    // Standard forward-error allowance: gamma_n = n*u / (1 - n*u).
    const gamma = scaledEpsilon / (1 - scaledEpsilon);
    const bound = Math.ceil(gamma * magnitude);
    return Number.isSafeInteger(bound) ? bound : null;
  }

  function reconcile(modelable, targetCents, horizonFactor, projectedOperations) {
    let delta = targetCents;
    for (let index = 0; index < modelable.length; index += 1) {
      delta -= modelable[index].allocatedCents;
      if (!Number.isSafeInteger(delta)) return false;
    }
    const roundingBound = modelable.length;
    const precisionMagnitude = Math.abs(targetCents) + Math.abs(delta);
    const operationCount = projectedOperations == null
      ? projectionOperationCount(modelable.length, 0)
      : projectedOperations;
    if (operationCount == null) return false;
    const precisionBound = reconciliationPrecisionBound(operationCount, precisionMagnitude);
    if (precisionBound == null) return false;
    const adjustmentBound = roundingBound + precisionBound;
    // Flooring contributes less than one cent per channel.
    // The independent discrete-KKT check below validates that these bounded
    // cent adjustments preserve the concave objective's allocation shape.
    if (!Number.isSafeInteger(delta) || Math.abs(delta) > adjustmentBound) return false;
    if (delta === 0) return true;
    const direction = delta > 0 ? 1 : -1;
    const required = Math.abs(delta);
    let remainingCapacity = required;
    const candidates = modelable.filter(function hasCapacity(item) {
      const capacity = direction > 0
        ? item.maximumCents - item.allocatedCents
        : item.allocatedCents - item.minimumCents;
      if (capacity <= 0) return false;
      remainingCapacity -= Math.min(remainingCapacity, capacity);
      return true;
    });
    if (remainingCapacity > 0) return false;

    function higherPriority(left, right) {
      const leftIncrement = logCentIncrement(
        left,
        left.allocatedCents,
        direction,
        horizonFactor
      );
      const rightIncrement = logCentIncrement(
        right,
        right.allocatedCents,
        direction,
        horizonFactor
      );
      const leftValue = leftIncrement == null
        ? (direction > 0 ? -Infinity : Infinity)
        : leftIncrement;
      const rightValue = rightIncrement == null
        ? (direction > 0 ? -Infinity : Infinity)
        : rightIncrement;
      if (leftValue !== rightValue) {
        return direction > 0 ? leftValue > rightValue : leftValue < rightValue;
      }
      const order = left.channel.localeCompare(right.channel);
      return direction > 0 ? order > 0 : order < 0;
    }

    const heap = [];
    candidates.forEach(function addCandidate(item) {
      pushHeap(heap, item, higherPriority);
    });
    while (delta !== 0) {
      const selected = popHeap(heap, higherPriority);
      if (!selected) return false;
      selected.allocatedCents += direction;
      delta -= direction;
      const hasCapacity = direction > 0
        ? selected.allocatedCents < selected.maximumCents
        : selected.allocatedCents > selected.minimumCents;
      if (hasCapacity) pushHeap(heap, selected, higherPriority);
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
    const balanceResult = balance(modelable, modeledTargetCents, horizonFactor);
    if (!balanceResult) return failure('no_defensible_remainder', 'No admitted response curve can receive the remaining budget.', fromCents(minimumCents), maximumCents == null ? null : fromCents(maximumCents), []);
    const balanced = balanceResult.allocations;
    if (!reconcile(balanced, modeledTargetCents, horizonFactor, balanceResult.precisionOperations)) {
      return failure('currency_reconciliation_failed', 'The allocation could not be reconciled to whole cents.', fromCents(minimumCents), maximumCents == null ? null : fromCents(maximumCents), []);
    }
    if (!repairDiscreteKkt(balanced, horizonFactor)
      || !satisfiesDiscreteKkt(balanced, horizonFactor)) {
      return failure('currency_reconciliation_failed', 'The allocation could not be reconciled to whole cents.', fromCents(minimumCents), maximumCents == null ? null : fromCents(maximumCents), []);
    }
    const allocations = new Map(balanced.map(function byName(item) { return [item.channel, item]; }));
    items.forEach(function retainFixed(item) {
      if (!allocations.has(item.channel)) allocations.set(item.channel, Object.assign({}, item, { allocatedCents: item.minimumCents }));
    });

    let currentPredictedOutcome = 0;
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
          currentPredictedOutcome: null,
          predictedOutcome: null,
          marginalMetric: null,
          constraint: allocationConstraint(allocated)
        };
      }
      const currentOutcome = planOutcome(
        model.metric,
        allocated.curve,
        allocated.currentSpend,
        horizonFactor
      );
      const outcome = planOutcome(
        model.metric,
        allocated.curve,
        recommendedSpend,
        horizonFactor
      );
      const rawMarginal = marginalOutcome(allocated.curve, recommendedSpendRate);
      const nextCurrentPredictedOutcome = currentOutcome == null
        ? null
        : currentPredictedOutcome + currentOutcome;
      const nextPredictedOutcome = outcome == null ? null : predictedOutcome + outcome;
      if (!Number.isFinite(currentOutcome) || !Number.isFinite(outcome)
        || !Number.isFinite(nextCurrentPredictedOutcome)
        || !Number.isFinite(nextPredictedOutcome)) {
        predictionFailed = true;
        return null;
      }
      currentPredictedOutcome = nextCurrentPredictedOutcome;
      predictedOutcome = nextPredictedOutcome;
      return {
        channel: allocated.channel,
        status: 'modelable',
        currentSpend: allocated.currentSpend,
        recommendedSpend: recommendedSpend,
        recommendedSpendRate: recommendedSpendRate,
        currentPredictedOutcome: currentOutcome,
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
        currentPredictedOutcome: currentPredictedOutcome,
        predictedOutcome: predictedOutcome
      },
      conflicts: []
    };
    return validPublishedAllocation(result) ? result : predictionOverflow();
  }

  root.MangroveBudgetAllocator = { allocatePlan: allocatePlan };
}(window));
