# Lead-Dev revenue setup (owner)

Public page: `/lead-dev/`  
Config file: `lead-dev/config.js`  
Contact page email: `contact/index.html` (keep in sync)

## Product model (locked)

| Offer | How it sells | Your involvement |
| --- | --- | --- |
| Lead-Dev Kit | Self-serve checkout | None after purchase |
| Ship With a Lead-Dev Agent | Self-serve checkout (self-paced) | None — optional email if they reach out |
| Full-Stack Kit (Premium) | Email inquiry only | Only if they email you |

No booking calendar. No live cohort facilitation required.

## Values to set

| Key | Where | Purpose | Example |
| --- | --- | --- | --- |
| `KIT_CHECKOUT_URL` | `lead-dev/config.js` | Kit payment link | Gumroad / Stripe / Lemon Squeezy |
| `COHORT_SIGNUP_URL` | `lead-dev/config.js` | Self-serve cohort checkout | Same providers (course product) |
| `CONTACT_EMAIL` | `lead-dev/config.js` + contact page | Public inbox + DWY CTA | `needlesearchapp@protonmail.com` |

`DWY_BOOKING_URL` is retired — DWY uses `mailto:` + `CONTACT_EMAIL`.

## Pricing (source bands — do not invent outside these without approval)

| Offer | Band |
| --- | --- |
| Lead-Dev Kit | $49–$149 |
| Ship With a Lead-Dev Agent (self-serve) | $297–$997 |
| Full-Stack Kit (Premium) | $297 |

Set **final** prices inside the bands in your checkout product, then update on-page copy if you want a single number instead of a range.

## Launch order (recommended)

1. Template pack (Kit)  
2. Self-serve cohort product  
3. Full-Stack Kit via email inquiries  

## Digital delivery (live)

Buyers are redirected after Stripe checkout:

| Product | After-payment URL | Download |
| --- | --- | --- |
| Lead-Dev Kit | `https://mangrovetools.com/deliver/kit/` | `/deliver/lead-dev-kit.zip` |
| Ship With a Lead-Dev Agent | `https://mangrovetools.com/deliver/cohort/` | `/deliver/lead-dev-cohort.zip` |

Set each Payment Link → **After payment** → **Don’t show confirmation page** / redirect to the URL above (or “Redirect customers to…”).

`/deliver/` is `noindex` and disallowed in `robots.txt` (not in sitemap). Links are for buyers via Stripe redirect — not linked from site nav.

Rebuild zips from `docs/lead-dev-products/` when templates/course content changes.

## Before activating live payments

- [x] Create Kit + cohort products in Stripe (self-serve)  
- [ ] Confirm tax / payout settings with your provider (owner only)  
- [x] Paste `KIT_CHECKOUT_URL` and `COHORT_SIGNUP_URL` into `lead-dev/config.js`  
- [x] Wire Stripe after-payment redirects to `/deliver/kit/` and `/deliver/cohort/`  
- [x] Confirm Full-Stack Kit email opens mailto to your inbox  
- [x] Pack license included in zip `LICENSE.txt`  
- [ ] Full-Stack Kit: payment received before kickoff (only after email intake)  

## Approval boundaries

Cursor may ship placeholder CTAs and this setup doc.  
**Do not** ask Cursor to activate live vendor billing, payouts, or tax settings without your approval.

## Source docs

- `docs/lead-dev-products/SALES_PAGE.md`  
- `docs/lead-dev-products/README.md`  
- `docs/lead-dev-products/course/CURRICULUM.md`  
- `docs/lead-dev-products/templates/README.md`  
- `docs/lead-dev-products/done-with-you/OFFER.md`  
