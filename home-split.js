/*
  home-split.js — Interactive split-screen homepage hero.
  Clicking left/right panel scrolls to that funnel's first content.
  Respects prefers-reduced-motion.
*/
(function () {
  "use strict";

  var panels = document.querySelectorAll(".split-panel");
  var isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  panels.forEach(function (panel) {
    panel.addEventListener("click", function () {
      var target = panel.dataset.goto;
      if (!target) return;

      // Mark chosen panel
      panels.forEach(function (p) { p.classList.remove("is-chosen"); });
      panel.classList.add("is-chosen");

      // Scroll to destination
      var dest = document.querySelector(target);
      if (!dest) return;

      if (isReduced) {
        dest.scrollIntoView();
      } else {
        dest.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    // Keyboard: Enter/Space also triggers
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        panel.click();
      }
    });
  });
})();
