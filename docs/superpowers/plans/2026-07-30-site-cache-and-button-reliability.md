# Site Cache and Button Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent mixed-version JavaScript/CSS deployments across every public route and make the Media Kit copy control provide the same fallback and visible status as the other calculators.

**Architecture:** Keep the static HTML/CSS/vanilla-JS architecture. Public pages will request byte-identical, SHA-256-fingerprinted copies of every local script and stylesheet while canonical source files remain the editing source of truth. The asset-versioning unit test will discover public local JS/CSS references instead of relying on a manually maintained allowlist. Media Kit will delegate clipboard behavior to the existing `MangroveToolExtras.wireCopyButton` helper.

**Tech Stack:** Static HTML, vanilla JavaScript, Python `unittest`, Node's built-in test runner, Vercel static hosting.

## Global Constraints

- Do not change affiliate IDs or `AFFILIATE_URL` values.
- Do not change Google Analytics identity.
- Do not change Vercel, DNS, domain, or production wiring.
- Do not change secrets, payments, legal claims, Supabase schema, or backend behavior.
- Preserve all routes and calculator behavior.
- Keep all user-entered data client-side.
- Respect the existing ready-PR and owner-approved merge/deploy gates.

---

### Task 1: Media Kit copy reliability

**Files:**
- Create: `tests/mediakit-app.test.js`
- Modify: `mediakit/app.js`
- Modify: `mediakit/index.html`

**Interfaces:**
- Consumes: `window.MangroveToolExtras.wireCopyButton(button, getSummary)`.
- Produces: a `buildRateSummary()` callback that returns `null` before a successful composition and a plain-text rate summary afterward.

- [x] **Step 1: Write the failing browser-contract test**

Create a Node VM test that loads the real `shared/tool-extras.js` and `mediakit/app.js` with a small DOM fixture. Assert that:

```js
assert.strictEqual(copyButton.disabled, true);
form.dispatchEvent({ type: 'submit', preventDefault() {} });
assert.strictEqual(copyButton.disabled, false);
copyButton.dispatchEvent({ type: 'click' });
await Promise.resolve();
assert.strictEqual(copyButton.textContent, 'Copied ✓');
assert.strictEqual(fallbackCopiedText, [
  'Mangrove Test media kit',
  'Primary: $450',
  'Band: $383 – $518',
  '$107.14 implied CPM'
].join('\n'));
```

The fixture must reject `navigator.clipboard.writeText()` so the test exercises the real fallback copy path and visible result state.

- [x] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/mediakit-app.test.js
```

Expected: FAIL because Media Kit does not disable/enable the copy button, does not use `wireCopyButton`, and does not show fallback status.

- [x] **Step 3: Implement the minimal copy integration**

In `mediakit/app.js`:

```js
const copyBtn = document.getElementById("copy-rates");

function buildRateSummary() {
  if (out.hidden) return null;
  return [
    document.getElementById("kit-name").textContent + " media kit",
    "Primary: " + document.getElementById("kit-primary").textContent,
    "Band: " + document.getElementById("kit-band").textContent,
    document.getElementById("kit-cpm").textContent,
  ].join("\n");
}
```

Enable `copyBtn` only after a valid `render()`, disable it on invalid output, remove the raw clipboard listener, and call:

```js
if (EXTRAS.wireCopyButton) {
  EXTRAS.wireCopyButton(copyBtn, buildRateSummary);
}
```

Add `disabled` to `#copy-rates` in `mediakit/index.html`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test tests/mediakit-app.test.js
```

Expected: PASS with fallback copy text and visible `Copied ✓` feedback.

- [x] **Step 5: Commit the completed button fix**

Run:

```bash
git add tests/mediakit-app.test.js mediakit/app.js mediakit/index.html
git commit -m "Harden Media Kit copy feedback"
```

---

### Task 2: Discover and fingerprint every public JS/CSS asset

**Files:**
- Modify: `scripts/test_asset_versioning.py`
- Modify: `index.html`
- Modify: `analytics/budget/index.html`
- Modify: `analytics/forecast/index.html`
- Modify: `letterroi/index.html`
- Modify: `sponsorquote/index.html`
- Modify: `subtarget/index.html`
- Modify: `mediakit/index.html`
- Modify: `inventory/index.html`
- Create: fingerprinted byte-identical copies beside each newly covered canonical asset.

**Interfaces:**
- Produces: `discover_cache_sensitive_assets(root: Path) -> set[str]`.
- Preserves: `asset_versioning_errors(root, asset_paths)` for focused fixtures while allowing `asset_paths=None` to use discovery.

- [x] **Step 1: Write failing discovery tests**

Add a temporary-site test that creates:

```html
<link rel="stylesheet" href="/styles.css">
<script src="/app.js"></script>
<link rel="canonical" href="/ignored.css">
<script src="https://example.com/external.js"></script>
```

Assert that discovery returns exactly `{"/styles.css", "/app.js"}`. Change the repository contract test to call `asset_versioning_errors(ROOT)` without a hand-maintained asset set.

- [x] **Step 2: Run the asset test and verify RED**

Run:

```bash
python3 -m unittest scripts.test_asset_versioning -v
```

Expected: FAIL first because discovery is undefined, then continue failing because 15 currently public local JS/CSS assets are unversioned.

- [x] **Step 3: Implement public-asset discovery**

Update `AssetReferenceParser` to collect only:

- `<script src>`
- `<link rel="stylesheet" href>`
- script preloads/modulepreloads

Add helpers that:

- exclude non-public directories such as `.git`, `.worktrees`, `docs`, `node_modules`, `scripts`, and `tests`;
- resolve root-relative and page-relative local paths;
- ignore external URLs;
- normalize a `name.<12 lowercase hex>.js|css` reference back to canonical `name.js|css`;
- return every canonical local `.js` or `.css` referenced by public HTML.

Make `asset_versioning_errors(root, asset_paths=None)` use discovery when `asset_paths` is omitted.

- [x] **Step 4: Run the focused test and confirm only real unversioned assets remain**

Run:

```bash
python3 -m unittest scripts.test_asset_versioning -v
```

Expected: FAIL with missing or unversioned fingerprint findings for Forecast, the homepage model, Budget page CSS, Studio CSS, and the five calculator app/config pairs.

- [x] **Step 5: Generate byte-identical fingerprints and update public HTML**

For every discovered canonical asset, compute:

```text
sha256(canonical bytes)[:12]
```

Create `stem.<digest>.js|css` beside the canonical file and replace the public HTML reference with that exact filename. Newly covered assets are:

```text
/analytics/budget/styles.css
/analytics/forecast/app.js
/shared/forecast-engine.js
/shared/letterroi-model.js
/studio.css
/letterroi/config.js
/letterroi/app.js
/sponsorquote/config.js
/sponsorquote/app.js
/subtarget/config.js
/subtarget/app.js
/mediakit/config.js
/mediakit/app.js
/inventory/config.js
/inventory/app.js
```

Do not modify canonical asset bytes except for the approved Media Kit behavior. Do not change any affiliate identifier; config fingerprints must be byte-identical copies.

- [x] **Step 6: Run the focused tests and verify GREEN**

Run:

```bash
python3 -m unittest scripts.test_asset_versioning -v
node --test tests/mediakit-app.test.js
```

Expected: PASS. Mutating any public reference back to an unversioned path or changing a fingerprint copy independently must make the asset test fail.

- [x] **Step 7: Commit the cache-safety sweep**

Stage the exact HTML, test, and generated asset paths, then run:

```bash
git commit -m "Fingerprint all public site assets"
```

---

### Task 3: Full verification, exact-head review, and ready PR

**Files:**
- Verify only; amend prior tasks only when evidence requires it.

**Interfaces:**
- Produces: one reviewed feature branch and a ready pull request against `main`.

- [ ] **Step 1: Run deterministic validation**

Run:

```bash
python3 scripts/validate_site.py
python3 scripts/validate_site.py --base-ref origin/main --allow-protected
python3 -m unittest discover -s scripts -p 'test_*.py' -v
node --test tests/*.test.js
git diff --check
```

The `--allow-protected` invocation is limited to byte-identical fingerprint copies of approved affiliate config files; no affiliate value may differ from its canonical source.

- [ ] **Step 2: Verify generated-file integrity**

Programmatically inspect every public local JS/CSS reference and assert:

- the referenced path exists;
- its digest segment equals `sha256(file bytes)[:12]`;
- its bytes equal the canonical source;
- no public local JS/CSS reference is unversioned.

- [ ] **Step 3: Verify visible behavior locally**

Serve the repository root and test desktop plus a 390px viewport:

- Budget sample data and allocation;
- Forecast sample data and manual add-month;
- LetterROI, SponsorQuote, SubTarget calculations and copy feedback;
- Media Kit compose and rejected-clipboard fallback feedback;
- Inventory plan and reset;
- no horizontal overflow or page console errors on affected routes.

Capture desktop and 390px screenshots of the changed Media Kit result/copy state.

- [ ] **Step 4: Request independent exact-head review**

Dispatch a read-only reviewer with:

```text
Base: origin/main
Head: current branch HEAD
Requirements: this plan plus the approved cache and Media Kit findings
```

Fix all Critical and Important findings, rerun the full verification commands, and request another exact-head review if HEAD changes materially.

- [ ] **Step 5: Push and open a ready PR**

Push `agent/site-cache-safety`, open a ready PR against `main`, and include:

- root cause and affected routes;
- exact cache-safety approach;
- Media Kit fallback behavior;
- test counts;
- desktop and 390px screenshot paths;
- confirmation that affiliate IDs, GA identity, Vercel wiring, backend, and production were unchanged;
- explicit note that the owner must apply `protected-change-approved` because new byte-identical config fingerprints contain unchanged protected affiliate lines.

Do not merge or deploy.
