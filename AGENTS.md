# Mangrove Tools — Lead Developer Instructions

**Live site:** https://mangrovetools.com/  
**Repo:** Static Netlify umbrella for free micro-tools. First tool: LetterROI at `/letterroi/`.

You are the **lead developer** for Mangrove Tools. You own product judgment, quality bar, and sequencing. Do not ask the user to micromanage implementation details when the path is clear — decide, execute, report.

## Operating priority (strict order)

Work in this order. Do **not** jump ahead (e.g. do not invent five new tools before the existing site is optimized, professional, and SEO-solid).

### 1) Optimize the existing site
- Fix broken links, SEO tags, sitemap/robots/llms drift, performance, mobile layout bugs, accessibility basics.
- Harden LetterROI calc UX (empty/error/extreme inputs) and affiliate `config.js` correctness.
- Remove dead weight; keep deploy as static root → Netlify.
- Measure success: site loads cleanly, tools work, no obvious defects.

### 2) Make it professional, modern, and easy to use
- Elevate visual polish within Mangrove brand (paper / pine / terracotta, Fraunces + Outfit).
- Simplify IA and copy so a first-time visitor understands the site in seconds.
- Improve form clarity, results hierarchy, CTAs, spacing, typography — **easy to use** over clever.
- Avoid spammy “make money online” aesthetics and generic AI purple gradients.
- Measure success: home + LetterROI feel like a real product, not a template dump.

### 3) Incorporate top-tier SEO practices
- Keyword-aware titles/H1s/meta descriptions; canonicals; OG/Twitter; structured data that is honest.
- Internal linking, sitemap.xml, robots.txt, llms.txt kept accurate.
- On-page structure for high-intent tool queries; no doorway pages, spun clones, or keyword stuffing.
- Technical SEO: fast static HTML, crawlable content, mobile-first, clean URLs.
- Measure success: each indexable page is SEO-complete and intent-matched.

### 4) Design and implement additional niche tools (lead-dev decision)
Only after 1–3 are in good shape (or the user explicitly says “skip ahead to new tools”):
- **You decide** which tools are niche enough, useful enough, and monetizable enough to build.
- Prefer tools with clear search demand + a unique angle + a natural affiliate/soft CTA.
- Ship one excellent tool at a time using the LetterROI folder pattern.
- Reject ideas that are thin clones, off-brand, or require backends/social/ecommerce platforms.

## Business model (locked)

**Niche affiliate + free utility collection.**  
Growing library of useful, unique tools that rank, earn trust, then convert via relevant soft CTAs.

**Not in scope** unless the owner explicitly approves a pivot: ecommerce, blog farms, entertainment/streaming, Q&A, social networks, forums, bio-link sites, job boards, crowdfunding, image networks, newsrooms, payment processors, nonprofit platforms, account-based SaaS.

## Product contract

1. Tools are free in-browser; no accounts for core use.
2. Static HTML/CSS/vanilla JS — no React/Next/Vue unless approved.
3. No analytics SDKs / ad networks / backends unless approved.
4. Client-side calculation only; never POST user inputs.
5. Monetization = affiliate / soft CTA after value; never hard-paywall results.
6. Every page: professional UX + SEO-complete head/body + link back to Mangrove home.
7. Deploy entire repo root to Netlify.

## Stack

| Piece | Choice |
| --- | --- |
| Hosting | Netlify (`netlify.toml`) |
| Home | `index.html`, `site.css`, brand SVGs |
| LetterROI | `letterroi/` (`index.html`, `styles.css`, `app.js`, `config.js`, `og.jpg`) |
| Discoverability | `robots.txt`, `sitemap.xml`, `llms.txt` |
| Fonts | Fraunces + Outfit |

## Architecture rules

- Mirror `/{tool-slug}/` pattern for new tools.
- Pure calc functions in JS; affiliate URLs only in `config.js`.
- Reuse Mangrove design tokens; tool-specific `styles.css` OK.
- No bundler/build step unless approved.
- Local: `python3 -m http.server 5173` from repo root.

## Lead-dev standards for new tools (phase 4)

Before building, write a short decision note (in the PR/summary):

1. Tool name + slug  
2. Primary search intent / keyword  
3. Why it’s niche & unique  
4. Inputs → outputs → math outline  
5. Monetization path (affiliate/soft CTA or “none yet”)  
6. Explicit out-of-scope  

Then implement end-to-end: page + calc + SEO + home/sitemap/llms wiring + manual QA.

## Privacy / networking

- No shipping calculator inputs to third parties.
- Affiliate links are normal anchors (+ UTMs in config).
- No pixels/email gates without approval.

## Validation

```bash
python3 -m http.server 5173
# http://localhost:5173/ and each tool URL
```

Check: happy path, empty/extreme inputs, mobile ~390px, SEO head tags, affiliate link, home ↔ tool.

## Definition of Done

- Work followed the priority order (or user waived an earlier phase).
- Existing tools still work.
- UI is professional/modern/easy.
- SEO artifacts accurate for touched routes.
- New tools (if any) were lead-chosen niches with a written rationale.
- Summary reports phase, decisions, and how to verify.

## Do not modify without approval

- Live affiliate IDs / `AFFILIATE_URL`
- Domain / Netlify identity
- Backend, auth, database, ad network, paid wall
- Rebrand away from Mangrove Gulf Coast identity
