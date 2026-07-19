# Production-readiness audit — MangroveTools V1.0 (branch)

**Branch:** `mangrovetools-development`  
**Date:** 2026-07-19  
**Deploy:** Not performed (requires owner approval)

## Validation run

| Check | Result |
| --- | --- |
| `python3 scripts/check-links.py` | OK — 9 HTML files, no broken internal links |
| Local server `python3 -m http.server 5173` | All listed routes returned HTTP 200 |
| Lead-Dev headline present | Verified |
| Lead-Dev placeholder CTAs | 3× “setup required” (checkout not live) |
| Home primary nav | `site-nav` present |
| Sitemap URL count | 8 `<loc>` entries |
| Affiliate IDs | Unchanged (`via=letterroi`) |

### Routes checked (local)

`/`, `/letterroi/`, `/sponsorquote/`, `/method/`, `/lead-dev/`, `/about/`, `/privacy/`, `/contact/`, `/sitemap.xml`, `/llms.txt`, `/robots.txt`, `/site.css`, `/lead-dev/config.js`, `/404.html`

### Manual / browser (owner should confirm)

| Item | Status |
| --- | --- |
| Visual check at ~390 / 768 / 1440 | MANUAL VERIFICATION — layout CSS added; confirm in browser |
| Keyboard / focus on nav | Focus-visible styles in `site.css`; confirm in browser |
| Live production `mangrovetools.com` | MANUAL — agent fetch returned 403 earlier |
| Netlify deploy of this branch | Not done — approval required |
| Live checkout / booking URLs | Intentionally empty — see `docs/setup/LEAD_DEV_REVENUE.md` |
| Contact inbox | Set to `needlesearchapp@protonmail.com` |

## Findings

### BLOCKER (for going live with paid offers)

- `KIT_CHECKOUT_URL`, `COHORT_SIGNUP_URL`, `DWY_BOOKING_URL` empty — CTAs disabled until owner configures.

### HIGH

- Production deploy of V1.0 not yet approved/executed.
- Contact email may not be provisioned yet.

### MEDIUM

- No automated browser/visual regression suite (static site; link checker only).
- Lead-Dev OG image reuses site `og.jpg` (acceptable; dedicated creatives optional later).

### LOW

- Tool pages keep tool-specific headers (intentional); site-wide nav is on umbrella pages.

### MANUAL VERIFICATION

- Real-device mobile layout
- Live DNS / Netlify publish of this branch
- Affiliate click-through on production after deploy

## Approval still required before

- Production deploy
- Pasting live payment/booking URLs and enabling money movement
- Payout / tax / storefront account setup
- Changing affiliate IDs
- Inventing testimonials or guarantee language

## V1.0 ship checklist (repo)

- [x] Development branch protected from sole `main` edits for this work
- [x] `.gitignore` / `.cursorignore`
- [x] AGENTS.md dual model + autonomy rules
- [x] Ops audit / strategy / backlog / discovery
- [x] Trust pages + shared nav/footer
- [x] `/method/` + `/lead-dev/`
- [x] Revenue setup doc
- [x] sitemap / llms / netlify redirects
- [ ] Owner: configure CTAs
- [ ] Owner: approve production deploy
