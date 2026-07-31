# Shared Shell Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mangrove's shared site shell feel like one calm, premium analytics instrument without changing IA, calculator behavior, or the homepage decision graph.

**Architecture:** Keep the existing static HTML/CSS/vanilla-JavaScript structure. Extend the shared design tokens and cascade, separate the homepage signal rail from the sticky masthead, and use existing result-state hooks to present a restrained evidence/bound/recheck sequence. Add one focused Python contract suite before visual implementation, then re-fingerprint changed cache-sensitive CSS.

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

### Task 1: Encode the shared-shell visual contract

**Files:**
- Create: `scripts/test_shared_shell_polish.py`

**Interfaces:**
- Consumes: `index.html`, `site.css`, `tool-shell.css`, `studio.css`, and `analytics/budget/styles.css` as text fixtures.
- Produces: `SharedShellPolishTests`, a static contract covering masthead structure, control tokens, instrument outputs, focus contrast, and reduced-motion behavior.

- [ ] **Step 1: Write the failing contract tests**

```python
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def source(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


class SharedShellPolishTests(unittest.TestCase):
    def test_homepage_signal_rail_is_outside_sticky_header(self) -> None:
        homepage = source("index.html")
        header_start = homepage.index('<header class="top is-home">')
        header_end = homepage.index("</header>", header_start)
        rail_start = homepage.index('<div class="header-signal-rail"')

        self.assertGreater(rail_start, header_end)
        self.assertNotIn("header-signal-rail", homepage[header_start:header_end])

    def test_site_css_defines_sticky_masthead_and_control_tokens(self) -> None:
        css = source("site.css")

        for declaration in (
            "--radius-control: 8px;",
            "--radius-panel: 4px;",
            "--sticky-header-offset: 6.25rem;",
            "position: sticky;",
            "min-height: 2.75rem;",
        ):
            self.assertIn(declaration, css)
        self.assertRegex(
            css,
            re.compile(r"\.top\s*\{[^}]*position:\s*sticky", re.DOTALL),
        )
        self.assertIn(".top::after", css)

    def test_secondary_headings_and_data_roles_are_precise(self) -> None:
        site_css = source("site.css")
        tool_css = source("tool-shell.css")

        self.assertIn("--heading-weight-secondary: 500;", site_css)
        self.assertIn("font-weight: var(--heading-weight-secondary);", site_css)
        self.assertIn("letter-spacing: -0.035em;", site_css)
        self.assertIn("font-family: var(--font-mono);", tool_css)

    def test_tool_results_use_state_rail_locators_and_dark_focus(self) -> None:
        css = source("tool-shell.css")

        self.assertIn("--result-rail", css)
        self.assertIn(".results::after", css)
        self.assertIn("@keyframes result-rail-resolve", css)
        self.assertIn("background: var(--surface-raised);", css)
        self.assertNotRegex(
            css,
            r"(?:input|select|textarea)[^{}]*:focus-visible\s*\{[^}]*background:\s*#fff",
        )

    def test_studio_and_budget_outputs_share_instrument_framing(self) -> None:
        studio_css = source("studio.css")
        budget_css = source("analytics/budget/styles.css")

        self.assertIn(".studio-result::before", studio_css)
        self.assertIn(".studio-result::after", studio_css)
        self.assertIn("background: var(--surface-2);", studio_css)
        self.assertIn('.budget-decision-canvas[data-phase="result"]', budget_css)
        self.assertIn(".budget-decision-canvas::after", budget_css)

    def test_reduced_motion_disables_new_state_transitions(self) -> None:
        tool_css = source("tool-shell.css")
        studio_css = source("studio.css")

        self.assertRegex(
            tool_css,
            re.compile(
                r"@media \(prefers-reduced-motion: reduce\).*?\.results::before",
                re.DOTALL,
            ),
        )
        self.assertRegex(
            studio_css,
            re.compile(
                r"@media \(prefers-reduced-motion: reduce\).*?\.studio-result",
                re.DOTALL,
            ),
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the focused test and verify the intended failures**

Run:

```bash
python3 -m unittest scripts.test_shared_shell_polish -v
```

Expected: failures for the still-nested homepage rail, missing sticky masthead/control tokens, missing locator/state rules, and missing shared output treatment.

- [ ] **Step 3: Commit the red test**

```bash
git add scripts/test_shared_shell_polish.py
git commit -m "test: define shared shell polish contract"
```

### Task 2: Build the sticky masthead and shared action hierarchy

**Files:**
- Modify: `index.html:189-213`
- Modify: `site.css:6-50,110-223,259-323,641-706,2380-2559,2795-3258`
- Test: `scripts/test_shared_shell_polish.py`

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

- [ ] **Step 5: Run the focused test and shared IA/font tests**

Run:

```bash
python3 -m unittest \
  scripts.test_shared_shell_polish \
  scripts.test_homepage_identity \
  scripts.test_site_ia \
  scripts.test_font_contract -v
```

Expected: homepage identity/IA/font contracts pass; shared-shell tests for header/actions/headings pass, while result/studio tests may remain red until Tasks 3 and 4.

- [ ] **Step 6: Commit the shared masthead and controls**

```bash
git add index.html site.css scripts/test_shared_shell_polish.py
git commit -m "feat: sharpen shared masthead and actions"
```

### Task 3: Add state-driven framing to calculator results

**Files:**
- Modify: `tool-shell.css:79-191,251-357,790-1040`
- Test: `scripts/test_shared_shell_polish.py`

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

- [ ] **Step 5: Run focused static and motion tests**

Run:

```bash
python3 -m unittest scripts.test_shared_shell_polish scripts.test_motion_integration -v
node --test tests/motion.test.js
```

Expected: tool-result, focus, motion, and sticky-offset contracts pass; studio/budget framing tests may remain red until Task 4.

- [ ] **Step 6: Commit the calculator workspace polish**

```bash
git add tool-shell.css scripts/test_shared_shell_polish.py
git commit -m "feat: frame calculator decisions as live outputs"
```

### Task 4: Align studio and budget decision surfaces

**Files:**
- Modify: `studio.css:17-52,108-178,237-324,374-498`
- Modify: `analytics/budget/styles.css:1-145,209-276,284-360`
- Test: `scripts/test_shared_shell_polish.py`

**Interfaces:**
- Consumes: shared surface, signal, radius, control, and focus tokens; existing `.studio-result`, `.choice`, `.metric`, and `.budget-decision-canvas[data-phase]` hooks.
- Produces: dark studio choice/focus treatments, framed `.studio-result`, phase-aware budget rails, and locator corners on the budget decision canvas.

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
.studio-result {
  position: relative;
  overflow: hidden;
  padding: 1.35rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-panel);
  background: var(--surface-2);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.26);
}

.studio-result::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent) 0 68%, var(--signal) 68%);
}

.studio-result::after {
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

Do not create a generic locator rule that would affect ordinary cards. Under reduced motion, disable `.studio-result` transitions and retain the final rail/locator state.

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

- [ ] **Step 4: Run the complete shared-shell contract**

Run:

```bash
python3 -m unittest scripts.test_shared_shell_polish -v
```

Expected: all shared-shell tests pass.

- [ ] **Step 5: Commit studio and budget alignment**

```bash
git add studio.css analytics/budget/styles.css scripts/test_shared_shell_polish.py
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
