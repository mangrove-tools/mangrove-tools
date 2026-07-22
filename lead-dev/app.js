(function () {
  "use strict";

  const cfg = window.LeadDevConfig || {};
  const email =
    typeof cfg.CONTACT_EMAIL === "string" && cfg.CONTACT_EMAIL.trim()
      ? cfg.CONTACT_EMAIL.trim()
      : "needlesearchapp@protonmail.com";

  function applyCta(id, url, labelWhenLive) {
    const el = document.getElementById(id);
    if (!el) return;

    const href = typeof url === "string" ? url.trim() : "";
    if (href) {
      el.href = href;
      el.removeAttribute("aria-disabled");
      el.classList.remove("is-disabled");
      el.target = "_blank";
      el.rel = "noopener noreferrer";
      if (labelWhenLive) el.textContent = labelWhenLive;
      return;
    }

    el.href = "#setup-required";
    el.setAttribute("aria-disabled", "true");
    el.classList.add("is-disabled");
    el.removeAttribute("target");
    el.removeAttribute("rel");
  }

  function applyMailtoCta(id, subject, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.href =
      "mailto:" + email + "?subject=" + encodeURIComponent(subject);
    el.removeAttribute("aria-disabled");
    el.classList.remove("is-disabled");
    el.removeAttribute("target");
    el.removeAttribute("rel");
    if (label) el.textContent = label;
  }

  applyCta("cta-kit", cfg.KIT_CHECKOUT_URL, "Buy Lead-Dev Kit");
  applyCta("cta-cohort", cfg.COHORT_SIGNUP_URL, "Get the cohort (self-serve)");
  applyMailtoCta(
    "cta-premium",
    "Full-Stack Lead-Dev Kit inquiry",
    "Email about Full-Stack Kit"
  );

  const emailEl = document.getElementById("lead-dev-email");
  if (emailEl) {
    emailEl.href = "mailto:" + email;
    emailEl.textContent = email;
  }

  const form = document.getElementById("offer-fit-form");
  const result = document.getElementById("offer-fit-result");
  if (!form || !result) return;

  const statusEl = document.getElementById("offer-fit-status");
  const headlineEl = document.getElementById("offer-fit-headline");
  const whyEl = document.getElementById("offer-fit-why");
  const avoidEl = document.getElementById("offer-fit-avoid");
  const ctasEl = document.getElementById("offer-fit-ctas");

  function val(name) {
    const el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function recommend(answers) {
    const { repo, time, help, budget, contract, mess } = answers;

    if (repo === "no" || contract === "no") {
      return {
        status: "Start free",
        statusClass: "is-yellow",
        headline: "Read the method before buying",
        why:
          "Lead-Dev assumes a real product contract and a repo you will touch. Paid offers won't fix \u201cbuild me Uber overnight\u201d prompting.",
        avoid: "Skip Kit, Cohort, and Premium until you want constraints.",
        primary: "method",
      };
    }

    if (budget === "premium") {
      return {
        status: "Primary fit",
        statusClass: "is-green",
        headline: "Full-Stack Lead-Dev Kit",
        why:
          "You want the full Kit plus checklists, rubric, and bonus prompts for your stack.",
        avoid: "Don't skip the free method and constitution first \u2014 the Kit assumes you've read it.",
        primary: "premium",
      };
    }

    if (
      (help === "guided" || mess === "blocked" || mess === "messy") &&
      budget === "cohort" &&
      (time === "mid" || time === "high") &&
      repo !== "no"
    ) {
      return {
        status: "Primary fit",
        statusClass: "is-green",
        headline: "Ship With a Lead-Dev Agent (self-serve cohort)",
        why:
          "You have (or will open) a repo, can put in focused hours, and want phased assignments \u2014 not just a file drop.",
        avoid:
          budget === "kit"
            ? "Kit alone may leave you without a path when the repo fights back."
            : "Premium Kit is available if you want the full stack.",
        primary: "cohort",
      };
    }

    if (help === "install" && budget !== "premium") {
      return {
        status: "Right ladder, wrong tier",
        statusClass: "is-yellow",
        headline:
          budget === "cohort"
            ? "Start with the cohort materials"
            : "Start with the Lead-Dev Kit",
        why:
          "You asked for install-for-me help but your budget doesn't match the Full-Stack Kit band.",
        avoid: "Read the method first.",
        primary: budget === "cohort" ? "cohort" : "kit",
      };
    }

    if (
      time === "low" ||
      help === "templates" ||
      budget === "kit" ||
      mess === "green"
    ) {
      return {
        status: "Primary fit",
        statusClass: "is-green",
        headline: "Lead-Dev Kit",
        why:
          "Templates and a filled AGENTS.md match your time, help preference, or greenfield stage. Self-serve first.",
        avoid:
          "Skip Cohort and Premium until you've adapted a constitution and felt the friction.",
        primary: "kit",
      };
    }

    return {
      status: "Primary fit",
      statusClass: "is-green",
      headline: "Lead-Dev Kit",
      why:
        "Default honest ladder: start with constitution templates, then expand into cohort or Premium if you need more.",
      avoid: "Don't buy Premium without a contract and a repo.",
      primary: "kit",
    };
  }

  function renderCtas(primary) {
    const kitUrl = (cfg.KIT_CHECKOUT_URL || "").trim();
    const cohortUrl = (cfg.COHORT_SIGNUP_URL || "").trim();
    const parts = [];

    if (primary === "method") {
      parts.push('<a class="btn" href="/method/">Read the method</a>');
      parts.push(
        '<a class="text-cta" href="/constitution/">Try Constitution Builder</a>'
      );
    } else if (primary === "kit") {
      if (kitUrl) {
        parts.push(
          '<a class="btn" href="' +
            kitUrl +
            '" target="_blank" rel="noopener noreferrer">Buy Lead-Dev Kit</a>'
        );
      }
      parts.push(
        '<a class="text-cta" href="/constitution/">Build a free starter AGENTS.md</a>'
      );
      parts.push('<a class="text-cta" href="#offers">See all offers</a>');
    } else if (primary === "cohort") {
      if (cohortUrl) {
        parts.push(
          '<a class="btn" href="' +
            cohortUrl +
            '" target="_blank" rel="noopener noreferrer">Get the cohort</a>'
        );
      }
      parts.push('<a class="text-cta" href="/phasegate/">Run Phase Gate first</a>');
      if (kitUrl) {
        parts.push(
          '<a class="text-cta" href="' +
            kitUrl +
            '" target="_blank" rel="noopener noreferrer">Or start with the Kit</a>'
        );
      }
    } else if (primary === "premium") {
      parts.push(
        '<a class="btn" href="mailto:' +
          email +
          "?subject=" +
          encodeURIComponent("Full-Stack Lead-Dev Kit inquiry") +
          '">Email about Full-Stack Kit</a>'
      );
      parts.push(
        '<a class="text-cta" href="/phasegate/">Self-check with Phase Gate</a>'
      );
    }

    ctasEl.innerHTML = parts.join("");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const answers = {
      repo: val("repo"),
      time: val("time"),
      help: val("help"),
      budget: val("budget"),
      contract: val("contract"),
      mess: val("mess"),
    };
    if (
      Object.keys(answers).some(function (k) {
        return !answers[k];
      })
    ) {
      result.hidden = true;
      return;
    }
    const rec = recommend(answers);
    statusEl.textContent = rec.status;
    statusEl.className = "result-status " + rec.statusClass;
    headlineEl.textContent = rec.headline;
    whyEl.textContent = rec.why;
    avoidEl.textContent = rec.avoid;
    renderCtas(rec.primary);
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  form.addEventListener("reset", function () {
    result.hidden = true;
  });
})();
