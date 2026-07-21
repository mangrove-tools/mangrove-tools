/*
  Home hero live mini-calc. Reuses the shared LetterROI model so the number
  here matches /letterroi/ for the same inputs, and deep-links into the full
  calculator carrying the current values.
*/
(function () {
  "use strict";

  var MODEL = window.MangroveLetterROI;
  if (!MODEL) return;
  var EXTRAS = window.MangroveToolExtras || {};

  // Same defaults the full calculator ships with, so the deep-linked result
  // matches what the hero shows.
  var SENDS_ASSUMED = 8;
  var PAID_PRICE_ASSUMED = 10;
  var DEBOUNCE_MS = 150;

  var form = document.getElementById("home-calc");
  if (!form) return;

  var subsEl = document.getElementById("home-subscribers");
  var openEl = document.getElementById("home-open-rate");
  var nicheEl = document.getElementById("home-niche");
  var totalEl = document.getElementById("home-total");
  var adsEl = document.getElementById("home-ads");
  var sponsorEl = document.getElementById("home-sponsor");
  var paidEl = document.getElementById("home-paid");
  var band = document.getElementById("home-range-band");
  var fullLink = document.getElementById("home-full-link");
  var money = MODEL.money;
  var debounceTimer = null;

  function clampNum(raw, min, max, fallback) {
    var v = Number(String(raw == null ? "" : raw).trim());
    if (!isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  }

  function compute() {
    var subscribers = clampNum(subsEl.value, 0, 10000000, 0);
    var openRate = clampNum(openEl.value, 0, 100, 0);
    var nicheKey = nicheEl.value;
    var niche = MODEL.NICHE_PRESETS[nicheKey] || MODEL.NICHE_PRESETS.general;

    var out = MODEL.calculate({
      subscribers: subscribers,
      openRate: openRate,
      sends: SENDS_ASSUMED,
      paidPrice: PAID_PRICE_ASSUMED,
      niche: niche,
    });

    totalEl.innerHTML =
      money(out.low) + " – " + money(out.high) + "<span>/mo</span>";
    adsEl.textContent = money(out.ads);
    sponsorEl.textContent = money(out.sponsor);
    paidEl.textContent = money(out.paid);

    if (EXTRAS.renderRangeBand) {
      EXTRAS.renderRangeBand(band, out.low, out.high, out.mid, money);
    }

    var params = new URLSearchParams({
      subscribers: String(subscribers),
      openRate: String(openRate),
      niche: nicheKey,
    });
    fullLink.href = "/letterroi/?" + params.toString();
  }

  form.addEventListener("input", function () {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(compute, DEBOUNCE_MS);
  });
  form.addEventListener("change", compute);

  compute();
})();
