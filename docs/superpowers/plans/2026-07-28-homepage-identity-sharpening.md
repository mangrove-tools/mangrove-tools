# Homepage Identity Sharpening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sharpen the homepage into a calm, premium decision instrument while preserving the existing chart geometry, content, IA, and non-homepage behavior.

**Architecture:** Keep the current static homepage and SVG intact, adding semantic framing and focus hooks in `index.html`, homepage-scoped presentation in `site.css`, and a small progressive-enhancement state controller in `shared/motion.js`. Lock the chart geometry with a parser-based regression test, exercise interaction behavior through the existing Node motion harness, and satisfy the repository’s content-addressed shared-asset contract.

**Tech Stack:** Static HTML, CSS custom properties, vanilla JavaScript, Python `unittest`, Node `assert`, Playwright/browser verification, Git/GitHub CLI.

## Global Constraints

- Preserve the existing decision graph `viewBox`, grid paths, uncertainty band, response curves, bound marker, point geometry, labels, legend, and three readout messages.
- Scope visual changes to the homepage. Other pages may receive only mechanically required fingerprint URL updates for shared assets.
- Do not alter affiliate identifiers, Google Analytics identity, production wiring, legal claims, Supabase/backend behavior, secrets, or unrelated files.
- Motion must be progressive enhancement, non-looping, and immediately static under `prefers-reduced-motion`.
- Verify at desktop and 390px, including horizontal overflow, keyboard focus, pointer/touch selection, and reduced motion.

---

### Task 1: Lock the real instrument and add semantic homepage controls

**Files:**
- Create: `scripts/test_homepage_identity.py`
- Modify: `index.html`
- Test: `scripts/test_homepage_identity.py`

- [ ] **Step 1: Write the failing geometry and semantics contract**

  Parse the real homepage and assert:

  - the exact current SVG `viewBox` and `d` values for both grid paths, the uncertainty band, both response curves, and the two bound paths;
  - the exact current bound rectangle and point coordinates;
  - the three existing axis labels, legend labels, and readout messages remain present and ordered;
  - the homepage header exposes a three-part evidence/bound/recheck rail;
  - the primary `/analytics/` link retains its accessible text while containing separate label and arrow regions;
  - the three readout cells expose keyboard-focusable `observation`, `bound`, and `recheck` hooks.

  This catches accidental graph redraws, copy loss, CTA-label regressions, or non-interactive readout markup.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `python3 -m unittest scripts.test_homepage_identity -v`

  Expected: failures for the missing rails, CTA split, and focus hooks while the geometry assertions pass.

- [ ] **Step 3: Add only the framing markup**

  In `index.html`:

  - add a decorative three-segment header signal rail labeled in accessible hidden text as evidence, bounded move, and recheck;
  - split the primary CTA into a visible label span and an `aria-hidden` arrow span without changing its accessible name or destination;
  - add four corner locator marks around the existing figure;
  - add a compact evidence/bound/recheck rail above the unchanged plot;
  - make the existing three readout cells focusable and map them to `observation`, `bound`, and `recheck`.

- [ ] **Step 4: Run the focused contract test and verify GREEN**

  Run: `python3 -m unittest scripts.test_homepage_identity -v`

- [ ] **Step 5: Commit the locked markup**

  ```bash
  git add index.html scripts/test_homepage_identity.py
  git commit -m "feat: frame homepage decision instrument"
  ```

---

### Task 2: Add linked graph focus states test-first

**Files:**
- Modify: `tests/motion.test.js`
- Modify: `shared/motion.js`

- [ ] **Step 1: Extend the fake element harness and write failing behavior tests**

  Exercise `initDecisionInstrument()` against real event behavior:

  - pointer entry and keyboard focus apply a transient `data-focus-state`;
  - leaving or blurring a readout restores a click-selected state while the
    visitor remains inside the instrument;
  - clicking a readout selects it and selecting another replaces it;
  - leaving the instrument clears the selection;
  - `Escape` clears the selection;
  - reduced-motion mode skips entrance frames but retains instantaneous focus behavior;
  - missing query/event APIs fail safely.

  This catches dead touch/keyboard controls, sticky transient states, multiple competing selections, and reduced-motion interaction loss.

- [ ] **Step 2: Run the Node test and verify RED**

  Run: `node tests/motion.test.js`

  Expected: the new focus-state assertions fail because no controller is attached.

- [ ] **Step 3: Implement the small state controller**

  In `shared/motion.js`:

  - query the figure’s `[data-instrument-focus]` cells;
  - maintain one selected state in closure;
  - preview on pointer/focus and restore the selection on leave/blur;
  - persist or replace selection on click;
  - clear on instrument exit or `Escape`;
  - attach the controller before the reduced-motion/static entrance branches.

  Do not redraw the SVG, add timers, or create looping animation.

- [ ] **Step 4: Run the Node test and verify GREEN**

  Run: `node tests/motion.test.js`

- [ ] **Step 5: Commit the interaction**

  ```bash
  git add shared/motion.js tests/motion.test.js
  git commit -m "feat: link decision readouts to graph focus"
  ```

---

### Task 3: Apply the homepage-scoped premium instrument styling

**Files:**
- Modify: `site.css`
- Modify: `scripts/test_motion_integration.py`
- Test: `scripts/test_motion_integration.py`

- [ ] **Step 1: Add failing integration assertions for state styling**

  Require CSS hooks for all three focus states and an explicit reduced-motion rule. The test catches a controller that changes data attributes without any corresponding visual treatment.

- [ ] **Step 2: Run the focused integration test and verify RED**

  Run: `python3 -m unittest scripts.test_motion_integration -v`

- [ ] **Step 3: Implement the approved visual system**

  In homepage-scoped CSS:

  - set the hero headline to IBM Plex Sans at weight `500`, approximately `-0.025em` tracking, and a precise line height;
  - strengthen the header lockup with a localized pine glow and a conceptual three-part rail;
  - style locator corners and the instrument rail without changing SVG geometry;
  - make the primary CTA a rounded pine label plus amber arrow control with a 44px minimum target;
  - emphasize the relevant existing curve, point, band, bound, legend, and readout for each linked state while only gently quieting unrelated marks;
  - keep all transitions inside `prefers-reduced-motion: no-preference` and make reduced states immediate;
  - tune the 390px layout so the CTA label, arrow, graph, legend, rail, and stacked readouts do not clip or overlap.

- [ ] **Step 4: Run the focused CSS integration test and verify GREEN**

  Run: `python3 -m unittest scripts.test_motion_integration -v`

- [ ] **Step 5: Commit the visual treatment**

  ```bash
  git add site.css scripts/test_motion_integration.py
  git commit -m "style: sharpen homepage instrument identity"
  ```

---

### Task 4: Fingerprint, verify, review, and open the ready PR

**Files:**
- Create: `site.<sha12>.css`
- Create: `shared/motion.<sha12>.js`
- Modify: public HTML references required by `scripts/test_asset_versioning.py`
- Create: `docs/superpowers/screenshots/homepage-identity-sharpening/home-desktop.png`
- Create: `docs/superpowers/screenshots/homepage-identity-sharpening/home-390px.png`

- [ ] **Step 1: Prove stale asset references fail**

  Run: `python3 -m unittest scripts.test_asset_versioning -v`

  Expected: failures naming the new missing CSS and motion fingerprints.

- [ ] **Step 2: Create byte-identical fingerprinted copies and update references**

  Compute the first 12 characters of each canonical asset’s SHA-256, copy each canonical asset to that exact versioned filename, and mechanically replace only its old fingerprinted URL across public HTML. Keep old fingerprinted files so already-cached pages remain valid.

- [ ] **Step 3: Run all automated checks**

  ```bash
  python3 scripts/validate_site.py
  python3 -m unittest discover -s scripts -p 'test_*.py' -v
  node tests/motion.test.js
  git diff --check
  ```

- [ ] **Step 4: Run browser verification**

  Serve the exact worktree and verify:

  - desktop homepage composition and each pointer/keyboard focus state;
  - 390px homepage with `scrollWidth <= 390`, unclipped CTA text, and usable tap selection;
  - reduced-motion mode shows the completed graph immediately and changes focus state without animation;
  - `/analytics/`, `/analytics/budget/`, `/analytics/forecast/`, `/calculators/`, `/method/`, and `/about/` load without console errors or visible regression;
  - one representative calculator still computes successfully.

  Capture the final desktop and 390px screenshots at the paths above.

- [ ] **Step 5: Commit the exact tested asset set and evidence**

  ```bash
  git add site.*.css shared/motion.*.js '*.html' analytics calculators method about letterroi sponsorquote subtarget mediakit inventory docs/superpowers/screenshots/homepage-identity-sharpening
  git commit -m "chore: version homepage identity assets"
  ```

  Inspect the staged paths before committing so no unrelated file is included.

- [ ] **Step 6: Independently review the exact head**

  Record `git rev-parse HEAD`, then run a read-only reviewer against exactly `origin/main...HEAD`. Resolve any actionable finding, rerun the affected checks, and repeat the exact-head review if HEAD changes.

- [ ] **Step 7: Push and open a ready PR**

  Push `codex/homepage-identity-sharpening`, open a non-draft PR with the approved scope, test evidence, desktop and 390px screenshots, exact reviewed head, and explicit “do not merge or deploy without owner approval” note. Confirm live CI, mergeability, and PR state before handoff.
