'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared/history-data.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'shared/marginality-engine.js'), 'utf8'),
  context
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'shared/budget-allocator.js'), 'utf8'),
  context
);
const history = context.window.MangroveHistoryData;
const marginality = context.window.MangroveMarginality;
const allocator = context.window.MangroveBudgetAllocator;

function inspect(text, extraOptions) {
  return history.inspectHistory(text, {
    now: new Date('2026-07-28T12:00:00Z'),
    ...extraOptions
  });
}

test('quoted CSV becomes controlled weekly history', () => {
  const sourceText = [
    'period,channel,spend,conversions,revenue',
    '2026-W02,"Paid, Search",1200,28,5600',
    '2026-W03,"Paid, Search",1500,32,6400'
  ].join('\n');

  const result = history.inspectHistory(sourceText, {
    now: new Date('2026-07-28T12:00:00Z')
  });

  assert.equal(result.ok, true);
  assert.equal(result.cadence, 'weekly');
  assert.equal(result.rows[0].channel, 'Paid, Search');
  assert.deepEqual(result.rows[0].outcomes, {
    conversions: 28,
    revenue: 5600
  });
  assert.equal(result.exclusions.length, 0);
});

test('findings identify location without reproducing raw cells', () => {
  const sourceText = [
    'period,channel,spend,conversions',
    '2026-W02,Paid Search,customer-secret-text,28'
  ].join('\n');

  const result = inspect(sourceText);
  const serialized = JSON.stringify(result.exclusions);

  assert.equal(result.ok, false);
  assert.match(serialized, /rowNumber/);
  assert.doesNotMatch(serialized, /customer-secret-text/);
});

test('parses tab-separated CRLF input and UTF-8 headers', () => {
  const result = inspect([
    'date\tsource\tcost\tleads\tcampaign 名',
    '2026-W02\tSearch\t1200\t28\tBrand',
    '2026-W03\tSearch\t1500\t32\tBrand'
  ].join('\r\n'));

  assert.equal(result.ok, true);
  assert.equal(result.delimiter, '\t');
  assert.deepEqual(result.headers, ['date', 'source', 'cost', 'leads', 'campaign 名']);
  assert.equal(result.rows.length, 2);
});

test('parses escaped quotes and trailing empty fields without shifting columns', () => {
  const result = inspect([
    'period,channel,spend,conversions,campaign',
    '2026-W02,"Paid ""Brand""",1200,28,'
  ].join('\n'));

  assert.equal(result.ok, true);
  assert.equal(result.rows[0].channel, 'Paid "Brand"');
  assert.deepEqual(result.rows[0].dimensions.campaign, []);
});

test('matches aliases independently of the browser locale', () => {
  function inspectInTurkishLikeLocale(moduleSource) {
    const localeContext = { window: {} };
    vm.createContext(localeContext);
    vm.runInContext(`
      String.prototype.toLocaleLowerCase = function toLocaleLowerCase() {
        return String(this).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
      };
    `, localeContext);
    vm.runInContext(moduleSource, localeContext);
    return localeContext.window.MangroveHistoryData.inspectHistory(
      'period,channel,MEDIA_SPEND,conversions\n2026-W02,Search,1200,28',
      { now: new Date('2026-07-28T12:00:00Z') }
    );
  }

  const legacyResult = inspectInTurkishLikeLocale(
    source.replace('.toLowerCase()', '.toLocaleLowerCase()')
  );
  assert.equal(legacyResult.ok, false);

  const result = inspectInTurkishLikeLocale(source);

  assert.equal(result.ok, true);
  assert.equal(result.rows[0].spend, 1200);
});

test('rejects duplicate semantic columns unless a valid explicit mapping resolves them', () => {
  const sourceText = [
    'period,channel,spend,cost,conversions',
    '2026-W02,Search,1200,1200,28'
  ].join('\n');

  const ambiguous = inspect(sourceText);
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.state, 'needs_correction');
  assert.equal(ambiguous.exclusions[0].code, 'ambiguous_column');

  const resolved = inspect(sourceText, { columnMap: { spend: 'spend' } });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.rows[0].spend, 1200);
});

test('rejects missing required columns and invalid explicit mapping headers', () => {
  const missing = inspect('period,channel,conversions\n2026-W02,Search,28');
  assert.equal(missing.ok, false);
  assert.equal(missing.state, 'needs_correction');
  assert.ok(missing.exclusions.some(finding => finding.code === 'missing_column'));

  const invalidOverride = inspect(
    'period,channel,spend,conversions\n2026-W02,Search,1200,28',
    { columnMap: { channel: 'missing source header' } }
  );
  assert.equal(invalidOverride.ok, false);
  assert.ok(invalidOverride.exclusions.some(finding => finding.code === 'missing_column'));
});

test('rejects malformed finite numbers and malformed row shapes', () => {
  const nonFinite = inspect('period,channel,spend,conversions\n2026-W02,Search,Infinity,28');
  assert.equal(nonFinite.ok, false);
  assert.ok(nonFinite.exclusions.some(finding => finding.field === 'spend' && finding.code === 'invalid_number'));

  const malformed = inspect('period,channel,spend,conversions\n2026-W02,Search,1200');
  assert.equal(malformed.ok, false);
  assert.ok(malformed.exclusions.some(finding => finding.code === 'field_count'));
});

test('rejects ambiguous slash dates', () => {
  const result = inspect('period,channel,spend,conversions\n01/02/2026,Search,1200,28');
  assert.equal(result.ok, false);
  assert.ok(result.exclusions.some(finding => finding.field === 'period' && finding.code === 'invalid_period'));
});

test('aggregates seven distinct ISO dates into weekly history with unique dimensions', () => {
  const result = inspect([
    'date,channel,cost,orders,campaign,audience',
    '2026-01-05,Search,40,1,Brand,New',
    '2026-01-05,Search,60,1,Brand,New',
    '2026-01-06,Search,110,3,Brand,New',
    '2026-01-07,Search,20,1,Brand,New',
    '2026-01-08,Search,20,1,Brand,New',
    '2026-01-09,Search,20,1,Brand,New',
    '2026-01-10,Search,20,1,Brand,New',
    '2026-01-11,Search,90,1,Retargeting,Returning'
  ].join('\n'));

  assert.equal(result.ok, true);
  assert.equal(result.cadence, 'weekly');
  assert.equal(result.cadenceDays, 7);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    periodKey: '2026-W02',
    periodStart: '2026-01-05',
    cadence: 'weekly',
    channel: 'Search',
    spend: 380,
    outcomes: { conversions: 10 },
    dimensions: { campaign: ['Brand', 'Retargeting'], segment: ['New', 'Returning'] }
  });
});

test('only seven-distinct-day channel weeks count as complete daily-input periods', () => {
  const start = Date.UTC(2024, 0, 1);
  const full = ['date,channel,spend,conversions'];
  const partial = ['date,channel,spend,conversions'];
  for (let week = 0; week < 12; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start + (week * 7 + day) * 86400000)
        .toISOString()
        .slice(0, 10);
      full.push(`${date},Search,100,10`);
      if (day < 2) partial.push(`${date},Search,100,10`);
    }
  }

  const complete = inspect(full.join('\n'));
  const incomplete = inspect(partial.join('\n'));

  assert.equal(complete.ok, true);
  assert.equal(complete.cadence, 'weekly');
  assert.equal(complete.cadenceDays, 7);
  assert.equal(complete.summary.completePeriods, 12);
  assert.equal(complete.rows.length, 12);
  assert.ok(complete.rows.every(row => row.cadence === 'weekly'));

  assert.equal(incomplete.ok, true);
  assert.equal(incomplete.cadence, 'weekly');
  assert.equal(incomplete.cadenceDays, 7);
  assert.equal(incomplete.summary.completePeriods, 0);
  assert.equal(incomplete.rows.length, 0);
  assert.equal(incomplete.summary.excludedRows, 24);
  assert.equal(
    incomplete.exclusions.filter(item => item.code === 'incomplete_period').length,
    12
  );
});

test('weekly-normalized daily history scales current, preserved, and predicted values once', () => {
  const start = Date.UTC(2024, 0, 1);
  const modeledSpend = [
    700, 840, 980, 1120, 1260, 1400,
    1050, 1190, 1330, 1470, 1610, 1750
  ];
  const lines = ['date,channel,spend,conversions'];
  modeledSpend.forEach((weeklySpend, week) => {
    const weeklyOutcome = 2 * Math.pow(weeklySpend, 0.6);
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start + (week * 7 + day) * 86400000)
        .toISOString()
        .slice(0, 10);
      lines.push(`${date},Search,${weeklySpend / 7},${weeklyOutcome / 7}`);
      lines.push(`${date},Local,50,2`);
    }
  });

  const inspection = inspect(lines.join('\n'));
  const analysis = marginality.analyzeHistory(inspection);
  const model = analysis.models.conversions;
  const plan = allocator.allocatePlan({
    model,
    totalBudget: 4000,
    planDays: 14,
    constraints: {}
  });
  const searchModel = model.channels.find(channel => channel.channel === 'Search');
  const localModel = model.channels.find(channel => channel.channel === 'Local');
  const searchPlan = plan.allocation.find(row => row.channel === 'Search');
  const localPlan = plan.allocation.find(row => row.channel === 'Local');

  assert.equal(inspection.cadence, 'weekly');
  assert.equal(model.cadenceDays, 7);
  assert.equal(plan.horizonFactor, 2);
  assert.equal(searchPlan.currentSpend, searchModel.currentSpendRate * 2);
  assert.equal(localModel.status, 'preserved');
  assert.equal(localPlan.recommendedSpend, localModel.preservedSpendRate * 2);
  assert.ok(Math.abs(
    searchPlan.predictedOutcome
      - marginality.predict(searchModel.curve, searchPlan.recommendedSpendRate) * 2
  ) < 1e-6);
});

test('normalizes weekly and monthly keys with their contract cadence days', () => {
  const weekly = inspect('week,platform,media_spend,sales\n2026-W02,Social,100,500\n2026-W03,Social,200,700');
  assert.equal(weekly.ok, true);
  assert.equal(weekly.cadence, 'weekly');
  assert.equal(weekly.cadenceDays, 7);

  const monthly = inspect('month,platform,media_spend,sales\n2026-01,Social,100,500\n2026-02,Social,200,700');
  assert.equal(monthly.ok, true);
  assert.equal(monthly.cadence, 'monthly');
  assert.equal(monthly.cadenceDays, 365.25 / 12);
  assert.equal(monthly.rows[0].periodStart, '2026-01-01');
});

test('excludes the current complete-period candidate without rejecting older rows', () => {
  const weekly = inspect([
    'period,channel,spend,conversions',
    '2026-W02,Search,100,2',
    '2026-W31,Search,200,4'
  ].join('\n'));
  assert.equal(weekly.ok, true);
  assert.equal(weekly.rows.length, 1);
  assert.equal(weekly.rows[0].periodKey, '2026-W02');
  assert.equal(weekly.exclusions[0].code, 'incomplete_period');

  const monthly = inspect('period,channel,spend,conversions\n2026-06,Search,100,2\n2026-07,Search,200,4');
  assert.equal(monthly.ok, true);
  assert.equal(monthly.rows.length, 1);
  assert.equal(monthly.rows[0].periodKey, '2026-06');
});

test('uses the caller-provided now date across the browser boundary', () => {
  const result = history.inspectHistory([
    'period,channel,spend,conversions',
    '2026-W05,Search,100,2',
    '2026-W06,Search,200,4'
  ].join('\n'), { now: new Date('2026-02-03T12:00:00Z') });

  assert.equal(result.ok, true);
  assert.deepEqual(result.rows.map(row => row.periodKey), ['2026-W05']);
  assert.equal(result.exclusions[0].code, 'incomplete_period');
});

test('rejects mixed channel cadences', () => {
  const result = inspect([
    'period,channel,spend,conversions',
    '2026-W02,Search,100,2',
    '2026-01,Social,100,2'
  ].join('\n'));

  assert.equal(result.ok, false);
  assert.equal(result.state, 'needs_correction');
  assert.ok(result.exclusions.some(finding => finding.code === 'mixed_cadence'));
});

test('requires a financial treatment for financial outcomes', () => {
  const sourceText = 'period,channel,spend,profit\n2026-W02,Search,100,20';
  const unresolved = inspect(sourceText);
  assert.equal(unresolved.ok, false);
  assert.equal(unresolved.state, 'needs_correction');
  assert.ok(unresolved.exclusions.some(finding => finding.code === 'financial_treatment_required'));

  const resolved = inspect(sourceText, { financialTreatment: 'after_marketing' });
  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.metrics, [{
    key: 'financial', label: 'Profit', costTreatment: 'after_marketing'
  }]);
});

test('explicit outcome mapping assigns a non-alias header without guessing semantics', () => {
  const sourceText = [
    'period,channel,spend,purchases',
    '2026-W02,Search,100,4'
  ].join('\n');
  const unresolved = inspect(sourceText);

  assert.equal(unresolved.ok, false);
  assert.equal(unresolved.columnMap.conversions, null);
  assert.equal(unresolved.columnMap.revenue, null);
  assert.equal(unresolved.columnMap.financial, null);
  assert.ok(unresolved.exclusions.some(item => item.code === 'missing_outcome'));

  const asConversions = inspect(sourceText, {
    columnMap: { conversions: 'purchases' }
  });
  const asRevenue = inspect(sourceText, {
    columnMap: { revenue: 'purchases' }
  });

  assert.equal(asConversions.ok, true);
  assert.deepEqual(asConversions.rows[0].outcomes, { conversions: 4 });
  assert.equal(asRevenue.ok, true);
  assert.deepEqual(asRevenue.rows[0].outcomes, { revenue: 4 });
});

test('ambiguous recognized outcome aliases require only their semantic mapping', () => {
  const sourceText = [
    'period,channel,spend,orders,leads',
    '2026-W02,Search,100,4,5'
  ].join('\n');
  const ambiguous = inspect(sourceText);

  assert.equal(ambiguous.ok, false);
  assert.ok(ambiguous.exclusions.some(item => (
    item.field === 'conversions' && item.code === 'ambiguous_column'
  )));
  assert.equal(
    ambiguous.exclusions.some(item => item.code === 'missing_outcome'),
    false
  );

  const resolved = inspect(sourceText, {
    columnMap: { conversions: 'orders' }
  });
  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.rows[0].outcomes, { conversions: 4 });
});

test('financial metrics retain the mapped source identity and still require cost treatment', () => {
  const aliases = [
    ['contribution', 'Contribution'],
    ['gross_profit', 'Gross profit'],
    ['profit', 'Profit']
  ];
  aliases.forEach(([header, label]) => {
    const result = inspect(
      `period,channel,spend,${header}\n2026-W02,Search,100,20`,
      { financialTreatment: 'after_marketing' }
    );
    assert.equal(result.metrics[0].label, label);
  });

  const explicit = inspect(
    'period,channel,spend,gross margin dollars\n2026-W02,Search,100,20',
    {
      columnMap: { financial: 'gross margin dollars' },
      financialTreatment: 'before_marketing'
    }
  );
  const analysis = marginality.analyzeHistory(explicit);

  assert.equal(explicit.ok, true);
  assert.equal(explicit.metrics[0].label, 'gross margin dollars');
  assert.equal(explicit.metrics[0].costTreatment, 'before_marketing');
  assert.equal(analysis.models.contribution.metric.label, 'gross margin dollars');
});

test('prototype-like explicit financial headers remain truthful source labels', () => {
  ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].forEach(header => {
    const result = inspect(
      `period,channel,spend,${header}\n2026-W02,Search,100,20`,
      {
        columnMap: { financial: header },
        financialTreatment: 'after_marketing'
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.metrics[0].label, header);
  });
});

test('duplicate aggregation fails closed before a nonfinite value reaches normalized rows', () => {
  const result = inspect([
    'period,channel,spend,conversions',
    '2026-W02,Search,1e308,10',
    '2026-W02,Search,1e308,10'
  ].join('\n'));

  assert.equal(result.ok, false);
  assert.equal(result.rows.length, 0);
  assert.ok(result.exclusions.some(item => (
    item.field === 'spend' && item.code === 'aggregate_overflow'
  )));
  assert.equal(JSON.stringify(result).includes('Infinity'), false);
  assert.equal(JSON.stringify(result).includes('NaN'), false);
});

test('serializes only normalized accepted columns and dimensions as clean CSV', () => {
  const result = inspect([
    'period,channel,spend,conversions,campaign',
    '2026-W02,"Paid, Search",1200,28,"Brand, Q1"'
  ].join('\n'));

  assert.equal(history.toCleanCsv(result), [
    'period,channel,spend,conversions,campaign',
    '2026-W02,"Paid, Search",1200,28,"Brand, Q1"'
  ].join('\n'));
  assert.throws(() => history.toCleanCsv({}), {
    name: 'TypeError',
    message: 'Normalized history is required.'
  });
});

test('clean CSV neutralizes spreadsheet formulas in every imported string cell', () => {
  const result = inspect([
    'period,channel,spend,conversions,campaign,segment',
    '2026-W02,"=SUM(1,1)",1200,28," +cmd","@owner"',
    '2026-W03,-channel,1300,30,Safe,"  =HYPERLINK(""x"")"'
  ].join('\n'));
  result.rows[0].channel = '  =SUM(1,1)';
  result.rows[0].dimensions.campaign = [' +cmd'];
  result.rows[1].dimensions.segment = ['  =HYPERLINK("x")'];

  assert.equal(history.toCleanCsv(result), [
    'period,channel,spend,conversions,campaign,segment',
    '2026-W02,"\'  =SUM(1,1)",1200,28,\' +cmd,\'@owner',
    '2026-W03,\'-channel,1300,30,Safe,"\'  =HYPERLINK(""x"")"'
  ].join('\n'));
  const displayed = inspect([
    'period,channel,spend,conversions',
    '2026-W02,"=SUM(1,1)",1200,28'
  ].join('\n'));
  assert.equal(displayed.rows[0].channel, '=SUM(1,1)');
});
