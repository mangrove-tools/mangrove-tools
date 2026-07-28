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
const history = context.window.MangroveHistoryData;

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

test('aggregates ISO dates into complete ISO weeks with unique dimensions', () => {
  const result = inspect([
    'date,channel,cost,orders,campaign,audience',
    '2026-01-05,Search,100,2,Brand,New',
    '2026-01-06,Search,110,3,Brand,New',
    '2026-01-11,Search,90,1,Retargeting,Returning'
  ].join('\n'));

  assert.equal(result.ok, true);
  assert.equal(result.cadence, 'daily');
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    periodKey: '2026-W02',
    periodStart: '2026-01-05',
    cadence: 'daily',
    channel: 'Search',
    spend: 300,
    outcomes: { conversions: 6 },
    dimensions: { campaign: ['Brand', 'Retargeting'], segment: ['New', 'Returning'] }
  });
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
    key: 'financial', label: 'Financial outcome', costTreatment: 'after_marketing'
  }]);
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
