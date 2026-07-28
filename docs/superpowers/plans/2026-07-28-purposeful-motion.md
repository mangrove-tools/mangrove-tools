# Purposeful Motion Implementation Plan

> **Execution note:** Implement with tests first. Preserve a fully visible
> no-JavaScript baseline and independently review exact HEAD.

**Goal:** Add one-shot homepage story progression and replayable analytics
result-state feedback, with a strict reduced-motion branch.

**Architecture:** A small shared `window.MangroveMotion` helper owns preference
detection, story initialization, result reveal, and result reset. Existing
pages opt in through script tags and explicit render-state calls.

## Task 1: Lock the motion contract

Add `tests/motion.test.js` and include it in the existing Node product test
runner. Assert:

- the public helper exposes story init, result reveal, and result reset;
- reduced-motion story init does not construct an observer;
- a normal story becomes ready and then active when intersecting;
- successful results move from updating to ready across animation frames;
- reduced-motion and missing-frame environments become ready synchronously;
- reset clears the result state;
- missing DOM elements are no-ops.

Run the focused Node test and confirm it fails because the helper is absent.

## Task 2: Implement progressive enhancement

Add `shared/motion.js` with no dependencies:

- detect reduced motion at call time;
- initialize the homepage story only when supported;
- never hide static content before the helper opts in;
- observe the story once and disconnect after activation;
- replay valid result state with two animation frames;
- reset invalid result state;
- initialize the homepage story after DOM readiness.

Run the focused test and make it pass.

## Task 3: Integrate the three pages

- Add a stable homepage story hook and load `/shared/motion.js`.
- Load the helper before each analytics app.
- In Budget Advisor and Revenue Forecaster, call reset in invalid branches and
  reveal after the successful result DOM is complete.
- Do not change calculations, validation, events, charts, or copy.

Add or extend focused static tests for script order and integration calls.

## Task 4: Add scoped visual states

- In `site.css`, add one-shot homepage stage/progress transitions only under
  the helper-controlled state.
- In `tool-shell.css`, add a brief results-ready accent and content settle.
- Reuse existing timing tokens and the global reduced-motion override.
- Preserve mobile widths, sticky results behavior, and no-JavaScript display.

## Task 5: Verify locally

Run:

```bash
node tests/motion.test.js
python3 scripts/validate_site.py --base-ref origin/main
python3 -B -m unittest discover -s scripts -p 'test_*.py' -v
git diff --check
```

Verify the diff does not touch protected identities, analytics math, event
payloads, backend/storage, affiliate configuration, or production wiring.

## Task 6: Browser evidence

Using an isolated browser profile and the local root server:

- verify homepage at desktop and true emulated 390px;
- scroll the story into view and confirm ready → active, then one-shot
  disconnect behavior;
- emulate reduced motion and confirm the story stays visible without observer
  state;
- run sample data in both analytics tools and confirm result ready state,
  replay, valid content, no console/runtime errors, and no overflow;
- capture full-page desktop and 390px screenshots after stable states;
- visually inspect and commit the evidence under
  `docs/superpowers/screenshots/purposeful-motion/`.

## Task 7: Review and publish

1. Commit implementation and evidence.
2. Independently review the exact SHA and screenshots.
3. Fix and re-review all Critical and Important findings.
4. Push the reviewed exact HEAD.
5. Open a ready PR with summary, routes/files, verification, screenshots,
   review notes, risks, and an explicit not-yet-merged/deployed note.
6. Merge and verify main CI, Vercel production, and public-route smoke only
   after all checks and owner gates pass.
