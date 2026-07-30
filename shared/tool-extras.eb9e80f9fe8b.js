/*
  Shared result helpers: range-band visualization + copy-summary button.
  Progressive enhancement — tools work fine if this fails to load.
*/
(function (root) {
  "use strict";

  var reduceMotion =
    root.matchMedia &&
    root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Draw a low–high range with a midpoint marker.
   * el: container with .range-band-fill, .range-band-mid, .range-band-low,
   *     .range-band-high children.
   * low/high/mid: numbers. format: fn(number) -> string for the labels.
   */
  function renderRangeBand(el, low, high, mid, format) {
    if (!el) return;
    var fill = el.querySelector(".range-band-fill");
    var marker = el.querySelector(".range-band-mid");
    var lowLabel = el.querySelector(".range-band-low");
    var highLabel = el.querySelector(".range-band-high");

    var span = high - low;
    var pct = span > 0 ? ((mid - low) / span) * 100 : 50;
    pct = Math.max(0, Math.min(100, pct));

    if (lowLabel) lowLabel.textContent = format(low);
    if (highLabel) highLabel.textContent = format(high);
    if (marker) marker.style.left = pct.toFixed(1) + "%";

    el.setAttribute(
      "aria-label",
      "Estimated range from " +
        format(low) +
        " to " +
        format(high) +
        ", midpoint " +
        format(mid)
    );
    el.hidden = false;

    if (fill) {
      if (reduceMotion) {
        fill.style.transform = "scaleX(1)";
      } else {
        fill.style.transform = "scaleX(0)";
        // next frame → animate to full
        root.requestAnimationFrame(function () {
          root.requestAnimationFrame(function () {
            fill.style.transform = "scaleX(1)";
          });
        });
      }
    }
  }

  function hideRangeBand(el) {
    if (el) el.hidden = true;
  }

  /**
   * Wire a "Copy summary" button. getSummary() must return a string, or
   * null/"" when there is nothing to copy yet.
   */
  function wireCopyButton(button, getSummary) {
    if (!button) return;
    var resetTimer = null;
    var defaultLabel = button.textContent;

    button.addEventListener("click", function () {
      var text = getSummary();
      if (!text) return;

      var done = function (ok) {
        button.textContent = ok ? "Copied ✓" : "Copy failed";
        button.classList.toggle("is-copied", ok);
        root.clearTimeout(resetTimer);
        resetTimer = root.setTimeout(function () {
          button.textContent = defaultLabel;
          button.classList.remove("is-copied");
        }, 2200);
      };

      if (root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(text).then(
          function () {
            done(true);
          },
          function () {
            done(fallbackCopy(text));
          }
        );
      } else {
        done(fallbackCopy(text));
      }
    });
  }

  function fallbackCopy(text) {
    try {
      var ta = root.document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      root.document.body.appendChild(ta);
      ta.select();
      var ok = root.document.execCommand("copy");
      root.document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  var PRODUCT_EVENT_ALLOWED_PAYLOAD_KEYS = {
    action: true,
    destination: true,
    link: true,
  };

  var ROUTE_TO_TOOL = {
    "/analytics/budget/": "Budget Advisor",
    "/analytics/forecast/": "Revenue Forecaster",
    "/letterroi/": "LetterROI",
    "/sponsorquote/": "SponsorQuote",
    "/subtarget/": "SubTarget",
    "/mediakit/": "Media Kit Generator",
    "/inventory/": "Inventory Planner",
  };

  function currentRoute() {
    var path = root.location && root.location.pathname ? root.location.pathname : "/";
    return path.endsWith("/") ? path : path + "/";
  }

  function currentToolName(route) {
    return ROUTE_TO_TOOL[route] || "Mangrove Tools";
  }

  function safeValue(value) {
    if (typeof value === "string") return value.slice(0, 80);
    if (typeof value === "number" && isFinite(value)) return value;
    if (typeof value === "boolean") return value ? "true" : "false";
    return undefined;
  }

  function safePayload(payload) {
    var route = currentRoute();
    var clean = {
      route: route,
      tool: currentToolName(route),
    };
    Object.keys(payload || {}).forEach(function (key) {
      if (!PRODUCT_EVENT_ALLOWED_PAYLOAD_KEYS[key]) return;
      var value = safeValue(payload[key]);
      if (value !== undefined) clean[key] = value;
    });
    return clean;
  }

  function trackProductEvent(eventName, payload) {
    try {
      if (typeof root.gtag !== "function") return;
      root.gtag("event", eventName, safePayload(payload));
    } catch (err) {
      return;
    }
  }

  function analyticsDestination(anchor) {
    try {
      var url = new URL(anchor.getAttribute("href"), root.location.href);
      var path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
      if (path === "/analytics/budget/" || path === "/analytics/forecast/") {
        return path;
      }
    } catch (err) {
      return "";
    }
    return "";
  }

  function wireProductLinkTracking() {
    if (!root.document || root.document._mangroveProductLinkTracking) return;
    root.document._mangroveProductLinkTracking = true;
    root.document.addEventListener("click", function (event) {
      var anchor = event.target && event.target.closest
        ? event.target.closest("a")
        : null;
      if (!anchor) return;

      var destination = anchor.matches("a.analytics-cta")
        ? analyticsDestination(anchor)
        : "";
      if (destination) {
        trackProductEvent("analytics_cta_clicked", {
          action: "click",
          destination: destination,
          link: "analytics_cta",
        });
      }

      if (anchor.matches('a[rel~="sponsored"]')) {
        trackProductEvent("affiliate_clicked", {
          action: "click",
          destination: "affiliate_partner",
          link: "affiliate",
        });
      }
    });
  }

  wireProductLinkTracking();

  root.MangroveToolExtras = {
    renderRangeBand: renderRangeBand,
    hideRangeBand: hideRangeBand,
    wireCopyButton: wireCopyButton,
    trackProductEvent: trackProductEvent,
  };
})(window);
