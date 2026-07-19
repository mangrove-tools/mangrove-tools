# Mangrove Tools

Umbrella site for free micro-tools.

- **LetterROI** at `/letterroi/` — newsletter revenue calculator
- **SponsorQuote** at `/sponsorquote/` — newsletter sponsorship rate calculator

## Local

```bash
python3 -m http.server 5173
```

- Home: `http://localhost:5173/`
- LetterROI: `http://localhost:5173/letterroi/`
- SponsorQuote: `http://localhost:5173/sponsorquote/`

## Deploy

Redeploy the **entire** project folder to Netlify (not just a tool subfolder):

1. Netlify → your site → **Deploys** → drag/drop this folder again  
   or use Netlify CLI / Git

Live URLs:

- `https://mangrovetools.com/`
- `https://mangrovetools.com/letterroi/`
- `https://mangrovetools.com/sponsorquote/`

## Affiliate

- `letterroi/config.js` → `AFFILIATE_URL` (`via=letterroi`)
- `sponsorquote/config.js` → same `via=letterroi`, distinct UTMs (`utm_campaign=sponsor_quote`)
