# Homepage Analytical Story Implementation Plan

> **Execution note:** Follow test-driven development and verify exact HEAD before
> publishing.

**Goal:** Reframe the homepage around a concrete three-stage analytical story
while preserving analytics as the primary product path.

**Architecture:** Keep the site static. Add semantic homepage HTML and scoped
shared CSS only. No JavaScript is required for this PR; the separate motion PR
will enhance the stable structure later.

**Files:**

- Modify: `index.html`
- Modify: `site.css`
- Add: `scripts/test_homepage_story.py`
- Add: `docs/superpowers/screenshots/homepage-story/homepage-desktop.png`
- Add: `docs/superpowers/screenshots/homepage-story/homepage-390px.png`

## Task 1: Lock the content contract

1. Add a focused parser-based test for the homepage story.
2. Assert one labelled three-stage sequence in ordered semantic markup.
3. Assert the example label, evidence table headings, decision cap, recheck
   window, and stop/revise condition are present as controlled concepts.
4. Assert the hero keeps exactly one filled `/analytics/` action and one
   secondary `/calculators/` action.
5. Run the focused test and confirm it fails for the missing story.

## Task 2: Implement the editorial story

1. Tighten the hero promise and supporting copy.
2. Replace the generic hero chart with an explicitly illustrative decision
   brief.
3. Add the three-stage evidence → checks → boundary sequence after the hero.
4. Keep the existing analytics cards, calculator anchor, trust content, and FAQ
   routes intact.
5. Run the focused test and make it pass.

## Task 3: Build the responsive visual treatment

1. Add scoped styles for the brief, stage sequence, example table, checks, and
   boundary card.
2. Use existing tokens, fonts, quiet rules, and tabular numerals.
3. Collapse the sequence cleanly to one column on narrow screens.
4. Avoid motion in this PR.
5. Run focused tests and `git diff --check`.

## Task 4: Verify the full repository

Run:

```bash
python3 scripts/validate_site.py
python3 -m unittest discover -s scripts -p 'test_*.py' -v
git diff --check
```

Confirm the diff contains no affiliate identity, Google Analytics identity,
deployment, secret, backend, analytics engine, or unrelated changes.

## Task 5: Browser evidence

1. Serve the repository root locally.
2. Verify `/` at desktop and 390px.
3. Check status, heading order, CTA destinations, console errors, font loading,
   and horizontal overflow.
4. Capture and visually inspect full-page desktop and 390px screenshots.
5. Commit the two screenshots under the paths listed above.

## Task 6: Independent exact-HEAD review and PR

1. Commit the implementation.
2. Ask an independent reviewer to inspect the exact commit and screenshots.
3. Address any Critical or Important findings and repeat verification/review.
4. Push the reviewed exact HEAD.
5. Open a ready PR with summary, routes/files, commands/results, screenshots,
   independent review notes, risks, and an explicit not-yet-merged/deployed
   note.
6. Merge and verify production only after all required checks and owner gates
   pass.
