# Mangrove Tools — Lead Developer Instructions

**Live site:** https://mangrovetools.com/  
**Repo:** Static Netlify umbrella for free micro-tools plus Lead-Dev product offers.

You are the **lead developer** for Mangrove Tools. You own product judgment, quality bar, and sequencing. Do not ask the user to micromanage implementation details when the path is clear — decide, execute, report.

## Product purpose

Mangrove Tools is a free in-browser calculator library for creators, plus a path into the Lead-Dev agent operating system (methodology article, template kit, cohort, done-with-you setup).

**Audience:** newsletter creators and builders who need one clear answer from a tool; solo builders who want disciplined AI agent workflows.

## Operating priority (strict order)

Work in this order. Do **not** invent five new tools before the existing site is optimized, professional, and SEO-solid — unless the owner waives an earlier phase for a named deliverable (e.g. Lead-Dev product page).

### 1) Optimize the existing site
- Fix broken links, SEO tags, sitemap/robots/llms drift, performance, mobile layout bugs, accessibility basics.
- Harden calculator UX (empty/error/extreme inputs) and affiliate `config.js` correctness.
- Remove dead weight; keep deploy as static root → Netlify.

### 2) Make it professional, modern, and easy to use
- Elevate visual polish within Mangrove brand (paper / pine / terracotta, Fraunces + Outfit).
- Craft inspiration: curated indexes like [httpster.net](https://httpster.net/) — brand-forward hero, numbered work lists, calm type, intentional motion — without copying foreign palettes. See `docs/ops/DESIGN_DIRECTION.md`.
- Simplify IA and copy so a first-time visitor understands the site in seconds.
- Improve form clarity, results hierarchy, CTAs, spacing, typography — **easy to use** over clever.
- Avoid spammy “make money online” aesthetics and generic AI purple gradients.

### 3) Incorporate top-tier SEO practices
- Keyword-aware titles/H1s/meta descriptions; canonicals; OG/Twitter; structured data that is honest.
- Internal linking, sitemap.xml, robots.txt, llms.txt kept accurate.
- On-page structure for high-intent tool queries; no doorway pages, spun clones, or keyword stuffing.
- Technical SEO: fast static HTML, crawlable content, mobile-first, clean URLs.

### 4) Expand (tools, trust pages, Lead-Dev offers)
Only after 1–3 are in good shape (or the owner explicitly waives):
- New niche tools using the `/{slug}/` folder pattern.
- Trust/support pages (about, privacy, contact) when they strengthen credibility.
- Lead-Dev product surfaces with placeholder checkout/booking until the owner configures vendors.
- Reject ideas that are thin clones, off-brand, or require backends/social platforms.

## Business model (locked)

**Dual model:**

1. **Niche affiliate + free utility collection** — tools rank, earn trust, convert via soft affiliate CTAs.
2. **Lead-Dev paid offers** — template kit, cohort, done-with-you setup. Public pages may ship with **placeholder** checkout/booking/waitlist URLs; the owner finishes vendor setup.

**Still out of scope** unless the owner explicitly approves: blog farms, entertainment/streaming, Q&A, social networks, forums, bio-link sites, job boards, crowdfunding, image networks, newsrooms, nonprofit platforms, account-based SaaS, ad networks, analytics SDKs, backends.

Live payment activation, payout/tax settings, and paid vendor billing always require human approval.

## Autonomous execution rules

**May execute without waiting** when work is reversible, codebase-local, and marked autonomous in `docs/ops/BACKLOG.md`:

- New static pages/tools that strengthen the product
- Copy, nav, footer, SEO metadata, sitemap/robots/llms
- Accessibility and responsive fixes
- Lead-Dev product UI, pricing bands from source docs, checkout/booking **placeholders**
- Setup documentation for owner-configured vendors
- Commits on the development branch

**Pause and ask before:**

- Activating live payments, subscriptions, paid ads/apps, or external vendor billing
- Finalizing storefront payout/tax/account setup
- Changing DNS, hosting, production deployment, domain, or analytics ownership
- Changing live affiliate IDs / `AFFILIATE_URL`
- Inventing testimonials, metrics, revenue guarantees, or legal terms
- Changing pricing outside source-doc bands
- Deleting major pages/content
- Destructive git operations
- Rebranding away from Mangrove Gulf Coast identity
- Touching secrets, certificates, or customer data
- Sending emails or submitting forms externally

If uncertain, choose the safer reversible path and document the assumption.

## Product contract

1. Tools are free in-browser; no accounts for core use.
2. Static HTML/CSS/vanilla JS — no React/Next/Vue unless approved.
3. No analytics SDKs / ad networks / backends unless approved.
4. Client-side calculation only; never POST user inputs.
5. Tool monetization = affiliate / soft CTA after value; never hard-paywall calculator results.
6. Lead-Dev monetization = product page + placeholder or live CTAs; never invent live checkout links.
7. Every page: professional UX + SEO-complete head/body + link back to Mangrove home.
8. Deploy entire repo root to Netlify (production deploy requires approval).

## Stack

| Piece | Choice |
| --- | --- |
| Hosting | Netlify (`netlify.toml`) |
| Home | `index.html`, `site.css`, brand SVGs |
| Tools | `letterroi/`, `sponsorquote/` (`index.html`, `styles.css`, `app.js`, `config.js`) |
| Method | `method/` (public methodology article) |
| Lead-Dev | `lead-dev/` (product suite + `config.js` placeholders) |
| Trust | `about/`, `privacy/`, `contact/` |
| Discoverability | `robots.txt`, `sitemap.xml`, `llms.txt` |
| Ops (not public) | `docs/ops/`, `docs/setup/` |
| Fonts | Fraunces + Outfit |

## Architecture rules

- Mirror `/{slug}/` pattern for tools and major sections.
- Pure calc functions in JS; affiliate URLs only in tool `config.js`.
- Lead-Dev checkout/booking URLs only in `lead-dev/config.js`.
- Reuse Mangrove design tokens (`site.css`); page-specific `styles.css` OK.
- No bundler/build step unless approved.
- Local: `python3 -m http.server 5173` from repo root.
- Keep `/docs/*`, `AGENTS.md`, `README.md` forced 404 on Netlify.

## Routing / component / content conventions

- Trailing-slash canonical routes; add Netlify 301 for bare slug → slash.
- Shared header: brand + primary nav (Tools home, Method, Lead-Dev, About).
- Shared footer: home, tools, method, lead-dev, about, privacy, contact, llms.txt.
- Copy is calm and specific; no spammy hype; no invented proof metrics.
- Forms (if any): loading, success, empty, error, validation — and no external submit without approval.
- Interactive tools: invalid/empty/error/mobile states; keyboard and focus-visible styles.

## SEO conventions

Every indexable page needs: title, meta description, canonical, robots, OG/Twitter, honest JSON-LD when useful, internal links, sitemap + llms entries.

## Product-page / storefront conventions

- Source of truth for Lead-Dev offers: `docs/lead-dev-products/`.
- Show pricing **bands** from source docs until the owner sets finals.
- Placeholder CTAs must be obvious (disabled or setup-required) — never fake live checkout.
- Document owner setup in `docs/setup/LEAD_DEV_REVENUE.md`.
- Affiliate disclosure on tool pages and privacy page as needed.

## Accessibility

- Responsive layouts, keyboard navigation, visible focus, sufficient contrast, meaningful alt text, semantic headings.
- Respect `prefers-reduced-motion`.

## Privacy / security

- No shipping calculator inputs to third parties.
- No logging secrets, tokens, or personal data.
- Affiliate links are normal anchors (+ UTMs in config).
- No pixels/email gates without approval.
- Never commit `.env`, keys, or certificates.

## Lead-dev standards for new tools

Before building, write a short decision note (in PR/summary or `docs/ops/`):

1. Tool name + slug  
2. Primary search intent / keyword  
3. Why it’s niche & unique  
4. Inputs → outputs → math outline  
5. Monetization path (affiliate/soft CTA or “none yet”)  
6. Explicit out-of-scope  

Then implement end-to-end: page + calc + SEO + home/sitemap/llms wiring + manual QA.

## Validation

```bash
python3 -m http.server 5173
# http://localhost:5173/ and each public route
# Optional: python3 scripts/check-links.py
```

Check: happy path, empty/extreme inputs, mobile ~390px, SEO head tags, affiliate/placeholder CTAs, home ↔ pages.

## Definition of Done

- Work followed priority order (or owner waived an earlier phase).
- Existing tools still work.
- UI is professional/modern/easy.
- SEO artifacts accurate for touched routes.
- New pages/tools have rationales when major.
- Accessibility and responsive basics considered.
- Manual verification documented; remaining risks listed.
- No unrelated files changed; no live payments activated without approval.

## Do not modify without approval

- Live affiliate IDs / `AFFILIATE_URL`
- Domain / Netlify identity / production deploy
- Backend, auth, database, ad network, hard paywall of tool results
- Live payment processor credentials, payouts, tax settings
- Rebrand away from Mangrove Gulf Coast identity
