/**
 * shared/budget-sample-data.js
 * Realistic first-run example for Budget Advisor.
 */
'use strict';

(function () {
  const sample = {
    exampleName: 'Naples small-business marketing budget',
    period: 'monthly',
    targetMetric: 'conversions',
    totalBudget: 12000,
    channels: [
      {
        channel: 'Google Ads',
        spend: 4200,
        conversions: 126,
        months: 3,
        minSpend: 2500,
        dataPoints: [
          { spend: 3200, conversions: 104 },
          { spend: 3800, conversions: 119 },
          { spend: 4200, conversions: 126 }
        ]
      },
      {
        channel: 'Meta Ads',
        spend: 2800,
        conversions: 76,
        months: 3,
        minSpend: 1200,
        dataPoints: [
          { spend: 2100, conversions: 64 },
          { spend: 2600, conversions: 73 },
          { spend: 2800, conversions: 76 }
        ]
      },
      {
        channel: 'Email / Newsletter',
        spend: 1100,
        conversions: 58,
        months: 3,
        minSpend: 700,
        dataPoints: [
          { spend: 850, conversions: 48 },
          { spend: 1000, conversions: 54 },
          { spend: 1100, conversions: 58 }
        ]
      },
      {
        channel: 'SEO / Organic',
        spend: 1900,
        conversions: 70,
        months: 3,
        minSpend: 1200,
        dataPoints: [
          { spend: 1400, conversions: 55 },
          { spend: 1700, conversions: 64 },
          { spend: 1900, conversions: 70 }
        ]
      }
    ]
  };

  window.MangroveBudgetSampleData = sample;
})();
