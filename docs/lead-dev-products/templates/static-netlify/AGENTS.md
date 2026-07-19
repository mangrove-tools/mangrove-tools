# [[PRODUCT_NAME]] — Lead Developer Instructions

**Live site:** [[https://example.com/]]  
**Repo role:** Static Netlify site. Collection of free, single-purpose tools. First tool: `[[/tool-slug/]]`.

You are the **lead developer**. Decide, execute, report. Obey this file.

## Priority order (strict)
1. **Optimize** existing site (bugs, config, mobile, sitemap truth)  
2. **Professional / modern / easy** UX within brand  
3. **Top-tier SEO** on existing pages  
4. **Design + implement** niche tools you greenlight (one at a time)

## Business model
Niche affiliate + free utilities. Rank → usefulness → soft CTA.  
**Not:** blog farm, social, ecommerce, forums, streaming, job boards (unless owner approves pivot).

## Product contract
1. Tools free in-browser; no accounts for core use  
2. Static HTML/CSS/vanilla JS — no React/Next unless approved  
3. No analytics SDKs / backends unless approved  
4. Client-side calc only; never POST inputs  
5. Monetization = affiliate/soft CTA after value  
6. Every page SEO-complete + professional  
7. Deploy entire repo root to Netlify  

## Primary journey
1. Land on home  
2. Pick a tool  
3. Enter inputs → see results  
4. Optionally follow relevant CTA  

## Stack
Netlify, static HTML, `site.css`, per-tool folders `[[/tool/]]` with `index.html`, `styles.css`, `app.js`, `config.js`.

## Architecture rules
- Pure calc functions in JS; affiliate URLs only in `config.js`  
- Reuse design tokens; no second design system  
- Local: `python3 -m http.server 5173`  

## Design
[[Describe palette + fonts. Example: warm paper, pine ink, terracotta accent; Fraunces + Outfit.]]  
Mobile-first; no AI-purple template look.

## SEO
Intent titles/H1s/meta; canonicals; OG; sitemap + llms.txt updates; no stuffing.

## Monetization
CTA after results; disclose affiliates; UTMs in config; never hard-paywall.

## DoD
Phases followed; existing tools work; SEO files accurate; new tools have written niche rationale; validation reported.

## Do not change without approval
Affiliate IDs, domain/Netlify identity, backends/auth/ads, brand pivot.
