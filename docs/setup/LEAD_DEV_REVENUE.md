# Lead-Dev revenue setup (owner)

Public page: `/lead-dev/`  
Config file: `lead-dev/config.js`  
Contact page email: `contact/index.html` (keep in sync)

## Product model (locked)

| Offer | How it sells | Your involvement |
| --- | --- | --- |
| Lead-Dev Kit | Self-serve checkout | None after purchase |
| Ship With a Lead-Dev Agent | Self-serve checkout (self-paced) | None — optional email if they reach out |
| Agent OS Install (DWY) | Email inquiry only | Only if they email you |

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
| Agent OS Install (DWY) | $499–$2,500 (Starter / Standard / Plus) |

Set **final** prices inside the bands in your checkout product, then update on-page copy if you want a single number instead of a range.

## Launch order (recommended)

1. Template pack (Kit)  
2. Self-serve cohort product  
3. DWY via email inquiries  

## Before activating live payments

- [ ] Create Kit + cohort products in your payment provider (self-serve)  
- [ ] Confirm tax / payout settings with your provider (owner only)  
- [ ] Paste `KIT_CHECKOUT_URL` and `COHORT_SIGNUP_URL` into `lead-dev/config.js`  
- [ ] Verify Kit/cohort buttons leave “setup required” mode  
- [ ] Confirm DWY button opens mailto to your inbox  
- [ ] Add pack license terms before selling the kit  
- [ ] DWY: SOW + payment received before kickoff (only after email intake)  

## Approval boundaries

Cursor may ship placeholder CTAs and this setup doc.  
**Do not** ask Cursor to activate live vendor billing, payouts, or tax settings without your approval.

## Source docs

- `docs/lead-dev-products/SALES_PAGE.md`  
- `docs/lead-dev-products/README.md`  
- `docs/lead-dev-products/course/CURRICULUM.md`  
- `docs/lead-dev-products/templates/README.md`  
- `docs/lead-dev-products/done-with-you/OFFER.md`  
