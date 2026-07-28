# Premium Analytics Instrument Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Mangrove's completed IA while making the affected routes
feel like one precise, calm, data-rich analytics instrument.

**Architecture:** Keep the static HTML, shared CSS, canvas charts, and existing
motion helper. Add IBM Plex Mono as a self-hosted data role, reshape the
homepage decision brief into semantic instrument markup, and extend the shared
tokens/styles so every affected route inherits the same hierarchy without
route-specific rewrites.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Canvas 2D, Python
`unittest`, Node's built-in test runner

## Global Constraints

- Do not change the completed IA, calculator logic, affiliate IDs or
  `AFFILIATE_URL`, Google Analytics identity, Supabase schema or backend
  behavior, legal claims, payments, secrets, Vercel, DNS, domains, or
  production wiring.
- Keep `/`, `/analytics/`, `/analytics/budget/`, `/analytics/forecast/`,
  `/calculators/`, `/method/`, and `/about/` polished at desktop and 390px.
- Use `--font-display: "IBM Plex Sans", "Segoe UI", sans-serif;`,
  `--font-body: "IBM Plex Sans", "Segoe UI", sans-serif;`, and
  `--font-mono: "IBM Plex Mono", "SFMono-Regular", monospace;`.
- Respect `prefers-reduced-motion`.
- Do not merge or deploy.

---

### Task 1: Establish the type and signal-token contract

**Files:**
- Modify: `scripts/test_font_contract.py`
- Modify: `fonts.css`
- Create: `fonts/ibm-plex-mono-400.woff2`
- Create: `fonts/ibm-plex-mono-500.woff2`
- Create: `fonts/ibm-plex-mono-600.woff2`
- Modify: `fonts/README.md`
- Modify: `site.css`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: global `--font-display`, `--font-body`, `--font-mono`,
  `--signal`, `--signal-soft`, and `--signal-line` CSS custom properties.

- [ ] **Step 1: Change the font contract test first**

  Require the three IBM Plex Mono WOFF2 files, the IBM Plex Mono `@font-face`,
  the three exact font-role declarations, and an updated repository contract.

- [ ] **Step 2: Run the focused test and verify the intended failure**

  Run:
  `python3 -m unittest scripts.test_font_contract -v`

  Expected: failure because IBM Plex Mono assets and `--font-mono` do not yet
  exist and `--font-display` still names Source Serif 4.

- [ ] **Step 3: Add the self-hosted font and global tokens**

  Download the Regular, Medium, and SemiBold WOFF2 files from IBM's official
  `IBM/plex` repository under
  `packages/plex-mono/fonts/complete/woff2/`, rename them to the lowercase
  repository convention, declare them in `fonts.css`, and document provenance.
  Change the active display/body roles to IBM Plex Sans and add IBM Plex Mono
  plus the restrained signal-amber color roles in `site.css`.

- [ ] **Step 4: Run the focused test and validator tests**

  Run:
  `python3 -m unittest scripts.test_font_contract -v`

  Then run:
  `python3 -m unittest discover -s scripts -p 'test_*.py' -v`

  Expected: all tests pass.

### Task 2: Turn the homepage brief into a decision instrument

**Files:**
- Modify: `tests/motion.test.js`
- Modify: `scripts/test_motion_integration.py`
- Modify: `shared/motion.js`
- Modify: `index.html`
- Modify: `site.css`

**Interfaces:**
- Produces: `MangroveMotion.initDecisionInstrument(element)` and
  `[data-decision-instrument][data-motion]` states.
- Consumes: the font and signal tokens from Task 1.

- [ ] **Step 1: Add failing motion and integration tests**

  Require `initDecisionInstrument`, verify reduced-motion and missing-frame
  fallbacks expose the final state synchronously, verify the normal path moves
  from `ready` to `active`, and require the homepage instrument hook.

- [ ] **Step 2: Run the focused tests and verify the intended failures**

  Run:
  `node tests/motion.test.js`

  Then run:
  `python3 -m unittest scripts.test_motion_integration -v`

  Expected: failures because the helper and homepage hook do not exist.

- [ ] **Step 3: Implement the semantic instrument**

  Replace only the hero's generic decision-brief aside with an accessible
  figure containing an illustrative status rail, two labelled response curves,
  uncertainty band, capped reallocation marker, and the existing observation,
  bounded move, and recheck language. Add the progressive-enhancement helper
  and scoped CSS so curves resolve before the decision marker. The static and
  reduced-motion states must show the final information immediately.

- [ ] **Step 4: Run focused tests and verify green**

  Run:
  `node tests/motion.test.js && python3 -m unittest scripts.test_motion_integration -v`

  Expected: all focused tests pass.

### Task 3: Carry the instrument system across shared routes

**Files:**
- Modify: `site.css`
- Modify: `tool-shell.css`
- Modify: `shared/charts.js`

**Interfaces:**
- Consumes: `--font-mono` and signal color roles from Task 1.
- Produces: shared data-label, surface, form, table, result, allocation-chart,
  and forecast-confidence-band treatments used by all affected routes.

- [ ] **Step 1: Apply the shared hierarchy**

  Use IBM Plex Sans for all large/product headings and IBM Plex Mono for
  metrics, section markers, table cells, evidence labels, confidence language,
  breadcrumbs, and result metadata. Add calibrated rules, grid texture, inset
  rails, and controlled surface contrast without changing route content or IA.

- [ ] **Step 2: Sharpen tool workspaces and chart semantics**

  Keep current and recommended allocation visibly labelled while rendering
  current in signal amber and recommended in pine. Render forecast confidence
  bands in signal amber and the forecast line in pine. Use IBM Plex Mono for
  chart labels and preserve responsive truncation behavior.

- [ ] **Step 3: Run all automated checks**

  Run:
  `python3 scripts/validate_site.py`

  Run:
  `python3 -m unittest discover -s scripts -p 'test_*.py' -v`

  Run:
  `node --test tests/*.test.js`

  Expected: validator passes, all Python tests pass, and all Node tests pass.

### Task 4: Browser verification, evidence, and exact-head review

**Files:**
- Create:
  `docs/superpowers/screenshots/premium-analytics-instrument/home-desktop.png`
- Create:
  `docs/superpowers/screenshots/premium-analytics-instrument/home-390px.png`
- Create:
  `docs/superpowers/screenshots/premium-analytics-instrument/budget-desktop.png`
- Create:
  `docs/superpowers/screenshots/premium-analytics-instrument/budget-390px.png`
- Create:
  `docs/superpowers/screenshots/premium-analytics-instrument/forecast-desktop.png`
- Create:
  `docs/superpowers/screenshots/premium-analytics-instrument/forecast-390px.png`

**Interfaces:**
- Consumes: the complete committed implementation.

- [ ] **Step 1: Verify affected routes in a browser**

  Serve the repository root on port 5173. Check all seven affected routes at
  1440px desktop and 390px mobile for content, computed font roles, horizontal
  overflow, clipping, focus, and console errors. Use sample data in both
  analytics tools and verify their result surfaces.

- [ ] **Step 2: Verify reduced motion**

  Emulate `prefers-reduced-motion: reduce` and confirm the homepage instrument,
  decision story, and analytics result surfaces expose the final state without
  scheduled visual animation.

- [ ] **Step 3: Capture the six required screenshots**

  Save homepage, Budget Advisor, and Revenue Forecaster at desktop and 390px in
  the screenshot directory above.

- [ ] **Step 4: Commit and independently review the exact head**

  Commit the scoped implementation and evidence, record the exact base and head
  SHAs, then dispatch an independent reviewer against that immutable range.
  Fix every critical or important finding, recommit, and repeat exact-head
  review if the head changes.

- [ ] **Step 5: Re-run final verification and open a ready PR**

  Run the validator, all Python tests, all Node tests, `git diff --check`, and
  inspect the final scoped diff. Push the branch and open a ready-for-review
  pull request. Do not merge or deploy.
