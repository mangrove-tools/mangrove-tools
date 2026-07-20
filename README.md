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

Publish the **entire repo root** (not a tool subfolder). No build step.

**Leaving Netlify → Porkbun:** domain is already at Porkbun. Turn on Static Hosting + GitHub Connect to `main` — see `docs/setup/PORKBUN_HOSTING.md`.

**Stronger edge (CSP / redirects):** Porkbun DNS + [Cloudflare Pages](https://pages.cloudflare.com/) — see `docs/setup/CLOUDFLARE_PAGES.md`.

**Backup:** Netlify via `netlify.toml` (pause after Porkbun smoke-check).

Production DNS / custom-domain cutover requires owner approval.

Live URLs:

- `https://mangrovetools.com/`
- `https://mangrovetools.com/letterroi/`
- `https://mangrovetools.com/sponsorquote/`
- `https://mangrovetools.com/method/`
- `https://mangrovetools.com/lead-dev/`

## Affiliate

- `letterroi/config.js` → `via=letterroi`
- `sponsorquote/config.js` → `via=sponsorquote`
- `subtarget/config.js` → `via=subtarget`
- Optional unused codes: `via=mangrove`, `via=leaddev` — see `docs/setup/AFFILIATE_VIA_CODES.md`
- Do not change affiliate IDs without approval.

## Lead-Dev checkout

Configure Kit + cohort checkout URLs in `lead-dev/config.js`. DWY is email-only.
Setup checklist: `docs/setup/LEAD_DEV_REVENUE.md`.
Affiliate via codes to create: `docs/setup/AFFILIATE_VIA_CODES.md`.

## Agent ops

Standing rules: `AGENTS.md`  
Backlog / strategy: `docs/ops/`
