# MangroveTools.com — Site Audit

**Date:** 2026-07-19  
**Scope:** Repository + attempted live fetch. Read-only at audit time; V1.0 implementation follows on `mangrovetools-development`.

## Verified facts

| Finding | Evidence |
| --- | --- |
| Static Netlify site, no bundler | No `package.json`; `netlify.toml`; HTML/CSS/JS |
| Public routes | `/`, `/letterroi/`, `/sponsorquote/`, `404.html` |
| Tools shipped | `letterroi/`, `sponsorquote/` with `config.js` affiliate pattern |
| Discoverability | `robots.txt`, `sitemap.xml` (3 URLs), `llms.txt` |
| Brand tokens | `site.css` — paper/pine/terracotta, Fraunces + Outfit |
| Docs blocked from public | `netlify.toml` force-404 `/docs/*`, `AGENTS.md`, `README.md` |
| Lead-Dev source (private) | `docs/lead-dev-products/`, `docs/lead-dev-methodology-article.md` |
| No privacy/about/contact pages | No matching HTML routes |
| No automated tests | No test runner or CI scripts |
| Affiliate URL | `letterroi/config.js` / `sponsorquote/config.js` — beehiiv `via=letterroi` |
| Ignore files | `.gitignore` + `.cursorignore` added in baseline commit |

## Reasonable inferences

- Primary visitor is a newsletter creator seeking a free calculator answer.
- Soft affiliate CTA after value is the current monetization path.
- Home IA is tool-directory focused; Lead-Dev revenue path is undocumented on the public site.
- Site feels more complete as a tool library than as a brand/trust destination (missing about/privacy/contact).

## Manual verification required

| Item | Status |
| --- | --- |
| Live `https://mangrovetools.com/` fetch from agent environment | **403 Forbidden** (2026-07-19) — verify in browser |
| Production deploy matches `main` | Confirm in Netlify dashboard |
| Affiliate link resolves correctly | Open LetterROI CTA in browser |
| Mobile layout on real devices | Spot-check after V1.0 |

## Architecture summary

1. **What it does:** Free niche calculators (newsletter revenue, sponsorship rates).  
2. **Audience:** Creators/builders.  
3. **Journeys:** Home → tool → calculate → optional affiliate CTA.  
4. **Nav:** Brand-only header; minimal footer.  
5. **Complete vs missing:** Tools look complete; trust + Lead-Dev + methodology pages missing.  
6. **Framework:** Static HTML; folder routes; Netlify redirects.  
7. **Styling:** Shared `site.css` + per-tool CSS.  
8. **State:** Client-side only in tool `app.js`.  
9. **Integrations:** Affiliate anchors only; no analytics SDK.  
10. **SEO:** Strong on tools/home; sitemap will need new routes for V1.0.  
11. **A11y:** Focus styles present; expand nav landmarks for V1.0.  
12. **Security/privacy:** Client-side calc; no input POST — good. No public privacy page yet.

## Production-readiness blockers (pre-V1.0)

- No public privacy policy page  
- No Lead-Dev conversion path  
- Methodology article only in `/docs` (404 on live)  
- Live site verification blocked from this environment (403)

## Recommended action plan

See `SITE_STRATEGY_V1.md` and `BACKLOG.md`.
