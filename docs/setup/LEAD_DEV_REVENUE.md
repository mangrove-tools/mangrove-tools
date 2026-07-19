# Lead-Dev revenue setup (owner)

Public page: `/lead-dev/`  
Config file: `lead-dev/config.js`  
Contact page email: `contact/index.html` (keep in sync)

## Values to set

| Key | Where | Purpose | Example |
| --- | --- | --- | --- |
| `KIT_CHECKOUT_URL` | `lead-dev/config.js` | Lead-Dev Kit payment link | Gumroad / Stripe Payment Link / Lemon Squeezy |
| `COHORT_SIGNUP_URL` | `lead-dev/config.js` | Cohort checkout or waitlist | Checkout URL or form |
| `DWY_BOOKING_URL` | `lead-dev/config.js` | DWY intake calendar | Calendly / SavvyCal / etc. |
| `CONTACT_EMAIL` | `lead-dev/config.js` + contact page | Public inbox | `needlesearchapp@protonmail.com` |

## Pricing (source bands — do not invent outside these without approval)

| Offer | Band |
| --- | --- |
| Lead-Dev Kit | $49–$149 |
| Ship With a Lead-Dev Agent (cohort) | $297–$997 |
| Agent OS Install (DWY) | $499–$2,500 (Starter / Standard / Plus) |

Set **final** prices inside the bands in your checkout product, then update on-page copy if you want a single number instead of a range.

## Launch order (recommended)

1. Template pack (Kit)  
2. Small cohort  
3. Done-with-you  

## Before activating live payments

- [ ] Create products in your payment provider  
- [ ] Confirm tax / payout settings with your provider (owner only)  
- [ ] Paste live URLs into `lead-dev/config.js`  
- [ ] Verify buttons leave “setup required” mode  
- [ ] Add pack license terms before selling the kit  
- [ ] DWY: SOW + payment received before kickoff  

## Approval boundaries

Cursor may ship placeholder CTAs and this setup doc.  
**Do not** ask Cursor to activate live vendor billing, payouts, tax settings, or production deploy without your approval.

## Source docs

- `docs/lead-dev-products/SALES_PAGE.md`  
- `docs/lead-dev-products/README.md`  
- `docs/lead-dev-products/course/CURRICULUM.md`  
- `docs/lead-dev-products/templates/README.md`  
- `docs/lead-dev-products/done-with-you/OFFER.md`  
