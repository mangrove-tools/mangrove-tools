(function () {
  const steps = Array.prototype.slice.call(document.querySelectorAll(".studio-step"));
  const progress = Array.prototype.slice.call(document.querySelectorAll(".studio-progress li"));
  const result = document.getElementById("constitution-result");
  const preview = document.getElementById("agents-preview");
  const briefPreview = document.getElementById("brief-preview");
  let step = 0;
  const state = {
    product: "",
    url: "",
    stack: "static-netlify",
    model: "affiliate-tools",
    audience: "",
    constraints: [],
    gates: [],
  };

  function showStep(i) {
    step = i;
    steps.forEach(function (el, idx) {
      el.classList.toggle("is-active", idx === i);
    });
    progress.forEach(function (el, idx) {
      el.classList.toggle("is-current", idx === i);
      el.classList.toggle("is-done", idx < i);
    });
  }

  function checkedValues(name) {
    return Array.prototype.map
      .call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (el) {
        return el.value;
      });
  }

  function readBasics() {
    state.product = (document.getElementById("product-name").value || "").trim();
    state.url = (document.getElementById("live-url").value || "").trim();
    state.audience = (document.getElementById("audience").value || "").trim();
    const stack = document.querySelector('input[name="stack"]:checked');
    const model = document.querySelector('input[name="model"]:checked');
    state.stack = stack ? stack.value : "static-netlify";
    state.model = model ? model.value : "affiliate-tools";
  }

  function stackLabel(s) {
    return (
      {
        "static-netlify": "Static HTML/CSS/vanilla JS on Netlify",
        "ios-swiftui": "iOS SwiftUI",
        nextjs: "Next.js App Router",
        fastapi: "Python FastAPI",
        other: "Custom stack (describe in session briefs)",
      }[s] || s
    );
  }

  function modelLabel(m) {
    return (
      {
        "affiliate-tools": "Niche affiliate + free utility collection",
        "app-store": "App Store / one-time or subscription app",
        saas: "Account-based product (only if owner-approved)",
        other: "Owner-defined business model",
      }[m] || m
    );
  }

  function buildAgentsMd() {
    const constraints =
      state.constraints.length > 0
        ? state.constraints.map(function (c) { return "- " + c; }).join("\n")
        : "- (add product-specific constraints)";
    const gates =
      state.gates.length > 0
        ? state.gates.map(function (g) { return "- " + g; }).join("\n")
        : "- Production deploy / live payments / affiliate ID changes";

    return (
      "# " +
      (state.product || "Product") +
      " — Lead Developer Instructions\n\n" +
      (state.url ? "**Live site:** " + state.url + "  \n" : "") +
      "**Audience:** " +
      (state.audience || "(describe who this is for)") +
      "\n\n" +
      "You are the **lead developer**. Decide, execute, report. Obey this file.\n\n" +
      "## Priority order (strict)\n" +
      "1. **Optimize** existing product (bugs, config, mobile, truth in metadata)\n" +
      "2. **Professional / modern / easy** UX within brand\n" +
      "3. **Top-tier SEO / store discovery** on existing surfaces\n" +
      "4. **Expand** only after 1–3 are green (one niche bet at a time)\n\n" +
      "## Business model\n" +
      modelLabel(state.model) +
      "\n\n" +
      "## Stack\n" +
      stackLabel(state.stack) +
      "\n\n" +
      "## Product contract\n" +
      constraints +
      "\n\n" +
      "## Do not change without approval\n" +
      gates +
      "\n\n" +
      "## Definition of Done\n" +
      "- Work followed priority order (or owner waived earlier phase)\n" +
      "- Existing journeys still work\n" +
      "- SEO/store artifacts accurate for touched routes\n" +
      "- Accessibility and responsive basics considered\n" +
      "- Manual verification reported; remaining risks listed\n"
    );
  }

  function buildBrief() {
    return (
      "# Session brief — " +
      (state.product || "Product") +
      "\n\n" +
      "## Goal\n" +
      "Ship the next Phase-appropriate slice. Do not invent Phase 4 expansion before Phases 1–3 are green.\n\n" +
      "## Context\n" +
      "- Stack: " +
      stackLabel(state.stack) +
      "\n" +
      "- Model: " +
      modelLabel(state.model) +
      "\n" +
      (state.url ? "- Live: " + state.url + "\n" : "") +
      "- Audience: " +
      (state.audience || "(fill in)") +
      "\n\n" +
      "## This session\n" +
      "1. Read AGENTS.md\n" +
      "2. Identify the highest-priority broken or incomplete item\n" +
      "3. Implement only that slice\n" +
      "4. Report what shipped, what was deferred, and residual risk\n\n" +
      "## Non-goals this session\n" +
      "- New analytics SDKs (unless already approved)\n" +
      "- Live payment activation without owner approval\n" +
      "- Rebrand / backend / account systems without approval\n"
    );
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("to-step-2").addEventListener("click", function () {
    readBasics();
    const err = document.getElementById("basics-error");
    if (!state.product) {
      err.hidden = false;
      err.textContent = "Add a product name to continue.";
      return;
    }
    err.hidden = true;
    showStep(1);
  });

  document.getElementById("back-to-1").addEventListener("click", function () {
    showStep(0);
  });

  document.getElementById("to-step-3").addEventListener("click", function () {
    state.constraints = checkedValues("constraint");
    state.gates = checkedValues("gate");
    showStep(2);
  });

  document.getElementById("back-to-2").addEventListener("click", function () {
    showStep(1);
  });

  document.getElementById("generate").addEventListener("click", function () {
    readBasics();
    state.constraints = checkedValues("constraint");
    state.gates = checkedValues("gate");
    const agents = buildAgentsMd();
    const brief = buildBrief();
    preview.textContent = agents;
    briefPreview.textContent = brief;
    result.hidden = false;
    showStep(3);
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  document.getElementById("download-agents").addEventListener("click", function () {
    download("AGENTS.md", buildAgentsMd());
  });

  document.getElementById("download-brief").addEventListener("click", function () {
    download("SESSION_BRIEF.md", buildBrief());
  });

  showStep(0);
})();
