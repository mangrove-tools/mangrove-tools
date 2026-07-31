# Shared Shell Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mangrove's shared site shell feel like one calm, premium analytics instrument without changing IA, calculator behavior, or the homepage decision graph.

**Architecture:** Keep the existing static HTML/CSS/vanilla-JavaScript structure. Extend the shared design tokens and cascade, separate the homepage signal rail from the sticky masthead, and use existing result-state hooks to present a restrained evidence/bound/recheck sequence. Characterize each visual behavior in a real browser before implementation, then re-fingerprint changed cache-sensitive CSS and run the repository's existing structural contracts.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Python `unittest`, Node's built-in test runner, browser automation against `python3 -m http.server`

## Global Constraints

- Preserve routes, page hierarchy, navigation labels, calculator inputs, formulas, and the homepage decision graph geometry, curves, uncertainty band, labels, and three-column readout.
- Do not change affiliate IDs, `AFFILIATE_URL`, Google Analytics identity, Vercel, DNS, domain, deployment wiring, secrets, payments, legal claims, Supabase schema, or backend behavior.
- Use IBM Plex Sans for display/body roles and IBM Plex Mono for metrics, table headings, evidence markers, confidence labels, and state labels.
- The masthead must use `position: sticky`; it must not become a fixed overlay.
- The homepage signal rail must scroll away outside the sticky row.
- Motion must be short, state-driven, non-looping, and static under `prefers-reduced-motion: reduce`.
- Desktop and 390px layouts must have no overlap, clipping, or horizontal overflow.
- Produce a ready PR only. Do not merge or deploy.

---

### Task 1: Characterize the current rendered shell

**Files:**
- No repository files; this is a browser-only red phase against the unchanged baseline.

**Interfaces:**
- Consumes: the site served at `http://127.0.0.1:5173`.
- Produces: hand-checked failing browser assertions for masthead stickiness, signal-rail separation, generic control radius, calculator locators, studio surface contrast, and budget rail orientation.

- [ ] **Step 1: Start the required local server and verify it loads**

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

Open `/`, wait for a complete load, confirm non-empty body text, no error overlay, and expected navigation links.

- [ ] **Step 2: Verify the masthead and controls fail the desired contract**

At desktop width, evaluate these literal expectations against the current homepage:

```javascript
const header = document.querySelector(".top");
const rail = document.querySelector(".header-signal-rail");
({
  headerPosition: getComputedStyle(header).position,
  railInsideHeader: header.contains(rail)
});
```

Then navigate to `/analytics/` and evaluate:

```javascript
getComputedStyle(document.querySelector(".btn:not(.hero-primary-cta)")).borderRadius;
```

Expected red baseline: `headerPosition` is not `sticky`, `railInsideHeader` is `true`, and the generic analytics button has a `2px` radius rather than the approved `8px` control radius.

- [ ] **Step 3: Verify calculator and studio outputs fail the desired contract**

On `/letterroi/`, `/mediakit/`, and `/analytics/budget/`, inspect real computed pseudo-element geometry:

```javascript
const target = document.querySelector(".results, .studio-result, .budget-decision-canvas");
({
  beforeWidth: getComputedStyle(target, "::before").width,
  beforeHeight: getComputedStyle(target, "::before").height,
  afterBackground: getComputedStyle(target, "::after").backgroundImage,
  surface: getComputedStyle(target).backgroundColor
});
```

Expected red baseline: calculator/studio outputs lack four-corner locator backgrounds, the studio result is not a bordered raised output surface, and the budget rail is a full-height left edge rather than a three-pixel top state rail.

- [ ] **Step 4: Record the red phase in the execution log**

Keep the observed values in the task commentary and proceed only after every intended production change has a real rendered behavior that currently fails.

### Task 2: Build the sticky masthead and shared action hierarchy

**Files:**
- Modify: `index.html:189-213`
- Modify: `site.css:6-50,110-223,259-323,641-706,2380-2559,2795-3258`

**Interfaces:**
- Produces: `--radius-control`, `--radius-panel`, `--sticky-header-offset`, sticky `.top`, non-sticky `.header-signal-rail`, and shared `.btn` interaction states.
- Consumes: existing `.top`, `.brand`, `.site-nav`, `.header-signal-rail`, `.btn`, `.btn-secondary`, `.hero-home`, and `.hero` markup.

- [ ] **Step 1: Move the homepage signal rail after the sticky header**

Change only the rail's nesting; preserve its three labels and data attributes exactly:

```html
    <header class="top is-home">
      <!-- existing brand and primary navigation remain unchanged -->
    </header>
    <div class="header-signal-rail" aria-hidden="true">
      <span data-signal="evidence">Evidence</span>
      <span data-signal="bound">Bounded move</span>
      <span data-signal="recheck">Recheck</span>
    </div>
```

- [ ] **Step 2: Add shared shell and control tokens**

Extend `:root` without changing the existing font or color roles:

```css
  --radius-control: 8px;
  --radius-panel: 4px;
  --sticky-header-offset: 6.25rem;
  --heading-weight-secondary: 500;
  --control-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
```

- [ ] **Step 3: Make the masthead sticky while preserving shell alignment**

Use an opaque layered surface and viewport-wide lower rule. Keep homepage glow localized to `.top.is-home .brand`:

```css
.top {
  position: sticky;
  top: 0;
  z-index: 40;
  max-width: none;
  padding-inline: max(1.5rem, calc((100vw - var(--shell)) / 2 + 1.5rem));
  background: rgba(12, 12, 12, 0.96);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(14px);
}

.top::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--line-strong) 16% 84%, transparent);
  pointer-events: none;
}

.header-signal-rail {
  max-width: var(--shell);
  margin: 0 auto;
  padding: 0 1.5rem;
}
```

At `max-width: 560px`, retain the two-row header, reduce vertical padding, and keep all five navigation labels visible. Do not hide links or turn the masthead into a menu.

- [ ] **Step 4: Refine secondary headings and shared actions**

Keep `.hero-headline` untouched. Override only secondary route headings and generic actions:

```css
.hero-home h1,
.hero:not(.hero-home) h1 {
  font-weight: var(--heading-weight-secondary);
  letter-spacing: -0.035em;
}

.btn {
  position: relative;
  min-height: 2.75rem;
  border-radius: var(--radius-control);
  box-shadow: var(--control-shadow);
}

.btn:not(.btn-secondary, .hero-primary-cta)::after {
  content: "";
  width: 0.32rem;
  height: 0.32rem;
  margin-left: 0.7rem;
  border-radius: 1px;
  background: var(--signal);
}

.btn-secondary {
  box-shadow: 0 1px 0 rgba(245, 243, 239, 0.05) inset;
}
```

Preserve the homepage split pill with a more specific override so it does not receive the generic commit marker. Ensure disabled/busy actions cannot animate or lift.

- [ ] **Step 5: Re-run the rendered masthead/action checks and shared IA/font tests**

Run:

```bash
python3 -m unittest \
  scripts.test_homepage_identity \
  scripts.test_site_ia \
  scripts.test_font_contract -v
```

Expected: homepage identity/IA/font contracts pass. In the browser, `.top` computes to `sticky` before and after scroll, the rail is no longer contained by the header and scrolls out of view, generic `.btn` controls compute to `8px`, and the homepage split CTA remains pill-shaped.

- [ ] **Step 6: Commit the shared masthead and controls**

```bash
git add index.html site.css
git commit -m "feat: sharpen shared masthead and actions"
```

### Task 3: Add state-driven framing to calculator results

**Files:**
- Modify: `tool-shell.css:79-191,251-357,790-1040`

**Interfaces:**
- Consumes: `--radius-control`, `--radius-panel`, `--sticky-header-offset`, existing `.results[data-result-state]`, `.primary`, `.secondary-action`, form controls, and the existing `MangroveMotion.revealResult()` state flow.
- Produces: `--result-rail`, persistent `.results::before` state rail, `.results::after` locator corners, and reduced-motion-safe `result-rail-resolve` animation.

- [ ] **Step 1: Offset desktop sticky results below the masthead**

```css
@media (min-width: 900px) {
  .results {
    top: var(--sticky-header-offset);
  }
}
```

- [ ] **Step 2: Normalize tool actions and focus surfaces**

Apply `var(--radius-control)` and stable 44px targets to `.primary`, `.secondary-action`, and `.ghost-btn`. Add an amber inset terminal edge to `.primary` rather than an arrow. Keep fields dark on focus:

```css
.primary,
.secondary-action,
.ghost-btn {
  min-height: 2.75rem;
  border-radius: var(--radius-control);
}

.primary {
  box-shadow: inset -3px 0 0 var(--signal), var(--control-shadow);
}

.inputs input:focus-visible,
.inputs select:focus-visible,
.inputs textarea:focus-visible,
.manual-row input:focus-visible {
  background: var(--surface-raised);
  color: var(--ink);
}
```

- [ ] **Step 3: Replace the transient result rule with a semantic three-stage rail**

```css
.results {
  --result-rail: linear-gradient(
    90deg,
    var(--accent) 0 48%,
    var(--signal) 48% 76%,
    rgba(232, 238, 233, 0.42) 76% 100%
  );
  overflow: hidden;
  border-radius: var(--radius-panel);
}

.results::before {
  content: "";
  position: absolute;
  z-index: 2;
  top: -1px;
  right: -1px;
  left: -1px;
  height: 3px;
  background: var(--result-rail);
  pointer-events: none;
  transform-origin: left center;
}

.results::after {
  content: "";
  position: absolute;
  z-index: 2;
  inset: 7px;
  background:
    linear-gradient(var(--accent-text), var(--accent-text)) left top / 12px 1px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left top / 1px 12px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right top / 12px 1px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right top / 1px 12px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left bottom / 12px 1px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left bottom / 1px 12px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right bottom / 12px 1px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right bottom / 1px 12px no-repeat;
  opacity: 0.42;
  pointer-events: none;
}
```

- [ ] **Step 4: Make existing result-state motion settle into the persistent rail**

```css
@media (prefers-reduced-motion: no-preference) {
  .results[data-result-state="updating"]::before {
    opacity: 0.48;
    transform: scaleX(0.22);
  }

  .results[data-result-state="ready"]::before {
    animation: result-rail-resolve 0.72s var(--ease) both;
  }
}

@keyframes result-rail-resolve {
  from { opacity: 0.48; transform: scaleX(0.22); }
  58% { opacity: 1; transform: scaleX(0.76); }
  to { opacity: 1; transform: scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .results::before,
  .results::after,
  .results[data-result-state] > * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
```

Keep all output content and existing calculation hooks unchanged.

- [ ] **Step 5: Run focused rendered and motion tests**

Run:

```bash
python3 -m unittest scripts.test_motion_integration -v
node --test tests/motion.test.js
```

Expected: motion tests pass. With canonical `site.css` and `tool-shell.css` injected locally, the results top stays below the masthead, controls compute to `8px`, focused fields retain a dark background, the state rail resolves to full width, locator backgrounds are present, and reduced-motion emulation reports no result animation.

- [ ] **Step 6: Commit the calculator workspace polish**

```bash
git add tool-shell.css
git commit -m "feat: frame calculator decisions as live outputs"
```

### Task 4: Align studio and budget decision surfaces

**Files:**
- Modify: `studio.css:17-52,108-178,237-324,374-498`
- Modify: `analytics/budget/styles.css:1-145,209-276,284-360`

**Interfaces:**
- Consumes: shared surface, signal, radius, control, and focus tokens; existing `.studio-result`, `.kit-compose`, `.choice`, `.metric`, and `.budget-decision-canvas[data-phase]` hooks.
- Produces: dark studio choice/focus treatments, framed `.studio-result` and `.kit-compose` outputs, phase-aware budget rails, and locator corners on the budget decision canvas.

- [ ] **Step 1: Correct the remaining studio dark-theme remnants**

```css
.choice {
  border-radius: var(--radius-panel);
  background: var(--surface-2);
}

.choice:has(input:checked) {
  border-color: var(--accent);
  background: rgba(66, 162, 142, 0.08);
}

.result-status.is-green { color: var(--ok-text); }
.result-status.is-yellow { color: var(--signal-text); }
.result-status.is-red,
.field-error { color: var(--danger-text); }
```

Use `var(--font-mono)` for `.studio-progress`, `.result-status`, `.metric .label`, and `.metric .value` while preserving tabular numerals.

- [ ] **Step 2: Frame studio outputs without decorating input forms**

```css
.studio-result,
.kit-compose {
  position: relative;
  overflow: hidden;
  padding: 1.35rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-panel);
  background: var(--surface-2);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.26);
}

.studio-result::before,
.kit-compose::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent) 0 68%, var(--signal) 68%);
}

.studio-result::after,
.kit-compose::after {
  content: "";
  position: absolute;
  inset: 7px;
  background:
    linear-gradient(var(--accent-text), var(--accent-text)) left top / 12px 1px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left top / 1px 12px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right top / 12px 1px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right top / 1px 12px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left bottom / 12px 1px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left bottom / 1px 12px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right bottom / 12px 1px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right bottom / 1px 12px no-repeat;
  opacity: 0.38;
  pointer-events: none;
}
```

Do not create a generic locator rule that would affect ordinary cards. Under reduced motion, disable `.studio-result` and `.kit-compose` transitions and retain the final rail/locator state. In print media, remove the Media Kit output's decorative rail, locators, shadow, and dark background.

- [ ] **Step 3: Turn the budget canvas rail into a phase indicator**

```css
.budget-decision-canvas::before {
  inset: -1px -1px auto;
  width: auto;
  height: 3px;
  background: linear-gradient(90deg, var(--accent) 0 68%, var(--signal) 68%);
}

.budget-decision-canvas[data-phase="parsing"]::before {
  background: var(--accent);
}

.budget-decision-canvas[data-phase="needs_correction"]::before,
.budget-decision-canvas[data-phase="blocked"]::before {
  background: var(--signal);
}

.budget-decision-canvas[data-phase="result"]::before {
  background: linear-gradient(90deg, var(--accent) 0 72%, var(--signal) 72%);
}

.budget-decision-canvas::after {
  content: "";
  position: absolute;
  inset: 7px;
  background:
    linear-gradient(var(--accent-text), var(--accent-text)) left top / 12px 1px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left top / 1px 12px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right top / 12px 1px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right top / 1px 12px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left bottom / 12px 1px no-repeat,
    linear-gradient(var(--accent-text), var(--accent-text)) left bottom / 1px 12px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right bottom / 12px 1px no-repeat,
    linear-gradient(var(--signal-text), var(--signal-text)) right bottom / 1px 12px no-repeat;
  opacity: 0.4;
  pointer-events: none;
}
```

Do not alter `data-phase` values or JavaScript state transitions.

- [ ] **Step 4: Run the rendered studio and budget contract**

Generate a Media Kit or Inventory result and load Budget sample data. Verify computed output surfaces have a three-pixel top rail, non-`none` locator background, dark raised surface, visible status color, and no clipped focus. Confirm Budget's `data-phase` values still follow `empty` → `parsing` → readiness → `result`, with a teal parsing rail, amber blocked/correction rail, and split final rail.

- [ ] **Step 5: Commit studio and budget alignment**

```bash
git add studio.css analytics/budget/styles.css
git commit -m "feat: align decision surfaces across tools"
```

### Task 5: Re-fingerprint assets and run repository verification

**Files:**
- Delete: superseded `site.<hash>.css`
- Create: new `site.<sha256-prefix>.css`
- Delete: superseded `tool-shell.<hash>.css`
- Create: new `tool-shell.<sha256-prefix>.css`
- Modify: every public HTML reference to `/site.<hash>.css`
- Modify: every calculator HTML reference to `/tool-shell.<hash>.css`
- Test: `scripts/test_asset_versioning.py`

**Interfaces:**
- Consumes: canonical `site.css` and `tool-shell.css` bytes.
- Produces: matching 12-character SHA-256 fingerprinted copies and updated HTML references.

- [ ] **Step 1: Demonstrate the asset contract is red after canonical CSS changes**

Run:

```bash
python3 -m unittest scripts.test_asset_versioning -v
```

Expected: failure naming the new expected fingerprinted CSS paths and stale HTML references.

- [ ] **Step 2: Generate exact fingerprinted copies and update references**

Calculate each name with the same algorithm used by `scripts/test_asset_versioning.py`:

```bash
shasum -a 256 site.css
shasum -a 256 tool-shell.css
```

Use the first 12 hex characters, copy the canonical bytes to the corresponding fingerprinted filename, replace only the old fingerprinted stylesheet URLs in HTML, and stage superseded tracked copies as deletions. Do not add a query-string cache buster.

- [ ] **Step 3: Run the canonical automated suite**

Run:

```bash
python3 scripts/validate_site.py --base-ref origin/main
python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
```

Expected: validator passes, every Python and Node test passes, and the diff has no whitespace errors.

- [ ] **Step 4: Commit the fingerprinted integration**

```bash
git add -A
git commit -m "chore: fingerprint shared shell assets"
```

### Task 6: Browser verification and evidence

**Files:**
- Create: `docs/superpowers/screenshots/shared-shell-polish/home-desktop.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/home-390px.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/budget-desktop.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/budget-390px.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/letterroi-desktop.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/letterroi-390px.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/method-desktop.png`
- Create: `docs/superpowers/screenshots/shared-shell-polish/method-390px.png`

**Interfaces:**
- Consumes: the complete fingerprinted static site served at `http://127.0.0.1:5173`.
- Produces: responsive screenshot evidence and a browser-verification record for the PR.

- [ ] **Step 1: Start the required local server from the worktree root**

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

- [ ] **Step 2: Verify affected routes at desktop and 390px**

Visit `/`, `/analytics/`, `/analytics/budget/`, `/analytics/forecast/`, `/calculators/`, `/method/`, `/about/`, `/letterroi/`, `/sponsorquote/`, `/subtarget/`, `/mediakit/`, and `/inventory/`.

For every route assert:

```javascript
document.documentElement.scrollWidth <= 390
```

at 390px, and confirm no overlap, clipping, horizontal overflow, console errors, or failed local asset requests. Spot-check FAQ, privacy, contact, and 404 navigation.

- [ ] **Step 3: Verify sticky and interactive behavior**

On the homepage, record the masthead's initial and scrolled `getBoundingClientRect().top` values as `0`, and confirm the signal rail's bottom becomes negative after scrolling. On a desktop calculator, confirm the results panel top remains below the masthead. Keyboard through skip navigation, all five masthead links, inputs, sample-data controls, submit/reset actions, and result actions.

- [ ] **Step 4: Verify representative calculator flows**

- Budget Advisor: use sample data, generate the decision, and confirm the rail settles to `data-phase="result"` without changing allocation output.
- Revenue Forecaster: load sample data and generate a forecast.
- LetterROI, SponsorQuote, and SubTarget: use sample values, calculate, then reset.
- Media Kit and Inventory: generate an output and confirm the framed result appears without obscuring focus or print behavior.

- [ ] **Step 5: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`. Confirm homepage graph content remains complete, result rails render in their final state, and result/studio transitions report `animation-name: none` or zero duration.

- [ ] **Step 6: Capture eight required screenshots**

Capture homepage, Budget Advisor, LetterROI, and Method at desktop and 390px in `docs/superpowers/screenshots/shared-shell-polish/`.

- [ ] **Step 7: Commit visual evidence**

```bash
git add docs/superpowers/screenshots/shared-shell-polish
git commit -m "docs: add shared shell visual evidence"
```

### Task 7: Exact-head review and ready PR

**Files:**
- Modify only if exact-head review finds an in-scope defect.

**Interfaces:**
- Consumes: immutable `origin/main...HEAD` diff and the full verification record.
- Produces: an independently reviewed exact head and a ready GitHub pull request.

- [ ] **Step 1: Record exact review range and inspect scope**

```bash
git fetch origin
git rev-parse origin/main
git rev-parse HEAD
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
git status --short
```

Confirm the diff contains only the approved spec/plan, shared presentation files, focused test, fingerprinted assets/references, and screenshot evidence.

- [ ] **Step 2: Independently review the exact committed head**

Use the required review workflow against the recorded immutable base/head range. Review for protected-surface changes, sticky overlap, mobile overflow, focus visibility, reduced-motion behavior, CSS cascade conflicts, asset fingerprint correctness, and unchanged calculator logic.

- [ ] **Step 3: Repair any important finding and repeat exact-head verification**

If the head changes, rerun the focused test, canonical validator/test suite, affected browser checks, and independent review against the new exact head.

- [ ] **Step 4: Run final completion verification**

```bash
python3 scripts/validate_site.py --base-ref origin/main
python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
git status --short
```

Expected: all commands pass and the worktree is clean.

- [ ] **Step 5: Push and open a ready PR**

Push `agent/shared-shell-polish`, open a non-draft PR against `main`, include the exact head, validation results, desktop/mobile screenshot paths, protected surfaces, and explicit statement that the PR has not been merged or deployed. Do not merge or deploy.
