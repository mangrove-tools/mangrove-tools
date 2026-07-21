/*
  Shared LetterROI revenue model — single source of truth.
  Used by /letterroi/ (full calculator) and the home hero mini-calc so
  the same inputs always produce the same number. Pure functions only.
*/
(function (root) {
  "use strict";

  var NICHE_PRESETS = {
    finance: {
      label: "Finance / investing",
      sponsorCpm: 45,
      adRpm: 18,
      paidConversion: 0.025,
    },
    tech: {
      label: "Tech / startups",
      sponsorCpm: 35,
      adRpm: 14,
      paidConversion: 0.02,
    },
    health: {
      label: "Health / wellness",
      sponsorCpm: 28,
      adRpm: 11,
      paidConversion: 0.018,
    },
    lifestyle: {
      label: "Lifestyle / culture",
      sponsorCpm: 22,
      adRpm: 9,
      paidConversion: 0.015,
    },
    general: {
      label: "General interest",
      sponsorCpm: 18,
      adRpm: 7,
      paidConversion: 0.012,
    },
  };

  /**
   * Directional model (see /methodology/ for the plain-language version):
   * - Ads: (opens per month / 1000) * niche RPM
   * - Sponsorships: ~1 primary slot every 2 sends at niche CPM
   * - Paid: list * niche conversion * monthly price (assumes paid tier is live)
   */
  function calculate(input) {
    var opensPerMonth =
      input.subscribers * (input.openRate / 100) * input.sends;

    var ads = (opensPerMonth / 1000) * input.niche.adRpm;

    var sponsorSlots = Math.max(1, Math.floor(input.sends / 2));
    var sponsor =
      (opensPerMonth / input.sends / 1000) *
      input.niche.sponsorCpm *
      sponsorSlots;

    var paid = input.subscribers * input.niche.paidConversion * input.paidPrice;

    var low = ads * 0.7 + sponsor * 0.65 + paid * 0.55;
    var high = ads * 1.15 + sponsor * 1.25 + paid * 1.35;
    var mid = ads + sponsor + paid;

    return {
      ads: ads,
      sponsor: sponsor,
      paid: paid,
      low: low,
      high: high,
      mid: mid,
      opensPerMonth: opensPerMonth,
    };
  }

  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(n)));
  }

  root.MangroveLetterROI = {
    NICHE_PRESETS: NICHE_PRESETS,
    calculate: calculate,
    money: money,
  };
})(window);
