# Site Cache and Media Kit Reliability Design

## Outcome

Replace stale PR #32 with a current-main change that fixes the still-reproducible
Media Kit copy-state defect and closes the remaining public-asset discovery gap.
The replacement must not reapply obsolete fingerprints or overwrite the visual
system shipped by PRs #33 and #34.

## Confirmed problems

1. `/mediakit/` enables **Copy rates** before a valid kit has been composed. A
   user can therefore invoke an empty copy action.
2. The current handler calls the Clipboard API only when it exists and gives no
   visible success or fallback path when that API is absent or rejects access.
3. `scripts/test_asset_versioning.py` protects a manually maintained subset of
   public CSS and JavaScript. A newly referenced local asset can bypass the
   fingerprint contract until someone remembers to update the allowlist.

## Design

### Media Kit copy state

- Author `#copy-rates` as disabled in HTML so the correct state exists before
  JavaScript runs.
- Keep it disabled when validation fails and enable it only after the rendered
  kit is complete.
- Build the copied summary from rendered, controlled output fields only. Return
  no copy value while the result is hidden.
- Delegate Clipboard API handling, rejected-permission fallback, and temporary
  `Copied ✓` feedback to the existing `MangroveToolExtras.wireCopyButton`
  helper. Do not create a second clipboard implementation.

### Public asset discovery

- Inspect public HTML only; exclude repository-only trees such as `docs/`,
  `scripts/`, `tests/`, `.git/`, `.worktrees/`, and `node_modules/`.
- Treat local `<script src>`, stylesheet links, module preloads, and script
  preloads as cache-sensitive references. Ignore external URLs and unrelated
  links such as canonicals.
- Derive the canonical path by removing only a terminal twelve-hex-character
  fingerprint immediately before `.css` or `.js`.
- Associate each reference directly with that canonical path. Do not use prefix
  matching, so names such as `app.js` and `app.helper.js` cannot overlap.
- For every discovered canonical asset, require a matching fingerprinted file,
  byte identity, a fingerprinted public reference, and no query-string cache
  busting.

## Constraints

- Preserve all affiliate IDs and `AFFILIATE_URL` values, Google Analytics
  identity, Vercel configuration, routing, backend behavior, and calculator
  math.
- Do not add dependencies or use Vercel paid-plan features.
- The changed fingerprinted Media Kit application file may trigger the
  repository's protected-change gate because it contains the protected
  `AFFILIATE_URL` symbol. The value remains unchanged; an owner-applied
  `protected-change-approved` label is still required if CI requests it.

## Verification

- TDD Node coverage proves copy starts disabled, invalid composition leaves it
  disabled, valid composition enables it, and rejected Clipboard API access
  falls back with the exact controlled summary and visible feedback.
- TDD Python coverage proves discovery includes all public local CSS/JS,
  excludes non-public/external references, and distinguishes overlapping
  canonical filenames.
- Run the canonical validator, all Python tests, all Node tests, and
  `git diff --check`.
- Verify `/mediakit/` at desktop and 390px, including invalid and valid compose
  states and the denied-clipboard fallback, with no console errors or overflow.

## Owner-approved fingerprint reconciliation

Automatic discovery exposes thirteen current public JavaScript assets that are
still referenced without content fingerprints. The owner approved one
mechanical reconciliation pass: copy the exact current canonical bytes to their
derived fingerprint paths and update only the corresponding HTML references.
This does not authorize logic, configuration-value, affiliate-value, or routing
changes, and it must not reuse stale generated files from PR #32.

## Non-goals

- No JavaScript or CSS logic rewrite during fingerprint reconciliation.
- No Media Kit redesign or new calculator fields.
- No Budget Advisor changes in this PR.
- No merge or deployment before the exact head passes independent review and
  the protected-change gate is satisfied if triggered.

## Verification evidence — 2026-08-03

Exact command output, browser states, and evidence-capture details are recorded
in the implementation plan. The screenshots use synthetic, non-user fixture
values only and are recorded in
`docs/superpowers/screenshots/site-cache-media-kit-reliability/`.
