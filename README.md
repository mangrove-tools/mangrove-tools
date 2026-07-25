# Mangrove Tools

Free **marketing analytics** for small businesses and founders, plus a free **newsletter calculator** library. From Naples, Florida.

- **Marketing analytics** (primary) — `/analytics/`
  - **Budget Advisor** at `/analytics/budget/` — marketing budget optimizer with marginal ROI and recommended allocation
  - **Revenue Forecaster** at `/analytics/forecast/` — trend, seasonality, and scenario forecasting
- **Newsletter calculators** (secondary; SEO surface) — `/letterroi/`, `/sponsorquote/`, `/subtarget/`, `/mediakit/`, `/inventory/`
- **Trust** — `/about/`, `/faq/`, `/privacy/`, `/contact/`

## Local

```bash
python3 -m http.server 5173
```

Optional link check:

```bash
python3 scripts/check-links.py
```

- Home: `http://localhost:5173/`
- Analytics: `http://localhost:5173/analytics/`
- LetterROI: `http://localhost:5173/letterroi/`

## Deploy

Publish the **entire repo root** (not a tool subfolder). No build step.

**Production host:** Vercel — `vercel.json` is the source of truth for rewrites, headers (CSP, security, cache), and the 404 rules for `/docs/*` and `*.md`. See `AGENTS.md` for the standing product contract.

The site no longer ships legacy Porkbun, Cloudflare Pages, or Netlify configuration. `vercel.json` and `.vercelignore` are the deployment source of truth.

Live URLs:

- `https://mangrovetools.com/`
- `https://mangrovetools.com/analytics/`
- `https://mangrovetools.com/analytics/budget/`
- `https://mangrovetools.com/analytics/forecast/`
- `https://mangrovetools.com/letterroi/`
- `https://mangrovetools.com/sponsorquote/`
- `https://mangrovetools.com/subtarget/`
- `https://mangrovetools.com/mediakit/`
- `https://mangrovetools.com/inventory/`

## Affiliate

- `letterroi/config.js` → `via=letterroi`
- `sponsorquote/config.js` → `via=sponsorquote`
- `subtarget/config.js` → `via=subtarget`
- Do not change affiliate IDs without approval.

## Agent ops

Standing rules: `AGENTS.md` · Operations: `docs/ops/`
