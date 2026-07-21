(function () {
  "use strict";

  const SUBSCRIBER_SOFT_CAP = 10_000_000;
  const DEBOUNCE_MS = 150;
  const FIELD_ORDER = ["subscribers", "open-rate", "custom-cpm"];

  const NICHE_PRESETS = {
    finance: { label: "Finance / investing", cpm: 45 },
    tech: { label: "Tech / startups", cpm: 35 },
    health: { label: "Health / wellness", cpm: 28 },
    lifestyle: { label: "Lifestyle / culture", cpm: 22 },
    general: { label: "General interest", cpm: 18 },
  };

  const PLACEMENT = {
    exclusive: {
      label: "Exclusive (sole sponsor)",
      multiplier: 1.2,
      note: "Premium for category exclusivity in the issue.",
    },
    multi: {
      label: "Multi-sponsor",
      multiplier: 0.6,
      note: "Shared attention with other sponsors in the issue.",
    },
  };

  const form = document.getElementById("calc-form");
  const totalRange = document.getElementById("total-range");
  const resultsNote = document.getElementById("results-note");
  const flatValue = document.getElementById("flat-value");
  const cpmValue = document.getElementById("cpm-value");
  const opensValue = document.getElementById("opens-value");
  const beehiivLink = document.getElementById("beehiiv-link");
  const faqBeehiivLink = document.getElementById("faq-beehiiv-link");
  const customCpmField = document.getElementById("custom-cpm-field");
  const rangeBand = document.getElementById("range-band");
  const nextSteps = document.getElementById("next-steps");
  const copyBtn = document.getElementById("copy-summary");
  const EXTRAS = window.MangroveToolExtras || {};
  let lastResult = null;

  const fieldIds = {
    subscribers: "subscribers",
    openRate: "open-rate",
    customCpm: "custom-cpm",
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

  function parseOptionalNumber(raw) {
    const trimmed = String(raw ?? "").trim();
    if (trimmed === "") return { empty: true, value: null };
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return { empty: false, value: null, invalid: true };
    return { empty: false, value, invalid: false };
  }

  function isWholeNumber(value) {
    return Number.isInteger(value);
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

  function focusFirstInvalid() {
    for (const id of FIELD_ORDER) {
      const input = document.getElementById(id);
      if (input && input.getAttribute("aria-invalid") === "true") {
        input.focus();
        return;
      }
    }
  }

  function syncCustomCpmVisibility() {
    const nicheKey = document.getElementById("niche").value;
    const show = nicheKey === "custom";
    customCpmField.hidden = !show;
    if (!show) setFieldError(fieldIds.customCpm, "");
  }

  function readAndValidate(showErrors) {
    const errors = {};
    const subscribersRaw = parseOptionalNumber(
      document.getElementById(fieldIds.subscribers).value
    );
    const openRateRaw = parseOptionalNumber(
      document.getElementById(fieldIds.openRate).value
    );
    const nicheKey = document.getElementById("niche").value;
    const placementKey = document.getElementById("placement").value;
    const placement = PLACEMENT[placementKey] || PLACEMENT.exclusive;

    let subscribers = null;
    if (subscribersRaw.empty) {
      errors.subscribers = "Enter your subscriber count.";
    } else if (
      subscribersRaw.invalid ||
      subscribersRaw.value < 0 ||
      !isWholeNumber(subscribersRaw.value)
    ) {
      errors.subscribers = "Subscribers must be a whole number (0 or more).";
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

    let nicheLabel = "";
    let nicheCpm = null;

    if (nicheKey === "custom") {
      const customRaw = parseOptionalNumber(
        document.getElementById(fieldIds.customCpm).value
      );
      nicheLabel = "Custom niche";
      if (customRaw.empty) {
        errors.customCpm = "Enter a niche CPM.";
      } else if (customRaw.invalid || customRaw.value <= 0 || customRaw.value > 500) {
        errors.customCpm = "CPM must be greater than 0 and up to 500.";
      } else {
        nicheCpm = customRaw.value;
      }
    } else {
      const niche = NICHE_PRESETS[nicheKey] || NICHE_PRESETS.general;
      nicheLabel = niche.label;
      nicheCpm = niche.cpm;
    }

    if (showErrors) {
      setFieldError(fieldIds.subscribers, errors.subscribers || "");
      setFieldError(fieldIds.openRate, errors.openRate || "");
      setFieldError(fieldIds.customCpm, errors.customCpm || "");
    }

    const valid = Object.keys(errors).length === 0;
    return {
      valid,
      input: valid
        ? {
            subscribers,
            openRate,
            nicheLabel,
            nicheCpm,
            placement,
            placementKey,
          }
        : null,
      directionalLarge:
        valid && subscribers !== null && subscribers >= 1_000_000,
    };
  }

  /**
   * Rate-card model (per primary sponsorship slot / issue):
   * opens = subscribers * openRate
   * baseFlat = (opens / 1000) * nicheCpm
   * quoted = baseFlat * placementMultiplier
   * band = quoted * 0.75 .. quoted * 1.35
   * impliedCpm = (quoted / opens) * 1000
   */
  function calculate(input) {
    const opens = input.subscribers * (input.openRate / 100);
    const baseFlat = (opens / 1000) * input.nicheCpm;
    const mid = baseFlat * input.placement.multiplier;
    const low = mid * 0.75;
    const high = mid * 1.35;
    const impliedCpm = opens > 0 ? (mid / opens) * 1000 : 0;

    return { opens, baseFlat, mid, low, high, impliedCpm };
  }

  function render(input, outcome, options) {
    lastResult = { input, outcome };
    totalRange.textContent = `${money(outcome.low)} – ${money(outcome.high)}`;
    flatValue.textContent = money(outcome.mid);
    cpmValue.textContent = moneyExact(outcome.impliedCpm);
    opensValue.textContent = Math.round(outcome.opens).toLocaleString();

    if (EXTRAS.renderRangeBand && rangeBand) {
      EXTRAS.renderRangeBand(
        rangeBand,
        outcome.low,
        outcome.high,
        outcome.mid,
        money
      );
    }
    if (nextSteps) nextSteps.hidden = false;
    if (copyBtn) copyBtn.disabled = false;

    const openRatePct = input.openRate.toFixed(
      Number.isInteger(input.openRate) ? 0 : 1
    );
    let note = `~${Math.round(outcome.opens).toLocaleString()} estimated opens in ${
      input.nicheLabel
    } at ${openRatePct}% open rate · niche CPM $${input.nicheCpm} · ${
      input.placement.label
    }.`;

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

  function resetResults(message) {
    lastResult = null;
    totalRange.textContent = "—";
    flatValue.textContent = "—";
    cpmValue.textContent = "—";
    opensValue.textContent = "—";
    resultsNote.textContent =
      message ||
      "Enter list size, open rate, and niche to build a rate card.";
    if (EXTRAS.hideRangeBand) EXTRAS.hideRangeBand(rangeBand);
    if (nextSteps) nextSteps.hidden = true;
    if (copyBtn) copyBtn.disabled = true;
  }

  function buildSummary() {
    if (!lastResult) return "";
    const i = lastResult.input;
    const o = lastResult.outcome;
    return (
      `SponsorQuote — newsletter sponsorship rate\n` +
      `${i.subscribers.toLocaleString()} subscribers · ${i.openRate}% open · ` +
      `${i.nicheLabel} ($${i.nicheCpm} CPM) · ${i.placement.label}\n` +
      `Suggested flat rate: ${money(o.mid)} (band ${money(o.low)}–${money(
        o.high
      )})\n` +
      `Implied CPM: ${moneyExact(o.impliedCpm)} · ~${Math.round(
        o.opens
      ).toLocaleString()} opens/issue\n` +
      `Directional estimate via https://mangrovetools.com/sponsorquote/`
    );
  }

  function buildAffiliateUrl() {
    const cfg = window.SponsorQuoteConfig || {};
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
        resetResults(
          showErrors
            ? "Fix the highlighted fields, then calculate again."
            : undefined
        );
      }
      if (showErrors) focusFirstInvalid();
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
    syncCustomCpmVisibility();
    if (!hasCalculated) return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      runCalculation({ showErrors: true, animate: false });
    }, DEBOUNCE_MS);
  }

  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);

  if (EXTRAS.wireCopyButton) EXTRAS.wireCopyButton(copyBtn, buildSummary);

  applyAffiliateLinks();
  syncCustomCpmVisibility();
  resetResults();
})();
