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

  root.MangroveToolExtras = {
    renderRangeBand: renderRangeBand,
    hideRangeBand: hideRangeBand,
    wireCopyButton: wireCopyButton,
  };
})(window);
