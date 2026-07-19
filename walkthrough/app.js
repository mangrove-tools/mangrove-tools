(function () {
  const scenes = {
    start: {
      title: "Two products, one operating system",
      body: "You’re a solo builder with a coding agent. You’ve seen two Lead-Dev case paths: Needle (iOS utility) and Mangrove Tools (this static site). Which surface are you standing on?",
      choices: [
        { label: "Needle — iOS utility with a locked journey", next: "needle-scope" },
        { label: "Mangrove — niche tool site with affiliate math", next: "mangrove-phase" },
      ],
    },
    "needle-scope": {
      title: "Needle · Scope pressure",
      body: "The agent offers to add an “AI search engine,” history vault, and analytics SDK soup. Your constitution lists those as non-goals. What do you do?",
      choices: [
        { label: "Accept the extras — more features feel like progress", next: "needle-fail" },
        { label: "Refuse — non-goals bind the agent", next: "needle-phase" },
      ],
    },
    "needle-fail": {
      title: "Reveal · Slot-machine prompting",
      body: "Without a constitution, the agent expands sideways. You get novelty, not a shippable StoreKit path. Lead-Dev exists to make refusal normal.",
      choices: [
        { label: "Back up and refuse the extras", next: "needle-phase" },
        { label: "See the Lead-Dev offers", next: "end-offers" },
      ],
    },
    "needle-phase": {
      title: "Needle · What ships first?",
      body: "Journey is locked. Privacy copy is honest. What’s the Lead-Dev move before adding another feature screen?",
      choices: [
        { label: "Optimize + polish the existing journey (Phases 1–2)", next: "needle-win" },
        { label: "Design three new tools immediately (Phase 4 early)", next: "phase-fail" },
      ],
    },
    "needle-win": {
      title: "Reveal · Constitution held",
      body: "Correct. Needle teaches locked journey, privacy honesty, and non-goals that block AI-search scope creep. Templates live in the Lead-Dev Kit; the cohort walks Phases 1–3 on your repo.",
      choices: [
        { label: "Try the Mangrove fork", next: "mangrove-phase" },
        { label: "Build my AGENTS.md", next: "end-constitution" },
        { label: "See offers", next: "end-offers" },
      ],
    },
    "mangrove-phase": {
      title: "Mangrove · Expansion itch",
      body: "LetterROI, SponsorQuote, and SubTarget already cover monetization math. Someone suggests a churn calculator and an SEO meta generator. What’s the Lead-Dev call?",
      choices: [
        { label: "Ship both — more tools, more SEO surface", next: "phase-fail" },
        { label: "Run Phase Gate; reject thin clones", next: "mangrove-unique" },
      ],
    },
    "phase-fail": {
      title: "Reveal · Phase 4 too early",
      body: "Expanding before Phases 1–3 are green (or shipping thin clones) turns a curated index into tool spam. The method’s rule: optimize → polish → discoverability → then one unique bet.",
      choices: [
        { label: "Open Phase Gate", next: "end-phasegate" },
        { label: "Filter ideas with Niche Gate", next: "end-nichegate" },
      ],
    },
    "mangrove-unique": {
      title: "Mangrove · Unique bets",
      body: "You shortlist Constitution Builder (Lead-Dev bridge) and Inventory Planner (calendar economics, not another CPM). How many do you greenlight this batch?",
      choices: [
        { label: "Both immediately — parallelize everything", next: "phase-fail" },
        { label: "Sequence by dependency — Lead-Dev bridge first", next: "mangrove-win" },
      ],
    },
    "mangrove-win": {
      title: "Reveal · One coherent ladder",
      body: "Mangrove’s live lesson: free tools earn trust; Lead-Dev is the paid OS; expansion must be unique and sequenced. You’re ready to install the same discipline on your repo.",
      choices: [
        { label: "Constitution Builder", next: "end-constitution" },
        { label: "Offer Fit on Lead-Dev", next: "end-offers" },
        { label: "Niche Gate", next: "end-nichegate" },
      ],
    },
    "end-constitution": {
      title: "Next step",
      body: "Generate a starter AGENTS.md, then adapt it. When you want filled stack templates, the Kit is the short path.",
      link: { href: "/constitution/", label: "Open Constitution Builder" },
      choices: [{ label: "Restart walkthrough", next: "start" }],
    },
    "end-phasegate": {
      title: "Next step",
      body: "Score Phases 1–3 before any Phase 4 work.",
      link: { href: "/phasegate/", label: "Open Phase Gate" },
      choices: [{ label: "Restart walkthrough", next: "start" }],
    },
    "end-nichegate": {
      title: "Next step",
      body: "Propose three ideas. Build at most one — or none.",
      link: { href: "/nichegate/", label: "Open Niche Gate" },
      choices: [{ label: "Restart walkthrough", next: "start" }],
    },
    "end-offers": {
      title: "Next step",
      body: "Use Offer Fit if you’re unsure which rung matches your repo, time, and budget.",
      link: { href: "/lead-dev/#offer-fit", label: "Lead-Dev · Offer Fit" },
      choices: [{ label: "Restart walkthrough", next: "start" }],
    },
  };

  const titleEl = document.getElementById("walk-title");
  const bodyEl = document.getElementById("walk-body");
  const forksEl = document.getElementById("walk-forks");
  const linkEl = document.getElementById("walk-link");
  let current = "start";

  function render(id) {
    current = id;
    const scene = scenes[id];
    if (!scene) return;
    titleEl.textContent = scene.title;
    bodyEl.textContent = scene.body;
    if (scene.link) {
      linkEl.hidden = false;
      linkEl.innerHTML =
        '<a class="btn" href="' + scene.link.href + '">' + scene.link.label + "</a>";
    } else {
      linkEl.hidden = true;
      linkEl.innerHTML = "";
    }
    forksEl.innerHTML = "";
    scene.choices.forEach(function (c) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice walk-forks-btn";
      btn.innerHTML = "<span><strong>" + c.label + "</strong></span>";
      btn.addEventListener("click", function () {
        render(c.next);
      });
      forksEl.appendChild(btn);
    });
  }

  render("start");
})();
