# Beehiiv affiliate via codes (owner)

Created in Partner Dashboard and wired on Mangrove Tools.

## Live via codes

| Surface | via code | URL | Status |
| --- | --- | --- | --- |
| LetterROI | `letterroi` | `https://www.beehiiv.com/?via=letterroi` | Wired in `letterroi/config.js` + page CTAs |
| SponsorQuote | `sponsorquote` | `https://www.beehiiv.com/?via=sponsorquote` | Wired in `sponsorquote/config.js` + page CTAs |
| SubTarget | `subtarget` | `https://www.beehiiv.com/?via=subtarget` | Wired in `subtarget/config.js` + page CTAs |
| Media Kit Composer | `mediakit` | `https://www.beehiiv.com/?via=mediakit` | Created in Partner Dashboard · wired in `mediakit/config.js` + page CTAs |
| Inventory Planner | `inventory` | `https://www.beehiiv.com/?via=inventory` | Created in Partner Dashboard · wired in `inventory/config.js` + page CTAs |
| Home / general | `mangrove` | `https://www.beehiiv.com/?via=mangrove` | Created — not wired yet (no home Beehiiv CTA) |
| Method / Lead-Dev | `leaddev` | `https://www.beehiiv.com/?via=leaddev` | Created — not wired yet (no Beehiiv CTA on those pages) |

## UTMs (appended by each tool’s `app.js`)

| Tool | UTM |
| --- | --- |
| LetterROI | `utm_source=letterroi&utm_medium=affiliate&utm_campaign=roi_calculator` |
| SponsorQuote | `utm_source=sponsorquote&utm_medium=affiliate&utm_campaign=sponsor_quote` |
| SubTarget | `utm_source=subtarget&utm_medium=affiliate&utm_campaign=paid_sub_goal` |
| Media Kit | `utm_source=mediakit&utm_medium=affiliate&utm_campaign=media_kit` |
| Inventory | `utm_source=inventory&utm_medium=affiliate&utm_campaign=sponsor_inventory` |

## Notes

- Keep `letterroi` as the Beehiiv **default** partner link unless you update the site first.
- Do not change production `AFFILIATE_URL` values without approval.
