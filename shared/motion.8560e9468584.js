/*
  Purposeful motion for analytical sequence and fresh result states.
  Progressive enhancement: every page remains complete without this helper.
*/
(function (root) {
  "use strict";

  var document = root.document;
  var resultSequence = 0;

  function prefersReducedMotion() {
    return Boolean(
      root.matchMedia &&
        root.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function initInstrumentFocus(instrument) {
    if (
      !instrument ||
      !instrument.dataset ||
      typeof instrument.querySelectorAll !== "function" ||
      instrument.dataset.focusController === "ready"
    ) {
      return;
    }

    var targets;
    try {
      targets = instrument.querySelectorAll("[data-instrument-focus]");
    } catch (_error) {
      return;
    }
    if (!targets || !targets.length) return;

    var selectedState = "";

    function showState(state) {
      if (state) {
        instrument.dataset.focusState = state;
      } else {
        delete instrument.dataset.focusState;
      }
    }

    function clearSelection() {
      selectedState = "";
      showState("");
    }

    function stateFor(target) {
      return target && target.dataset
        ? target.dataset.instrumentFocus || ""
        : "";
    }

    for (var index = 0; index < targets.length; index += 1) {
      var target = targets[index];
      if (!target || typeof target.addEventListener !== "function") continue;

      target.addEventListener("pointerenter", function (event) {
        showState(stateFor(event.currentTarget));
      });
      target.addEventListener("pointerleave", function () {
        showState(selectedState);
      });
      target.addEventListener("focus", function (event) {
        showState(stateFor(event.currentTarget));
      });
      target.addEventListener("blur", function () {
        showState(selectedState);
      });
      target.addEventListener("click", function (event) {
        selectedState = stateFor(event.currentTarget);
        showState(selectedState);
      });
    }

    if (typeof instrument.addEventListener === "function") {
      instrument.addEventListener("pointerleave", clearSelection);
      instrument.addEventListener("focusout", function (event) {
        if (
          event.relatedTarget &&
          typeof instrument.contains === "function" &&
          instrument.contains(event.relatedTarget)
        ) {
          return;
        }
        clearSelection();
      });
      instrument.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        clearSelection();
      });
    }

    instrument.dataset.focusController = "ready";
  }

  function initDecisionInstrument(instrument) {
    instrument =
      instrument ||
      (document && document.querySelector
        ? document.querySelector("[data-decision-instrument]")
        : null);
    if (!instrument) return;

    initInstrumentFocus(instrument);

    if (prefersReducedMotion()) {
      instrument.dataset.motion = "reduced";
      return;
    }

    if (typeof root.requestAnimationFrame !== "function") {
      instrument.dataset.motion = "static";
      return;
    }

    instrument.dataset.motion = "ready";
    root.requestAnimationFrame(function () {
      root.requestAnimationFrame(function () {
        instrument.dataset.motion = "active";
      });
    });
  }

  function initDecisionStory(story) {
    story =
      story ||
      (document && document.querySelector
        ? document.querySelector("[data-decision-story]")
        : null);
    if (!story) return;

    if (prefersReducedMotion()) {
      story.dataset.motion = "reduced";
      return;
    }

    if (typeof root.IntersectionObserver !== "function") {
      story.dataset.motion = "static";
      return;
    }

    var observer;
    try {
      observer = new root.IntersectionObserver(
        function (entries) {
          for (var index = 0; index < entries.length; index += 1) {
            var entry = entries[index];
            if (entry.target === story && entry.isIntersecting) {
              story.dataset.motion = "active";
              observer.disconnect();
              break;
            }
          }
        },
        {
          threshold: 0.2,
          rootMargin: "0px 0px -8% 0px",
        }
      );
    } catch (_error) {
      story.dataset.motion = "static";
      return;
    }

    try {
      story.dataset.motion = "ready";
      observer.observe(story);
    } catch (_error) {
      observer.disconnect();
      story.dataset.motion = "static";
    }
  }

  function revealResult(result) {
    if (!result) return;

    resultSequence += 1;
    var sequence = String(resultSequence);
    result.dataset.resultMotionSequence = sequence;

    if (
      prefersReducedMotion() ||
      typeof root.requestAnimationFrame !== "function"
    ) {
      result.dataset.resultState = "ready";
      return;
    }

    result.dataset.resultState = "updating";
    root.requestAnimationFrame(function () {
      root.requestAnimationFrame(function () {
        if (result.dataset.resultMotionSequence === sequence) {
          result.dataset.resultState = "ready";
        }
      });
    });
  }

  function resetResult(result) {
    if (!result) return;

    resultSequence += 1;
    result.dataset.resultMotionSequence = String(resultSequence);
    delete result.dataset.resultState;
  }

  root.MangroveMotion = {
    initDecisionInstrument: initDecisionInstrument,
    initDecisionStory: initDecisionStory,
    revealResult: revealResult,
    resetResult: resetResult,
  };

  if (document) {
    if (document.readyState === "loading" && document.addEventListener) {
      document.addEventListener("DOMContentLoaded", function () {
        initDecisionInstrument();
        initDecisionStory();
      });
    } else {
      initDecisionInstrument();
      initDecisionStory();
    }
  }
})(window);
