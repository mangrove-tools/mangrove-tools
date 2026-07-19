(function () {
  "use strict";

  const SUBSCRIBER_SOFT_CAP = 10_000_000;
  const DEBOUNCE_MS = 150;

  const NICHE_PRESETS = {
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

  const form = document.getElementById("calc-form");
  const totalRange = document.getElementById("total-range");
  const resultsNote = document.getElementById("results-note");
  const adsValue = document.getElementById("ads-value");
  const sponsorValue = document.getElementById("sponsor-value");
  const paidValue = document.getElementById("paid-value");
  const beehiivLink = document.getElementById("beehiiv-link");
  const faqBeehiivLink = document.getElementById("faq-beehiiv-link");

  const fieldIds = {
    subscribers: "subscribers",
    openRate: "open-rate",
    sends: "sends",
    paidPrice: "paid-price",
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
    const subscribersRaw = parseOptionalNumber(
      document.getElementById(fieldIds.subscribers).value
    );
    const openRateRaw = parseOptionalNumber(
      document.getElementById(fieldIds.openRate).value
    );
    const sendsRaw = parseOptionalNumber(
      document.getElementById(fieldIds.sends).value
    );
    const paidPriceRaw = parseOptionalNumber(
      document.getElementById(fieldIds.paidPrice).value
    );
    const nicheKey = document.getElementById("niche").value;
    const niche = NICHE_PRESETS[nicheKey] || NICHE_PRESETS.general;

    let subscribers = null;
    if (subscribersRaw.empty) {
      errors.subscribers = "Enter your subscriber count.";
    } else if (subscribersRaw.invalid || subscribersRaw.value < 0) {
      errors.subscribers = "Subscribers must be zero or a positive number.";
    } else if (subscribersRaw.value > SUBSCRIBER_SOFT_CAP) {
      errors.subscribers = `Use up to ${SUBSCRIBER_SOFT_CAP.toLocaleString()} subscribers for a directional estimate.`;
    } else {
      subscribers = subscribersRaw.value;
    }

    let openRate = null;
    if (openRateRaw.empty) {
      errors.openRate = "Enter an open rate.";
    } else if (
      openRateRaw.invalid ||
      openRateRaw.value < 0 ||
      openRateRaw.value > 100
    ) {
      errors.openRate = "Open rate must be between 0 and 100.";
    } else {
      openRate = openRateRaw.value;
    }

    let sends = null;
    if (sendsRaw.empty) {
      errors.sends = "Enter emails sent per month.";
    } else if (
      sendsRaw.invalid ||
      !Number.isInteger(sendsRaw.value) ||
      sendsRaw.value < 1 ||
      sendsRaw.value > 60
    ) {
      errors.sends = "Emails per month must be a whole number from 1 to 60.";
    } else {
      sends = sendsRaw.value;
    }

    let paidPrice = null;
    if (paidPriceRaw.empty) {
      paidPrice = 0;
    } else if (paidPriceRaw.invalid || paidPriceRaw.value < 0) {
      errors.paidPrice = "Paid tier price must be zero or a positive number.";
    } else {
      paidPrice = paidPriceRaw.value;
    }

    if (showErrors) {
      setFieldError(fieldIds.subscribers, errors.subscribers || "");
      setFieldError(fieldIds.openRate, errors.openRate || "");
      setFieldError(fieldIds.sends, errors.sends || "");
      setFieldError(fieldIds.paidPrice, errors.paidPrice || "");
    }

    const valid = Object.keys(errors).length === 0;
    return {
      valid,
      input: valid
        ? { subscribers, openRate, sends, paidPrice, niche, nicheKey }
        : null,
      directionalLarge:
        valid && subscribers !== null && subscribers >= 1_000_000,
    };
  }

  /**
   * Directional model:
   * - Ads: (opens per month / 1000) * RPM
   * - Sponsorships: ~1 primary sponsor slot every 2 sends at niche CPM
   * - Paid: list * conversion * price (assumes paid tier is live)
   */
  function calculate(input) {
    const opensPerMonth =
      input.subscribers * (input.openRate / 100) * input.sends;

    const ads = (opensPerMonth / 1000) * input.niche.adRpm;

    const sponsorSlots = Math.max(1, Math.floor(input.sends / 2));
    const sponsor =
      (opensPerMonth / input.sends / 1000) *
      input.niche.sponsorCpm *
      sponsorSlots;

    const paid =
      input.subscribers * input.niche.paidConversion * input.paidPrice;

    const low = ads * 0.7 + sponsor * 0.65 + paid * 0.55;
    const high = ads * 1.15 + sponsor * 1.25 + paid * 1.35;
    const mid = ads + sponsor + paid;

    return { ads, sponsor, paid, low, high, mid, opensPerMonth };
  }

  function render(input, outcome, options) {
    totalRange.textContent = `${money(outcome.low)} – ${money(outcome.high)}`;
    adsValue.textContent = money(outcome.ads);
    sponsorValue.textContent = money(outcome.sponsor);
    paidValue.textContent = money(outcome.paid);

    const openRatePct = input.openRate.toFixed(
      Number.isInteger(input.openRate) ? 0 : 1
    );
    let note = `~${Math.round(outcome.opensPerMonth).toLocaleString()} opens/mo in ${
      input.niche.label
    } at ${openRatePct}% open rate. Midpoint ~${money(outcome.mid)}/mo.`;

    if (options && options.directionalLarge) {
      note +=
        " Large-list figures are directional — real rates vary widely.";
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
    adsValue.textContent = "—";
    sponsorValue.textContent = "—";
    paidValue.textContent = "—";
    resultsNote.textContent = "Enter your list metrics, then calculate.";
  }

  function buildAffiliateUrl() {
    const cfg = window.LetterROIConfig || {};
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
