/**
 * shared/budget-sample-data.js
 * Deterministic historical example for Budget Advisor.
 */
'use strict';

(function () {
  const periods = [
    '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23',
    '2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23',
    '2026-03-30', '2026-04-06', '2026-04-13', '2026-04-20',
    '2026-04-27', '2026-05-04', '2026-05-11', '2026-05-18'
  ];
  const histories = [
    {
      channel: 'Paid search',
      spend: [2400, 3000, 3500, 2800, 4200, 4600, 3200, 3900, 5000, 2700, 4400, 3600, 4800, 3100, 4100, 4500],
      conversions: [64, 72, 77, 69, 84, 89, 74, 81, 92, 68, 86, 78, 90, 73, 83, 87],
      revenue: [12082, 14210, 15671, 13499, 17787, 19128, 14807, 16922, 20197, 13199, 18394, 16096, 19530, 14511, 17612, 18705]
    },
    {
      channel: 'Paid social',
      spend: [1400, 1900, 2400, 1700, 2800, 3100, 2200, 2600, 3400, 1600, 3000, 2100, 3300, 1800, 2700, 3200],
      conversions: [43, 50, 56, 48, 61, 64, 54, 58, 67, 46, 63, 53, 66, 49, 60, 65],
      revenue: [7170, 8932, 10414, 8238, 11589, 12557, 9858, 11025, 13343, 7919, 12175, 9551, 13002, 8583, 11377, 12750]
    },
    {
      channel: 'Email sponsorships',
      spend: [600, 900, 1200, 750, 1500, 1350, 1000, 1650, 1800, 800, 1400, 1100, 1700, 700, 1300, 1550],
      conversions: [40, 50, 57, 45, 64, 61, 52, 67, 70, 47, 61, 55, 68, 44, 60, 65],
      revenue: [4476, 5861, 6996, 5190, 8079, 7613, 6251, 8613, 9142, 5429, 7733, 6657, 8764, 4968, 7414, 8270]
    },
    {
      channel: 'Local partnerships',
      spend: [900, 905, 895, 910, 900, 905, 895, 910, 900, 905, 895, 910, 900, 905, 895, 910],
      conversions: [32, 32, 31, 32, 31, 32, 31, 32, 32, 32, 31, 32, 31, 32, 31, 32],
      revenue: [3274, 3307, 3249, 3310, 3258, 3300, 3268, 3290, 3274, 3307, 3249, 3310, 3258, 3300, 3268, 3290]
    }
  ];
  const lines = ['period,channel,spend,conversions,revenue'];

  histories.forEach(function addHistory(history) {
    periods.forEach(function addPeriod(period, index) {
      lines.push([
        period,
        history.channel,
        history.spend[index],
        history.conversions[index],
        history.revenue[index]
      ].join(','));
    });
  });

  window.MangroveBudgetSampleData = {
    exampleName: 'Naples service business — 16 weekly periods',
    text: lines.join('\n'),
    totalBudget: 72000,
    planDays: 42,
    expected: {
      channels: 4,
      completePeriods: 16,
      modelableChannels: 3,
      preservedChannels: 1
    }
  };
})();
