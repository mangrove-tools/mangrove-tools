(function () {
  const cfg = window.LeadDevConfig || {};

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

  applyCta("cta-kit", cfg.KIT_CHECKOUT_URL, "Buy Lead-Dev Kit");
  applyCta("cta-cohort", cfg.COHORT_SIGNUP_URL, "Join the cohort");
  applyCta("cta-dwy", cfg.DWY_BOOKING_URL, "Book DWY intake");

  const email = document.getElementById("lead-dev-email");
  if (email && cfg.CONTACT_EMAIL) {
    email.href = "mailto:" + cfg.CONTACT_EMAIL;
    email.textContent = cfg.CONTACT_EMAIL;
  }
})();
