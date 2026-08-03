/**
 * Progressive Budget Advisor decision canvas.
 */
'use strict';

(function attachBudgetApp(root) {
  const GATE_LABELS = Object.freeze({
    minimum_complete_periods: 'Needs at least 12 complete periods',
    positive_coverage: 'Needs positive spend and outcome in at least 75% of periods',
    distinct_spend: 'Needs at least 4 distinct positive spend levels',
    spend_variation: 'Needs at least 20% robust spend variation',
    elasticity: 'Needs a stable diminishing-return response',
    elasticity_stability: 'Response shape changes too much when one period is removed',
    current_prediction_stability: 'Current prediction changes too much when one period is removed'
  });
  const STATUS_LABELS = Object.freeze({
    modelable: 'Modeled marginal response',
    preserved: 'Preserved at recent spend'
  });
  const FIELD_LABELS = Object.freeze({
    period: 'Period',
    channel: 'Channel',
    spend: 'Spend',
    conversions: 'Conversions',
    revenue: 'Revenue',
    financial: 'Financial outcome',
    outcome: 'Outcome'
  });
  const FAILURE_COPY = Object.freeze({
    minimums_exceed_budget:
      'Preserved and minimum allocations exceed this budget. Increase the budget or lower the listed constraints.',
    maximums_below_budget:
      'Channel maximums leave part of this budget unassigned. Raise a maximum or lower the total budget.',
    no_defensible_remainder:
      'No modeled channel can accept the remaining budget. Add spend variation or change an explicit constraint.',
    prediction_overflow:
      'The modeled outcome is too large to calculate safely. Review the imported values or choose a shorter planning window.',
    invalid_plan:
      'Enter a positive budget and planning window.',
    rounding_infeasible:
      'The plan cannot be reconciled to currency cents under the current constraints.'
  });
  const FAILURE_CODES = Object.freeze({
    invalid_input: 'invalid_plan',
    currency_reconciliation_failed: 'rounding_infeasible'
  });
  const MARGINAL_LABELS = Object.freeze({
    marginal_cpa: 'Marginal CPA',
    marginal_roas: 'Marginal ROAS',
    marginal_roi: 'Marginal ROI'
  });
  const IMPORT_ACTIONS = Object.freeze(['upload', 'paste', 'sample']);
  const BUDGET_EVENTS = Object.freeze([
    'tool_started',
    'sample_data_used',
    'calculation_completed'
  ]);

  function createState() {
    return {
      phase: 'empty',
      importResult: null,
      analysis: null,
      selectedObjective: null,
      allocation: null,
      constraints: {},
      sourceKind: null,
      pendingImport: null
    };
  }

  function modelFor(analysis, objective) {
    if (!analysis || !analysis.models || typeof analysis.models !== 'object') return null;
    const selected = objective || analysis.recommendedObjective;
    if (selected && analysis.models[selected]) return analysis.models[selected];
    const first = Object.keys(analysis.models)[0];
    return first ? analysis.models[first] : null;
  }

  function derivePhase(state) {
    const current = state && typeof state === 'object' ? state : createState();
    if (current.phase === 'parsing' && !current.importResult && !current.analysis) {
      return 'parsing';
    }
    if (current.importResult && current.importResult.ok === false) return 'needs_correction';
    if (current.allocation && current.allocation.ok === true) return 'result';
    if (current.allocation && current.allocation.ok === false) return 'blocked';
    if (!current.analysis) return 'empty';
    if (current.analysis.ok !== true) return 'blocked';

    const model = modelFor(current.analysis, current.selectedObjective);
    const channels = model && Array.isArray(model.channels) ? model.channels : [];
    const modelable = channels.filter(function isModelable(channel) {
      return channel && channel.status === 'modelable';
    }).length;
    const preserved = channels.filter(function isPreserved(channel) {
      return channel && channel.status === 'preserved';
    }).length;

    if (modelable === 0 && preserved > 0) return 'partially_modelable';
    if (modelable === 0) return 'blocked';
    if (preserved > 0) return 'partially_modelable';
    return 'ready';
  }

  function readinessView(analysis) {
    const source = analysis && typeof analysis === 'object' ? analysis : {};
    const summary = source.historySummary && typeof source.historySummary === 'object'
      ? source.historySummary
      : {};
    const model = modelFor(source, source.recommendedObjective);
    const channels = model && Array.isArray(model.channels) ? model.channels : [];
    const eligibleObjectives = Array.isArray(source.eligibleObjectives)
      ? source.eligibleObjectives
      : [];
    const eligibleMetrics = eligibleObjectives.map(function metricLabel(objective) {
      const objectiveModel = source.models && source.models[objective];
      return objectiveModel && objectiveModel.metric && typeof objectiveModel.metric.label === 'string'
        ? objectiveModel.metric.label
        : String(objective);
    });
    const displayChannels = channels.map(function displayChannel(channel) {
      const status = channel && channel.status === 'modelable' ? 'modelable' : 'preserved';
      const failedGates = Array.isArray(channel && channel.failedGates)
        ? channel.failedGates.map(function gateLabel(code) {
          return GATE_LABELS[code] || 'Does not meet a controlled evidence gate';
        })
        : [];
      return {
        name: channel && typeof channel.channel === 'string' ? channel.channel : 'Unnamed channel',
        status: status,
        statusLabel: STATUS_LABELS[status],
        failedGates: failedGates
      };
    });

    return {
      completePeriods: Number.isFinite(summary.completePeriods) ? summary.completePeriods : 0,
      channelCount: Number.isFinite(summary.channels) ? summary.channels : displayChannels.length,
      eligibleMetrics: eligibleMetrics,
      excludedRowCount: Number.isFinite(summary.excludedRows) ? summary.excludedRows : 0,
      modelableCount: displayChannels.filter(function modeled(channel) {
        return channel.status === 'modelable';
      }).length,
      preservedCount: displayChannels.filter(function preserved(channel) {
        return channel.status === 'preserved';
      }).length,
      channels: displayChannels
    };
  }

  function finiteValue(value) {
    return Number.isFinite(value) ? value : null;
  }

  function money(value) {
    const amount = finiteValue(value);
    if (amount == null) return '—';
    const absolute = Math.abs(amount);
    return (amount < 0 ? '-$' : '$') + absolute.toLocaleString('en-US', {
      minimumFractionDigits: Math.round(absolute * 100) % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  function numberText(value) {
    const amount = finiteValue(value);
    if (amount == null) return '—';
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function marginalLabel(metric) {
    if (!metric || typeof metric.key !== 'string') return 'Selected marginal metric';
    if (metric.key === 'conversions') return MARGINAL_LABELS.marginal_cpa;
    if (metric.key === 'revenue') return MARGINAL_LABELS.marginal_roas;
    if (metric.key === 'financial'
      && (metric.costTreatment === 'before_marketing' || metric.costTreatment === 'after_marketing')) {
      return MARGINAL_LABELS.marginal_roi;
    }
    return 'Selected marginal metric';
  }

  function formatMarginal(metric) {
    if (!metric || !MARGINAL_LABELS[metric.key] || !Number.isFinite(metric.value)) return '—';
    if (metric.key === 'marginal_cpa') {
      return money(metric.value) + ' ' + MARGINAL_LABELS[metric.key];
    }
    return numberText(metric.value) + '× ' + MARGINAL_LABELS[metric.key];
  }

  function constraintRows(model, constraints) {
    const selectedModel = model && typeof model === 'object' ? model : {};
    const sourceConstraints = constraints && typeof constraints === 'object' ? constraints : {};
    const channels = Array.isArray(selectedModel.channels) ? selectedModel.channels : [];
    return channels.map(function constraintRow(channel, index) {
      const name = channel && typeof channel.channel === 'string' ? channel.channel : 'Unnamed channel';
      const source = sourceConstraints[name] && typeof sourceConstraints[name] === 'object'
        ? sourceConstraints[name]
        : {};
      const modelable = channel && channel.status === 'modelable';
      return {
        channel: name,
        status: modelable ? 'modelable' : 'preserved',
        statusLabel: modelable ? 'Modeled' : 'Preserved',
        minimum: modelable
          ? { id: 'constraint-minimum-' + index, value: finiteValue(source.minimum) }
          : null,
        maximum: modelable
          ? { id: 'constraint-maximum-' + index, value: finiteValue(source.maximum) }
          : null,
        preserved: modelable
          ? null
          : { id: 'constraint-preserved-' + index, value: finiteValue(source.minimum) },
        excluded: {
          id: 'constraint-excluded-' + index,
          value: source.excluded === true
        }
      };
    });
  }

  function resultView(model, allocation) {
    const selectedModel = model && typeof model === 'object' ? model : {};
    const result = allocation && typeof allocation === 'object' ? allocation : {};
    if (result.ok !== true) {
      const normalizedCode = FAILURE_CODES[result.code] || result.code;
      return {
        state: 'blocked',
        message: FAILURE_COPY[normalizedCode] || FAILURE_COPY.invalid_plan,
        conflicts: Array.isArray(result.conflicts)
          ? result.conflicts.filter(function stringConflict(value) { return typeof value === 'string'; })
          : [],
        minimumBudget: finiteValue(result.minimumBudget),
        maximumBudget: finiteValue(result.maximumBudget)
      };
    }

    const metric = selectedModel.metric && typeof selectedModel.metric === 'object'
      ? selectedModel.metric
      : {};
    const channels = Array.isArray(selectedModel.channels) ? selectedModel.channels : [];
    const channelsByName = new Map(channels.map(function indexChannel(channel) {
      return [channel && channel.channel, channel];
    }));
    const rows = (Array.isArray(result.allocation) ? result.allocation : []).map(function allocationRow(row) {
      const channel = channelsByName.get(row && row.channel) || {};
      const status = row && row.status === 'modelable' ? 'Modeled' : 'Preserved';
      const currentSpend = finiteValue(row && row.currentSpend);
      const recommendedSpend = finiteValue(row && row.recommendedSpend);
      return {
        channel: row && typeof row.channel === 'string' ? row.channel : 'Unnamed channel',
        status: status,
        evidence: status === 'Modeled' ? 'Modeled marginal response' : 'Preserved',
        currentPlanSpend: money(currentSpend),
        recommended: money(recommendedSpend),
        change: currentSpend == null || recommendedSpend == null
          ? '—'
          : money(recommendedSpend - currentSpend),
        marginalMetric: formatMarginal(row && row.marginalMetric),
        constraint: row && typeof row.constraint === 'string'
          ? row.constraint.charAt(0).toUpperCase() + row.constraint.slice(1)
          : '—',
        failedGates: status === 'Preserved' && Array.isArray(channel.failedGates)
          ? channel.failedGates.map(function namedGate(code) {
            return GATE_LABELS[code] || 'Does not meet a controlled evidence gate';
          })
          : []
      };
    });
    const modeledRows = rows.filter(function modeled(row) { return row.status === 'Modeled'; });
    const preservedRows = rows.filter(function preserved(row) { return row.status === 'Preserved'; });
    const rawRows = Array.isArray(result.allocation) ? result.allocation : [];
    let driverIndex = -1;
    let driverIncrease = 0;
    rawRows.forEach(function findDriver(row, index) {
      if (!row || row.status !== 'modelable') return;
      const increase = finiteValue(row.recommendedSpend) - finiteValue(row.currentSpend);
      if (Number.isFinite(increase) && increase > driverIncrease) {
        driverIncrease = increase;
        driverIndex = index;
      }
    });
    const driver = driverIndex >= 0 && driverIncrease > 0 ? rows[driverIndex] : null;
    const failedGateCopy = preservedRows.flatMap(function channelFailures(row) {
      return row.failedGates.map(function gateCopy(gate) { return row.channel + ' — ' + gate; });
    });
    const cadence = typeof selectedModel.cadence === 'string' ? selectedModel.cadence : 'historical';
    const timingCaveat = Number.isFinite(result.horizonFactor) && result.horizonFactor < 1
      ? 'Timing caveat: this planning window is shorter than the ' + cadence
        + ' history cadence, so response may arrive after the plan ends.'
      : null;
    const confounders = 'Seasonality, promotions, pricing, targeting, creative, audience, '
      + 'channel interactions, and measurement changes may confound the historical relationship.';
    const caveat = 'This is observational evidence, not a causal conclusion. ' + confounders
      + ' Treat the recommendation as a bounded test to recheck.'
      + (timingCaveat ? ' ' + timingCaveat : '');
    const totals = result.totals && typeof result.totals === 'object' ? result.totals : {};
    const metricLabel = typeof metric.label === 'string' ? metric.label : 'Selected outcome';
    const outcomeValue = metric.key === 'conversions'
      ? numberText(totals.predictedOutcome)
      : money(totals.predictedOutcome);
    const financialTreatment = metric.key !== 'financial'
      ? null
      : metric.costTreatment === 'before_marketing'
        ? metricLabel + ' was mapped as a financial outcome before marketing; marketing spend was subtracted from the modeled result.'
        : metricLabel + ' was mapped as a financial outcome already after marketing spend, so spend was not subtracted again.';

    return {
      state: 'result',
      objectiveLabel: metricLabel,
      marginalMetricLabel: marginalLabel(metric),
      methodNote: 'This plan compares observational history using modeled marginal response.',
      summary: [
        { label: 'Requested budget', value: money(totals.requestedBudget) },
        { label: 'Optimized budget', value: money(totals.optimizedBudget) },
        { label: 'Preserved budget', value: money(totals.preservedBudget) },
        { label: 'Predicted modeled-channel ' + metricLabel, value: outcomeValue }
      ],
      outcomeScope: preservedRows.length > 0
        ? 'Whole-plan predicted ' + metricLabel
          + ' is unavailable because preserved channels have no fitted response.'
        : 'All planned channels are included in the predicted ' + metricLabel + '.',
      rows: rows,
      evidenceQuality: modeledRows.length + ' modelable channel' + (modeledRows.length === 1 ? '' : 's')
        + ' and ' + preservedRows.length + ' preserved channel' + (preservedRows.length === 1 ? '' : 's')
        + (failedGateCopy.length ? '. Failed gates: ' + failedGateCopy.join('; ') + '.' : '.'),
      mainDriver: driver
        ? driver.channel + ' receives the largest modeled increase at ' + driver.marginalMetric + '.'
        : 'No modeled channel receives a positive increase under the current constraints.',
      caveat: caveat,
      timingCaveat: timingCaveat,
      financialTreatment: financialTreatment
    };
  }

  function modelEvidenceView(model, allocation) {
    const selectedModel = model && typeof model === 'object' ? model : {};
    const result = allocation && typeof allocation === 'object' ? allocation : {};
    if (result.ok !== true) {
      return { state: 'hidden', overview: null, channels: [] };
    }

    const metric = selectedModel.metric && typeof selectedModel.metric === 'object'
      ? selectedModel.metric
      : {};
    const allocationRows = Array.isArray(result.allocation) ? result.allocation : [];
    const rowsByName = new Map(allocationRows.map(function indexAllocation(row) {
      return [row && row.channel, row];
    }));
    const modelableRows = allocationRows.filter(function modelableAllocation(row) {
      return row && row.status === 'modelable';
    });
    const chartRows = modelableRows.map(function projectMarginal(row) {
      const sourceMetric = row.marginalMetric && typeof row.marginalMetric === 'object'
        ? row.marginalMetric
        : {};
      const sourceValue = finiteValue(sourceMetric.value);
      const conversionValue = metric.key === 'conversions'
        && sourceValue != null && sourceValue > 0
        ? 1 / sourceValue
        : null;
      return {
        channel: typeof row.channel === 'string' ? row.channel : 'Unnamed channel',
        status: 'modelable',
        marginalMetric: {
          key: metric.key === 'conversions'
            ? 'marginal_conversions_per_dollar'
            : metric.key === 'revenue'
              ? 'marginal_roas'
              : 'marginal_roi',
          value: metric.key === 'conversions' ? conversionValue : sourceValue
        }
      };
    }).filter(function finiteMarginal(row) {
      return Number.isFinite(row.marginalMetric.value);
    });

    const channels = (Array.isArray(selectedModel.channels) ? selectedModel.channels : [])
      .map(function projectChannel(channel) {
        const name = channel && typeof channel.channel === 'string'
          ? channel.channel
          : 'Unnamed channel';
        const allocationRow = rowsByName.get(name) || {};
        const modelable = channel && channel.status === 'modelable';
        const excluded = !modelable && allocationRow.constraint === 'excluded';
        const status = modelable ? 'modelable' : excluded ? 'excluded' : 'preserved';
        const horizonFactor = finiteValue(result.horizonFactor);
        const currentSpend = finiteValue(allocationRow.currentSpend);
        const currentSpendRate = status === 'modelable'
          && horizonFactor != null && horizonFactor > 0 && currentSpend != null
          ? currentSpend / horizonFactor
          : finiteValue(channel && channel.currentSpendRate);
        const recommendedSpendRate = status === 'modelable'
          ? finiteValue(allocationRow.recommendedSpendRate)
          : status === 'excluded'
            ? finiteValue(allocationRow.recommendedSpendRate)
            : null;
        const failedLabels = (Array.isArray(channel && channel.failedGates)
          ? channel.failedGates
          : []).map(function controlledGate(code) {
            return GATE_LABELS[code] || 'Does not meet a controlled evidence gate';
          });
        const visibleFailures = failedLabels.slice(0, 2);
        const remainingFailures = failedLabels.length - visibleFailures.length;
        const evidenceGaps = visibleFailures.join('; ')
          + (remainingFailures > 0 ? '; and ' + String(remainingFailures) + ' more evidence gates' : '');
        const curve = status === 'modelable'
          && channel && channel.curve && typeof channel.curve === 'object'
          && finiteValue(channel.curve.a) != null
          && finiteValue(channel.curve.b) != null
          ? {
            a: finiteValue(channel.curve.a),
            b: finiteValue(channel.curve.b),
            r2: finiteValue(channel.curve.r2)
          }
          : null;
        const observations = (Array.isArray(channel && channel.observations)
          ? channel.observations
          : []).map(function projectObservation(observation) {
            return {
              spend: finiteValue(observation && observation.spend),
              outcome: finiteValue(observation && observation.outcome)
            };
          }).filter(function finiteObservation(observation) {
            return observation.spend != null && observation.outcome != null;
          });
        const cadence = selectedModel.cadence || 'historical';
        const positionRows = status === 'modelable'
          ? [
            ['Fitted treatment', 'In-sample diminishing-return curve'],
            ['Current spend rate', money(currentSpendRate) + ' per ' + cadence + ' period'],
            ['Recommended spend rate', money(recommendedSpendRate) + ' per ' + cadence + ' period'],
            [
              'In-sample log-space fit (R²)',
              curve && curve.r2 != null
                ? curve.r2.toLocaleString('en-US', { maximumFractionDigits: 4 })
                : '—'
            ]
          ]
          : [];

        return {
          name: name,
          status: status,
          statusLabel: status === 'modelable'
            ? 'Modeled'
            : status === 'excluded' ? 'Excluded' : 'Preserved',
          summary: status === 'modelable'
            ? 'Modeled response admitted; the curve shows observed diminishing returns and the spend markers used in this plan.'
            : status === 'excluded'
              ? 'Excluded from this plan — no budget allocated and no fitted response curve was admitted.'
                + (evidenceGaps ? ' Evidence gaps: ' + evidenceGaps + '.' : '')
              : 'Not modeled — allocation preserved.'
                + (evidenceGaps ? ' Evidence gaps: ' + evidenceGaps + '.' : ''),
          fitText: curve && curve.r2 != null
            ? curve.r2.toLocaleString('en-US', { maximumFractionDigits: 4 })
            : '—',
          positions: {
            currentSpendRate: currentSpendRate,
            recommendedSpendRate: recommendedSpendRate
          },
          positionRows: positionRows,
          accessibleLabel: status === 'modelable'
            ? name + ' response curve with observed data and current and recommended spend markers'
            : status === 'excluded'
              ? name + ' observed spend and outcome points; excluded from this plan with no fitted response curve'
              : name + ' observed spend and outcome points; no fitted response curve',
          chartChannel: {
            status: status,
            curve: curve,
            observations: observations
          }
        };
      });

    return {
      state: 'ready',
      overview: {
        heading: 'Cross-channel modeled marginal efficiency',
        summary: metric.key === 'conversions'
          ? 'Compare marginal conversions per dollar across admitted response curves; higher is better. The allocation table reports the equivalent marginal CPA, where lower is better.'
          : 'Compare the selected marginal metric only across channels with admitted response curves; higher is better.',
        chartRows: chartRows
      },
      channels: channels
    };
  }

  root.MangroveBudgetApp = {
    createState: createState,
    derivePhase: derivePhase,
    readinessView: readinessView,
    resultView: resultView,
    modelEvidenceView: modelEvidenceView,
    constraintRows: constraintRows
  };

  function init() {
    const document = root.document;
    const HISTORY = root.MangroveHistoryData || {};
    const MARGINALITY = root.MangroveMarginality || {};
    const ALLOCATOR = root.MangroveBudgetAllocator || {};
    const CHARTS = root.MangroveCharts || {};
    const EXTRAS = root.MangroveToolExtras || {};
    const SAMPLE = root.MangroveBudgetSampleData || {};
    const MOTION = root.MangroveMotion || {};
    const state = createState();
    const downloadUrls = new Map();
    let activeCorrectionText = null;
    let chartTimer = null;
    let repaintCharts = null;
    let preservedDefaults = {};

    const decisionCanvas = document.getElementById('decision-canvas');
    const historyFile = document.getElementById('history-file');
    const pasteToggle = document.getElementById('paste-history-toggle');
    const pastePanel = document.getElementById('paste-history-panel');
    const historyPaste = document.getElementById('history-paste');
    const parsePastedHistory = document.getElementById('parse-pasted-history');
    const sampleButton = document.getElementById('use-sample-data');
    const importStatus = document.getElementById('import-status');
    const correctionPanel = document.getElementById('correction-panel');
    const correctionFindings = document.getElementById('correction-findings');
    const columnMapping = document.getElementById('column-mapping');
    const financialTreatment = document.getElementById('financial-treatment');
    const applyCorrections = document.getElementById('apply-corrections');
    const correctionGuide = document.getElementById('download-correction-guide');
    const replacementWarning = document.getElementById('replacement-warning');
    const confirmReplacement = document.getElementById('confirm-replacement');
    const cancelReplacement = document.getElementById('cancel-replacement');
    const readinessPanel = document.getElementById('readiness-panel');
    const readinessSummary = document.getElementById('readiness-summary');
    const readinessChannelRows = document.getElementById('readiness-channel-rows');
    const planForm = document.getElementById('plan-form');
    const totalBudgetInput = document.getElementById('total-budget');
    const planDaysInput = document.getElementById('plan-days');
    const objectiveSelect = document.getElementById('objective');
    const constraintsList = document.getElementById('constraints-list');
    const resultsPanel = document.getElementById('results');
    const resultsNote = document.getElementById('results-note');
    const modelEvidence = document.getElementById('model-evidence');
    const modelEvidenceCharts = document.getElementById('model-evidence-charts');
    const modelInspector = document.getElementById('model-inspector');
    const modelDiagnosticsChannels = document.getElementById('model-diagnostics-channels');
    const cleanedHistoryHead = document.getElementById('cleaned-history-head');
    const cleanedHistoryRows = document.getElementById('cleaned-history-rows');
    const downloadCleanedData = document.getElementById('download-cleaned-data');
    const downloadAllocation = document.getElementById('download-allocation');
    const recommendationExplanation = document.getElementById('recommendation-explanation');
    const explanationConfidence = document.getElementById('explanation-confidence');
    const explanationDriver = document.getElementById('explanation-driver');
    const explanationCaveat = document.getElementById('explanation-caveat');
    const resultDetails = document.createElement('div');
    resultDetails.className = 'result-details';
    if (resultsPanel && recommendationExplanation
      && recommendationExplanation.parentNode === resultsPanel
      && typeof resultsPanel.insertBefore === 'function') {
      resultsPanel.insertBefore(resultDetails, recommendationExplanation);
    } else if (resultsPanel) {
      resultsPanel.appendChild(resultDetails);
    }

    function trackEvent(eventName, action) {
      if (BUDGET_EVENTS.indexOf(eventName) === -1
        || IMPORT_ACTIONS.indexOf(action) === -1) return;
      if (typeof EXTRAS.trackProductEvent !== 'function') return;
      EXTRAS.trackProductEvent(eventName, { action: action });
    }

    function trackImport(sourceKind) {
      if (sourceKind === 'sample') trackEvent('sample_data_used', sourceKind);
      trackEvent('tool_started', sourceKind);
    }

    function clearElement(element) {
      if (element) element.replaceChildren();
    }

    function setImportStatus(message) {
      if (importStatus) importStatus.textContent = message;
    }

    function phaseMessage(phase) {
      const messages = {
        empty: 'No history loaded.',
        parsing: 'Reading and checking history…',
        needs_correction: 'History needs correction before modeling.',
        ready: 'History is ready for a budget plan.',
        partially_modelable: 'History is ready. Unsupported channels will be preserved at recent spend.',
        blocked: 'History is normalized, but no channel clears every response-curve gate.',
        result: 'Allocation ready.'
      };
      return messages[phase] || messages.empty;
    }

    function syncPhase() {
      const phase = derivePhase(state);
      const selectedModel = modelFor(state.analysis, state.selectedObjective);
      const canPlan = selectedModel && Array.isArray(selectedModel.channels)
        && selectedModel.channels.some(function plannableChannel(channel) {
          return channel && (channel.status === 'modelable' || channel.status === 'preserved');
        });
      state.phase = phase;
      if (decisionCanvas) decisionCanvas.dataset.phase = phase;
      if (correctionPanel) correctionPanel.hidden = phase !== 'needs_correction';
      if (readinessPanel) {
        readinessPanel.hidden = ['ready', 'partially_modelable', 'blocked', 'result'].indexOf(phase) === -1;
      }
      if (planForm) {
        planForm.hidden = !canPlan
          || ['ready', 'partially_modelable', 'blocked', 'result'].indexOf(phase) === -1;
      }
      if (resultsPanel) {
        resultsPanel.hidden = phase !== 'result' && !(phase === 'blocked' && state.allocation);
      }
      if (modelEvidence) {
        modelEvidence.hidden = phase !== 'result'
          || !state.allocation
          || state.allocation.ok !== true;
      }
      if (modelInspector) {
        modelInspector.hidden = ['ready', 'partially_modelable', 'blocked', 'result'].indexOf(phase) === -1;
      }
      if (!state.pendingImport) setImportStatus(phaseMessage(phase));
    }

    function cancelChartRepaint() {
      if (chartTimer != null && typeof root.clearTimeout === 'function') {
        root.clearTimeout(chartTimer);
      }
      chartTimer = null;
      repaintCharts = null;
    }

    function clearAllocationResult() {
      state.allocation = null;
      if (resultsNote) resultsNote.textContent = 'Choose a budget and horizon to build the plan.';
      if (downloadAllocation) downloadAllocation.disabled = true;
      clearElement(resultDetails);
      clearElement(modelEvidenceCharts);
      if (modelEvidence) modelEvidence.hidden = true;
      cancelChartRepaint();
      if (recommendationExplanation) recommendationExplanation.hidden = true;
      if (MOTION.resetResult) MOTION.resetResult(resultsPanel);
      syncPhase();
    }

    function invalidateAllocation(message) {
      if (!state.allocation) return;
      clearAllocationResult();
      setImportStatus(message);
    }

    function revokeDownloads() {
      downloadUrls.forEach(function revokeDownload(timer, url) {
        if (timer != null && typeof root.clearTimeout === 'function') {
          root.clearTimeout(timer);
        }
        if (root.URL && typeof root.URL.revokeObjectURL === 'function') {
          root.URL.revokeObjectURL(url);
        }
      });
      downloadUrls.clear();
    }

    function resetFinancialTreatmentChoice() {
      if (!financialTreatment) return;
      const selected = financialTreatment.querySelector(
        'input[name="financial-treatment"]:checked'
      );
      if (selected) selected.checked = false;
    }

    function clearPriorDecision() {
      if (MOTION.resetResult) MOTION.resetResult(resultsPanel);
      cancelChartRepaint();
      revokeDownloads();
      state.phase = 'empty';
      state.importResult = null;
      state.analysis = null;
      state.selectedObjective = null;
      state.allocation = null;
      state.constraints = {};
      state.sourceKind = null;
      state.pendingImport = null;
      activeCorrectionText = null;
      preservedDefaults = {};
      resetFinancialTreatmentChoice();
      clearElement(readinessSummary);
      clearElement(readinessChannelRows);
      clearElement(cleanedHistoryHead);
      clearElement(cleanedHistoryRows);
      clearElement(objectiveSelect);
      clearElement(constraintsList);
      clearElement(resultDetails);
      clearElement(modelEvidenceCharts);
      clearElement(modelDiagnosticsChannels);
      if (modelEvidence) modelEvidence.hidden = true;
      if (recommendationExplanation) recommendationExplanation.hidden = true;
      if (downloadAllocation) downloadAllocation.disabled = true;
      if (resultsNote) resultsNote.textContent = 'Choose a budget and horizon to build the plan.';
    }

    function downloadText(filename, text, type) {
      if (!root.Blob || !root.URL || typeof root.URL.createObjectURL !== 'function') return;
      const blob = new root.Blob([text], { type: type });
      const url = root.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      const timer = typeof root.setTimeout === 'function'
        ? root.setTimeout(function revokeDownloadedObjectUrl() {
          downloadUrls.delete(url);
          if (root.URL && typeof root.URL.revokeObjectURL === 'function') {
            root.URL.revokeObjectURL(url);
          }
        }, 0)
        : null;
      downloadUrls.set(url, timer);
    }

    function controlledMetric(metric) {
      if (!metric || typeof metric !== 'object') return null;
      return {
        key: typeof metric.key === 'string' ? metric.key : null,
        value: finiteValue(metric.value)
      };
    }

    function allocationDownloadPayload(model, allocation) {
      const selectedModel = model && typeof model === 'object' ? model : {};
      const result = allocation && typeof allocation === 'object' ? allocation : {};
      const metric = selectedModel.metric && typeof selectedModel.metric === 'object'
        ? selectedModel.metric
        : {};
      const totals = result.totals && typeof result.totals === 'object'
        ? result.totals
        : {};
      const allocationRows = Array.isArray(result.allocation) ? result.allocation : [];
      const channels = Array.isArray(selectedModel.channels) ? selectedModel.channels : [];
      return {
        version: 1,
        objective: {
          key: typeof metric.key === 'string' ? metric.key : null,
          label: typeof metric.label === 'string' ? metric.label : null,
          costTreatment: typeof metric.costTreatment === 'string' ? metric.costTreatment : null,
          cadence: typeof selectedModel.cadence === 'string' ? selectedModel.cadence : null,
          cadenceDays: finiteValue(selectedModel.cadenceDays)
        },
        allocation: {
          code: typeof result.code === 'string' ? result.code : null,
          horizonFactor: finiteValue(result.horizonFactor),
          objective: typeof result.objective === 'string' ? result.objective : null,
          rows: allocationRows.map(function controlledAllocationRow(row) {
            return {
              channel: row && typeof row.channel === 'string' ? row.channel : null,
              status: row && (row.status === 'modelable' || row.status === 'preserved')
                ? row.status
                : null,
              currentSpend: finiteValue(row && row.currentSpend),
              recommendedSpend: finiteValue(row && row.recommendedSpend),
              recommendedSpendRate: finiteValue(row && row.recommendedSpendRate),
              predictedOutcome: finiteValue(row && row.predictedOutcome),
              marginalMetric: controlledMetric(row && row.marginalMetric),
              constraint: row && typeof row.constraint === 'string' ? row.constraint : null
            };
          }),
          totals: {
            requestedBudget: finiteValue(totals.requestedBudget),
            allocatedBudget: finiteValue(totals.allocatedBudget),
            optimizedBudget: finiteValue(totals.optimizedBudget),
            preservedBudget: finiteValue(totals.preservedBudget),
            predictedOutcome: finiteValue(totals.predictedOutcome)
          },
          conflicts: Array.isArray(result.conflicts)
            ? result.conflicts.filter(function controlledConflict(value) {
              return typeof value === 'string';
            })
            : []
        },
        modelDiagnostics: channels.map(function controlledChannelDiagnostics(channel) {
          const diagnostics = channel && channel.diagnostics && typeof channel.diagnostics === 'object'
            ? channel.diagnostics
            : {};
          const curve = channel && channel.status === 'modelable'
            && channel.curve && typeof channel.curve === 'object'
            ? channel.curve
            : null;
          return {
            channel: channel && typeof channel.channel === 'string' ? channel.channel : null,
            status: channel && (channel.status === 'modelable' || channel.status === 'preserved')
              ? channel.status
              : null,
            currentSpendRate: finiteValue(channel && channel.currentSpendRate),
            preservedSpendRate: finiteValue(channel && channel.preservedSpendRate),
            curve: curve
              ? {
                a: finiteValue(curve.a),
                b: finiteValue(curve.b),
                r2: finiteValue(curve.r2)
              }
              : null,
            diagnostics: {
              completePeriods: finiteValue(diagnostics.completePeriods),
              positiveCoverage: finiteValue(diagnostics.positiveCoverage),
              distinctPositiveSpend: finiteValue(diagnostics.distinctPositiveSpend),
              robustSpendVariation: finiteValue(diagnostics.robustSpendVariation),
              elasticity: finiteValue(diagnostics.elasticity),
              elasticityIqr: finiteValue(diagnostics.elasticityIqr),
              maximumCurrentPredictionChange: finiteValue(
                diagnostics.maximumCurrentPredictionChange
              )
            },
            failedGates: Array.isArray(channel && channel.failedGates)
              ? channel.failedGates.filter(function controlledGate(value) {
                return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GATE_LABELS, value);
              })
              : []
          };
        })
      };
    }

    function renderCorrection(inspection) {
      clearElement(correctionFindings);
      clearElement(columnMapping);
      if (applyCorrections) applyCorrections.hidden = true;
      if (financialTreatment) financialTreatment.hidden = true;

      const findings = Array.isArray(inspection && inspection.exclusions)
        ? inspection.exclusions
        : [];
      findings.forEach(function addFinding(item) {
        const listItem = document.createElement('li');
        const row = Number.isFinite(item.rowNumber) ? item.rowNumber : 1;
        const field = FIELD_LABELS[item.field] || 'History';
        listItem.textContent = 'Row ' + row + ' · ' + field + ' — ' + String(item.message || 'Review this field.');
        correctionFindings.appendChild(listItem);
      });

      const mappingFields = [];
      findings.forEach(function collectMapping(item) {
        if ((item.code === 'ambiguous_column' || item.code === 'missing_column')
          && FIELD_LABELS[item.field] && mappingFields.indexOf(item.field) === -1) {
          mappingFields.push(item.field);
        }
      });
      const headers = Array.isArray(inspection && inspection.headers) ? inspection.headers : [];
      mappingFields.forEach(function addMappingField(field) {
        const wrapper = document.createElement('div');
        const label = document.createElement('label');
        const select = document.createElement('select');
        const placeholder = document.createElement('option');
        const selectId = 'map-' + field;
        wrapper.className = 'mapping-field';
        label.htmlFor = selectId;
        label.textContent = FIELD_LABELS[field] + ' source column';
        select.id = selectId;
        select.dataset.field = field;
        placeholder.value = '';
        placeholder.textContent = 'Choose a source column';
        select.appendChild(placeholder);
        headers.forEach(function addHeader(header) {
          const option = document.createElement('option');
          option.value = header;
          option.textContent = header;
          select.appendChild(option);
        });
        wrapper.append(label, select);
        columnMapping.appendChild(wrapper);
      });

      const needsOutcomeMapping = findings.some(function outcomeFinding(item) {
        return item.code === 'missing_outcome';
      });
      if (needsOutcomeMapping) {
        const wrapper = document.createElement('div');
        const sourceLabel = document.createElement('label');
        const sourceSelect = document.createElement('select');
        const sourcePlaceholder = document.createElement('option');
        const typeLabel = document.createElement('label');
        const typeSelect = document.createElement('select');
        const typePlaceholder = document.createElement('option');
        wrapper.className = 'mapping-field';
        sourceLabel.htmlFor = 'map-outcome-source';
        sourceLabel.textContent = 'Outcome source column';
        sourceSelect.id = 'map-outcome-source';
        sourceSelect.dataset.field = 'outcomeSource';
        sourcePlaceholder.value = '';
        sourcePlaceholder.textContent = 'Choose a source column';
        sourceSelect.appendChild(sourcePlaceholder);
        headers.forEach(function addOutcomeHeader(header) {
          const option = document.createElement('option');
          option.value = header;
          option.textContent = header;
          sourceSelect.appendChild(option);
        });
        typeLabel.htmlFor = 'map-outcome-type';
        typeLabel.textContent = 'Outcome meaning';
        typeSelect.id = 'map-outcome-type';
        typeSelect.dataset.field = 'outcomeType';
        typePlaceholder.value = '';
        typePlaceholder.textContent = 'Choose conversions, revenue, or financial';
        typeSelect.appendChild(typePlaceholder);
        [
          ['conversions', 'Conversions'],
          ['revenue', 'Revenue'],
          ['financial', 'Financial outcome']
        ].forEach(function addOutcomeType(optionDefinition) {
          const option = document.createElement('option');
          option.value = optionDefinition[0];
          option.textContent = optionDefinition[1];
          typeSelect.appendChild(option);
        });
        wrapper.append(sourceLabel, sourceSelect, typeLabel, typeSelect);
        columnMapping.appendChild(wrapper);
      }

      const needsFinancialTreatment = findings.some(function financialFinding(item) {
        return item.code === 'financial_treatment_required';
      });
      if (financialTreatment) financialTreatment.hidden = !needsFinancialTreatment;
      if (applyCorrections) {
        applyCorrections.hidden = mappingFields.length === 0
          && !needsOutcomeMapping
          && !needsFinancialTreatment;
      }
    }

    function addSummaryItem(label, value) {
      const wrapper = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      wrapper.append(term, description);
      readinessSummary.appendChild(wrapper);
    }

    function viewForSelectedObjective() {
      if (!state.analysis) return readinessView(null);
      const selectedAnalysis = Object.assign({}, state.analysis, {
        recommendedObjective: state.selectedObjective || state.analysis.recommendedObjective
      });
      return readinessView(selectedAnalysis);
    }

    function optionalNumber(value) {
      if (value === '' || value == null) return null;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : NaN;
    }

    function constraintInput(definition, labelText, type) {
      const field = document.createElement('div');
      const label = document.createElement('label');
      const input = document.createElement('input');
      field.className = type === 'checkbox' ? 'constraint-toggle' : 'constraint-field';
      label.htmlFor = definition.id;
      label.textContent = labelText;
      input.id = definition.id;
      input.type = type;
      if (type === 'number') {
        input.min = '0';
        input.step = '0.01';
        input.inputMode = 'decimal';
        input.value = definition.value == null ? '' : String(definition.value);
      } else {
        input.checked = definition.value === true;
      }
      field.append(label, input);
      return { field: field, input: input };
    }

    function renderConstraints() {
      clearElement(constraintsList);
      const model = modelFor(state.analysis, state.selectedObjective);
      if (!model || !Array.isArray(model.channels)) return;
      const planDays = Number(planDaysInput.value);
      const horizonFactor = Number.isFinite(planDays) && planDays > 0
        && Number.isFinite(model.cadenceDays) && model.cadenceDays > 0
        ? planDays / model.cadenceDays
        : 1;
      model.channels.forEach(function initializeConstraint(channel) {
        if (!channel || typeof channel.channel !== 'string') return;
        const name = channel.channel;
        const prior = state.constraints[name] && typeof state.constraints[name] === 'object'
          ? state.constraints[name]
          : {};
        if (channel.status === 'modelable') {
          state.constraints[name] = {
            minimum: finiteValue(prior.minimum),
            maximum: finiteValue(prior.maximum),
            excluded: prior.excluded === true
          };
          return;
        }
        const projected = Math.round(
          (Number.isFinite(channel.preservedSpendRate) ? channel.preservedSpendRate : 0)
          * horizonFactor * 100
        ) / 100;
        const useProjected = prior.minimum == null || prior.minimum === preservedDefaults[name];
        state.constraints[name] = {
          minimum: useProjected ? projected : finiteValue(prior.minimum),
          maximum: null,
          excluded: prior.excluded === true
        };
        preservedDefaults[name] = projected;
      });

      constraintRows(model, state.constraints).forEach(function addConstraint(row) {
        const card = document.createElement('section');
        const heading = document.createElement('h3');
        const status = document.createElement('p');
        const fields = document.createElement('div');
        card.className = 'constraint-card';
        heading.textContent = row.channel;
        status.className = 'constraint-status';
        status.textContent = row.statusLabel;
        fields.className = 'constraint-fields';

        if (row.minimum) {
          const minimum = constraintInput(row.minimum, 'Minimum plan amount', 'number');
          minimum.input.addEventListener('input', function updateMinimum() {
            state.constraints[row.channel].minimum = optionalNumber(minimum.input.value);
            invalidateAllocation('Constraint changed. Rebuild the plan to update the recommendation.');
          });
          fields.appendChild(minimum.field);
        }
        if (row.maximum) {
          const maximum = constraintInput(row.maximum, 'Maximum plan amount', 'number');
          maximum.input.addEventListener('input', function updateMaximum() {
            state.constraints[row.channel].maximum = optionalNumber(maximum.input.value);
            invalidateAllocation('Constraint changed. Rebuild the plan to update the recommendation.');
          });
          fields.appendChild(maximum.field);
        }
        if (row.preserved) {
          const preserved = constraintInput(row.preserved, 'Preserved amount', 'number');
          preserved.input.addEventListener('input', function updatePreserved() {
            state.constraints[row.channel].minimum = optionalNumber(preserved.input.value);
            invalidateAllocation('Constraint changed. Rebuild the plan to update the recommendation.');
          });
          fields.appendChild(preserved.field);
        }
        const excluded = constraintInput(row.excluded, 'Exclude channel', 'checkbox');
        excluded.input.addEventListener('change', function updateExclusion() {
          state.constraints[row.channel].excluded = excluded.input.checked === true;
          invalidateAllocation('Constraint changed. Rebuild the plan to update the recommendation.');
        });
        fields.appendChild(excluded.field);
        card.append(heading, status, fields);
        constraintsList.appendChild(card);
      });
    }

    function renderReadiness() {
      const view = viewForSelectedObjective();
      clearElement(readinessSummary);
      clearElement(readinessChannelRows);
      addSummaryItem('Complete periods', String(view.completePeriods));
      addSummaryItem('Channels', String(view.channelCount));
      addSummaryItem('Eligible metrics', view.eligibleMetrics.join(', ') || 'None');
      addSummaryItem('Excluded rows', String(view.excludedRowCount));
      addSummaryItem('Modeled', String(view.modelableCount));
      addSummaryItem('Preserved', String(view.preservedCount));

      view.channels.forEach(function addChannel(channel) {
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const status = document.createElement('td');
        const gates = document.createElement('td');
        name.textContent = channel.name;
        status.textContent = channel.statusLabel;
        if (channel.failedGates.length === 0) {
          gates.textContent = 'All response-curve gates passed';
        } else {
          const list = document.createElement('ul');
          list.className = 'gate-list';
          channel.failedGates.forEach(function addGate(label) {
            const item = document.createElement('li');
            item.textContent = label;
            list.appendChild(item);
          });
          gates.appendChild(list);
        }
        row.append(name, status, gates);
        readinessChannelRows.appendChild(row);
      });
      renderObjectives();
      renderConstraints();
      if (recommendationExplanation) recommendationExplanation.hidden = true;
    }

    function renderObjectives() {
      clearElement(objectiveSelect);
      if (!state.analysis || !Array.isArray(state.analysis.eligibleObjectives)) return;
      state.analysis.eligibleObjectives.forEach(function addObjective(objective) {
        const option = document.createElement('option');
        const model = state.analysis.models && state.analysis.models[objective];
        option.value = objective;
        option.textContent = model && model.metric && model.metric.label
          ? model.metric.label
          : objective;
        option.selected = objective === state.selectedObjective;
        objectiveSelect.appendChild(option);
      });
    }

    function renderExplanation(view) {
      if (!recommendationExplanation) return;
      explanationConfidence.textContent = view.evidenceQuality;
      explanationDriver.textContent = view.mainDriver;
      explanationCaveat.textContent = view.caveat;
      recommendationExplanation.hidden = false;
    }

    function renderCleanedHistory(inspection) {
      clearElement(cleanedHistoryHead);
      clearElement(cleanedHistoryRows);
      const metrics = Array.isArray(inspection.metrics) ? inspection.metrics : [];
      const columns = [
        { key: 'period', label: 'Period' },
        { key: 'channel', label: 'Channel' },
        { key: 'spend', label: 'Spend' }
      ].concat(metrics.map(function metricColumn(metric) {
        return { key: metric.key, label: metric.label };
      }));
      ['campaign', 'segment'].forEach(function optionalDimension(key) {
        const hasDimension = inspection.rows.some(function dimensionPresent(row) {
          return row && row.dimensions && Array.isArray(row.dimensions[key])
            && row.dimensions[key].length > 0;
        });
        if (hasDimension) {
          columns.push({
            key: key,
            label: key === 'campaign' ? 'Campaign' : 'Segment',
            dimension: true
          });
        }
      });
      const headerRow = document.createElement('tr');
      columns.forEach(function addHeader(column) {
        const header = document.createElement('th');
        header.scope = 'col';
        header.textContent = column.label;
        headerRow.appendChild(header);
      });
      cleanedHistoryHead.appendChild(headerRow);
      inspection.rows.forEach(function addHistoryRow(historyRow) {
        const row = document.createElement('tr');
        columns.forEach(function addCell(column) {
          const cell = document.createElement('td');
          if (column.key === 'period') cell.textContent = historyRow.periodKey;
          else if (column.key === 'channel') cell.textContent = historyRow.channel;
          else if (column.key === 'spend') cell.textContent = String(historyRow.spend);
          else if (column.dimension) {
            const values = historyRow.dimensions && Array.isArray(historyRow.dimensions[column.key])
              ? historyRow.dimensions[column.key]
              : [];
            cell.textContent = values.join(' | ');
          }
          else cell.textContent = String(historyRow.outcomes[column.key]);
          row.appendChild(cell);
        });
        cleanedHistoryRows.appendChild(row);
      });
    }

    function resultCell(row, key) {
      const cell = document.createElement('td');
      cell.textContent = row[key];
      return cell;
    }

    function renderResult(view, planDays) {
      clearElement(resultDetails);
      if (!view || view.state !== 'result') {
        const blocked = document.createElement('div');
        const message = document.createElement('p');
        blocked.className = 'blocked-result';
        message.textContent = view && view.message
          ? view.message
          : FAILURE_COPY.invalid_plan;
        blocked.appendChild(message);
        if (view && (view.minimumBudget != null || view.maximumBudget != null)) {
          const boundaries = document.createElement('dl');
          boundaries.className = 'blocked-boundaries';
          [
            ['Minimum feasible budget', view.minimumBudget],
            ['Maximum feasible budget', view.maximumBudget]
          ].forEach(function addBoundary(boundary) {
            if (boundary[1] == null) return;
            const wrapper = document.createElement('div');
            const term = document.createElement('dt');
            const description = document.createElement('dd');
            term.textContent = boundary[0];
            description.textContent = money(boundary[1]);
            wrapper.append(term, description);
            boundaries.appendChild(wrapper);
          });
          blocked.appendChild(boundaries);
        }
        if (view && Array.isArray(view.conflicts) && view.conflicts.length > 0) {
          const label = document.createElement('p');
          const list = document.createElement('ul');
          label.textContent = 'Constraints to review:';
          view.conflicts.forEach(function addConflict(conflict) {
            const item = document.createElement('li');
            item.textContent = conflict;
            list.appendChild(item);
          });
          blocked.append(label, list);
        }
        resultDetails.appendChild(blocked);
        resultsNote.textContent = message.textContent;
        if (recommendationExplanation) recommendationExplanation.hidden = true;
        return;
      }

      const method = document.createElement('p');
      const summary = document.createElement('dl');
      const tableScroll = document.createElement('div');
      const table = document.createElement('table');
      const caption = document.createElement('caption');
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const body = document.createElement('tbody');
      method.className = 'result-method';
      method.textContent = view.methodNote;
      summary.className = 'result-summary';
      view.summary.forEach(function addResultSummary(item) {
        const wrapper = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = item.label;
        description.textContent = item.value;
        wrapper.append(term, description);
        summary.appendChild(wrapper);
      });
      if (view.outcomeScope) {
        const wrapper = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        wrapper.className = 'result-outcome-scope';
        term.textContent = 'Outcome scope';
        description.textContent = view.outcomeScope;
        wrapper.append(term, description);
        summary.appendChild(wrapper);
      }
      tableScroll.className = 'table-scroll';
      table.className = 'data-table allocation-table';
      caption.textContent = 'Recommended allocation by channel';
      [
        'Channel',
        'Evidence',
        'Current plan-rate spend',
        'Recommended',
        'Change',
        'Selected marginal metric',
        'Constraint'
      ].forEach(function addAllocationHeader(label) {
        const header = document.createElement('th');
        header.scope = 'col';
        header.textContent = label;
        headerRow.appendChild(header);
      });
      head.appendChild(headerRow);
      view.rows.forEach(function addAllocationRow(row) {
        const tableRow = document.createElement('tr');
        tableRow.append(
          resultCell(row, 'channel'),
          resultCell(row, 'evidence'),
          resultCell(row, 'currentPlanSpend'),
          resultCell(row, 'recommended'),
          resultCell(row, 'change'),
          resultCell(row, 'marginalMetric'),
          resultCell(row, 'constraint')
        );
        body.appendChild(tableRow);
      });
      table.append(caption, head, body);
      tableScroll.appendChild(table);
      resultDetails.append(method, summary, tableScroll);
      if (view.financialTreatment) {
        const treatment = document.createElement('p');
        treatment.className = 'financial-result-note';
        treatment.textContent = view.financialTreatment;
        resultDetails.appendChild(treatment);
      }
      resultsNote.textContent = 'Allocation calculated for a ' + String(planDays) + '-day decision horizon.';
      renderExplanation(view);
    }

    function diagnosticRows(channel) {
      const diagnostics = channel && channel.diagnostics && typeof channel.diagnostics === 'object'
        ? channel.diagnostics
        : {};
      const failed = Array.isArray(channel && channel.failedGates) ? channel.failedGates : [];
      const rows = [
        ['minimum_complete_periods', 'Complete periods', diagnostics.completePeriods, 'number'],
        ['positive_coverage', 'Positive spend and outcome coverage', diagnostics.positiveCoverage, 'percent'],
        ['distinct_spend', 'Distinct positive spend levels', diagnostics.distinctPositiveSpend, 'number'],
        ['spend_variation', 'Robust spend variation', diagnostics.robustSpendVariation, 'percent'],
        ['elasticity', 'Diminishing-return elasticity', diagnostics.elasticity, 'decimal'],
        ['elasticity_stability', 'Leave-one-period-out elasticity IQR', diagnostics.elasticityIqr, 'decimal'],
        [
          'current_prediction_stability',
          'Maximum current-prediction change',
          diagnostics.maximumCurrentPredictionChange,
          'percent'
        ]
      ];
      return rows.map(function diagnostic(row) {
        const value = finiteValue(row[2]);
        let display = '—';
        if (value != null) {
          if (row[3] === 'percent') display = numberText(value * 100) + '%';
          else display = numberText(value);
        }
        return {
          code: row[0],
          label: row[1],
          value: display,
          result: failed.indexOf(row[0]) === -1 ? 'Passed' : 'Failed'
        };
      });
    }

    function renderModelEvidence(model, allocation) {
      clearElement(modelEvidenceCharts);
      cancelChartRepaint();
      const view = modelEvidenceView(model, allocation);
      if (!modelEvidenceCharts || view.state !== 'ready') return;

      const chartJobs = [];
      const overview = document.createElement('section');
      const overviewHeading = document.createElement('h3');
      const overviewSummary = document.createElement('p');
      const crossCanvas = document.createElement('canvas');
      const curveGrid = document.createElement('div');
      overview.className = 'evidence-overview inspector-overview';
      overviewHeading.textContent = view.overview.heading;
      overviewSummary.textContent = view.overview.summary;
      crossCanvas.id = 'marginal-efficiency-chart';
      crossCanvas.width = 720;
      crossCanvas.height = 260;
      crossCanvas.setAttribute('role', 'img');
      crossCanvas.setAttribute('aria-label', 'Cross-channel modeled marginal efficiency chart');
      overview.append(overviewHeading, overviewSummary, crossCanvas);
      curveGrid.className = 'evidence-curve-grid';

      view.channels.forEach(function addEvidenceCard(channel, index) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        const status = document.createElement('p');
        const summary = document.createElement('p');
        const positions = document.createElement('dl');
        const canvas = document.createElement('canvas');
        section.className = 'evidence-card';
        heading.textContent = channel.name;
        status.className = 'evidence-card-status';
        status.textContent = channel.statusLabel;
        summary.className = 'evidence-card-summary';
        summary.textContent = channel.summary;
        positions.className = 'evidence-card-positions channel-inspector-positions';
        channel.positionRows.forEach(function addPosition(item) {
          const wrapper = document.createElement('div');
          const term = document.createElement('dt');
          const description = document.createElement('dd');
          term.textContent = item[0];
          description.textContent = item[1];
          wrapper.append(term, description);
          positions.appendChild(wrapper);
        });
        canvas.id = 'response-curve-' + index;
        canvas.width = 720;
        canvas.height = 320;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Channel: ' + channel.accessibleLabel);
        section.append(heading, status, summary);
        if (channel.positionRows.length > 0) section.appendChild(positions);
        section.appendChild(canvas);
        curveGrid.appendChild(section);
        chartJobs.push({
          canvas: canvas,
          channel: channel.chartChannel,
          positions: channel.status === 'modelable' ? channel.positions : {}
        });
      });
      modelEvidenceCharts.append(overview, curveGrid);

      repaintCharts = function paintEvidenceCharts() {
        if (typeof CHARTS.drawMarginalEfficiencyChart === 'function') {
          CHARTS.drawMarginalEfficiencyChart(crossCanvas, view.overview.chartRows, {
            marginalLabel: model.metric.key === 'conversions'
              ? 'Marginal conversions per dollar (higher is better)'
              : marginalLabel(model.metric) + ' (higher is better)',
            formatMarginal: function formatMarginalValue(value) {
              if (model.metric.key === 'conversions') {
                return numberText(value) + ' marginal conversions per dollar';
              }
              return formatMarginal({
                key: model.metric.key === 'revenue'
                  ? 'marginal_roas'
                  : 'marginal_roi',
                value: value
              });
            }
          });
        }
        if (typeof CHARTS.drawResponseCurve === 'function') {
          chartJobs.forEach(function drawChannel(job) {
            CHARTS.drawResponseCurve(job.canvas, job.channel, job.positions, {
              spendLabel: 'Spend per ' + (model.cadence || 'historical period'),
              outcomeLabel: model.metric.label,
              formatSpend: money,
              formatOutcome: model.metric.key === 'conversions' ? numberText : money
            });
          });
        }
      };
      repaintCharts();
    }

    function renderDiagnostics(model, inspection) {
      clearElement(modelDiagnosticsChannels);
      if (!modelDiagnosticsChannels || !model || !inspection || inspection.ok !== true) return;
      modelDiagnosticsChannels.className = 'model-diagnostics-channels inspector-charts';
      const channels = Array.isArray(model.channels) ? model.channels : [];
      channels.forEach(function addChannelDiagnostics(channel) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        const status = document.createElement('p');
        const tableScroll = document.createElement('div');
        const table = document.createElement('table');
        const caption = document.createElement('caption');
        const head = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const body = document.createElement('tbody');
        const gateScroll = document.createElement('div');
        const gateTable = document.createElement('table');
        const gateCaption = document.createElement('caption');
        const gateHead = document.createElement('thead');
        const gateHeaderRow = document.createElement('tr');
        const gateBody = document.createElement('tbody');
        section.className = 'channel-diagnostics';
        heading.textContent = channel.channel;
        status.className = 'channel-inspector-summary';
        status.textContent = channel.status === 'modelable'
          ? 'Modeled response admitted; diagnostic values and normalized observations are shown below.'
          : 'Preserved observations only; evidence gates explain why no fitted line was admitted.';
        tableScroll.className = 'table-scroll';
        table.className = 'data-table inspector-observations';
        caption.textContent = 'Observed periods for this channel';
        ['Period', 'Spend', model.metric.label].forEach(function addObservationHeader(label) {
          const header = document.createElement('th');
          header.scope = 'col';
          header.textContent = label;
          headerRow.appendChild(header);
        });
        head.appendChild(headerRow);
        (Array.isArray(channel.observations) ? channel.observations : []).forEach(function addObservation(observation) {
          const row = document.createElement('tr');
          const period = document.createElement('td');
          const spend = document.createElement('td');
          const outcome = document.createElement('td');
          period.textContent = observation.periodKey;
          spend.textContent = money(observation.spend);
          outcome.textContent = model.metric.key === 'conversions'
            ? numberText(observation.outcome)
            : money(observation.outcome);
          row.append(period, spend, outcome);
          body.appendChild(row);
        });
        table.append(caption, head, body);
        tableScroll.appendChild(table);

        gateScroll.className = 'table-scroll';
        gateTable.className = 'data-table inspector-gates';
        gateCaption.textContent = 'Evidence gate values';
        ['Gate', 'Value', 'Result'].forEach(function addGateHeader(label) {
          const header = document.createElement('th');
          header.scope = 'col';
          header.textContent = label;
          gateHeaderRow.appendChild(header);
        });
        gateHead.appendChild(gateHeaderRow);
        diagnosticRows(channel).forEach(function addDiagnostic(diagnostic) {
          const row = document.createElement('tr');
          const label = document.createElement('td');
          const value = document.createElement('td');
          const result = document.createElement('td');
          label.textContent = diagnostic.label;
          value.textContent = diagnostic.value;
          result.textContent = diagnostic.result;
          row.append(label, value, result);
          gateBody.appendChild(row);
        });
        gateTable.append(gateCaption, gateHead, gateBody);
        gateScroll.appendChild(gateTable);
        section.append(heading, status, tableScroll, gateScroll);
        modelDiagnosticsChannels.appendChild(section);
      });
    }

    function finishInspection(inspection) {
      const analysis = typeof MARGINALITY.analyzeHistory === 'function'
        ? MARGINALITY.analyzeHistory(inspection)
        : { ok: false, models: {}, eligibleObjectives: [], recommendedObjective: null };
      analysis.historySummary = {
        completePeriods: inspection.summary.completePeriods,
        channels: inspection.summary.channels,
        excludedRows: inspection.summary.excludedRows
      };
      state.importResult = inspection;
      state.analysis = analysis;
      state.selectedObjective = analysis.recommendedObjective;
      state.allocation = null;
      state.constraints = {};
      preservedDefaults = {};
      activeCorrectionText = null;
      historyPaste.value = '';
      if (SAMPLE.totalBudget && state.sourceKind === 'sample') {
        totalBudgetInput.value = String(SAMPLE.totalBudget);
      }
      if (SAMPLE.planDays && state.sourceKind === 'sample') {
        planDaysInput.value = String(SAMPLE.planDays);
      }
      renderReadiness();
      renderCleanedHistory(inspection);
      renderDiagnostics(modelFor(analysis, state.selectedObjective), inspection);
      syncPhase();
    }

    function processImport(text, sourceKind, options) {
      state.phase = 'parsing';
      state.sourceKind = sourceKind;
      state.importResult = null;
      state.analysis = null;
      state.allocation = null;
      syncPhase();
      const inspection = typeof HISTORY.inspectHistory === 'function'
        ? HISTORY.inspectHistory(text, options || {})
        : {
          ok: false,
          state: 'needs_correction',
          headers: [],
          exclusions: [{
            rowNumber: 1,
            field: 'history',
            code: 'parser_unavailable',
            message: 'History checking is unavailable.'
          }]
        };
      state.importResult = inspection;
      if (inspection.ok !== true) {
        activeCorrectionText = text;
        renderCorrection(inspection);
        syncPhase();
        return;
      }
      finishInspection(inspection);
    }

    function requestImport(text, sourceKind) {
      const sourceText = typeof text === 'string' ? text : '';
      if (state.analysis || state.allocation) {
        state.pendingImport = { text: sourceText, sourceKind: sourceKind };
        replacementWarning.hidden = false;
        setImportStatus('New history is waiting for replacement confirmation.');
        return;
      }
      resetFinancialTreatmentChoice();
      trackImport(sourceKind);
      processImport(sourceText, sourceKind);
    }

    function retryCorrection() {
      if (typeof activeCorrectionText !== 'string' || !state.importResult) return;
      const columnMap = {};
      const headers = Array.isArray(state.importResult.headers) ? state.importResult.headers : [];
      const priorMap = state.importResult.columnMap && typeof state.importResult.columnMap === 'object'
        ? state.importResult.columnMap
        : {};
      Object.keys(priorMap).forEach(function retainResolvedMapping(field) {
        if (typeof priorMap[field] === 'string' && headers.indexOf(priorMap[field]) !== -1) {
          columnMap[field] = priorMap[field];
        }
      });
      const selects = columnMapping.querySelectorAll('select[data-field]');
      let mappingComplete = true;
      let outcomeSource = null;
      let outcomeType = null;
      Array.from(selects).forEach(function readMapping(select) {
        if (!select.value) {
          mappingComplete = false;
        } else if (select.dataset.field === 'outcomeSource') {
          outcomeSource = select.value;
        } else if (select.dataset.field === 'outcomeType') {
          outcomeType = select.value;
        } else {
          columnMap[select.dataset.field] = select.value;
        }
      });
      if (outcomeSource && outcomeType) columnMap[outcomeType] = outcomeSource;
      const treatment = financialTreatment.querySelector('input[name="financial-treatment"]:checked');
      const needsTreatment = !financialTreatment.hidden;
      if (!mappingComplete || (needsTreatment && !treatment)) {
        setImportStatus('Choose every required mapping before applying corrections.');
        return;
      }
      processImport(activeCorrectionText, state.sourceKind, {
        columnMap: columnMap,
        financialTreatment: treatment ? treatment.value : undefined
      });
    }

    function correctionGuideText() {
      const inspection = state.importResult || {};
      const headers = Array.isArray(inspection.headers) ? inspection.headers : [];
      const findings = Array.isArray(inspection.exclusions) ? inspection.exclusions : [];
      const lines = [
        'Budget Advisor correction guide',
        '',
        'Detected headers: ' + (headers.length ? headers.join(', ') : 'None'),
        'Required semantic fields: period, channel, spend, and at least one of conversions, revenue, financial',
        '',
        'Findings:'
      ];
      findings.forEach(function addFinding(item) {
        lines.push(
          'Row ' + String(Number.isFinite(item.rowNumber) ? item.rowNumber : 1)
          + ' | ' + String(item.field || 'history')
          + ' | ' + String(item.code || 'review_required')
          + ' | ' + String(item.message || 'Review this field.')
        );
      });
      return lines.join('\n');
    }

    pasteToggle.addEventListener('click', function togglePastePanel() {
      const expanded = pasteToggle.getAttribute('aria-expanded') === 'true';
      pasteToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      pastePanel.hidden = expanded;
      if (!expanded) historyPaste.focus();
    });

    parsePastedHistory.addEventListener('click', function importPastedHistory() {
      requestImport(historyPaste.value, 'paste');
    });

    sampleButton.addEventListener('click', function importSample() {
      if (typeof SAMPLE.text !== 'string') return;
      requestImport(SAMPLE.text, 'sample');
    });

    historyFile.addEventListener('change', function importFile() {
      const file = historyFile.files && historyFile.files[0];
      if (!file || typeof root.FileReader !== 'function') return;
      const reader = new root.FileReader();
      reader.addEventListener('load', function fileLoaded() {
        requestImport(typeof reader.result === 'string' ? reader.result : '', 'upload');
        historyFile.value = '';
      });
      reader.addEventListener('error', function fileFailed() {
        setImportStatus('The selected file could not be read.');
        historyFile.value = '';
      });
      reader.readAsText(file);
    });

    confirmReplacement.addEventListener('click', function replaceHistory() {
      const pending = state.pendingImport;
      if (!pending) return;
      clearPriorDecision();
      state.pendingImport = null;
      replacementWarning.hidden = true;
      trackImport(pending.sourceKind);
      processImport(pending.text, pending.sourceKind);
    });

    cancelReplacement.addEventListener('click', function keepHistory() {
      const pendingSourceKind = state.pendingImport && state.pendingImport.sourceKind;
      state.pendingImport = null;
      if (pendingSourceKind === 'paste') historyPaste.value = '';
      replacementWarning.hidden = true;
      syncPhase();
    });

    applyCorrections.addEventListener('click', retryCorrection);

    correctionGuide.addEventListener('click', function downloadCorrectionGuide() {
      downloadText(
        'mangrove-budget-correction-guide.txt',
        correctionGuideText(),
        'text/plain;charset=utf-8'
      );
    });

    objectiveSelect.addEventListener('change', function changeObjective() {
      if (!state.analysis || !state.analysis.models[objectiveSelect.value]) return;
      state.selectedObjective = objectiveSelect.value;
      state.constraints = {};
      preservedDefaults = {};
      clearAllocationResult();
      renderReadiness();
      renderDiagnostics(
        modelFor(state.analysis, state.selectedObjective),
        state.importResult
      );
      syncPhase();
      const model = modelFor(state.analysis, state.selectedObjective);
      const label = model && model.metric && typeof model.metric.label === 'string'
        ? model.metric.label
        : 'the selected outcome';
      setImportStatus('Objective changed to ' + label + '. Review constraints before rebuilding the plan.');
    });

    planDaysInput.addEventListener('input', function invalidatePlanHorizon() {
      invalidateAllocation('Planning window changed. Rebuild the plan to update the recommendation.');
    });

    planDaysInput.addEventListener('change', function updatePlanHorizon() {
      if (!state.analysis) return;
      clearAllocationResult();
      renderConstraints();
      setImportStatus('Planning window changed. Review preserved amounts before rebuilding the plan.');
    });

    totalBudgetInput.addEventListener('input', function updateBudget() {
      invalidateAllocation('Budget changed. Rebuild the plan to update the recommendation.');
    });

    downloadCleanedData.addEventListener('click', function downloadCleanHistory() {
      if (!state.importResult || state.importResult.ok !== true
        || typeof HISTORY.toCleanCsv !== 'function') return;
      downloadText(
        'mangrove-budget-cleaned-history.csv',
        HISTORY.toCleanCsv(state.importResult),
        'text/csv;charset=utf-8'
      );
    });

    downloadAllocation.addEventListener('click', function downloadPlanAllocation() {
      const model = modelFor(state.analysis, state.selectedObjective);
      if (!model || !state.allocation || state.allocation.ok !== true) return;
      downloadText(
        'mangrove-budget-allocation.json',
        JSON.stringify(allocationDownloadPayload(model, state.allocation), null, 2) + '\n',
        'application/json;charset=utf-8'
      );
    });

    planForm.addEventListener('submit', function buildPlan(event) {
      event.preventDefault();
      clearAllocationResult();
      const model = modelFor(state.analysis, state.selectedObjective);
      const totalBudget = Number(totalBudgetInput.value);
      const planDays = Number(planDaysInput.value);
      if (!model || !Number.isFinite(totalBudget) || totalBudget <= 0
        || !Number.isFinite(planDays) || planDays <= 0
        || typeof ALLOCATOR.allocatePlan !== 'function') {
        setImportStatus(FAILURE_COPY.invalid_plan);
        return;
      }
      state.allocation = ALLOCATOR.allocatePlan({
        model: model,
        totalBudget: totalBudget,
        planDays: planDays,
        constraints: state.constraints
      });
      const view = resultView(model, state.allocation);
      if (!state.allocation.ok) {
        renderResult(view);
        if (MOTION.resetResult) MOTION.resetResult(resultsPanel);
        syncPhase();
        setImportStatus('Plan blocked. Review the result and constraints.');
        return;
      }
      renderResult(view, planDays);
      syncPhase();
      renderModelEvidence(model, state.allocation);
      if (downloadAllocation) downloadAllocation.disabled = false;
      if (MOTION.revealResult) MOTION.revealResult(resultsPanel);
      if (['upload', 'paste', 'sample'].indexOf(state.sourceKind) !== -1) {
        trackEvent('calculation_completed', state.sourceKind);
      }
    });

    if (typeof root.addEventListener === 'function') {
      root.addEventListener('resize', function repaintAfterResize() {
        if (!repaintCharts || (modelEvidence && modelEvidence.hidden)
          || typeof root.setTimeout !== 'function') return;
        if (chartTimer != null && typeof root.clearTimeout === 'function') {
          root.clearTimeout(chartTimer);
        }
        chartTimer = root.setTimeout(function repaintResultCharts() {
          chartTimer = null;
          if (repaintCharts) repaintCharts();
        }, 150);
      });
    }

    syncPhase();
  }

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
}(window));
