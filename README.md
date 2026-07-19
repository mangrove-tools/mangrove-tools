# Mangrove Tools

Umbrella site for free micro-tools and Lead-Dev offers.

- **LetterROI** at `/letterroi/` — newsletter revenue calculator
- **SponsorQuote** at `/sponsorquote/` — newsletter sponsorship rate calculator
- **Method** at `/method/` — free Lead-Dev methodology article
- **Lead-Dev** at `/lead-dev/` — kit, cohort, and done-with-you offers
- **About / Privacy / Contact** at `/about/`, `/privacy/`, `/contact/`

## Local

```bash
python3 -m http.server 5173
```

Optional link check:

```bash
python3 scripts/check-links.py
```

- Home: `http://localhost:5173/`
- LetterROI: `http://localhost:5173/letterroi/`
- SponsorQuote: `http://localhost:5173/sponsorquote/`
- Method: `http://localhost:5173/method/`
- Lead-Dev: `http://localhost:5173/lead-dev/`

## Deploy

Redeploy the **entire** project folder to Netlify (not just a tool subfolder).
Production deploy requires owner approval.

Live URLs:

- `https://mangrovetools.com/`
- `https://mangrovetools.com/letterroi/`
- `https://mangrovetools.com/sponsorquote/`
- `https://mangrovetools.com/method/`
- `https://mangrovetools.com/lead-dev/`

## Affiliate

- `letterroi/config.js` → `AFFILIATE_URL` (`via=letterroi`)
- `sponsorquote/config.js` → same `via=letterroi`, distinct UTMs (`utm_campaign=sponsor_quote`)
- Do not change affiliate IDs without approval.

## Lead-Dev checkout / booking

Configure URLs in `lead-dev/config.js`. Setup checklist: `docs/setup/LEAD_DEV_REVENUE.md`.

## Agent ops

Standing rules: `AGENTS.md`  
Backlog / strategy: `docs/ops/`
