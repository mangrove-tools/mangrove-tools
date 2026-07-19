(function () {
  "use strict";

  const REVENUE_SOFT_CAP = 10_000_000;
  const PRICE_SOFT_CAP = 10_000;
  const SUBS_SOFT_CAP = 10_000_000;
  const DEBOUNCE_MS = 150;
  const BAND_FACTOR = 0.15;

  const form = document.getElementById("calc-form");
  const totalRange = document.getElementById("total-range");
  const resultsNote = document.getElementById("results-note");
  const subsValue = document.getElementById("subs-value");
  const netValue = document.getElementById("net-value");
  const runRateValue = document.getElementById("run-rate-value");
  const churnRow = document.getElementById("churn-row");
  const churnValue = document.getElementById("churn-value");
  const beehiivLink = document.getElementById("beehiiv-link");
  const faqBeehiivLink = document.getElementById("faq-beehiiv-link");

  const fieldIds = {
    targetRevenue: "target-revenue",
    monthlyPrice: "monthly-price",
    platformFee: "platform-fee",
    annualShare: "annual-share",
    annualPrice: "annual-price",
    churnRate: "churn-rate",
  };

  let hasCalculated = false;
  let debounceTimer = null;

  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(n)));
  }

  function moneyExact(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Math.max(0, n));
  }

  function subs(n) {
    return Math.max(0, Math.ceil(n)).toLocaleString();
  }

  function parseOptionalNumber(raw) {
    const trimmed = String(raw ?? "").trim();
    if (trimmed === "") return { empty: true, value: null };
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return { empty: false, value: null, invalid: true };
    return { empty: false, value, invalid: false };
  }

  function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}-error`);
    if (!input || !errorEl) return;

    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `${inputId}-error`);
      errorEl.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      errorEl.textContent = "";
    }
  }

  function clearAllErrors() {
    Object.values(fieldIds).forEach((id) => setFieldError(id, ""));
  }

  function readAndValidate(showErrors) {
    const errors = {};
    const targetRaw = parseOptionalNumber(
      document.getElementById(fieldIds.targetRevenue).value
    );
    const monthlyPriceRaw = parseOptionalNumber(
      document.getElementById(fieldIds.monthlyPrice).value
    );
    const platformFeeRaw = parseOptionalNumber(
      document.getElementById(fieldIds.platformFee).value
    );
    const annualShareRaw = parseOptionalNumber(
      document.getElementById(fieldIds.annualShare).value
    );
    const annualPriceRaw = parseOptionalNumber(
      document.getElementById(fieldIds.annualPrice).value
    );
    const churnRaw = parseOptionalNumber(
      document.getElementById(fieldIds.churnRate).value
    );

    let targetRevenue = null;
    if (targetRaw.empty) {
      errors.targetRevenue = "Enter your target monthly revenue.";
    } else if (targetRaw.invalid || targetRaw.value <= 0) {
      errors.targetRevenue = "Target revenue must be greater than zero.";
    } else if (targetRaw.value > REVENUE_SOFT_CAP) {
      errors.targetRevenue = `Use up to ${money(REVENUE_SOFT_CAP)} for a directional estimate.`;
    } else {
      targetRevenue = targetRaw.value;
    }

    let monthlyPrice = null;
    if (monthlyPriceRaw.empty) {
      errors.monthlyPrice = "Enter your monthly subscription price.";
    } else if (monthlyPriceRaw.invalid || monthlyPriceRaw.value <= 0) {
      errors.monthlyPrice = "Monthly price must be greater than zero.";
    } else if (monthlyPriceRaw.value > PRICE_SOFT_CAP) {
      errors.monthlyPrice = `Monthly price must be up to ${money(PRICE_SOFT_CAP)}.`;
    } else {
      monthlyPrice = monthlyPriceRaw.value;
    }

    let platformFee = 10;
    if (platformFeeRaw.empty) {
      platformFee = 10;
    } else if (
      platformFeeRaw.invalid ||
      platformFeeRaw.value < 0 ||
      platformFeeRaw.value >= 100
    ) {
      errors.platformFee = "Platform fee must be between 0 and 99.9%.";
    } else {
      platformFee = platformFeeRaw.value;
    }

    const feeMultiplier = 1 - platformFee / 100;
    if (feeMultiplier <= 0) {
      errors.platformFee = "Platform fee must leave some net revenue per sub.";
    }

    let annualShare = null;
    const annualShareProvided = !annualShareRaw.empty;
    const annualPriceProvided = !annualPriceRaw.empty;

    if (annualShareProvided) {
      if (
        annualShareRaw.invalid ||
        annualShareRaw.value < 0 ||
        annualShareRaw.value > 100
      ) {
        errors.annualShare = "Annual plan share must be between 0 and 100.";
      } else if (annualShareRaw.value > 0 && !annualPriceProvided) {
        errors.annualPrice = "Enter an annual plan price when share is above 0.";
      } else {
        annualShare = annualShareRaw.value;
      }
    }

    let annualPrice = null;
    if (annualPriceProvided) {
      if (annualPriceRaw.invalid || annualPriceRaw.value <= 0) {
        errors.annualPrice = "Annual price must be greater than zero.";
      } else if (annualPriceRaw.value > PRICE_SOFT_CAP * 12) {
        errors.annualPrice = "Annual price looks too high for a directional estimate.";
      } else if (!annualShareProvided || annualShareRaw.value <= 0) {
        errors.annualShare =
          "Enter an annual plan share above 0 when you add an annual price.";
      } else {
        annualPrice = annualPriceRaw.value;
      }
    }

    let churnRate = null;
    if (!churnRaw.empty) {
      if (churnRaw.invalid || churnRaw.value < 0 || churnRaw.value > 100) {
        errors.churnRate = "Churn rate must be between 0 and 100.";
      } else {
        churnRate = churnRaw.value;
      }
    }

    if (showErrors) {
      setFieldError(fieldIds.targetRevenue, errors.targetRevenue || "");
      setFieldError(fieldIds.monthlyPrice, errors.monthlyPrice || "");
      setFieldError(fieldIds.platformFee, errors.platformFee || "");
      setFieldError(fieldIds.annualShare, errors.annualShare || "");
      setFieldError(fieldIds.annualPrice, errors.annualPrice || "");
      setFieldError(fieldIds.churnRate, errors.churnRate || "");
    }

    const valid = Object.keys(errors).length === 0;
    return {
      valid,
      input: valid
        ? {
            targetRevenue,
            monthlyPrice,
            platformFee,
            feeMultiplier,
            annualShare,
            annualPrice,
            churnRate,
          }
        : null,
      directionalLarge:
        valid &&
        targetRevenue !== null &&
        monthlyPrice !== null &&
        targetRevenue / (monthlyPrice * feeMultiplier) >= SUBS_SOFT_CAP,
    };
  }

  /**
   * Inverse paid-sub goal:
   * netMonthly = monthlyPrice * (1 - fee%)
   * netAnnualMonthly = (annualPrice / 12) * (1 - fee%)
   * blendedNet = monthlyShare * netMonthly + annualShare * netAnnualMonthly
   * subs = ceil(target / blendedNet)
   * band = subs * (1 ± 15%)
   * churn replacements = ceil(subs * churn%)
   */
  function calculate(input) {
    const netMonthly = input.monthlyPrice * input.feeMultiplier;
    let blendedNet = netMonthly;
    let usesAnnualMix = false;

    if (
      input.annualShare !== null &&
      input.annualShare > 0 &&
      input.annualPrice !== null
    ) {
      usesAnnualMix = true;
      const monthlyShare = (100 - input.annualShare) / 100;
      const annualShare = input.annualShare / 100;
      const netAnnualMonthly = (input.annualPrice / 12) * input.feeMultiplier;
      blendedNet = monthlyShare * netMonthly + annualShare * netAnnualMonthly;
    }

    const subsNeeded = Math.ceil(input.targetRevenue / blendedNet);
    const low = Math.ceil(subsNeeded * (1 - BAND_FACTOR));
    const high = Math.ceil(subsNeeded * (1 + BAND_FACTOR));
    const annualRunRate = input.targetRevenue * 12;
    const churnReplacements =
      input.churnRate !== null && input.churnRate > 0
        ? Math.ceil(subsNeeded * (input.churnRate / 100))
        : null;

    return {
      subsNeeded,
      low,
      high,
      blendedNet,
      netMonthly,
      annualRunRate,
      churnReplacements,
      usesAnnualMix,
    };
  }

  function render(input, outcome, options) {
    totalRange.textContent = `${subs(outcome.low)} – ${subs(outcome.high)}`;
    subsValue.textContent = subs(outcome.subsNeeded);
    netValue.textContent = moneyExact(outcome.blendedNet);
    runRateValue.textContent = money(outcome.annualRunRate);

    if (outcome.churnReplacements !== null) {
      churnRow.hidden = false;
      churnValue.textContent = subs(outcome.churnReplacements);
    } else {
      churnRow.hidden = true;
      churnValue.textContent = "—";
    }

    let note = `${money(input.targetRevenue)}/mo goal at ${moneyExact(
      input.monthlyPrice
    )}/mo list price · ${input.platformFee}% platform fee · ${moneyExact(
      outcome.blendedNet
    )} net per paying sub`;

    if (outcome.usesAnnualMix) {
      note += ` · ${input.annualShare}% on ${money(input.annualPrice)}/yr annual plan`;
    }

    note += ".";

    if (options && options.directionalLarge) {
      note += " Large subscriber counts are directional — validate with your funnel.";
    }

    resultsNote.textContent = note;

    if (options && options.animate) {
      totalRange.classList.remove("is-pop");
      void totalRange.offsetWidth;
      totalRange.classList.add("is-pop");
    }
  }

  function resetResults() {
    totalRange.textContent = "—";
    subsValue.textContent = "—";
    netValue.textContent = "—";
    runRateValue.textContent = "—";
    churnRow.hidden = true;
    churnValue.textContent = "—";
    resultsNote.textContent =
      "Enter your revenue goal and subscription price, then calculate.";
  }

  function buildAffiliateUrl() {
    const cfg = window.SubTargetConfig || {};
    let url = cfg.AFFILIATE_URL || "https://www.beehiiv.com/";
    if (cfg.UTM && !/[?&]utm_/.test(url)) {
      url += (url.includes("?") ? "&" : "?") + cfg.UTM;
    }
    return url;
  }

  function applyAffiliateLinks() {
    const url = buildAffiliateUrl();
    if (beehiivLink) beehiivLink.href = url;
    if (faqBeehiivLink) faqBeehiivLink.href = url;
  }

  function runCalculation(options) {
    const showErrors = Boolean(options && options.showErrors);
    const animate = Boolean(options && options.animate);
    const result = readAndValidate(showErrors);

    if (!result.valid) {
      if (showErrors || !hasCalculated) {
        resetResults();
      }
      return false;
    }

    clearAllErrors();
    hasCalculated = true;
    render(result.input, calculate(result.input), {
      animate,
      directionalLarge: result.directionalLarge,
    });
    return true;
  }

  function onSubmit(event) {
    event.preventDefault();
    runCalculation({ showErrors: true, animate: true });
  }

  function onInput() {
    if (!hasCalculated) return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      runCalculation({ showErrors: true, animate: false });
    }, DEBOUNCE_MS);
  }

  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);

  applyAffiliateLinks();
  resetResults();
})();
