(function () {
  const form = document.getElementById("nichegate-form");
  const result = document.getElementById("nichegate-result");
  const phaseReady = document.getElementById("phase-ready");

  function idea(n) {
    return {
      name: (form.elements["name" + n].value || "").trim(),
      keyword: (form.elements["keyword" + n].value || "").trim(),
      unique: (form.elements["unique" + n].value || "").trim(),
      io: (form.elements["io" + n].value || "").trim(),
      money: form.elements["money" + n].value,
      clone: form.elements["clone" + n].value,
      phaseOk: form.elements["phase" + n].value,
    };
  }

  function score(idea) {
    const kills = [];
    let points = 0;

    if (!idea.name || !idea.keyword) {
      kills.push("Missing name or primary keyword");
    } else {
      points += 1;
    }

    if (!idea.unique || idea.unique.length < 24) {
      kills.push("Uniqueness note too thin — explain why a 10-minute clone fails");
    } else {
      points += 1;
    }

    if (!idea.io || idea.io.length < 16) {
      kills.push("Inputs → outputs not specified");
    } else {
      points += 1;
    }

    if (idea.clone === "easy") {
      kills.push("Clone-hardness: easy for a generic AI site or platform blog");
    } else if (idea.clone === "medium") {
      points += 0.5;
    } else if (idea.clone === "hard") {
      points += 1.5;
    } else {
      kills.push("Clone-hardness not set");
    }

    if (idea.money === "none-fit") {
      kills.push("No monetization path that fits Mangrove (affiliate soft CTA or Lead-Dev)");
    } else if (idea.money === "affiliate" || idea.money === "lead-dev" || idea.money === "both") {
      points += 1;
    } else {
      kills.push("Monetization path not set");
    }

    if (idea.phaseOk === "no") {
      kills.push("Phases 1–3 not green — ship fixes before expansion");
    } else if (idea.phaseOk === "yes") {
      points += 1;
    } else {
      kills.push("Phase readiness not set");
    }

    const thinPatterns = /churn|ltv|open.?rate|meta tag|schema gen|prompt pack|cpm calculator/i;
    const blob = [idea.name, idea.keyword, idea.unique, idea.io].join(" ");
    if (thinPatterns.test(blob)) {
      kills.push("Matches a rejected thin pattern (churn/LTV/SEO gen/prompt pack/clone calculator)");
    }

    const pass = kills.length === 0 && points >= 5;
    return { idea: idea, points: points, kills: kills, pass: pass };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (phaseReady.value === "no") {
      result.hidden = false;
      document.getElementById("ng-status").textContent = "Gate closed";
      document.getElementById("ng-status").className = "result-status is-red";
      document.getElementById("ng-headline").textContent = "Do not expand yet";
      document.getElementById("ng-summary").textContent =
        "You marked Phases 1–3 as not ready. Run Phase Gate and clear the backlog before choosing a Phase 4 bet.";
      document.getElementById("ng-cards").innerHTML = "";
      document.getElementById("ng-pick").textContent = "";
      document.getElementById("ng-ctas").innerHTML =
        '<a class="btn" href="/phasegate/">Open Phase Gate</a><a class="text-cta" href="/constitution/">Constitution Builder</a>';
      return;
    }

    const scored = [1, 2, 3].map(idea).map(score);
    const filled = scored.filter(function (s) { return s.idea.name || s.idea.keyword; });
    if (!filled.length) {
      result.hidden = false;
      document.getElementById("ng-status").textContent = "Need ideas";
      document.getElementById("ng-status").className = "result-status is-yellow";
      document.getElementById("ng-headline").textContent = "Add at least one idea";
      document.getElementById("ng-summary").textContent = "Fill name + keyword on Idea A (and optionally B/C).";
      document.getElementById("ng-cards").innerHTML = "";
      document.getElementById("ng-pick").textContent = "";
      document.getElementById("ng-ctas").innerHTML = "";
      return;
    }

    const cards = document.getElementById("ng-cards");
    cards.innerHTML = filled
      .map(function (s, idx) {
        const label = ["A", "B", "C"][idx] || String(idx + 1);
        return (
          '<article class="idea-card">' +
          "<h3>Idea " +
          label +
          ": " +
          (s.idea.name || "(unnamed)") +
          "</h3>" +
          '<p class="result-status ' +
          (s.pass ? "is-green" : "is-red") +
          '">' +
          (s.pass ? "Pass" : "Fail") +
          " · " +
          s.points.toFixed(1) +
          " pts</p>" +
          (s.kills.length
            ? "<ul>" +
              s.kills.map(function (k) { return "<li>" + k + "</li>"; }).join("") +
              "</ul>"
            : "<p>Clears the uniqueness, monetization, and phase bars.</p>") +
          "</article>"
        );
      })
      .join("");

    const passers = filled.filter(function (s) { return s.pass; }).sort(function (a, b) {
      return b.points - a.points;
    });

    const status = document.getElementById("ng-status");
    const headline = document.getElementById("ng-headline");
    const summary = document.getElementById("ng-summary");
    const pick = document.getElementById("ng-pick");
    const ctas = document.getElementById("ng-ctas");

    if (!passers.length) {
      status.textContent = "Build none";
      status.className = "result-status is-red";
      headline.textContent = "No idea cleared the gate";
      summary.textContent =
        "That is a valid Lead-Dev outcome. Fix uniqueness or finish Phases 1–3 — do not force a thin ship.";
      pick.textContent = "Chosen idea: none.";
      ctas.innerHTML =
        '<a class="btn" href="/phasegate/">Re-run Phase Gate</a>' +
        '<a class="text-cta" href="/walkthrough/">See how Mangrove chose</a>' +
        '<a class="text-cta" href="/lead-dev/#offers">Cohort materials</a>';
    } else {
      const top = passers[0];
      status.textContent = "Build at most one";
      status.className = "result-status is-green";
      headline.textContent = "Ship: " + top.idea.name;
      summary.textContent =
        "Primary keyword: " +
        top.idea.keyword +
        ". Propose three, build at most one. Everything else stays killed.";
      pick.textContent =
        passers.length > 1
          ? "Runner-up kept on ice: " + passers.slice(1).map(function (p) { return p.idea.name; }).join(", ")
          : "No runner-up cleared the bar.";
      ctas.innerHTML =
        '<a class="btn" href="/lead-dev/#offers">Get the cohort path</a>' +
        '<a class="text-cta" href="/constitution/">Lock it in AGENTS.md</a>' +
        '<a class="text-cta" href="/method/">Method</a>';
    }

    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  form.addEventListener("reset", function () {
    result.hidden = true;
  });
})();
