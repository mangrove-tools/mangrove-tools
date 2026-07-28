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
    financial: 'Financial outcome'
  });

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

  root.MangroveBudgetApp = {
    createState: createState,
    derivePhase: derivePhase,
    readinessView: readinessView
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
    const chartTimers = [];
    const downloadUrls = [];
    let activeCorrectionText = null;

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
    const resultsPanel = document.getElementById('results');
    const resultsNote = document.getElementById('results-note');
    const modelInspector = document.getElementById('model-inspector');
    const cleanedHistoryHead = document.getElementById('cleaned-history-head');
    const cleanedHistoryRows = document.getElementById('cleaned-history-rows');
    const downloadCleanedData = document.getElementById('download-cleaned-data');
    const downloadAllocation = document.getElementById('download-allocation');
    const recommendationExplanation = document.getElementById('recommendation-explanation');
    const explanationConfidence = document.getElementById('explanation-confidence');
    const explanationDriver = document.getElementById('explanation-driver');
    const explanationCaveat = document.getElementById('explanation-caveat');

    function trackEvent(eventName, action) {
      if (typeof EXTRAS.trackProductEvent !== 'function') return;
      EXTRAS.trackProductEvent(eventName, { action: action });
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
      state.phase = phase;
      if (decisionCanvas) decisionCanvas.dataset.phase = phase;
      if (correctionPanel) correctionPanel.hidden = phase !== 'needs_correction';
      if (readinessPanel) {
        readinessPanel.hidden = ['ready', 'partially_modelable', 'blocked', 'result'].indexOf(phase) === -1;
      }
      if (planForm) {
        planForm.hidden = ['ready', 'partially_modelable', 'result'].indexOf(phase) === -1;
      }
      if (resultsPanel) resultsPanel.hidden = phase !== 'result';
      if (modelInspector) {
        modelInspector.hidden = ['ready', 'partially_modelable', 'blocked', 'result'].indexOf(phase) === -1;
      }
      if (!state.pendingImport) setImportStatus(phaseMessage(phase));
    }

    function clearAllocationResult() {
      state.allocation = null;
      if (resultsNote) resultsNote.textContent = 'Choose a budget and horizon to build the plan.';
      if (downloadAllocation) downloadAllocation.disabled = true;
      if (MOTION.resetResult) MOTION.resetResult(resultsPanel);
      syncPhase();
    }

    function revokeDownloads() {
      while (downloadUrls.length > 0) {
        const url = downloadUrls.pop();
        if (root.URL && typeof root.URL.revokeObjectURL === 'function') {
          root.URL.revokeObjectURL(url);
        }
      }
    }

    function clearPriorDecision() {
      if (MOTION.resetResult) MOTION.resetResult(resultsPanel);
      chartTimers.forEach(function clearChartTimer(timer) {
        root.clearTimeout(timer);
      });
      chartTimers.length = 0;
      revokeDownloads();
      state.phase = 'empty';
      state.importResult = null;
      state.analysis = null;
      state.selectedObjective = null;
      state.allocation = null;
      state.constraints = {};
      state.sourceKind = null;
      activeCorrectionText = null;
      clearElement(readinessSummary);
      clearElement(readinessChannelRows);
      clearElement(cleanedHistoryHead);
      clearElement(cleanedHistoryRows);
      clearElement(objectiveSelect);
      if (recommendationExplanation) recommendationExplanation.hidden = true;
      if (downloadAllocation) downloadAllocation.disabled = true;
      if (resultsNote) resultsNote.textContent = 'Choose a budget and horizon to build the plan.';
    }

    function downloadText(filename, text, type) {
      if (!root.Blob || !root.URL || typeof root.URL.createObjectURL !== 'function') return;
      const blob = new root.Blob([text], { type: type });
      const url = root.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      downloadUrls.push(url);
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
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

      const needsFinancialTreatment = findings.some(function financialFinding(item) {
        return item.code === 'financial_treatment_required';
      });
      if (financialTreatment) financialTreatment.hidden = !needsFinancialTreatment;
      if (applyCorrections) {
        applyCorrections.hidden = mappingFields.length === 0 && !needsFinancialTreatment;
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
      renderExplanation(view);
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
      explanationConfidence.textContent = 'Observational evidence — '
        + view.modelableCount + ' channel' + (view.modelableCount === 1 ? '' : 's')
        + ' support modeled marginal response.';
      explanationDriver.textContent = 'The planner can compare modeled marginal returns only across admitted channels.';
      explanationCaveat.textContent = view.preservedCount > 0
        ? view.preservedCount + ' preserved channel' + (view.preservedCount === 1 ? ' stays' : 's stay')
          + ' at recent spend and cannot receive optimized remainder.'
        : 'Historical relationships can change and do not establish causal incrementality.';
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
          else cell.textContent = String(historyRow.outcomes[column.key]);
          row.appendChild(cell);
        });
        cleanedHistoryRows.appendChild(row);
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
      activeCorrectionText = null;
      if (state.sourceKind === 'paste') historyPaste.value = '';
      renderReadiness();
      renderCleanedHistory(inspection);
      if (SAMPLE.totalBudget && state.sourceKind === 'sample') {
        totalBudgetInput.value = String(SAMPLE.totalBudget);
      }
      if (SAMPLE.planDays && state.sourceKind === 'sample') {
        planDaysInput.value = String(SAMPLE.planDays);
      }
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
      processImport(sourceText, sourceKind);
    }

    function retryCorrection() {
      if (typeof activeCorrectionText !== 'string' || !state.importResult) return;
      const columnMap = {};
      const selects = columnMapping.querySelectorAll('select[data-field]');
      let mappingComplete = true;
      Array.from(selects).forEach(function readMapping(select) {
        if (!select.value) mappingComplete = false;
        else columnMap[select.dataset.field] = select.value;
      });
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
      trackEvent('tool_started', 'paste');
      requestImport(historyPaste.value, 'paste');
    });

    sampleButton.addEventListener('click', function importSample() {
      if (typeof SAMPLE.text !== 'string') return;
      trackEvent('sample_data_used', 'sample');
      trackEvent('tool_started', 'sample');
      requestImport(SAMPLE.text, 'sample');
    });

    historyFile.addEventListener('change', function importFile() {
      const file = historyFile.files && historyFile.files[0];
      if (!file || typeof root.FileReader !== 'function') return;
      const reader = new root.FileReader();
      reader.addEventListener('load', function fileLoaded() {
        trackEvent('tool_started', 'upload');
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
      downloadText('budget-advisor-correction-guide.txt', correctionGuideText(), 'text/plain;charset=utf-8');
    });

    objectiveSelect.addEventListener('change', function changeObjective() {
      if (!state.analysis || !state.analysis.models[objectiveSelect.value]) return;
      state.selectedObjective = objectiveSelect.value;
      state.allocation = null;
      renderReadiness();
      syncPhase();
    });

    downloadCleanedData.addEventListener('click', function downloadCleanHistory() {
      if (!state.importResult || state.importResult.ok !== true
        || typeof HISTORY.toCleanCsv !== 'function') return;
      downloadText(
        'budget-advisor-cleaned-history.csv',
        HISTORY.toCleanCsv(state.importResult),
        'text/csv;charset=utf-8'
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
        setImportStatus('Enter a positive budget and plan length.');
        return;
      }
      state.allocation = ALLOCATOR.allocatePlan({
        model: model,
        totalBudget: totalBudget,
        planDays: planDays,
        constraints: state.constraints
      });
      if (!state.allocation.ok) {
        setImportStatus(state.allocation.message || 'The plan is not feasible with these constraints.');
        if (MOTION.resetResult) MOTION.resetResult(resultsPanel);
        return;
      }
      resultsNote.textContent = 'Allocation calculated for a ' + planDays + '-day decision horizon.';
      if (MOTION.revealResult) MOTION.revealResult(resultsPanel);
      syncPhase();
      trackEvent('calculation_completed', 'submit');
    });

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
