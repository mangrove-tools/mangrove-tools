# Brand and IA Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable Calculators hub and Method page, establish the five-part site hierarchy, and give Home one primary route into Analytics without moving existing calculator URLs.

**Architecture:** Keep the static HTML/CSS/vanilla JavaScript architecture. Add two folder-index routes, update the existing nav/footer generator so duplicated page chrome stays consistent, and protect the resulting route/navigation contract with behavior-oriented Python tests.

**Tech Stack:** Static HTML5, CSS, Python 3 `unittest`, existing repository validator, local HTTP server, browser verification.

## Global Constraints

- Do not change Affiliate IDs or `AFFILIATE_URL`.
- Do not change Google Analytics identity `G-E20401V5WB`.
- Do not change Vercel, DNS, domain, production wiring, payments, secrets, or legal claims.
- Do not store or transmit raw calculator inputs.
- Keep `/letterroi/`, `/sponsorquote/`, `/subtarget/`, `/mediakit/`, and `/inventory/` at their existing public URLs.
- Keep `id="calculators"` on the homepage calculator section.
- Primary navigation order is Home, Analytics, Calculators, Method, About.
- Home has one filled primary hero action, `Explore Analytics`, linking to `/analytics/`.
- Use Source Serif 4 for display and IBM Plex Sans for body/UI; add no font dependency.
- Avoid “unlock insights,” “AI-powered,” “transform your business,” “toolbox,” “revolutionize,” “seamless,” and generic founder language.
- Run `python3 scripts/validate_site.py` and `python3 -m unittest discover -s scripts -p 'test_*.py' -v`.
- Capture desktop 1440×1000 and mobile 390×844 screenshots.
- Independently review exact HEAD before opening the pull request.

---

### Task 1: Protect the IA Contract

**Files:**
- Create: `scripts/test_site_ia.py`
- Modify: `scripts/test_public_metadata.py`

**Interfaces:**
- Consumes: existing static HTML routes and `scripts/apply-nav-footer.py`.
- Produces: a test contract for five ordered primary links, two new public routes, unchanged legacy calculator routes, and a single Analytics primary action.

- [ ] **Step 1: Write failing route and navigation tests**

Create an HTML parser that extracts links from `<nav class="site-nav">` and
assert that every public HTML page has these ordered `(href, text)` pairs:

```python
EXPECTED_NAV = [
    ("/", "Home"),
    ("/analytics/", "Analytics"),
    ("/calculators/", "Calculators"),
    ("/method/", "Method"),
    ("/about/", "About"),
]
```

Add tests that:

- assert `calculators/index.html` and `method/index.html` exist;
- assert the five legacy calculator directories still contain `index.html`;
- parse the homepage hero and find exactly one `.btn` link, with text
  `Explore Analytics` and `href="/analytics/"`;
- assert the homepage still contains an element with `id="calculators"`;
- assert `/calculators/` links to all five legacy calculator routes;
- assert `/method/` links to `/`, `/analytics/`, `/about/`, and `/privacy/`;
- copy `scripts/apply-nav-footer.py`, `about/index.html`, and `404.html` into a
  temporary repository fixture, execute the copied script, and assert the
  generated nav equals `EXPECTED_NAV`.

Update `scripts/test_public_metadata.py` so its hand-written public route set
includes:

```python
"https://mangrovetools.com/calculators/",
"https://mangrovetools.com/method/",
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
python3 -m unittest scripts.test_site_ia scripts.test_public_metadata -v
```

Expected: failures because `/calculators/`, `/method/`, the five-link nav, and
their sitemap/llms entries do not exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add scripts/test_site_ia.py scripts/test_public_metadata.py
git commit -m "test: define site IA contract"
```

### Task 2: Add Calculators and Method Routes

**Files:**
- Create: `calculators/index.html`
- Create: `method/index.html`
- Modify: `sitemap.xml`
- Modify: `llms.txt`

**Interfaces:**
- Consumes: existing page metadata, brand header/footer markup, and shared `site.css`.
- Produces: `/calculators/` and `/method/` public routes for the shared navigation.

- [ ] **Step 1: Implement `/calculators/`**

Use the existing head, skip link, atmosphere, header, breadcrumbs, shell, and
footer patterns. The page H1 is:

```html
<h1 id="hero-title">Precise utilities for bounded questions</h1>
```

Create two labelled sections:

```html
<h2>Revenue and pricing</h2>
<h2>Sales operations</h2>
```

The first section links LetterROI, SponsorQuote, and SubTarget. The second links
Media Kit Composer and Inventory Planner. Each entry includes one Inputs line and
one Output line. End with one quiet link:

```html
<a class="text-cta" href="/analytics/">Need a decision from historical data? Explore Analytics</a>
```

- [ ] **Step 2: Implement `/method/`**

Use one H1:

```html
<h1 id="hero-title">Useful models, visible limits</h1>
```

Add concise H2 sections named:

```text
Start with the decision
Work in the browser
Show the model
Use benchmarks carefully
State confidence and caveats
What the tools do not claim
```

Include natural inline links to `/`, `/analytics/`, `/about/`, and `/privacy/`.
State that results are estimates, assumptions can fail, benchmarks are
references rather than universal targets, and the tools do not provide legal,
financial, or guaranteed-performance advice.

- [ ] **Step 3: Register the routes**

Add canonical URLs to `sitemap.xml` and descriptive Markdown links to
`llms.txt`:

```text
https://mangrovetools.com/calculators/
https://mangrovetools.com/method/
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
python3 -m unittest scripts.test_site_ia scripts.test_public_metadata -v
```

Expected: route existence, route-content, sitemap, and llms assertions pass;
navigation and homepage-primary-action assertions remain red.

- [ ] **Step 5: Commit the routes**

```bash
git add calculators/index.html method/index.html sitemap.xml llms.txt
git commit -m "feat: add calculators and method routes"
```

### Task 3: Establish the Shared Five-Part Navigation

**Files:**
- Modify: `scripts/apply-nav-footer.py`
- Modify: `index.html`
- Modify: `404.html`
- Modify: `about/index.html`
- Modify: `analytics/index.html`
- Modify: `analytics/budget/index.html`
- Modify: `analytics/forecast/index.html`
- Modify: `calculators/index.html`
- Modify: `contact/index.html`
- Modify: `faq/index.html`
- Modify: `inventory/index.html`
- Modify: `letterroi/index.html`
- Modify: `mediakit/index.html`
- Modify: `method/index.html`
- Modify: `privacy/index.html`
- Modify: `sponsorquote/index.html`
- Modify: `subtarget/index.html`
- Modify: `site.css`

**Interfaces:**
- Consumes: `EXPECTED_NAV` from Task 1 and the two routes from Task 2.
- Produces: identical primary navigation and footer collection links across every public page.

- [ ] **Step 1: Update the nav/footer generator**

Generate links in this exact order:

```html
<a href="/">Home</a>
<a href="/analytics/">Analytics</a>
<a href="/calculators/">Calculators</a>
<a href="/method/">Method</a>
<a href="/about/">About</a>
```

Set `aria-current="page"` on the route family owning the current page. Treat the
five legacy newsletter routes as Calculators pages. Add Method to the Site
footer column and point the Calculators footer heading or collection link to
`/calculators/`.

- [ ] **Step 2: Apply and verify generated chrome**

Run:

```bash
python3 scripts/apply-nav-footer.py
python3 scripts/apply-nav-footer.py
git diff --exit-code
```

The first run updates pages. After staging those updates, the second run must
produce no additional diff relative to the staged result; use
`git diff --exit-code` after `git add` to prove idempotence.

- [ ] **Step 3: Set one homepage primary route**

Replace the two filled hero product buttons with:

```html
<a class="btn" href="/analytics/">Explore Analytics</a>
<a class="text-cta" href="/calculators/">Browse Calculators</a>
```

Leave the individual Budget Advisor and Revenue Forecaster entry links in the
following Analytics section. Keep `id="calculators"` on the homepage secondary
utility section.

- [ ] **Step 4: Add intentional 390px navigation layout**

At the mobile breakpoint:

```css
.top {
  align-items: flex-start;
  flex-direction: column;
}

.site-nav {
  display: grid;
  grid-template-columns: repeat(5, max-content);
  justify-content: space-between;
  width: 100%;
}
```

Use a compact responsive font size and gap that preserve at least the existing
tap-block height. Do not hide links or introduce a menu button.

- [ ] **Step 5: Run focused tests and refactor**

Run:

```bash
python3 -m unittest scripts.test_site_ia scripts.test_public_metadata -v
```

Expected: all focused tests pass.

Review repeated HTML changes and keep only changes produced by the nav/footer
generator plus the explicit homepage and CSS changes.

- [ ] **Step 6: Commit shared IA**

```bash
git add scripts/apply-nav-footer.py index.html 404.html about analytics calculators contact faq inventory letterroi mediakit method privacy sponsorquote subtarget site.css
git commit -m "feat: establish analytics-first site hierarchy"
```

### Task 4: Full Verification and Reviewable Visual Evidence

**Files:**
- Create: `docs/superpowers/screenshots/brand-ia-foundation/home-desktop.png`
- Create: `docs/superpowers/screenshots/brand-ia-foundation/home-390px.png`
- Create: `docs/superpowers/screenshots/brand-ia-foundation/calculators-desktop.png`
- Create: `docs/superpowers/screenshots/brand-ia-foundation/calculators-390px.png`
- Create: `docs/superpowers/screenshots/brand-ia-foundation/method-desktop.png`
- Create: `docs/superpowers/screenshots/brand-ia-foundation/method-390px.png`

**Interfaces:**
- Consumes: the complete branch.
- Produces: mechanical, browser, and screenshot evidence for independent exact-HEAD review.

- [ ] **Step 1: Run complete mechanical validation**

Run:

```bash
python3 scripts/validate_site.py
python3 -m unittest discover -s scripts -p 'test_*.py' -v
git diff --check origin/main...HEAD
```

Expected: validator passes, every unit test passes, and diff check has no output.

- [ ] **Step 2: Start and verify the local site**

Run:

```bash
python3 -m http.server 5173
```

Verify `/`, `/analytics/`, `/calculators/`, `/method/`, `/about/`, both Analytics
tools, and all five legacy calculator routes return meaningful pages without
console errors or error overlays.

- [ ] **Step 3: Verify desktop and 390px behavior**

At 1440×1000 and 390×844:

- confirm the five navigation links are visible and focusable;
- confirm `document.documentElement.scrollWidth === document.documentElement.clientWidth`;
- confirm current-page state is correct;
- confirm Home has one filled Analytics CTA;
- confirm all five calculator entries open their unchanged routes;
- confirm Method links to Home, Analytics, About, and Privacy.

- [ ] **Step 4: Save screenshots**

Capture full-page PNGs at the six exact paths listed above. Wait for
`document.fonts.ready` before capture.

- [ ] **Step 5: Commit evidence and run final checks**

```bash
git add docs/superpowers/screenshots/brand-ia-foundation
git commit -m "docs: add brand IA visual evidence"
python3 scripts/validate_site.py
python3 -m unittest discover -s scripts -p 'test_*.py' -v
git diff --check origin/main...HEAD
```

- [ ] **Step 6: Independent exact-HEAD review**

Record:

```bash
git rev-parse HEAD
git merge-base origin/main HEAD
```

Give the independent reviewer the approved design, implementation plan, exact
base/head SHAs, full diff, test evidence, screenshot paths, and global
constraints. Resolve every Critical or Important finding, re-run validation,
and re-review the fix before opening the ready pull request.
