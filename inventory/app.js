(function () {
  const cfg = window.InventoryConfig || {};
  const form = document.getElementById("inventory-form");
  const result = document.getElementById("inventory-result");
  const affiliate = document.getElementById("affiliate-cta");
  const EXTRAS = window.MangroveToolExtras || {};

  function trackEvent(eventName, action) {
    if (!EXTRAS.trackProductEvent) return;
    EXTRAS.trackProductEvent(eventName, {
      route: "/inventory/",
      tool: "Inventory Planner",
      action: action,
    });
  }

  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  }

  function num(id) {
    const v = parseFloat(document.getElementById(id).value);
    return isFinite(v) ? v : NaN;
  }

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    trackEvent("tool_started", "submit");
    const issues = num("issues-month");
    const slots = num("slots-issue");
    const fill = clamp(num("fill-rate"), 0, 100) / 100;
    const exclusiveShare = clamp(num("exclusive-share"), 0, 100) / 100;
    const primaryRate = num("primary-rate");
    const exclusivePremium = clamp(num("exclusive-premium"), 0, 200) / 100;
    const horizon = Math.max(1, Math.round(num("horizon") || 3));
    const err = document.getElementById("inv-error");

    if (
      !isFinite(issues) ||
      issues <= 0 ||
      !isFinite(slots) ||
      slots <= 0 ||
      !isFinite(primaryRate) ||
      primaryRate <= 0
    ) {
      err.hidden = false;
      err.textContent = "Need issues/month, slots/issue, and a primary rate.";
      result.hidden = true;
      affiliate.hidden = true;
      return;
    }
    err.hidden = true;

    const capacityMonth = issues * slots;
    const bookedSlots = capacityMonth * fill;
    const openSlots = Math.max(0, capacityMonth - bookedSlots);
    const exclusiveSlots = bookedSlots * exclusiveShare;
    const standardSlots = bookedSlots - exclusiveSlots;
    const exclusiveRate = primaryRate * (1 + exclusivePremium);
    const bookedRevenue =
      standardSlots * primaryRate + exclusiveSlots * exclusiveRate;
    const openRevenueAtRate = openSlots * primaryRate;
    const capacityHorizon = capacityMonth * horizon;
    const bookedHorizon = bookedSlots * horizon;
    const revenueHorizon = bookedRevenue * horizon;

    // Sold-out estimate: months until open inventory is absorbed if fill → 100% at current pace of new bookings.
    // Simple model: remaining open slots / (capacity * (1 - fill)) incremental — if fill already 100%, sold out now.
    let soldOutLabel = "Already at full fill in the model";
    if (fill < 1 && openSlots > 0) {
      const absorbPerMonth = capacityMonth * (1 - fill);
      const monthsToSell = openSlots / absorbPerMonth;
      soldOutLabel =
        monthsToSell < 0.15
          ? "Within ~1 week at current fill trajectory"
          : "~" + monthsToSell.toFixed(1) + " months to full fill (directional)";
    } else if (fill >= 1) {
      soldOutLabel = "Modeled as sold out this month";
    }

    document.getElementById("m-capacity").textContent = capacityMonth.toFixed(1);
    document.getElementById("m-booked").textContent = bookedSlots.toFixed(1);
    document.getElementById("m-open").textContent = openSlots.toFixed(1);
    document.getElementById("m-revenue").textContent = money(bookedRevenue);
    document.getElementById("m-open-rev").textContent = money(openRevenueAtRate);
    document.getElementById("m-horizon-rev").textContent = money(revenueHorizon);
    document.getElementById("m-horizon-slots").textContent =
      bookedHorizon.toFixed(1) + " / " + capacityHorizon.toFixed(1);
    document.getElementById("m-soldout").textContent = soldOutLabel;
    document.getElementById("m-exclusive").textContent =
      exclusiveSlots.toFixed(1) + " @ " + money(exclusiveRate);

    result.hidden = false;
    affiliate.hidden = false;
    trackEvent("calculation_completed", "submit");

    const base = (cfg.AFFILIATE_URL || "").trim();
    const utm = (cfg.UTM || "").trim();
    const a = document.getElementById("affiliate-link");
    if (a && base) {
      a.href = base + (base.indexOf("?") >= 0 ? "&" : "?") + utm;
    }
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  form.addEventListener("reset", function () {
    result.hidden = true;
    affiliate.hidden = true;
  });
})();
