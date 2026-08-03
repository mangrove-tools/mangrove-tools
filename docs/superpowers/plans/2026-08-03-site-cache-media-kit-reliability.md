# Site Cache and Media Kit Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stale PR #32 with a current-main reliability change that hardens Media Kit copy behavior and automatically protects every public local CSS/JS asset.

**Architecture:** Extend the existing Python asset contract so references map directly to canonical assets discovered from public HTML. Keep Media Kit rendering in its existing application file and delegate clipboard/fallback behavior to the established shared tool helper.

**Tech Stack:** Static HTML, vanilla JavaScript, Node's built-in test runner, Python `unittest`, existing fingerprinted-asset convention.

## Global Constraints

- Preserve affiliate IDs and `AFFILIATE_URL` values, Google Analytics identity, Vercel configuration, routes, calculator math, and backend behavior.
- Add no dependency or Vercel paid-plan feature.
- Work from `origin/main`; do not port stale generated assets from PR #32.
- Use TDD for every behavior change and watch each focused test fail for the expected reason before implementation.
- Do not merge or deploy before independent exact-HEAD review and any required owner-applied protected-change label.

---

### Task 1: Discover and verify every public cache-sensitive asset

**Files:**
- Modify: `scripts/test_asset_versioning.py`

**Interfaces:**
- Produces: `public_html_files(root: Path) -> list[Path]`
- Produces: `canonical_asset_path(reference_path: str) -> str`
- Produces: `discover_cache_sensitive_assets(root: Path) -> set[str]`
- Changes: `asset_versioning_errors(root: Path, asset_paths: set[str] | None = None) -> list[str]`

- [ ] **Step 1: Write the failing discovery and overlap tests**

Add tests with temporary public/nested/docs HTML fixtures. Assert that local
stylesheets, script preloads, and scripts are discovered; external/canonical and
docs references are ignored. Include both `/app.<hash>.js` and
`/app.helper.<hash>.js` and assert they map to `/app.js` and `/app.helper.js`
independently.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_asset_versioning.AssetVersioningTests.test_discovers_every_public_local_script_and_stylesheet -v
```

Expected: FAIL because the discovery interface and behavior do not exist.

- [ ] **Step 3: Implement direct canonical discovery**

Add a terminal fingerprint regex, public HTML filtering, cache-bearing link
classification, exact canonical mapping, and optional automatic discovery in
`asset_versioning_errors`. Replace prefix-family association with direct
canonical association for discovered references.

- [ ] **Step 4: Run the focused and full asset tests and verify GREEN**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_asset_versioning -v
```

Expected: all asset-versioning tests pass against the current public tree.

- [ ] **Step 5: Commit the asset contract**

```bash
git add scripts/test_asset_versioning.py
git commit -m "test: discover all public cache-sensitive assets"
```

### Task 2: Make Media Kit copy state truthful and resilient

**Files:**
- Create: `tests/mediakit-app.test.js`
- Modify: `mediakit/app.js`
- Modify: `mediakit/index.html`
- Create: `mediakit/app.<sha12>.js`
- Delete: the obsolete tracked fingerprinted Media Kit application copy referenced before this change

**Interfaces:**
- Consumes: `window.MangroveToolExtras.wireCopyButton(button, getText)`
- Produces: `buildRateSummary() -> string | null` inside the Media Kit application closure

- [ ] **Step 1: Write the failing behavior tests**

Execute the real `shared/tool-extras.js` and `mediakit/app.js` in a controlled
DOM fixture. Assert the button starts disabled; an invalid submit leaves it
disabled; a valid submit enables it; and a rejected Clipboard API call falls
back to the exact rendered rate summary and changes the label to `Copied ✓`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/mediakit-app.test.js
```

Expected: FAIL because current production enables copy before a valid result and
does not use the shared rejected-clipboard fallback.

- [ ] **Step 3: Implement the minimal Media Kit change**

Author the button with `disabled`, keep it disabled on invalid rendering, enable
it after a successful render, build summary text only from visible output, and
wire it through `wireCopyButton`. Do not alter rates, affiliate values, or
analytics events.

- [ ] **Step 4: Regenerate only the changed Media Kit fingerprint**

Compute the first twelve SHA-256 hex characters of `mediakit/app.js`, copy those
exact bytes to `mediakit/app.<sha12>.js`, update the single script reference in
`mediakit/index.html`, and remove the obsolete tracked fingerprinted copy.

- [ ] **Step 5: Run the focused Node test and asset contract and verify GREEN**

Run:

```bash
node --test tests/mediakit-app.test.js
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.test_asset_versioning -v
```

Expected: all focused tests pass and the fingerprint copy byte-matches its
canonical source.

- [ ] **Step 6: Commit the Media Kit repair**

```bash
git add mediakit/app.js mediakit/index.html mediakit/app.*.js tests/mediakit-app.test.js
git commit -m "fix: harden Media Kit copy feedback"
```

### Task 3: Validate and review the replacement PR head

**Files:**
- Modify: `docs/superpowers/specs/2026-08-03-site-cache-media-kit-reliability-design.md`
- Modify: `docs/superpowers/plans/2026-08-03-site-cache-media-kit-reliability.md`
- Create: `docs/superpowers/screenshots/site-cache-media-kit-reliability/mediakit-desktop.png`
- Create: `docs/superpowers/screenshots/site-cache-media-kit-reliability/mediakit-390px.png`

**Interfaces:**
- Produces: an exact reviewed Git HEAD suitable for a replacement pull request against `main`

- [ ] **Step 1: Run the complete deterministic suite**

```bash
python3 scripts/validate_site.py --base-ref origin/main
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
```

Expected: all checks pass, except the validator may report only the documented
protected-change label requirement for the regenerated affiliate-bearing script.

- [ ] **Step 2: Verify the browser behavior**

Serve the repository root on port 5173. At desktop and 390px, verify initial
disabled state, invalid submit, valid compose, rejected Clipboard API fallback,
visible copied feedback, `scrollWidth === clientWidth`, and no console errors.

- [ ] **Step 3: Capture evidence and commit documentation**

Save desktop and 390px screenshots under the declared screenshot directory,
record exact commands/results in the plan, and commit only the scoped docs and
screenshots.

- [ ] **Step 4: Request independent exact-HEAD review**

Give the reviewer `origin/main`, exact `HEAD`, this design, this plan, protected
boundaries, and fresh verification output. Resolve every Critical or Important
finding before publishing.

- [ ] **Step 5: Push and open the replacement PR**

Open a ready PR against `main` with summary, changed routes/files, validation,
desktop/390px evidence, independent review notes, remaining risks, and an
explicit note that the stale PR #32 is superseded. Do not apply the protected
label as an agent.
