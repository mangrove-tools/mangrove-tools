# Calculator UX audit (P1-13)

**Date:** 2026-07-20  
**Tools:** LetterROI, SponsorQuote, SubTarget

## Behaviors verified / fixed

| Case | Behavior |
| --- | --- |
| Empty required fields on submit | Field errors + results note “Fix the highlighted fields…” + focus first invalid |
| Fractional subscribers | Rejected (whole numbers only) |
| Open rate outside 0–100 | Rejected |
| Sends outside 1–60 or non-integer | Rejected (LetterROI) |
| Subscribers / revenue above soft caps | Rejected with directional message |
| LetterROI paid price above $10,000 | Rejected (new soft cap) |
| SubTarget price &lt; $0.50 or revenue &lt; $1 | Rejected |
| Custom CPM empty / out of range | Rejected (SponsorQuote) |
| Large-list success | Directional note appended (unchanged) |
| Before first success | Results show em dashes + empty guidance |
| Live edit after success | Debounced revalidate with errors |

## Manual checks

1. Clear a required field → Calculate → error + focus.  
2. Enter `5000.5` subscribers → rejected.  
3. Enter `99999999` subscribers → soft-cap message.  
4. Happy path still produces a banded result.
