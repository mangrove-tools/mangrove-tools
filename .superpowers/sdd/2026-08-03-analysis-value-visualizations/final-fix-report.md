# Final fix report: analysis value visualizations

Status: DONE_WITH_CONCERNS

## Scope and commits

- Worktree: `/Users/kylelawlor/Development/mangrove-tools/.worktrees/analysis-value-visualizations`
- Branch: `codex/analysis-value-visualizations`
- Reviewed base: `6ae9980208716356458abef18f82864db7c615b4`
- Fix implementation: `1168c8b6ea4cd963f8fb6bfbbc1b84f32d4e259a` (`fix: clarify Budget plan value visuals`)
- Scope remained limited to Budget presentation, the shared chart renderer, their behavioral tests, the approved design/plan, fingerprint references, and refreshed evidence images.
- `shared/budget-allocator.js`, `shared/marginality-engine.js`, analytics collection, affiliate/GA/Vercel wiring, APIs, and Forecast application behavior were not changed.
- No push, pull request, merge, deployment, or external mutation was performed.

## Finding resolution

### 1. No-curve modeled outcome

Resolved. The result projection now determines modeled-outcome availability from the number of modeled allocation rows instead of trusting allocator totals that are correctly initialized to zero. A successful fixed plan with no admitted response curve therefore renders `Unavailable`, keeps the controlled explanation, and omits the empty outcome details list and canvas.

Behavioral coverage uses allocator-shaped totals with `currentPredictedOutcome: 0` and `predictedOutcome: 0`, plus a full-DOM fixed-plan submission. This closes the previous test gap created by substituting `null` totals.

### 2. Preserved baseline semantics

Resolved without changing optimization or marginality behavior. The existing recent-period-median automatic preserved baseline remains intact. The UI now distinguishes:

- `Current (latest observed rate)`;
- `Recommended plan` for modeled channels;
- `Preserved plan baseline` for unsupported preserved channels; and
- `Excluded plan` for explicit exclusions.

Readiness identifies preserved channels as `Preserved from recent-period median`. The panel explains that current uses the latest observed rate, the automatic preserved plan baseline uses the recent-period median and is not optimized, and a manual amount replaces that baseline. The shared chart legend now uses the truthful umbrella label `Plan`, not `Recommended`.

The sample regression proves the distinction with Local partnerships at `$5,460` current versus `$5,415` preserved plan. The approved design and implementation plan were corrected to match the preserved-baseline decision.

### 3. Higher-channel-count allocation geometry

Resolved. `prepareCanvas` accepts a minimum layout height and applies it before bitmap sizing. Allocation charts now use `max(300px, row count * 28px + 28px)`, so twelve valid rows render at 364px rather than being compressed into the former fixed 300px layout.

The focused 266px test renders twelve rows, asserts that CSS height expands, asserts bitmap height matches layout height, finds every current/plan value pair, requires at least 11px between their label centers, and retains full bounds checks. Browser evidence at exactly 390px confirmed the same twelve-row case at CSS `278.8125 x 364` and bitmap `278 x 364`, with document `scrollWidth === 390`.

### 4. Approved headings

Resolved. The allocation panel is titled `Where the budget moves`. The outcome panel title is metric-specific: `Modeled-channel expected revenue` or `Modeled-channel expected conversions` in the tested objectives. The design and implementation-plan sample markup now agree with runtime behavior.

## Test-driven sequence

Production changes were made only after focused behavioral tests failed for the requested behavior.

Observed RED evidence:

- twelve allocation rows stayed at 300px, failing `12 rows should expand the CSS layout height`;
- the allocation legend lacked `Plan`;
- an allocator-shaped no-model result exposed `$0` instead of `Unavailable`;
- the no-model DOM retained an empty outcome `<dl>`;
- preserved sample copy lacked latest-observed versus recent-median semantics;
- allocation and outcome headings remained generic;
- readiness still labeled the preserved row `Preserved at recent spend` and its status copy did not identify the recent-period median.

Focused GREEN evidence after implementation:

- chart regressions: 2/2 passed;
- initial Budget regressions: 4/4 passed;
- readiness regressions: 2/2 passed;
- final focused allocator/chart/Budget suite: 131/131 passed.

The tests exercise output and DOM behavior rather than source-string or documentation assertions.

## Fingerprints and references

- Canonical `analytics/budget/app.js` SHA-256: `5ac126e5395272012e32e04cac2cd0d49b641c1b504d15bfd8b30282f56eb0aa`.
- Public copy: `analytics/budget/app.5ac126e53952.js`; byte-identical and hash-prefix correct.
- Canonical `shared/charts.js` SHA-256: `56290ecdfbc2ddfa8bd9ab23e3c6a1e89e9757f9e45773eb3a8631ad9910d9a4`.
- Public copy: `shared/charts.56290ecdfbc2.js`; byte-identical and hash-prefix correct.
- The superseded `app.48909593f3e9.js` and `charts.87e258718718.js` files were removed.
- Budget references the new app and shared-chart fingerprints; Forecast references the new shared-chart fingerprint.

## Deterministic verification at the implementation commit

1. `PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_site.py --base-ref origin/main`
   - Expected exit 1: six checks passed; only `protected change requires owner approval label: AGENTS.md` failed.
2. `PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_site.py --base-ref origin/main --allow-protected`
   - Exit 0; 7/7 checks passed under the explicit local owner-approval assertion.
3. `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v`
   - Exit 0; 72/72 passed.
4. `node --test tests/*.test.js`
   - Exit 0; 202/202 passed, 0 failed, 0 skipped.
5. `node --test tests/budget-allocator.test.js tests/charts.test.js tests/budget-app.test.js`
   - Exit 0; 131/131 passed.
6. `git diff --check origin/main...HEAD` and staged/working-tree diff checks
   - Exit 0; no whitespace errors.
7. Privacy and language scans
   - No `fetch`, `XMLHttpRequest`, `sendBeacon`, `localStorage`, `sessionStorage`, or console sink was added to the changed runtime files.
   - No causal-lift, guaranteed-return/performance, or calibrated-confidence wording was introduced.
8. Scope checks
   - No diff in allocator, marginality engine, tool extras, Forecast application code, API code, or Vercel configuration.
   - Task 5 Step 8 and the final-delivery checkbox remain unchecked.

Because this report is committed after the implementation, the exact SHA and clean-status result for the report-only final commit are necessarily recorded in the final handoff after that commit is created. The same required suites are rerun against that exact HEAD.

## Browser and screenshot evidence

Local browser verification used `agent-browser 0.27.0` against `python3 -m http.server 5173` and was closed afterward.

Desktop sample at 1440 x 1500:

- document `scrollWidth` was 1440;
- both approved headings, the `Current`/`Plan` legend, and the latest-observed/recent-median preserved explanation were visible;
- allocation canvas was CSS `390.8125 x 300`, bitmap `390 x 300`;
- outcome canvas was CSS `390.8125 x 220`, bitmap `390 x 220`;
- no console entries, page errors, overlay, storage writes, or calculator-input API request appeared.

Normal sample at exactly 390px:

- `innerWidth === 390` and `scrollWidth === 390`;
- the readiness row showed `Local partnerships / Preserved from recent-period median`;
- panels stacked without page-level overflow;
- allocation canvas was CSS `278.8125 x 300`, bitmap `278 x 300`;
- outcome canvas was CSS `278.8125 x 220`, bitmap `278 x 220`;
- text equivalents fit their containers, and no console/page error, overlay, storage write, or API request appeared.

Additional exact-390px states:

- twelve-channel valid plan: twelve rows, allocation canvas CSS `278.8125 x 364`, bitmap `278 x 364`, inline height `364px`, and document `scrollWidth === 390`;
- preserved-only fixed plan: summary `Predicted modeled-channel Conversions / Unavailable`, controlled explanation present, zero outcome canvases, zero outcome detail lists, and document `scrollWidth === 390`.

Refreshed evidence:

- `docs/superpowers/screenshots/analysis-value-visualizations/budget-value-desktop.png`: genuine RGB PNG, 1440 x 1500, 261061 bytes;
- `docs/superpowers/screenshots/analysis-value-visualizations/budget-value-390px.png`: genuine RGB PNG, 390 x 11276, 797082 bytes.

Both images were inspected at original detail. The desktop capture is clean and includes the revised Plan value section. The mobile full-page capture and focused crops show readable stacked panels, revised preserved semantics, contained table behavior, and no page-level clipping.

## Review and remaining gate

- A supplemental fix-range reviewer reported no actionable issue during its implementation, regression, fingerprint, and privacy review. The controller retained ownership of the authoritative scoped exact-HEAD re-review and pull-request decision.
- The only known gate is intentional: GitHub CI must receive the owner-applied `protected-change-approved` label for the existing protected `AGENTS.md` change. Local `--allow-protected` validation does not create or replace that label.
- Task 5 Step 8 and final delivery remain unchecked. No push, PR, merge, or deploy was performed.
