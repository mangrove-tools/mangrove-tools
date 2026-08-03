(function () {
  const cfg = window.MediaKitConfig || {};
  const form = document.getElementById("mediakit-form");
  const out = document.getElementById("kit-out");
  const affiliate = document.getElementById("affiliate-cta");
  const copyRates = document.getElementById("copy-rates");
  const EXTRAS = window.MangroveToolExtras || {};

  function trackEvent(eventName, action) {
    if (!EXTRAS.trackProductEvent) return;
    EXTRAS.trackProductEvent(eventName, {
      route: "/mediakit/",
      tool: "Media Kit Generator",
      action: action,
    });
  }

  function money(n) {
    if (!isFinite(n)) return "—";
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

  function impliedCpm(list, openPct, flat) {
    const opens = list * (openPct / 100);
    if (!opens) return NaN;
    return (flat / opens) * 1000;
  }

  function render() {
    const name = (document.getElementById("pub-name").value || "").trim();
    const tagline = (document.getElementById("tagline").value || "").trim();
    const niche = (document.getElementById("niche").value || "").trim();
    const contact = (document.getElementById("contact").value || "").trim();
    const list = num("list-size");
    const openPct = num("open-rate");
    const primary = num("rate-primary");
    const secondary = num("rate-secondary");
    const placements = (document.getElementById("placements").value || "")
      .split("\n")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    const err = document.getElementById("mk-error");
    if (!name || !isFinite(list) || list <= 0 || !isFinite(openPct) || !isFinite(primary) || primary <= 0) {
      err.hidden = false;
      err.textContent = "Need publication name, list size, open rate, and a primary rate.";
      out.hidden = true;
      affiliate.hidden = true;
      if (copyRates) copyRates.disabled = true;
      return;
    }
    err.hidden = true;

    const cpm = impliedCpm(list, openPct, primary);
    const bandLow = primary * 0.85;
    const bandHigh = primary * 1.15;

    document.getElementById("kit-name").textContent = name;
    document.getElementById("kit-tag").textContent = tagline || niche || "Newsletter media kit";
    document.getElementById("kit-list").textContent = Math.round(list).toLocaleString("en-US");
    document.getElementById("kit-open").textContent = openPct.toFixed(1) + "%";
    document.getElementById("kit-niche").textContent = niche || "—";
    document.getElementById("kit-primary").textContent = money(primary);
    document.getElementById("kit-band").textContent = money(bandLow) + " – " + money(bandHigh);
    document.getElementById("kit-cpm").textContent = isFinite(cpm) ? "$" + cpm.toFixed(2) + " implied CPM" : "—";
    document.getElementById("kit-secondary").textContent = isFinite(secondary) && secondary > 0 ? money(secondary) : "—";
    document.getElementById("kit-contact").textContent = contact || "—";

    const ul = document.getElementById("kit-placements");
    const items = (placements.length ? placements : ["Primary sponsorship", "Secondary / classified"]);
    ul.replaceChildren(...items.map(function (p) {
      const li = document.createElement("li");
      li.textContent = p;
      return li;
    }));

    out.hidden = false;
    affiliate.hidden = false;
    if (copyRates) copyRates.disabled = false;

    const base = (cfg.AFFILIATE_URL || "").trim();
    const utm = (cfg.UTM || "").trim();
    const a = document.getElementById("affiliate-link");
    if (a && base) {
      a.href = base + (base.indexOf("?") >= 0 ? "&" : "?") + utm;
    }
  }

  function buildRateSummary() {
    if (out.hidden) return null;
    const name = document.getElementById("kit-name").textContent;
    const primary = document.getElementById("kit-primary").textContent;
    const band = document.getElementById("kit-band").textContent;
    const cpm = document.getElementById("kit-cpm").textContent;
    if (!name || !primary || !band || !cpm) return null;
    return name + " media kit\nPrimary: " + primary + "\nBand: " + band + "\n" + cpm;
  }

  if (copyRates) {
    copyRates.disabled = true;
    if (EXTRAS.wireCopyButton) {
      EXTRAS.wireCopyButton(copyRates, buildRateSummary);
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    trackEvent("tool_started", "submit");
    render();
    if (!out.hidden) trackEvent("calculation_completed", "submit");
  });

  document.getElementById("print-kit").addEventListener("click", function () {
    window.print();
  });
})();
