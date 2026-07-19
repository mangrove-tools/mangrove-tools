(function () {
  const ITEMS = [
    { phase: 1, id: "p1-journey", label: "Primary journey works end-to-end on mobile (~390px)" },
    { phase: 1, id: "p1-inputs", label: "Empty / zero / extreme inputs don’t crash tools" },
    { phase: 1, id: "p1-links", label: "Broken links and obvious 404s are fixed" },
    { phase: 1, id: "p1-config", label: "Config / affiliate / checkout URLs are correct or honestly placeholder" },
    { phase: 1, id: "p1-meta", label: "robots / sitemap / llms (or store metadata) are not lying" },
    { phase: 1, id: "p1-scope", label: "No new features sneaked in “while fixing”" },
    { phase: 2, id: "p2-stranger", label: "Stranger test: purpose clear in ~5 seconds" },
    { phase: 2, id: "p2-cta", label: "Primary CTA is obvious" },
    { phase: 2, id: "p2-hierarchy", label: "One focal action per section; clutter reduced" },
    { phase: 2, id: "p2-forms", label: "Forms labeled; errors human-readable" },
    { phase: 2, id: "p2-results", label: "Results state clearer than form noise" },
    { phase: 2, id: "p2-brand", label: "Brand consistent (not a random new palette)" },
    { phase: 2, id: "p2-touch", label: "Touch targets usable on phone" },
    { phase: 3, id: "p3-intent", label: "Intent keyword chosen per indexable page" },
    { phase: 3, id: "p3-title", label: "Title and meta description are human and keyword-aware" },
    { phase: 3, id: "p3-h1", label: "Single H1 aligned to intent" },
    { phase: 3, id: "p3-canonical", label: "Canonical + OG/Twitter present" },
    { phase: 3, id: "p3-internal", label: "Internal links home ↔ tools / offers" },
    { phase: 3, id: "p3-sitemap", label: "sitemap.xml + llms.txt updated for live routes" },
    { phase: 3, id: "p3-honest", label: "No stuffing, spun clones, or dishonest JSON-LD" },
  ];

  const SCORE = { yes: 1, partial: 0.5, no: 0 };
  const form = document.getElementById("phasegate-form");
  const list = document.getElementById("checklist");
  const result = document.getElementById("phasegate-result");

  function renderList() {
    let html = "";
    let phase = 0;
    ITEMS.forEach(function (item) {
      if (item.phase !== phase) {
        phase = item.phase;
        html += "<h3 style=\"margin:1.5rem 0 0.5rem;font-family:var(--font-display);font-size:1.15rem\">Phase " + phase + "</h3>";
      }
      html +=
        '<div class="check-row">' +
        "<div><p>" +
        item.label +
        "</p></div>" +
        '<label class="visually-hidden" for="' +
        item.id +
        '">Status for: ' +
        item.label +
        "</label>" +
        '<select id="' +
        item.id +
        '" name="' +
        item.id +
        '" required>' +
        '<option value="">—</option>' +
        '<option value="yes">Yes</option>' +
        '<option value="partial">Partial</option>' +
        '<option value="no">No</option>' +
        "</select></div>";
    });
    list.innerHTML = html;
  }

  function scorePhase(phase) {
    const items = ITEMS.filter(function (i) { return i.phase === phase; });
    let sum = 0;
    let answered = 0;
    const gaps = [];
    items.forEach(function (item) {
      const v = form.elements[item.id].value;
      if (!v) return;
      answered += 1;
      sum += SCORE[v];
      if (v !== "yes") gaps.push({ item: item, value: v });
    });
    return {
      ratio: answered ? sum / items.length : 0,
      answered: answered,
      total: items.length,
      gaps: gaps,
    };
  }

  function band(ratio) {
    if (ratio >= 0.85) return "green";
    if (ratio >= 0.55) return "yellow";
    return "red";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const p1 = scorePhase(1);
    const p2 = scorePhase(2);
    const p3 = scorePhase(3);
    if (p1.answered < p1.total || p2.answered < p2.total || p3.answered < p3.total) {
      result.hidden = false;
      document.getElementById("pg-status").textContent = "Incomplete";
      document.getElementById("pg-status").className = "result-status is-yellow";
      document.getElementById("pg-headline").textContent = "Answer every row";
      document.getElementById("pg-summary").textContent =
        "Phase Gate only scores when each checklist item has Yes, Partial, or No.";
      document.getElementById("pg-backlog").innerHTML = "";
      document.getElementById("pg-ctas").innerHTML = "";
      return;
    }

    const overall = (p1.ratio + p2.ratio + p3.ratio) / 3;
    const b1 = band(p1.ratio);
    const b2 = band(p2.ratio);
    const b3 = band(p3.ratio);
    const worst = [b1, b2, b3].includes("red")
      ? "red"
      : [b1, b2, b3].includes("yellow")
        ? "yellow"
        : "green";

    const statusEl = document.getElementById("pg-status");
    statusEl.className = "result-status is-" + worst;
    statusEl.textContent =
      worst === "green" ? "Ready to consider expansion" : worst === "yellow" ? "Stabilize first" : "Do not expand yet";

    document.getElementById("pg-headline").textContent =
      worst === "green"
        ? "Phases 1–3 look green enough to shortlist one Phase 4 bet"
        : "Stay in Phases 1–3 — expansion can wait";

    document.getElementById("pg-summary").textContent =
      "Phase 1 " +
      Math.round(p1.ratio * 100) +
      "% · Phase 2 " +
      Math.round(p2.ratio * 100) +
      "% · Phase 3 " +
      Math.round(p3.ratio * 100) +
      "% · Overall " +
      Math.round(overall * 100) +
      "%. Scores are a sequencing aid, not a guarantee.";

    const ordered = []
      .concat(
        p1.gaps.map(function (g) { return { phase: 1, g: g }; }),
        p2.gaps.map(function (g) { return { phase: 2, g: g }; }),
        p3.gaps.map(function (g) { return { phase: 3, g: g }; })
      )
      .sort(function (a, b) {
        const rank = { no: 0, partial: 1 };
        if (a.phase !== b.phase) return a.phase - b.phase;
        return rank[a.g.value] - rank[b.g.value];
      });

    const backlog = document.getElementById("pg-backlog");
    if (!ordered.length) {
      backlog.innerHTML = "<li>No open gaps — run <a href=\"/nichegate/\">Niche Gate</a> on at most three ideas.</li>";
    } else {
      backlog.innerHTML = ordered
        .map(function (row) {
          return (
            "<li><strong>P" +
            row.phase +
            " · " +
            row.g.value +
            ":</strong> " +
            row.g.item.label +
            "</li>"
          );
        })
        .join("");
    }

    const ctas = document.getElementById("pg-ctas");
    if (worst === "green") {
      ctas.innerHTML =
        '<a class="btn" href="/nichegate/">Open Niche Gate</a>' +
        '<a class="text-cta" href="/constitution/">Refresh your constitution</a>' +
        '<a class="text-cta" href="/lead-dev/#offer-fit">Offer Fit</a>';
    } else if (worst === "yellow") {
      ctas.innerHTML =
        '<a class="btn" href="/lead-dev/#offers">Get cohort materials</a>' +
        '<a class="text-cta" href="/constitution/">Constitution Builder</a>' +
        '<a class="text-cta" href="/method/">Re-read the method</a>';
    } else {
      ctas.innerHTML =
        '<a class="btn" href="/constitution/">Install a constitution first</a>' +
        '<a class="text-cta" href="/lead-dev/#offer-fit">Which offer fits?</a>' +
        '<a class="text-cta" href="/method/">Method article</a>';
    }

    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  form.addEventListener("reset", function () {
    result.hidden = true;
  });

  renderList();
})();
