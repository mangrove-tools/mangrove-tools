(function () {
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
      "mailto:" +
      email +
      "?subject=" +
      encodeURIComponent(subject);
    el.removeAttribute("aria-disabled");
    el.classList.remove("is-disabled");
    el.removeAttribute("target");
    el.removeAttribute("rel");
    if (label) el.textContent = label;
  }

  applyCta("cta-kit", cfg.KIT_CHECKOUT_URL, "Buy Lead-Dev Kit");
  applyCta("cta-cohort", cfg.COHORT_SIGNUP_URL, "Get the cohort (self-serve)");
  applyMailtoCta(
    "cta-dwy",
    "Agent OS Install inquiry",
    "Email about Agent OS Install"
  );

  const emailEl = document.getElementById("lead-dev-email");
  if (emailEl) {
    emailEl.href = "mailto:" + email;
    emailEl.textContent = email;
  }
})();
