(function () {
  "use strict";

  const SUBSCRIBER_SOFT_CAP = 10_000_000;
  const PAID_PRICE_SOFT_CAP = 10_000;
  const DEBOUNCE_MS = 150;
  const FIELD_ORDER = ["subscribers", "open-rate", "sends", "paid-price"];

  const MODEL = window.MangroveLetterROI || {};
  const NICHE_PRESETS = MODEL.NICHE_PRESETS || {};
  const EXTRAS = window.MangroveToolExtras || {};

  const form = document.getElementById("calc-form");
  const totalRange = document.getElementById("total-range");
  const resultsNote = document.getElementById("results-note");
  const adsValue = document.getElementById("ads-value");
  const sponsorValue = document.getElementById("sponsor-value");
  const paidValue = document.getElementById("paid-value");
  const beehiivLink = document.getElementById("beehiiv-link");
  const faqBeehiivLink = document.getElementById("faq-beehiiv-link");
  const rangeBand = document.getElementById("range-band");
  const nextSteps = document.getElementById("next-steps");
  const copyBtn = document.getElementById("copy-summary");

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

    let sends = null;
    if (sendsRaw.empty) {
      errors.sends = "Enter emails sent per month.";
    } else if (
      sendsRaw.invalid ||
      !isWholeNumber(sendsRaw.value) ||
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
    } else if (paidPriceRaw.value > PAID_PRICE_SOFT_CAP) {
      errors.paidPrice = `Paid tier price must be up to ${money(PAID_PRICE_SOFT_CAP)} for a directional estimate.`;
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

  // Directional model lives in /shared/letterroi-model.js (single source of
  // truth shared with the home hero mini-calc). See /methodology/ for details.
  const calculate = MODEL.calculate;

  let lastResult = null;

  function render(input, outcome, options) {
    lastResult = { input, outcome };
    totalRange.textContent = `${money(outcome.low)} – ${money(outcome.high)}`;
    adsValue.textContent = money(outcome.ads);
    sponsorValue.textContent = money(outcome.sponsor);
    paidValue.textContent = money(outcome.paid);

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

  function resetResults(message) {
    lastResult = null;
    totalRange.textContent = "—";
    adsValue.textContent = "—";
    sponsorValue.textContent = "—";
    paidValue.textContent = "—";
    resultsNote.textContent =
      message || "Enter your list metrics, then calculate.";
    if (EXTRAS.hideRangeBand) EXTRAS.hideRangeBand(rangeBand);
    if (nextSteps) nextSteps.hidden = true;
    if (copyBtn) copyBtn.disabled = true;
  }

  function buildSummary() {
    if (!lastResult) return "";
    const i = lastResult.input;
    const o = lastResult.outcome;
    return (
      `LetterROI — newsletter revenue estimate\n` +
      `${i.subscribers.toLocaleString()} subscribers · ${i.openRate}% open · ` +
      `${i.sends} emails/mo · ${i.niche.label}\n` +
      `Estimated monthly revenue: ${money(o.low)}–${money(o.high)} ` +
      `(midpoint ${money(o.mid)})\n` +
      `Ads ${money(o.ads)} · Sponsorships ${money(o.sponsor)} · Paid subs ${money(
        o.paid
      )}\n` +
      `Directional estimate via https://mangrovetools.com/letterroi/`
    );
  }

  // Deep-link prefill: /letterroi/?subscribers=5000&openRate=38&niche=tech
  function applyQueryPrefill() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    const map = {
      subscribers: "subscribers",
      openRate: "open-rate",
      sends: "sends",
      paidPrice: "paid-price",
    };
    let touched = false;
    Object.keys(map).forEach((key) => {
      if (!params.has(key)) return;
      const el = document.getElementById(map[key]);
      const raw = params.get(key);
      if (el && raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw))) {
        el.value = raw;
        touched = true;
      }
    });
    const nicheParam = params.get("niche");
    if (nicheParam && NICHE_PRESETS[nicheParam]) {
      const nicheEl = document.getElementById("niche");
      if (nicheEl) {
        nicheEl.value = nicheParam;
        touched = true;
      }
    }
    return touched;
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
  resetResults();

  // Prefilled from the home hero (or a shared link) → show the result at once.
  if (applyQueryPrefill()) {
    runCalculation({ showErrors: false, animate: true });
  }
})();
