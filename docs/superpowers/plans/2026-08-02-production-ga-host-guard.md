# Production-Only Google Analytics Host Guard Implementation Plan

> **For Codex:** Execute this plan with the superpowers:executing-plans workflow and verify each checkpoint before moving on.

**Goal:** Prevent Mangrove Tools preview and local hosts from loading Google Analytics while preserving the approved production measurement identity and product-event behavior.

**Architecture:** Replace the duplicated Google tag snippets in public HTML with one fingerprinted, synchronous first-party loader. The loader performs an exact hostname check before it creates Google's asynchronous script element or initializes `dataLayer`, so non-production pages make no Google Analytics request and expose no `gtag` queue. A Node `vm` contract test executes the real browser artifact against production and non-production host fixtures.

**Tech Stack:** Static HTML, vanilla JavaScript, Node built-in test runner, Python unittest site contracts.

---

### Task 1: Add a production-host analytics contract

**Files:**
- Create: `tests/google-analytics-loader.test.js`
- Modify: `scripts/test_product_javascript.py`

- [ ] Add a runtime fixture that executes the loader with a fake DOM and hostname.
- [ ] Assert `mangrovetools.com` loads and configures only `G-E20401V5WB`.
- [ ] Assert localhost, Vercel preview, and Netlify preview hosts do not load or initialize Google Analytics.
- [ ] Run `node --test tests/google-analytics-loader.test.js` and confirm it fails because the loader does not exist yet.

### Task 2: Implement the shared loader and head contract

**Files:**
- Create: `shared/google-analytics.js`
- Create: `shared/google-analytics.<content-hash>.js`
- Modify: all public `*.html` files currently containing the Google tag snippet
- Modify: `scripts/upgrade-analytics-head.py`
- Modify: `scripts/test_asset_versioning.py`
- Modify: `scripts/test_budget_advisor_contract.py`

- [ ] Add the exact production-host guard before any Google-owned script or `dataLayer` initialization.
- [ ] Generate the content-identical fingerprinted asset and reference it from every current Google-tagged page.
- [ ] Update the analytics head upgrade helper to emit the guarded loader reference.
- [ ] Add the loader to the cache-sensitive asset contract.
- [ ] Run the targeted Node contract and asset-versioning test until both pass.

### Task 3: Verify and prepare the ready PR

**Files:**
- Verify only

- [ ] Run `python3 scripts/validate_site.py --base-ref origin/main --allow-protected` because the approved change intentionally preserves the protected GA identity while moving its markup.
- [ ] Run `python3 -m unittest discover -s scripts -p 'test_*.py' -v`.
- [ ] Run `node --test tests/*.test.js` and `git diff --check`.
- [ ] Verify the exact diff contains no affiliate, GA identity, deployment, secret, backend, or unrelated changes.
- [ ] Commit, independently review the exact head, push, open a ready PR, and verify its checks without merging or deploying to production.
