# Production-readiness audit — Mangrove Tools

**Date:** 2026-07-20  
**Repo SHA context:** `main` / feature branch `cursor/mangrove-workflow-foundation-f444`  
**Live:** https://mangrovetools.com/ — **verified reachable** (earlier 403 note is obsolete)

## Classification legend

BLOCKER · HIGH · MEDIUM · LOW · MANUAL VERIFICATION

## Verified checks (2026-07-20)

| Check | Result |
| --- | --- |
| Public routes HTTP | 200 for all sitemap URLs + studio tools |
| Bare slug redirects | 301 → trailing slash |
| www / http | 301 → https://mangrovetools.com/ |
| `/docs/*`, `AGENTS.md`, `README.md`, `/deliver/` listing | 404 / protected as configured |
| `python3 scripts/check-links.py` | OK — 19 HTML files |
| Live ↔ local home bytes | SHA-256 match |
| GA | `G-E20401V5WB` on pages |
| Lead-Dev Stripe | Payment Links present + HTTP 200 |
| Deliver pages | Present, noindex |
| Security headers | `nosniff`, `Referrer-Policy`, HSTS (Netlify); **no CSP** |
| Privacy / About / Contact | Live |
| Automated unit/e2e | None |

## Findings

### BLOCKER

- None for operating the free-tool site.

### HIGH

- None open for core browsing/calculating.  
- **Owner responsibility:** Stripe payout/tax/product correctness and deliver zip freshness (outside agent autonomy).

### MEDIUM

- No Content-Security-Policy (`netlify.toml`).  
- Calculator CSS duplication → regression risk on visual changes.  
- No automated visual/a11y CI.  
- Ops docs previously stale vs live Stripe (addressed in workflow PR).

### LOW

- Some studio pages missing `og:locale`; walkthrough lacks JSON-LD.  
- Stub `styles.css` files under mediakit/inventory.

### MANUAL VERIFICATION

- Real-device mobile / keyboard / screen reader  
- Full Stripe purchase → deliver download  
- Affiliate + GA verification in vendor dashboards  
- Contrast audit across all studio steps  

## Release posture

| Item | Status |
| --- | --- |
| Static deploy model | Sound |
| SEO discoverability | Strong |
| Placeholder checkout | **Resolved** — live Payment Links in `lead-dev/config.js` |
| Experimental UI rewrite | **Not approved** — follow backlog IDs |
| Production deploy of risky changes | Still prefer owner approval / preview deploys |

## Rollback

Netlify prior deploy + git revert of feature branch. No database migrations.
