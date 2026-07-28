/**
 * Browser-only parsing and normalization for Budget Advisor history imports.
 */
'use strict';

(function attachHistoryData(root) {
  const COLUMN_ALIASES = Object.freeze({
    period: ['period', 'date', 'week', 'month'],
    channel: ['channel', 'source', 'platform'],
    spend: ['spend', 'cost', 'media_spend'],
    conversions: ['conversions', 'orders', 'leads'],
    revenue: ['revenue', 'sales'],
    financial: ['contribution', 'gross_profit', 'profit'],
    campaign: ['campaign', 'campaign_name'],
    segment: ['segment', 'audience', 'market']
  });
  const REQUIRED_FIELDS = ['period', 'channel', 'spend'];
  const OUTCOME_FIELDS = ['conversions', 'revenue', 'financial'];
  const DIMENSION_FIELDS = ['campaign', 'segment'];
  const DAY_MS = 24 * 60 * 60 * 1000;

  function finding(rowNumber, field, code, message) {
    return { rowNumber: rowNumber, field: field, code: code, message: message };
  }

  function emptyInspection() {
    return {
      ok: false,
      state: 'needs_correction',
      delimiter: ',',
      cadence: null,
      cadenceDays: null,
      headers: [],
      columnMap: {
        period: null,
        channel: null,
        spend: null,
        conversions: null,
        revenue: null,
        financial: null,
        campaign: null,
        segment: null
      },
      metrics: [],
      rows: [],
      exclusions: [],
      summary: {
        inputRows: 0,
        acceptedRows: 0,
        excludedRows: 0,
        completePeriods: 0,
        channels: 0
      }
    };
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let fields = [];
    let field = '';
    let inQuotes = false;
    let line = 1;
    let rowLine = 1;

    function finishRow() {
      fields.push(field);
      if (fields.length !== 1 || fields[0] !== '') {
        rows.push({ fields: fields, rowNumber: rowLine });
      }
      fields = [];
      field = '';
      rowLine = line;
    }

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"') {
        if (inQuotes && text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (character === delimiter && !inQuotes) {
        fields.push(field);
        field = '';
      } else if ((character === '\n' || character === '\r') && !inQuotes) {
        if (character === '\r' && text[index + 1] === '\n') index += 1;
        finishRow();
        line += 1;
        rowLine = line;
      } else {
        field += character;
      }
    }

    if (field !== '' || fields.length > 0) finishRow();
    return rows;
  }

  function countUnquoted(text, delimiter) {
    let count = 0;
    let inQuotes = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"') {
        if (inQuotes && text[index + 1] === '"') index += 1;
        else inQuotes = !inQuotes;
      } else if (!inQuotes && character === delimiter) {
        count += 1;
      } else if (!inQuotes && (character === '\n' || character === '\r')) {
        break;
      }
    }
    return count;
  }

  function detectDelimiter(text) {
    return countUnquoted(text, '\t') > countUnquoted(text, ',') ? '\t' : ',';
  }

  function headerKey(header) {
    return header.replace(/^\uFEFF/, '').trim().toLowerCase();
  }

  function sourceHeader(headers, requested) {
    const requestedKey = headerKey(String(requested));
    const matches = headers.filter(function matchHeader(header) {
      return headerKey(header) === requestedKey;
    });
    return matches.length === 1 ? matches[0] : null;
  }

  function mapColumns(headers, overrides, exclusions) {
    const map = {};
    const overrideMap = overrides && typeof overrides === 'object' ? overrides : {};
    Object.keys(COLUMN_ALIASES).forEach(function mapField(field) {
      if (Object.prototype.hasOwnProperty.call(overrideMap, field)) {
        const header = sourceHeader(headers, overrideMap[field]);
        if (header) {
          map[field] = header;
        } else {
          map[field] = null;
          exclusions.push(finding(1, field, 'missing_column', 'The selected source column is not present.'));
        }
        return;
      }

      const aliases = COLUMN_ALIASES[field];
      const matches = headers.filter(function matchAlias(header) {
        return aliases.indexOf(headerKey(header)) !== -1;
      });
      if (matches.length > 1) {
        map[field] = null;
        exclusions.push(finding(1, field, 'ambiguous_column', 'More than one source column matches this field.'));
      } else {
        map[field] = matches.length === 1 ? matches[0] : null;
      }
    });
    return map;
  }

  function isoWeekStart(date) {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() - day + 1);
    return utc;
  }

  function isoWeekKey(date) {
    const start = isoWeekStart(date);
    const thursday = new Date(start.getTime());
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const year = thursday.getUTCFullYear();
    const yearStart = isoWeekStart(new Date(Date.UTC(year, 0, 4)));
    const week = Math.round((start.getTime() - yearStart.getTime()) / (7 * DAY_MS)) + 1;
    return year + '-W' + String(week).padStart(2, '0');
  }

  function dateText(date) {
    return date.getUTCFullYear() + '-'
      + String(date.getUTCMonth() + 1).padStart(2, '0') + '-'
      + String(date.getUTCDate()).padStart(2, '0');
  }

  function parsePeriod(value) {
    const text = value.trim();
    let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match) {
      const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (dateText(date) !== text) return null;
      return { sourceCadence: 'date', date: date };
    }

    match = /^(\d{4})-W(\d{2})$/.exec(text);
    if (match) {
      const year = Number(match[1]);
      const week = Number(match[2]);
      if (week < 1 || week > 53) return null;
      const firstWeek = isoWeekStart(new Date(Date.UTC(year, 0, 4)));
      const date = new Date(firstWeek.getTime() + (week - 1) * 7 * DAY_MS);
      if (isoWeekKey(date) !== text) return null;
      return { sourceCadence: 'weekly', date: date };
    }

    match = /^(\d{4})-(\d{2})$/.exec(text);
    if (match) {
      const month = Number(match[2]);
      if (month < 1 || month > 12) return null;
      return { sourceCadence: 'monthly', date: new Date(Date.UTC(Number(match[1]), month - 1, 1)) };
    }
    return null;
  }

  function finiteNumber(value) {
    const text = value.trim();
    if (text === '') return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function median(numbers) {
    const sorted = numbers.slice().sort(function numericSort(left, right) { return left - right; });
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function resolveDateCadence(rows) {
    const dates = Array.from(new Set(rows.map(function dateValue(row) { return row.date.getTime(); })))
      .sort(function numericSort(left, right) { return left - right; });
    const gaps = [];
    for (let index = 1; index < dates.length; index += 1) {
      const gap = (dates[index] - dates[index - 1]) / DAY_MS;
      if (gap > 0) gaps.push(gap);
    }
    return gaps.length > 0 && gaps.every(function weeklyGap(gap) { return gap % 7 === 0; })
      && median(gaps) >= 6 && median(gaps) <= 8
      ? 'weekly'
      : 'daily';
  }

  function cadenceDays(cadence) {
    if (cadence === 'monthly') return 365.25 / 12;
    if (cadence === 'weekly') return 7;
    return 1;
  }

  function financialMetricLabel(source) {
    const labels = {
      contribution: 'Contribution',
      gross_profit: 'Gross profit',
      profit: 'Profit'
    };
    const sourceText = typeof source === 'string' ? source.trim() : '';
    return labels[headerKey(sourceText)] || sourceText || 'Financial outcome';
  }

  function metricDefinitions(columnMap, financialTreatment) {
    const labels = { conversions: 'Conversions', revenue: 'Revenue', financial: 'Financial outcome' };
    return OUTCOME_FIELDS.filter(function presentMetric(field) { return columnMap[field] !== null; })
      .map(function metric(field) {
        return {
          key: field,
          label: field === 'financial' ? financialMetricLabel(columnMap.financial) : labels[field],
          costTreatment: field === 'financial' ? financialTreatment : null
        };
      });
  }

  function inspectionError(inspection) {
    inspection.ok = false;
    inspection.state = 'needs_correction';
    return inspection;
  }

  function inspectHistory(text, options) {
    const inspection = emptyInspection();
    const settings = options && typeof options === 'object' ? options : {};
    const sourceText = typeof text === 'string' ? text : '';
    inspection.delimiter = detectDelimiter(sourceText);
    const records = parseDelimited(sourceText, inspection.delimiter);
    if (records.length === 0) {
      inspection.exclusions.push(finding(1, 'history', 'missing_header', 'A header row is required.'));
      return inspectionError(inspection);
    }

    inspection.headers = records[0].fields.map(function normalizeHeader(header) {
      return header.replace(/^\uFEFF/, '').trim();
    });
    inspection.summary.inputRows = records.length - 1;
    inspection.columnMap = mapColumns(inspection.headers, settings.columnMap, inspection.exclusions);
    REQUIRED_FIELDS.forEach(function requireField(field) {
      if (inspection.columnMap[field] === null && !inspection.exclusions.some(function alreadyFound(item) {
        return item.field === field && item.code === 'missing_column';
      })) {
        inspection.exclusions.push(finding(1, field, 'missing_column', 'A required source column is missing.'));
      }
    });
    const outcomes = OUTCOME_FIELDS.filter(function mappedOutcome(field) {
      return inspection.columnMap[field] !== null;
    });
    if (outcomes.length === 0) {
      inspection.exclusions.push(finding(1, 'outcome', 'missing_outcome', 'At least one outcome column is required.'));
    }
    if (inspection.columnMap.financial !== null
      && settings.financialTreatment !== 'before_marketing'
      && settings.financialTreatment !== 'after_marketing') {
      inspection.exclusions.push(finding(1, 'financial', 'financial_treatment_required', 'Choose how the financial outcome treats marketing cost.'));
    }
    inspection.metrics = metricDefinitions(inspection.columnMap, settings.financialTreatment || null);

    const indexes = {};
    Object.keys(inspection.columnMap).forEach(function findIndex(field) {
      indexes[field] = inspection.columnMap[field] === null ? -1 : inspection.headers.indexOf(inspection.columnMap[field]);
    });
    const validRecords = [];
    records.slice(1).forEach(function validateRecord(record) {
      if (record.fields.length !== inspection.headers.length) {
        inspection.exclusions.push(finding(record.rowNumber, 'row', 'field_count', 'This row does not match the header field count.'));
        inspection.summary.excludedRows += 1;
        return;
      }
      const rowFindings = [];
      const period = indexes.period === -1 ? null : parsePeriod(record.fields[indexes.period]);
      if (!period) rowFindings.push(finding(record.rowNumber, 'period', 'invalid_period', 'Use YYYY-MM-DD, YYYY-Www, or YYYY-MM.'));
      const channel = indexes.channel === -1 ? '' : record.fields[indexes.channel].trim();
      if (!channel) rowFindings.push(finding(record.rowNumber, 'channel', 'required_value', 'A channel value is required.'));
      const spend = indexes.spend === -1 ? null : finiteNumber(record.fields[indexes.spend]);
      if (spend === null) rowFindings.push(finding(record.rowNumber, 'spend', 'invalid_number', 'Use a finite number.'));
      const outcomeValues = {};
      outcomes.forEach(function validateOutcome(field) {
        const value = finiteNumber(record.fields[indexes[field]]);
        if (value === null) rowFindings.push(finding(record.rowNumber, field, 'invalid_number', 'Use a finite number.'));
        else outcomeValues[field] = value;
      });
      if (rowFindings.length > 0) {
        inspection.exclusions.push.apply(inspection.exclusions, rowFindings);
        inspection.summary.excludedRows += 1;
        return;
      }
      const dimensions = { campaign: [], segment: [] };
      DIMENSION_FIELDS.forEach(function readDimension(field) {
        if (indexes[field] !== -1 && record.fields[indexes[field]].trim() !== '') {
          dimensions[field].push(record.fields[indexes[field]].trim());
        }
      });
      validRecords.push({
        rowNumber: record.rowNumber,
        date: period.date,
        sourceCadence: period.sourceCadence,
        channel: channel,
        spend: spend,
        outcomes: outcomeValues,
        dimensions: dimensions
      });
    });

    if (inspection.exclusions.some(function configurationError(item) { return item.rowNumber === 1; })) {
      return inspectionError(inspection);
    }
    if (validRecords.length === 0) return inspectionError(inspection);

    const channelCadences = new Map();
    const channelGroups = new Map();
    validRecords.forEach(function groupByChannel(record) {
      if (!channelGroups.has(record.channel)) channelGroups.set(record.channel, []);
      channelGroups.get(record.channel).push(record);
    });
    channelGroups.forEach(function resolveChannelCadence(channelRows, channel) {
      const sourceCadences = Array.from(new Set(channelRows.map(function sourceCadence(row) { return row.sourceCadence; })));
      if (sourceCadences.length !== 1) {
        channelCadences.set(channel, 'mixed');
      } else if (sourceCadences[0] === 'date') {
        channelCadences.set(channel, resolveDateCadence(channelRows));
      } else {
        channelCadences.set(channel, sourceCadences[0]);
      }
    });
    const resolvedCadences = Array.from(new Set(Array.from(channelCadences.values())));
    if (resolvedCadences.length !== 1 || resolvedCadences[0] === 'mixed') {
      inspection.exclusions.push(finding(1, 'period', 'mixed_cadence', 'All channels must use the same cadence.'));
      return inspectionError(inspection);
    }
    const sourceCadence = resolvedCadences[0];
    const dailyAggregation = sourceCadence === 'daily';
    inspection.cadence = dailyAggregation ? 'weekly' : sourceCadence;
    inspection.cadenceDays = cadenceDays(inspection.cadence);

    const suppliedNow = settings.now && typeof settings.now.getTime === 'function'
      ? settings.now.getTime()
      : NaN;
    const now = Number.isFinite(suppliedNow) ? new Date(suppliedNow) : new Date();
    const currentWeekStart = isoWeekStart(now);
    const currentMonth = now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
    const grouped = new Map();
    validRecords.forEach(function normalizeRecord(record) {
      let periodKey;
      let periodStart;
      if (inspection.cadence === 'monthly') {
        periodKey = record.date.getUTCFullYear() + '-' + String(record.date.getUTCMonth() + 1).padStart(2, '0');
        periodStart = new Date(Date.UTC(record.date.getUTCFullYear(), record.date.getUTCMonth(), 1));
        if (periodKey === currentMonth) {
          inspection.exclusions.push(finding(record.rowNumber, 'period', 'incomplete_period', 'The current month is not complete.'));
          inspection.summary.excludedRows += 1;
          return;
        }
      } else {
        periodStart = isoWeekStart(record.date);
        periodKey = isoWeekKey(periodStart);
        if (periodStart.getTime() === currentWeekStart.getTime()) {
          inspection.exclusions.push(finding(record.rowNumber, 'period', 'incomplete_period', 'The current ISO week is not complete.'));
          inspection.summary.excludedRows += 1;
          return;
        }
      }
      const groupKey = periodKey + '\u0000' + record.channel;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          periodKey: periodKey,
          periodStart: dateText(periodStart),
          cadence: inspection.cadence,
          channel: record.channel,
          spend: 0,
          outcomes: {},
          dimensions: { campaign: [], segment: [] },
          rowNumbers: [],
          distinctDates: new Set(),
          aggregateOverflow: false,
          overflowFields: new Set()
        });
        outcomes.forEach(function initializeOutcome(field) { grouped.get(groupKey).outcomes[field] = 0; });
      }
      const normalized = grouped.get(groupKey);
      normalized.rowNumbers.push(record.rowNumber);
      if (dailyAggregation) normalized.distinctDates.add(dateText(record.date));
      const spendTotal = normalized.spend + record.spend;
      if (Number.isFinite(spendTotal)) {
        normalized.spend = spendTotal;
      } else {
        normalized.aggregateOverflow = true;
        normalized.overflowFields.add('spend');
      }
      outcomes.forEach(function sumOutcome(field) {
        const outcomeTotal = normalized.outcomes[field] + record.outcomes[field];
        if (Number.isFinite(outcomeTotal)) {
          normalized.outcomes[field] = outcomeTotal;
        } else {
          normalized.aggregateOverflow = true;
          normalized.overflowFields.add(field);
        }
      });
      DIMENSION_FIELDS.forEach(function addDimensions(field) {
        record.dimensions[field].forEach(function addDimension(value) {
          if (normalized.dimensions[field].indexOf(value) === -1) normalized.dimensions[field].push(value);
        });
      });
    });
    inspection.rows = Array.from(grouped.values()).flatMap(function completeGroup(normalized) {
      if (normalized.aggregateOverflow) {
        normalized.overflowFields.forEach(function addOverflowFinding(field) {
          inspection.exclusions.push(finding(
            normalized.rowNumbers[0],
            field,
            'aggregate_overflow',
            'Aggregated values must remain finite.'
          ));
        });
        inspection.summary.excludedRows += normalized.rowNumbers.length;
        return [];
      }
      if (dailyAggregation && normalized.distinctDates.size !== 7) {
        inspection.exclusions.push(finding(
          normalized.rowNumbers[0],
          'period',
          'incomplete_period',
          'A daily channel-week needs seven distinct calendar days.'
        ));
        inspection.summary.excludedRows += normalized.rowNumbers.length;
        return [];
      }
      inspection.summary.acceptedRows += normalized.rowNumbers.length;
      return [{
        periodKey: normalized.periodKey,
        periodStart: normalized.periodStart,
        cadence: normalized.cadence,
        channel: normalized.channel,
        spend: normalized.spend,
        outcomes: normalized.outcomes,
        dimensions: normalized.dimensions
      }];
    }).sort(function sortRows(left, right) {
      return left.periodStart.localeCompare(right.periodStart) || left.channel.localeCompare(right.channel);
    });
    inspection.summary.completePeriods = new Set(inspection.rows.map(function period(row) { return row.periodKey; })).size;
    inspection.summary.channels = new Set(inspection.rows.map(function channel(row) { return row.channel; })).size;
    if (inspection.exclusions.some(function invalidRow(item) { return item.code !== 'incomplete_period'; })) {
      return inspectionError(inspection);
    }
    inspection.ok = true;
    inspection.state = 'ready';
    return inspection;
  }

  function escapeCell(value) {
    const source = String(value);
    const text = typeof value === 'string' && /^\s*[=+\-@]/.test(source)
      ? "'" + source
      : source;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function toCleanCsv(history) {
    if (!history || history.ok !== true || history.state !== 'ready'
      || !Array.isArray(history.rows) || !Array.isArray(history.metrics)
      || !history.columnMap) {
      throw new TypeError('Normalized history is required.');
    }
    const metricKeys = history.metrics.map(function metricKey(metric) { return metric.key; });
    const dimensions = DIMENSION_FIELDS.filter(function presentDimension(field) {
      return history.columnMap[field] !== null;
    });
    const columns = ['period', 'channel', 'spend'].concat(metricKeys, dimensions);
    const lines = [columns.join(',')];
    history.rows.forEach(function serializeRow(row) {
      const cells = [row.periodKey, row.channel, row.spend]
        .concat(metricKeys.map(function outcomeValue(key) { return row.outcomes[key]; }))
        .concat(dimensions.map(function dimensionValue(key) { return row.dimensions[key].join(' | '); }));
      lines.push(cells.map(escapeCell).join(','));
    });
    return lines.join('\n');
  }

  root.MangroveHistoryData = {
    inspectHistory: inspectHistory,
    toCleanCsv: toCleanCsv
  };
}(window));
